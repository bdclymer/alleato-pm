import { create } from "zustand";

interface CommentsSidebarState {
  open: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
}

export const useCommentsSidebarStore = create<CommentsSidebarState>()((set) => ({
  open: false,
  toggle: () => set((s) => ({ open: !s.open })),
  setOpen: (open) => set({ open }),
}));
