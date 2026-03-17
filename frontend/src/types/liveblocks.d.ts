// Global Liveblocks type augmentation.
// Declares the shape of thread metadata stored on every comment thread.
declare global {
  interface Liveblocks {
    ThreadMetadata: {
      /** X position as a percentage (0–100) of the PDF page width */
      x?: number;
      /** Y position as a percentage (0–100) of the PDF page height */
      y?: number;
      /** PDF page number (1-based) where the pin was placed */
      page?: number;
    };
  }
}

export {};
