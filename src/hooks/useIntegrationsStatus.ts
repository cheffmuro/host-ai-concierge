import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type IntegrationKey = "chatwoot" | "evolution" | "dify";

const required: Record<IntegrationKey, string[]> = {
  chatwoot: ["url", "user_token", "account_id"],
  evolution: ["url", "api_key", "instance"],
  dify: ["url", "api_key", "dataset_id"],
};

export interface IntegrationsStatus {
  chatwoot: boolean;
  evolution: boolean;
  dify: boolean;
  loading: boolean;
  missing: IntegrationKey[];
}

const labels: Record<IntegrationKey, string> = {
  chatwoot: "Chatwoot",
  evolution: "Evolution",
  dify: "Dify",
};

export const integrationLabel = (key: IntegrationKey) => labels[key];

export function useIntegrationsStatus(): IntegrationsStatus {
  const [state, setState] = useState<IntegrationsStatus>({
    chatwoot: false,
    evolution: false,
    dify: false,
    loading: true,
    missing: [],
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_integrations_status");
      if (cancelled) return;

      const map = new Map<string, boolean>();
      if (!error && Array.isArray(data)) {
        (data as Array<{ key: string; configured: boolean }>).forEach((row) => {
          map.set(row.key, !!row.configured);
        });
      }

      const chatwoot = map.get("chatwoot") ?? false;
      const evolution = map.get("evolution") ?? false;
      const dify = map.get("dify") ?? false;

      const missing = (Object.keys(required) as IntegrationKey[]).filter((k) => {
        return !({ chatwoot, evolution, dify }[k]);
      });

      setState({ chatwoot, evolution, dify, loading: false, missing });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
