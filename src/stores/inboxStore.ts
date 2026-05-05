import { create } from "zustand";
import type { Channel } from "@/services/types";

interface InboxState {
  selectedId: string | null;
  channelFilter: Channel | "all";
  search: string;
  contextOpen: boolean;
  setSelected: (id: string | null) => void;
  setChannelFilter: (c: Channel | "all") => void;
  setSearch: (s: string) => void;
  setContextOpen: (open: boolean) => void;
}

export const useInboxStore = create<InboxState>((set) => ({
  selectedId: null,
  channelFilter: "all",
  search: "",
  contextOpen: false,
  setSelected: (id) => set({ selectedId: id }),
  setChannelFilter: (c) => set({ channelFilter: c }),
  setSearch: (s) => set({ search: s }),
  setContextOpen: (open) => set({ contextOpen: open }),
}));
