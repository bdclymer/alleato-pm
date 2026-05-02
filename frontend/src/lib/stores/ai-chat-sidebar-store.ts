import { create } from "zustand";

interface AiChatSidebarState {
  open: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
}

export const useAiChatSidebarStore = create<AiChatSidebarState>()((set) => ({
  open: false,
  toggle: () => set((s) => ({ open: !s.open })),
  setOpen: (open) => set({ open }),
}));
