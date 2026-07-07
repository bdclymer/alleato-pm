import "@liveblocks/client";

// Global Liveblocks type augmentation. Thread metadata is optional so both
// commenting styles share one type: per-record threads (EntityComments) carry no
// metadata, while page-overlay pins store their anchor as { x, y } page
// coordinates. See page-comments-overlay.tsx.
declare global {
  interface Liveblocks {
    ThreadMetadata: {
      x?: number;
      y?: number;
    };
  }
}

export {};
