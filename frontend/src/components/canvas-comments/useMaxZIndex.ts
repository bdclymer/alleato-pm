import { useMemo } from "react";
import { useThreads } from "@liveblocks/react/suspense";

/** Returns the highest zIndex across all canvas comment threads. */
export function useMaxZIndex(): number {
  const { threads } = useThreads();

  return useMemo(() => {
    let max = 0;
    for (const thread of threads) {
      const z = thread.metadata.zIndex ?? 0;
      if (z > max) max = z;
    }
    return max;
  }, [threads]);
}
