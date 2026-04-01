"use client";

/**
 * ClientFeedbackWidget — Production-safe feedback widget for all authenticated users.
 *
 * This is SEPARATE from the dev Agentation workflow. Client feedback goes to:
 *   POST /api/feedback → admin_feedback_items (source: "client") → GitHub issue → feedback inbox
 *
 * Features:
 * - Floating action button (FAB) in bottom-right corner
 * - Dialog form with title, description, type, severity
 * - Automatic viewport screenshot capture via html-to-image
 * - Screenshot retake and file upload
 * - Works in production for any authenticated user
 */

import { useCallback, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { usePathname } from "next/navigation";
import {
  Bug,
  Camera,
  HelpCircle,
  Lightbulb,
  MessageSquarePlus,
  Pencil,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_FEEDBACK_OVERLAY_ATTRIBUTE } from "@/lib/admin-feedback/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FeedbackType = "bug" | "change_request" | "question" | "copy";
type FeedbackSeverity = "low" | "medium" | "high";

const FEEDBACK_TYPES: { value: FeedbackType; label: string; icon: typeof Bug; description: string }[] = [
  { value: "bug", label: "Bug", icon: Bug, description: "Something isn't working" },
  { value: "change_request", label: "Suggestion", icon: Lightbulb, description: "An improvement or new feature" },
  { value: "question", label: "Question", icon: HelpCircle, description: "I need help with something" },
  { value: "copy", label: "Copy Edit", icon: Pencil, description: "Text or content change" },
];

const SEVERITY_OPTIONS: { value: FeedbackSeverity; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "bg-muted text-muted-foreground" },
  { value: "medium", label: "Medium", color: "bg-primary/10 text-primary" },
  { value: "high", label: "High", color: "bg-destructive/10 text-destructive" },
];

// ---------------------------------------------------------------------------
// Screenshot capture
// ---------------------------------------------------------------------------

async function captureViewportScreenshot(): Promise<string | null> {
  try {
    const captureRoot = document.body;

    // Hide overlays during capture
    const overlays = document.querySelectorAll(
      `[${ADMIN_FEEDBACK_OVERLAY_ATTRIBUTE}], [data-radix-dialog-overlay], [role="dialog"], [data-client-feedback-root]`,
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
        pixelRatio: 1,
        width: window.innerWidth,
        height: window.innerHeight,
        style: {
          transform: `translate(-${window.scrollX}px, -${window.scrollY}px)`,
        },
        filter: (node: HTMLElement) => {
          if (node.nodeType !== 1) return true;
          if (node.getAttribute?.("data-client-feedback-root") !== null) return false;
          if (node.getAttribute?.(ADMIN_FEEDBACK_OVERLAY_ATTRIBUTE) === "true") return false;
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
    console.warn("[ClientFeedback] Screenshot capture failed:", err);
    return null;
  }
}

function inferProjectId(pathname: string): number | null {
  const match = pathname.match(/^\/(\d+)(?:\/|$)/);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

// ---------------------------------------------------------------------------
// Main Widget
// ---------------------------------------------------------------------------

export function ClientFeedbackWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("bug");
  const [severity, setSeverity] = useState<FeedbackSeverity>("medium");
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check auth on first open
  const handleOpen = useCallback(async () => {
    if (isAuthenticated === null) {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const authed = !!data.user;
      setIsAuthenticated(authed);
      if (!authed) {
        toast.error("Please sign in to submit feedback.");
        return;
      }
    } else if (!isAuthenticated) {
      toast.error("Please sign in to submit feedback.");
      return;
    }

    // Auto-capture screenshot when opening
    setIsOpen(true);
    setIsCapturing(true);
    const screenshot = await captureViewportScreenshot();
    setScreenshotDataUrl(screenshot);
    setIsCapturing(false);
  }, [isAuthenticated]);

  const handleRetake = useCallback(async () => {
    // Temporarily hide dialog for clean screenshot
    setIsCapturing(true);
    // Small delay so the dialog hide takes effect
    await new Promise((r) => setTimeout(r, 100));
    const screenshot = await captureViewportScreenshot();
    setScreenshotDataUrl(screenshot);
    setIsCapturing(false);
  }, []);

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

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setFeedbackType("bug");
    setSeverity("medium");
    setScreenshotDataUrl(null);
    setIsCapturing(false);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    resetForm();
  }, [resetForm]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in the title and description.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          type: feedbackType,
          severity,
          pageUrl: window.location.href,
          pagePath: pathname,
          pageTitle: document.title || null,
          projectId: inferProjectId(pathname),
          screenshotDataUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit feedback");
      }

      toast.success("Feedback submitted! Thank you for helping us improve.", {
        duration: 4000,
      });
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  }, [title, description, feedbackType, severity, pathname, screenshotDataUrl, handleClose]);

  return (
    <>
      {/* Floating Action Button */}
      <div data-client-feedback-root>
        <Button
          onClick={handleOpen}
          size="icon"
          className="fixed bottom-6 right-6 z-[9999] h-12 w-12 rounded-full shadow-sm"
          aria-label="Submit feedback"
        >
          <MessageSquarePlus className="h-5 w-5" />
        </Button>
      </div>

      {/* Feedback Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent
          className="sm:max-w-lg"
          data-client-feedback-root
        >
          <DialogHeader>
            <DialogTitle>Submit Feedback</DialogTitle>
            <DialogDescription>
              Help us improve by reporting bugs, suggesting features, or asking questions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Feedback Type */}
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {FEEDBACK_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = feedbackType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFeedbackType(type.value)}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="feedback-title">Title</Label>
              <Input
                id="feedback-title"
                placeholder="Brief summary of the issue..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="feedback-description">Description</Label>
              <Textarea
                id="feedback-description"
                placeholder="What happened? What did you expect to happen?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={5000}
              />
            </div>

            {/* Severity */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <div className="flex gap-2">
                {SEVERITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSeverity(opt.value)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      severity === opt.value
                        ? opt.color + " ring-1 ring-current"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Screenshot */}
            <div className="space-y-2">
              <Label>Screenshot</Label>
              {isCapturing ? (
                <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-border bg-muted/50">
                  <p className="text-sm text-muted-foreground">Capturing screenshot...</p>
                </div>
              ) : screenshotDataUrl ? (
                <div className="relative">
                  <img
                    src={screenshotDataUrl}
                    alt="Screenshot preview"
                    className="h-32 w-full rounded-md border border-border object-cover object-top"
                  />
                  <div className="absolute bottom-2 right-2 flex gap-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleRetake}
                      className="h-7 text-xs"
                    >
                      <Camera className="mr-1 h-3 w-3" />
                      Retake
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(file);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-7 text-xs"
                    >
                      <Upload className="mr-1 h-3 w-3" />
                      Replace
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setScreenshotDataUrl(null)}
                      className="h-7 text-xs"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex h-24 items-center justify-center gap-3 rounded-md border border-dashed border-border bg-muted/50">
                  <Button variant="outline" size="sm" onClick={handleRetake}>
                    <Camera className="mr-1.5 h-3.5 w-3.5" />
                    Capture Screenshot
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    Upload Image
                  </Button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !title.trim() || !description.trim()}
            >
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
