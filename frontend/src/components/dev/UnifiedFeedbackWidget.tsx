"use client";

/**
 * UnifiedFeedbackWidget — Dev-only Agentation toolbar for AI-assisted development.
 *
 * This is the DEVELOPMENT pipeline. Annotations go to the Agentation MCP server
 * for Claude to pick up and fix directly. They do NOT auto-submit to the client
 * feedback inbox.
 *
 * To escalate a dev annotation to the client feedback inbox (e.g., for tracking),
 * use the "Escalate to Inbox" button that appears after each annotation.
 *
 * Flow:
 * 1. User creates annotation via Agentation toolbar → MCP syncs automatically
 * 2. `onAnnotationAdd` fires → we auto-capture a screenshot
 * 3. Screenshot toast shows with option to "Escalate to Inbox"
 * 4. Only if escalated: POST to /api/admin/feedback → GitHub issue → inbox
 * 5. Otherwise: annotation stays in MCP only for dev workflow
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Agentation } from "agentation";
import { toPng } from "html-to-image";
import { usePathname } from "next/navigation";
import { Camera, ExternalLink, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { ADMIN_FEEDBACK_OVERLAY_ATTRIBUTE } from "@/lib/admin-feedback/constants";
import { Button } from "@/components/ui/button";

const MCP_ENDPOINT = "http://localhost:4747";

/** Agentation annotation shape (subset of AFS 1.1 fields we use). */
type AgentationAnnotation = {
  id: string;
  comment: string;
  element?: string;
  elementPath?: string;
  cssClasses?: string;
  reactComponents?: string;
  intent?: "fix" | "change" | "question" | "approve";
  severity?: "blocking" | "important" | "suggestion";
  kind?: "feedback" | "placement" | "rearrange";
  x?: number;
  y?: number;
  url?: string;
  timestamp?: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
  selectedText?: string;
  computedStyles?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Screenshot helpers (reused from AdminFeedbackWidget)
// ---------------------------------------------------------------------------

async function captureViewportScreenshot(): Promise<string | null> {
  try {
    // Always capture the full visible viewport via document.body, clipped to
    // the current window dimensions so the result is a reasonable size.
    const captureRoot = document.body;

    // Hide dev overlays during capture
    const overlays = document.querySelectorAll(
      `[${ADMIN_FEEDBACK_OVERLAY_ATTRIBUTE}], [data-radix-dialog-overlay], [role="dialog"], [data-feedback-toolbar]`,
    );
    const hidden: { el: HTMLElement; prev: string }[] = [];
    overlays.forEach((el) => {
      if (el instanceof HTMLElement) {
        hidden.push({ el, prev: el.style.visibility });
        el.style.visibility = "hidden";
      }
    });

    try {
      const dataUrl = await toPng(captureRoot, {
        backgroundColor: "#ffffff",
        // Use 1x pixel ratio to keep file size small and image readable
        pixelRatio: 1,
        // Clip to current viewport so we don't capture the entire scrollable page
        width: window.innerWidth,
        height: window.innerHeight,
        style: {
          // Shift the captured area to the current scroll position
          transform: `translate(-${window.scrollX}px, -${window.scrollY}px)`,
        },
        filter: (node: HTMLElement) => {
          if (node.nodeType !== 1) return true;
          const attr = node.getAttribute?.(ADMIN_FEEDBACK_OVERLAY_ATTRIBUTE);
          if (attr === "true") return false;
          // Also hide agentation toolbar
          if (node.getAttribute?.("data-feedback-toolbar") !== null) return false;
          return true;
        },
      });

      if (!dataUrl || dataUrl === "data:,") return null;
      return dataUrl;
    } finally {
      hidden.forEach(({ el, prev }) => {
        el.style.visibility = prev;
      });
    }
  } catch (err) {
    console.warn("[UnifiedFeedback] Screenshot capture failed:", err);
    return null;
  }
}

function inferProjectId(pathname: string): number | null {
  const match = pathname.match(/^\/(\d+)(?:\/|$)/);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Map agentation severity → admin feedback severity */
function mapSeverity(
  sev: string | undefined,
): "low" | "medium" | "high" {
  if (sev === "blocking") return "high";
  if (sev === "important") return "medium";
  return "low";
}

/** Map agentation intent → admin feedback request type */
function mapRequestType(
  intent: string | undefined,
): "bug" | "change_request" | "copy" | "question" {
  if (intent === "fix") return "bug";
  if (intent === "question") return "question";
  return "change_request";
}

// ---------------------------------------------------------------------------
// Screenshot upload toast — shown briefly after each annotation
// ---------------------------------------------------------------------------

type ScreenshotToastProps = {
  screenshotUrl: string | null;
  onUpload: (file: File) => void;
  onRetake: () => void;
  onDismiss: () => void;
  onEscalate: () => void;
  isCapturing: boolean;
};

function ScreenshotToast({
  screenshotUrl,
  onUpload,
  onRetake,
  onDismiss,
  onEscalate,
  isCapturing,
}: ScreenshotToastProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="fixed bottom-20 right-5 z-[10000] flex flex-col gap-2 rounded-lg border border-border bg-card px-4 py-3 shadow-sm animate-in slide-in-from-right-5"
      {...{ [ADMIN_FEEDBACK_OVERLAY_ATTRIBUTE]: "true" }}
    >
      <div className="flex items-center gap-3">
        {isCapturing ? (
          <p className="text-sm text-muted-foreground">Capturing screenshot...</p>
        ) : screenshotUrl ? (
          <>
            <img
              src={screenshotUrl}
              alt="Captured"
              className="h-10 w-14 rounded border border-border object-cover"
            />
            <p className="text-sm text-foreground">Annotation sent to MCP</p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={onRetake}>
                <Camera className="h-3.5 w-3.5" />
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpload(file);
                  e.target.value = "";
                }}
              />
              <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Annotation sent to MCP (no screenshot)</p>
            <Button variant="ghost" size="sm" onClick={onRetake}>
              <Camera className="h-3.5 w-3.5 mr-1" />
              Capture
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
                e.target.value = "";
              }}
            />
            <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5 mr-1" />
              Upload
            </Button>
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>

      {/* Escalate to client feedback inbox */}
      <Button
        variant="outline"
        size="sm"
        onClick={onEscalate}
        className="w-full text-xs"
      >
        <ExternalLink className="mr-1.5 h-3 w-3" />
        Escalate to Feedback Inbox
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main widget
// ---------------------------------------------------------------------------

export function UnifiedFeedbackWidget() {
  const pathname = usePathname();

  // Screenshot state for the current annotation being enriched
  const [pendingAnnotation, setPendingAnnotation] = useState<AgentationAnnotation | null>(null);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss screenshot toast after 10s — does NOT submit to inbox
  // (annotations only go to MCP by default; user must explicitly escalate)
  useEffect(() => {
    if (pendingAnnotation && !isCapturing) {
      dismissTimerRef.current = setTimeout(() => {
        // Just dismiss — annotation is already in MCP
        setPendingAnnotation(null);
        setScreenshotDataUrl(null);
      }, 10000);

      return () => {
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      };
    }
  }, [pendingAnnotation, isCapturing]);

  /** Escalate annotation to the feedback inbox (admin feedback backend + GitHub) */
  const escalateToInbox = useCallback(
    async (annotation: AgentationAnnotation, screenshot: string | null) => {
      try {
        const response = await fetch("/api/admin/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: annotation.comment?.slice(0, 100) || "Agentation annotation",
            comment: annotation.comment || "No description",
            requestType: mapRequestType(annotation.intent),
            severity: mapSeverity(annotation.severity),
            pageUrl: window.location.href,
            pagePath: pathname,
            pageTitle: document.title || null,
            projectId: inferProjectId(pathname),
            screenshotDataUrl: screenshot,
            target: {
              id: null,
              selector: annotation.elementPath || "body",
              text: annotation.selectedText || annotation.comment?.slice(0, 160) || null,
              tagName: annotation.element?.split(" ").pop()?.replace(/[<>"]/g, "") || null,
              domPath: annotation.elementPath || null,
              rect: annotation.boundingBox
                ? {
                    x: annotation.boundingBox.x,
                    y: annotation.boundingBox.y,
                    width: annotation.boundingBox.width,
                    height: annotation.boundingBox.height,
                  }
                : null,
            },
            metadata: {
              pathname,
              userAgent: navigator.userAgent,
              source: "agentation-escalated",
              agentationId: annotation.id,
              intent: annotation.intent,
              kind: annotation.kind,
              reactComponents: annotation.reactComponents,
              cssClasses: annotation.cssClasses,
            },
          }),
        });

        if (response.ok) {
          toast.success("Escalated to feedback inbox + GitHub issue created");
          console.log("[UnifiedFeedback] Annotation escalated to feedback inbox");
        } else {
          toast.error("Failed to escalate — check console");
          console.error("[UnifiedFeedback] Escalation failed:", await response.text());
        }
      } catch (err) {
        toast.error("Failed to escalate annotation");
        console.error("[UnifiedFeedback] Escalation error:", err);
      }
    },
    [pathname],
  );

  const handleAnnotationAdd = useCallback(
    async (annotation: AgentationAnnotation) => {
      // Capture screenshot for all dev users (not just admins) — useful for escalation
      setPendingAnnotation(annotation);
      setIsCapturing(true);

      const screenshot = await captureViewportScreenshot();

      setScreenshotDataUrl(screenshot);
      setIsCapturing(false);
    },
    [],
  );

  const handleRetake = useCallback(async () => {
    if (!pendingAnnotation) return;
    setIsCapturing(true);
    const screenshot = await captureViewportScreenshot();
    setScreenshotDataUrl(screenshot);
    setIsCapturing(false);
  }, [pendingAnnotation]);

  const handleUpload = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setScreenshotDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDismiss = useCallback(() => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    // Just dismiss — annotation is already in MCP, no inbox submission
    setPendingAnnotation(null);
    setScreenshotDataUrl(null);
  }, []);

  const handleEscalate = useCallback(() => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    if (pendingAnnotation) {
      escalateToInbox(pendingAnnotation, screenshotDataUrl);
    }
    setPendingAnnotation(null);
    setScreenshotDataUrl(null);
  }, [pendingAnnotation, screenshotDataUrl, escalateToInbox]);

  return (
    <>
      <Agentation
        endpoint={MCP_ENDPOINT}
        onAnnotationAdd={handleAnnotationAdd as (annotation: unknown) => void}
      />

      {/* Screenshot toast — annotation is already in MCP; option to escalate to inbox */}
      {pendingAnnotation && (
        <ScreenshotToast
          screenshotUrl={screenshotDataUrl}
          onUpload={handleUpload}
          onRetake={handleRetake}
          onDismiss={handleDismiss}
          onEscalate={handleEscalate}
          isCapturing={isCapturing}
        />
      )}
    </>
  );
}
