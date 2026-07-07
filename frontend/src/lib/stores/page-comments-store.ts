import { create } from "zustand";

interface PageCommentsState {
  /** When true, the page is in click-anywhere comment mode. */
  active: boolean;
  setActive: (active: boolean) => void;
  toggle: () => void;
}

/**
 * Controls the Liveblocks page-comment overlay. Toggled from the header comment
 * icon; read by PageCommentsOverlay, which only mounts the Liveblocks connection
 * (and shows pins) while active — so nothing, badge included, sits on the page
 * when comment mode is off. Intentionally NOT persisted: comment mode is a
 * transient action, not a saved preference.
 */
export const usePageCommentsStore = create<PageCommentsState>((set) => ({
  active: false,
  setActive: (active) => set({ active }),
  toggle: () => set((state) => ({ active: !state.active })),
}));
