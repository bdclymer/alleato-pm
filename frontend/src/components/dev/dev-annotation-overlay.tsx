"use client";

/**
 * DevAnnotationOverlay
 *
 * Floating dev tool — only renders in development mode.
 * Lets Megan annotate any page and have Claude Code respond.
 *
 * Usage in root layout.tsx:
 *   import { DevAnnotationOverlay } from "@/components/dev/dev-annotation-overlay";
 *   ...
 *   {process.env.NODE_ENV === "development" && <DevAnnotationOverlay />}
 *
 * How it works:
 * 1. Floating button appears bottom-right in dev mode
 * 2. Click opens panel — current route pre-filled
 * 3. Optionally capture screenshot (uses html2canvas)
 * 4. Submit creates annotation via POST /api/dev/annotate
 * 5. Badge shows count of unresolved annotations
 * 6. Panel shows all annotations + Claude Code's replies
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type Annotation = {
  id: string;
  route: string;
  comment: string;
  status: string;
  created_at: string;
  ai_reply: string | null;
  ai_replied_at: string | null;
  screenshot_url: string | null;
};

export function DevAnnotationOverlay() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [tab, setTab] = useState<"new" | "history">("new");
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Poll for annotation updates every 20s when panel is open
  const fetchAnnotations = useCallback(async () => {
    try {
      const res = await fetch("/api/dev/annotate?status=all");
      if (res.ok) {
        const { annotations: data } = await res.json();
        setAnnotations(data ?? []);
      }
    } catch {
      // Silent fail — non-critical
    }
  }, []);

  useEffect(() => {
    fetchAnnotations();
  }, [fetchAnnotations]);

  useEffect(() => {
    if (open) {
      fetchAnnotations();
      pollRef.current = setInterval(fetchAnnotations, 20000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, fetchAnnotations]);

  const captureScreenshot = async () => {
    setCapturing(true);
    try {
      // Dynamically import html2canvas to avoid SSR issues
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(document.body, {
        scale: 0.5,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      setScreenshotData(canvas.toDataURL("image/png"));
    } catch {
      // Screenshot is optional — fail silently
    } finally {
      setCapturing(false);
    }
  };

  const handleSubmit = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/dev/annotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route: pathname,
          comment: comment.trim(),
          screenshotDataUrl: screenshotData,
          componentHint: null,
        }),
      });
      if (res.ok) {
        setComment("");
        setScreenshotData(null);
        setTab("history");
        await fetchAnnotations();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openCount = annotations.filter(
    (a) => a.status === "open" || a.status === "in_progress"
  ).length;

  const repliedCount = annotations.filter((a) => a.status === "replied").length;

  return (
    <>
      {/* Floating trigger button */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2">
        {repliedCount > 0 && !open && (
          <div className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 animate-pulse">
            {repliedCount} reply{repliedCount > 1 ? " replies" : ""} from Claude
          </div>
        )}
        {/* eslint-disable-next-line design-system/no-design-violations -- dev-only floating widget */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="relative flex items-center gap-1.5 bg-zinc-900 text-white text-xs font-medium px-3 py-2 rounded-full shadow-lg border border-zinc-700 hover:bg-zinc-800 transition-colors"
          title="Dev annotation bridge"
        >
          <span className="text-base">🤖</span>
          <span>Dev Bridge</span>
          {openCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {openCount}
            </span>
          )}
        </button>
      </div>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-16 right-4 z-[9999] w-96 bg-background border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[70vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Dev Bridge</span>
              <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                {pathname}
              </span>
            </div>
            {/* eslint-disable-next-line design-system/no-design-violations -- dev-only panel close */}
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground text-lg leading-none"
            >
              ×
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            {/* eslint-disable-next-line design-system/no-design-violations -- dev-only tab control */}
            <button
              onClick={() => setTab("new")}
              className={`flex-1 text-xs py-2 font-medium transition-colors ${
                tab === "new"
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              + New annotation
            </button>
            {/* eslint-disable-next-line design-system/no-design-violations -- dev-only tab control */}
            <button
              onClick={() => setTab("history")}
              className={`flex-1 text-xs py-2 font-medium transition-colors relative ${
                tab === "history"
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              History
              {repliedCount > 0 && (
                <span className="absolute top-1 right-4 bg-blue-500 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {repliedCount}
                </span>
              )}
            </button>
          </div>

          {/* New annotation tab */}
          {tab === "new" && (
            <div className="flex flex-col gap-3 p-4">
              <Textarea
                placeholder="Describe the issue or what you want Claude Code to look at..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="resize-none text-sm min-h-[100px]"
                autoFocus
              />
              <div className="flex items-center justify-between">
                {/* eslint-disable-next-line design-system/no-design-violations -- dev-only action */}
                <button
                  onClick={captureScreenshot}
                  disabled={capturing}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  {capturing ? "Capturing..." : screenshotData ? "✓ Screenshot captured" : "📷 Add screenshot"}
                </button>
                {screenshotData && (
                  // eslint-disable-next-line design-system/no-design-violations -- dev-only action
                  <button
                    onClick={() => setScreenshotData(null)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              {screenshotData && (
                <img
                  src={screenshotData}
                  alt="Screenshot preview"
                  className="rounded border border-border w-full object-cover max-h-24"
                />
              )}
              <Button
                onClick={handleSubmit}
                disabled={submitting || !comment.trim()}
                size="sm"
                className="w-full"
              >
                {submitting ? "Sending..." : "Send to Claude Code"}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Claude Code will poll this, open the page in agent-browser, and reply here.
              </p>
            </div>
          )}

          {/* History tab */}
          {tab === "history" && (
            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {annotations.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No annotations yet. Create one to get started.
                </div>
              )}
              {annotations.map((a) => (
                <div key={a.id} className="p-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-foreground leading-snug">{a.comment}</p>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        a.status === "replied"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                          : a.status === "resolved"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground font-mono">{a.route}</span>
                    <span className="text-[10px] text-muted-foreground">
                      · {new Date(a.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  {a.ai_reply && (
                    <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5 mt-1">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                          Claude Code
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          · {a.ai_replied_at ? new Date(a.ai_replied_at).toLocaleTimeString() : ""}
                        </span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                        {a.ai_reply}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
