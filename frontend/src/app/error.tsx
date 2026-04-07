"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

function isChunkLoadError(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return (
    msg.includes("loading chunk") ||
    msg.includes("failed to load chunk") ||
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("importing a module script failed") ||
    msg.includes("loading css chunk") ||
    msg.includes("_next/static")
  );
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Auto-reload on chunk errors (deployment cache mismatch)
    if (isChunkLoadError(error)) {
      try {
        const last = sessionStorage.getItem("chunk-error-reload");
        if (!last || Date.now() - Number(last) > 10_000) {
          sessionStorage.setItem("chunk-error-reload", String(Date.now()));
          window.location.reload();
          return;
        }
      } catch {
        window.location.reload();
        return;
      }
    }
    console.error("Unhandled error:", error);
  }, [error]);

  const isChunk = isChunkLoadError(error);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
      <div className={`rounded-full p-4 ${isChunk ? "bg-primary/10" : "bg-destructive/10"}`}>
        {isChunk ? (
          <svg
            className="h-6 w-6 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
            />
          </svg>
        ) : (
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
        )}
      </div>
      <h2 className="text-xl font-semibold">
        {isChunk ? "New version available" : "Something went wrong"}
      </h2>
      <p className="text-muted-foreground text-center max-w-md">
        {isChunk
          ? "The app has been updated. Click refresh to load the latest version."
          : error.message || "An unexpected error occurred. Please try again."}
      </p>
      <div className="flex gap-4">
        <Button onClick={() => isChunk ? window.location.reload() : reset()} variant="default">
          {isChunk ? "Refresh Now" : "Try Again"}
        </Button>
        <Button onClick={() => (window.location.href = "/")} variant="outline">
          Go Home
        </Button>
      </div>
    </div>
  );
}
