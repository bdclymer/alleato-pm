"use client";

import type { ReactNode } from "react";

/**
 * Main app provider wrapper.
 * Liveblocks was removed in favor of Supabase collaboration primitives.
 */
export function Providers({ children }: { children: ReactNode }) {
  return children;
}
