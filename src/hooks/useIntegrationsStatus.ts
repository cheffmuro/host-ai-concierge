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
      // Usa RPC (SECURITY DEFINER) que só devolve booleanos — não expõe tokens.
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
      const n8n = map.get("n8n") ?? false;

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
