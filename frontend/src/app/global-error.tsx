"use client";

import { useEffect } from "react";

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

export default function GlobalError({
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
        // sessionStorage blocked — reload once anyway
        window.location.reload();
        return;
      }
    }
  }, [error]);

  const isChunk = isChunkLoadError(error);

  return (
    <html>
      <body>
        <div className="flex h-screen flex-col items-center justify-center gap-4 p-8"
             style={{ fontFamily: "system-ui, sans-serif" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: isChunk ? "rgba(99, 102, 241, 0.1)" : "rgba(239, 68, 68, 0.1)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <span style={{ fontSize: 28 }}>{isChunk ? "🔄" : "⚠️"}</span>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
            {isChunk ? "New version available" : "Something went wrong"}
          </h2>
          <p style={{ color: "#6b7280", textAlign: "center", maxWidth: 400 }}>
            {isChunk
              ? "The app has been updated. Click refresh to load the latest version."
              : error.message || "A critical error occurred. Please try again."}
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => isChunk ? window.location.reload() : reset()}
              style={{
                padding: "8px 16px", borderRadius: 6, border: "none", cursor: "pointer",
                background: "#6366f1", color: "white", fontWeight: 500
              }}
            >
              {isChunk ? "Refresh Now" : "Try Again"}
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              style={{
                padding: "8px 16px", borderRadius: 6, border: "1px solid #d1d5db",
                cursor: "pointer", background: "white", fontWeight: 500
              }}
            >
              Go Home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
