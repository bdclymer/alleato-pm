"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Detect chunk/runtime module loading failures that require a hard refresh.
function isRuntimeModuleLoadError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes("loading chunk") ||
    message.includes("failed to load chunk") ||
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("importing a module script failed") ||
    message.includes("_next/static") ||
    message.includes("module factory is not available") ||
    message.includes("worker was terminated")
  );
}

export default function DrawingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isRuntimeLoadError = isRuntimeModuleLoadError(error);

  useEffect(() => {
    console.error("Drawings module error:", error);

    // Force one-time reload for chunk/runtime load mismatches.
    if (!isRuntimeLoadError) return;
    try {
      const lastReload = sessionStorage.getItem("drawings-module-error-reload");
      if (!lastReload || Date.now() - Number(lastReload) > 10_000) {
        sessionStorage.setItem("drawings-module-error-reload", String(Date.now()));
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  }, [error, isRuntimeLoadError]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
      <div className="rounded-full bg-destructive/10 p-4">
        <svg
          className="h-6 w-6 text-destructive"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold">Drawings Error</h2>
      <p className="text-muted-foreground text-center max-w-md">
        {isRuntimeLoadError
          ? "The page code changed while this tab was open. Refresh to continue."
          : error.message || "Failed to load drawings data. Please try again."}
      </p>
      <div className="flex gap-4">
        <Button onClick={() => (isRuntimeLoadError ? window.location.reload() : reset())} variant="default">
          {isRuntimeLoadError ? "Refresh Now" : "Try Again"}
        </Button>
        <Button onClick={() => window.history.back()} variant="outline">
          Go Back
        </Button>
      </div>
    </div>
  );
}
