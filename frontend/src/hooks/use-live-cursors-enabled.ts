"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "live-cursors-enabled";

export function useLiveCursorsEnabled() {
  const [enabled, setEnabledState] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setEnabledState(true);
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  }, []);

  return { enabled, setEnabled };
}
