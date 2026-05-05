import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface OutboxAttachmentMeta {
  id: string;
  name: string;
  mime: string;
  size: number;
  kind: "image" | "file";
  // Note: file binaries are not persisted across reloads.
}

export interface OutboxItem {
  id: string; // matches the optimistic message id
  conversationId: string;
  content: string;
  attachments?: OutboxAttachmentMeta[];
  createdAt: string;
  attempts: number;
  lastError?: string;
}

interface OutboxState {
  items: OutboxItem[];
  flushing: boolean;
  enqueue: (item: Omit<OutboxItem, "attempts">) => void;
  remove: (id: string) => void;
  markAttempt: (id: string, error?: string) => void;
  setFlushing: (v: boolean) => void;
  forConversation: (conversationId: string) => OutboxItem[];
}

export const useOutboxStore = create<OutboxState>()(
  persist(
    (set, get) => ({
      items: [],
      flushing: false,
      enqueue: (item) =>
        set((s) => ({ items: [...s.items.filter((i) => i.id !== item.id), { ...item, attempts: 0 }] })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      markAttempt: (id, error) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, attempts: i.attempts + 1, lastError: error } : i)),
        })),
      setFlushing: (v) => set({ flushing: v }),
      forConversation: (cid) => get().items.filter((i) => i.conversationId === cid),
    }),
    {
      name: "host-ai-concierge-outbox",
      version: 2,
      // One-time migration from the previous storage key ("anfitriao-outbox")
      // so users who already had a queued outbox don't lose it after the rename.
      migrate: (persistedState, _version) => persistedState as OutboxState,
      onRehydrateStorage: () => (state) => {
        if (typeof window === "undefined" || !state) return;
        if (state.items && state.items.length > 0) return;
        try {
          const legacy = window.localStorage.getItem("anfitriao-outbox");
          if (!legacy) return;
          const parsed = JSON.parse(legacy);
          const items = parsed?.state?.items;
          if (Array.isArray(items) && items.length > 0) {
            state.items = items;
          }
          window.localStorage.removeItem("anfitriao-outbox");
        } catch {
          /* ignore — legacy payload corrupted */
        }
      },
    },
  ),
);
