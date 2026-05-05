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
      name: "anfitriao-outbox",
    },
  ),
);
