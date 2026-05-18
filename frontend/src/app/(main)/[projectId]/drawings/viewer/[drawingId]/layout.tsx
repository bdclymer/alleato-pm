import type { ReactNode } from "react";
import { LiveblocksAppProvider } from "@/components/providers/liveblocks-app-provider";

export default function DrawingViewerLayout({ children }: { children: ReactNode }) {
  return <LiveblocksAppProvider>{children}</LiveblocksAppProvider>;
}
