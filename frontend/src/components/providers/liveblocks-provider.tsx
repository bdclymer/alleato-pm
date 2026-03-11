"use client";

import { ReactNode } from "react";
import { LiveblocksProvider as Provider } from "../../liveblocks.config";

export function LiveblocksProviderWrapper({
  children,
}: {
  children: ReactNode;
}) {
  return <Provider>{children}</Provider>;
}
