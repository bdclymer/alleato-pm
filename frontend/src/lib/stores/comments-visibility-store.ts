import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CommentsVisibilityState {
  /** When true, Velt comment pins and the recorder/audio/video widgets render on the page. */
  visible: boolean;
  toggle: () => void;
  setVisible: (visible: boolean) => void;
}

/**
 * Controls whether the global Velt collaboration layer (comment pins, recorder
 * control panel, audio/video playback widgets) is shown on top of page content.
 *
 * Persisted so the user's preference survives reloads and navigation. Read by
 * `VeltGlobalLayer`; toggled from the header comments menu.
 */
export const useCommentsVisibilityStore = create<CommentsVisibilityState>()(
  persist(
    (set) => ({
      visible: true,
      toggle: () => set((state) => ({ visible: !state.visible })),
      setVisible: (visible) => set({ visible }),
    }),
    {
      name: "comments-visibility",
    },
  ),
);
