"use client";

import type { ReactNode } from "react";
import { lazy, Suspense } from "react";
import { usePathname } from "next/navigation";

const LiveblocksAppProvider = lazy(() =>
  import("@/components/providers/liveblocks-app-provider").then((mod) => ({
    default: mod.LiveblocksAppProvider,
  }))
);

/** Provides route-aware client contexts without loading app-only providers on public auth routes. */
export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname?.startsWith("/auth")) {
    return <>{children}</>;
  }

  return (
    <Suspense fallback={children}>
      <LiveblocksAppProvider>{children}</LiveblocksAppProvider>
    </Suspense>
  );
}
