"use client";

import { useEffect, useState } from "react";

type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function useDeferredMount(timeoutMs = 1_500) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const browserWindow = window as WindowWithIdleCallback;
    if (browserWindow.requestIdleCallback) {
      const handle = browserWindow.requestIdleCallback(() => setMounted(true), {
        timeout: timeoutMs,
      });
      return () => browserWindow.cancelIdleCallback?.(handle);
    }

    const handle = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(handle);
  }, [timeoutMs]);

  return mounted;
}
