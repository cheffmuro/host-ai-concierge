/**
 * Modo Demonstração — simula o app "tudo conectado" (Chatwoot + Dify +
 * Evolution) com um cenário de hospedagem. Nada é gravado no banco e
 * nenhuma server function é chamada enquanto o modo está ligado.
 */
import { create } from "zustand";

const STORAGE_KEY = "anfitriao:demo-mode";

function readInitial(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

interface DemoState {
  enabled: boolean;
  hydrated: boolean;
  setEnabled: (v: boolean) => void;
  hydrate: () => void;
}

export const useDemoStore = create<DemoState>((set) => ({
  enabled: false,
  hydrated: false,
  hydrate: () => set({ enabled: readInitial(), hydrated: true }),
  setEnabled: (v) => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, v ? "true" : "false");
      }
    } catch {
      /* noop */
    }
    set({ enabled: v });
  },
}));

/** Leitura imperativa (services fora do React). */
export const isDemoMode = () => useDemoStore.getState().enabled;

/** Hook reativo para componentes. */
export const useDemoMode = () => useDemoStore((s) => s.enabled);
