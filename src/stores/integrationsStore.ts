/**
 * Store client-side com as credenciais das integrações resolvidas
 * (via server functions `getChatwootConfig`/`getDifyConfig`).
 *
 * Fallback: se ainda não houver bootstrap ou vier vazio, cai nas
 * variáveis `VITE_*` do build (mantém retrocompatibilidade com deploys
 * antigos que injetavam credenciais via Vercel).
 */
import { create } from "zustand";
import type { ChatwootConfig, DifyConfig } from "@/lib/integrations.functions";

interface State {
  chatwoot: ChatwootConfig;
  dify: DifyConfig;
  loaded: boolean;
  version: number;
  setChatwoot: (cfg: ChatwootConfig) => void;
  setDify: (cfg: DifyConfig) => void;
  markLoaded: () => void;
}

const envChatwoot: ChatwootConfig = {
  url: import.meta.env.VITE_CHATWOOT_URL as string | undefined,
  user_token: import.meta.env.VITE_CHATWOOT_USER_TOKEN as string | undefined,
  account_id: import.meta.env.VITE_CHATWOOT_ACCOUNT_ID as string | undefined,
  inbox_id: import.meta.env.VITE_CHATWOOT_INBOX_ID as string | undefined,
  pubsub_token: import.meta.env.VITE_CHATWOOT_PUBSUB_TOKEN as string | undefined,
};

const envDify: DifyConfig = {
  url: import.meta.env.VITE_DIFY_URL as string | undefined,
  api_key: import.meta.env.VITE_DIFY_API_KEY as string | undefined,
  dataset_id: import.meta.env.VITE_DIFY_DATASET_ID as string | undefined,
};

const merge = <T extends Record<string, unknown>>(a: T, b: T): T => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
};

export const useIntegrationsStore = create<State>((set) => ({
  chatwoot: envChatwoot,
  dify: envDify,
  loaded: false,
  version: 0,
  setChatwoot: (cfg) => set((s) => ({ chatwoot: merge(envChatwoot, cfg), version: s.version + 1 })),
  setDify: (cfg) => set((s) => ({ dify: merge(envDify, cfg), version: s.version + 1 })),
  markLoaded: () => set({ loaded: true }),
}));

export const isChatwootLive = (c: ChatwootConfig) =>
  Boolean(c.url && c.user_token && c.account_id);

export const isDifyLive = (c: DifyConfig) =>
  Boolean(c.url && c.api_key && c.dataset_id);
