import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type IntegrationKey = "chatwoot" | "evolution" | "dify" | "n8n";

const required: Record<IntegrationKey, string[]> = {
  chatwoot: ["url", "user_token", "account_id"],
  evolution: ["url", "api_key", "instance"],
  dify: ["url", "api_key", "dataset_id"],
  n8n: ["webhook_handoff"],
};

export interface IntegrationsStatus {
  chatwoot: boolean;
  evolution: boolean;
  dify: boolean;
  n8n: boolean;
  loading: boolean;
  missing: IntegrationKey[];
}

const labels: Record<IntegrationKey, string> = {
  chatwoot: "Chatwoot",
  evolution: "Evolution",
  dify: "Dify",
  n8n: "n8n",
};

export const integrationLabel = (key: IntegrationKey) => labels[key];

export function useIntegrationsStatus(): IntegrationsStatus {
  const [state, setState] = useState<IntegrationsStatus>({
    chatwoot: false,
    evolution: false,
    dify: false,
    n8n: false,
    loading: true,
    missing: [],
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", Object.keys(required));
      if (cancelled) return;

      const map = new Map<string, Record<string, string>>();
      data?.forEach((row: { key: string; value: unknown }) => {
        map.set(row.key, (row.value as Record<string, string>) || {});
      });

      const check = (k: IntegrationKey) => {
        const v = map.get(k) || {};
        return required[k].every((f) => (v[f] ?? "").toString().trim().length > 0);
      };

      const chatwoot = check("chatwoot");
      const evolution = check("evolution");
      const dify = check("dify");
      const n8n = check("n8n");

      const missing = (Object.keys(required) as IntegrationKey[]).filter((k) => {
        return !({ chatwoot, evolution, dify, n8n }[k]);
      });

      setState({ chatwoot, evolution, dify, n8n, loading: false, missing });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
