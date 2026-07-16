/**
 * Store client-side com os metadados públicos das integrações (URLs, ids,
 * `pubsub_token` do Chatwoot para o ActionCable). Tokens sensíveis
 * (`user_token`, `api_key`) NÃO vivem aqui — todas as chamadas ao Chatwoot
 * e Dify passam por server functions.
 */
import { create } from "zustand";
import type { ChatwootPublicConfig, DifyPublicConfig } from "@/lib/integrations.functions";

interface State {
  chatwoot: ChatwootPublicConfig;
  dify: DifyPublicConfig;
  loaded: boolean;
  version: number;
  setChatwoot: (cfg: Partial<ChatwootPublicConfig>) => void;
  setDify: (cfg: Partial<DifyPublicConfig>) => void;
  markLoaded: () => void;
}

const empty = { configured: false } as const;

export const useIntegrationsStore = create<State>((set) => ({
  chatwoot: { ...empty },
  dify: { ...empty },
  loaded: false,
  version: 0,
  setChatwoot: (cfg) =>
    set((s) => ({
      chatwoot: { ...s.chatwoot, ...cfg, configured: cfg.configured ?? s.chatwoot.configured },
      version: s.version + 1,
    })),
  setDify: (cfg) =>
    set((s) => ({
      dify: { ...s.dify, ...cfg, configured: cfg.configured ?? s.dify.configured },
      version: s.version + 1,
    })),
  markLoaded: () => set({ loaded: true }),
}));

export const isChatwootLive = (c: ChatwootPublicConfig) => Boolean(c.configured);
export const isDifyLive = (c: DifyPublicConfig) => Boolean(c.configured);
