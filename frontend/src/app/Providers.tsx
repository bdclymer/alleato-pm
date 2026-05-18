"use client";

import type { ReactNode } from "react";

/**
 * Route-aware client provider slot.
 *
 * `LiveblocksAppProvider` used to be mounted here at the app root, which
 * shipped the Liveblocks runtime to every authenticated page. It is now
 * scoped to the specific routes that need realtime (budget, drawings
 * viewer, spreadsheet demo) via per-segment layouts.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
