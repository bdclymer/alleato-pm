"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { usePathname } from "next/navigation";
import { Camera, ImagePlus, ListFilter, RefreshCw, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  ADMIN_FEEDBACK_OVERLAY_ATTRIBUTE,
  feedbackTargetProps,
} from "@/lib/admin-feedback/constants";
import {
  buildFeedbackTargetSnapshot,
  getSelectableElement,
  type FeedbackTargetSnapshot,
} from "@/lib/admin-feedback/targeting";
import { useCurrentUserProfile } from "@/hooks/use-current-user-profile";
import { cn } from "@/lib/utils";
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

type SubmissionState = {
  title: string;
  comment: string;
};

type RectState = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const DEFAULT_FORM: SubmissionState = {
  title: "",
  comment: "",
};

function getRectState(target: FeedbackTargetSnapshot | null): RectState | null {
  if (!target) {
    return null;
  }

  return {
    left: target.pageX - window.scrollX,
    top: target.pageY - window.scrollY,
    width: target.width,
    height: target.height,
  };
}

function inferProjectId(pathname: string) {
  const match = pathname.match(/^\/(\d+)(?:\/|$)/);
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function captureTargetScreenshot(target: HTMLElement) {
  const rect = target.getBoundingClientRect();
  const pageX = rect.left + window.scrollX;
  const pageY = rect.top + window.scrollY;
  const padding = 32;
  const maxWidth = Math.min(window.innerWidth - 32, 980);
  const cropX = Math.max(0, pageX - padding);
  const cropY = Math.max(0, pageY - padding);
  const cropWidth = Math.min(
    Math.max(rect.width + padding * 2, 320),
    maxWidth,
  );
  const cropHeight = Math.max(rect.height + padding * 2, 220);

  // Hide overlays (dialog, feedback widget) during capture
  const overlays = document.querySelectorAll(
    `[${ADMIN_FEEDBACK_OVERLAY_ATTRIBUTE}], [data-radix-dialog-overlay], [role="dialog"]`,
  );
  const hidden: { el: HTMLElement; prev: string }[] = [];
  overlays.forEach((el) => {
    if (el instanceof HTMLElement) {
      hidden.push({ el, prev: el.style.visibility });
      el.style.visibility = "hidden";
    }
  });

  try {
    const canvas = await html2canvas(document.body, {
      backgroundColor: "#ffffff",
      scale: Math.min(window.devicePixelRatio || 1, 2),
      logging: false,
      useCORS: true,
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
    });

    return canvas.toDataURL("image/png");
  } finally {
    // Restore overlays
    hidden.forEach(({ el, prev }) => {
      el.style.visibility = prev;
    });
  }
}

export function AdminFeedbackWidget() {
  const pathname = usePathname();
  const { profile, isLoading } = useCurrentUserProfile();
  const [isSelecting, setIsSelecting] = useState(false);
  const [hoveredTarget, setHoveredTarget] = useState<FeedbackTargetSnapshot | null>(
    null,
  );
  const [selectedTarget, setSelectedTarget] =
    useState<FeedbackTargetSnapshot | null>(null);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<SubmissionState>(DEFAULT_FORM);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const frameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    // 10MB limit
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
    reader.onerror = () => {
      toast.error("Failed to read image file.");
    };
    reader.readAsDataURL(file);

    // Reset the input so the same file can be re-selected
    event.target.value = "";
  }, []);

  const isAdmin = profile?.isAdmin === true;
  const hoveredRect = hoveredTarget ? getRectState(hoveredTarget) : null;

  useEffect(() => {
    if (!isSelecting || dialogOpen) {
      return;
    }

    const onMouseMove = (event: MouseEvent) => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = window.requestAnimationFrame(() => {
        const element = getSelectableElement(
          document.elementFromPoint(event.clientX, event.clientY),
        );
        if (!element) {
          setHoveredTarget(null);
          return;
        }

        setHoveredTarget(buildFeedbackTargetSnapshot(element));
      });
    };

    const onClick = (event: MouseEvent) => {
      const element = getSelectableElement(
        document.elementFromPoint(event.clientX, event.clientY),
      );
      if (!element) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      setSelectedElement(element);
      setSelectedTarget(buildFeedbackTargetSnapshot(element));
      setHoveredTarget(buildFeedbackTargetSnapshot(element));
      setDialogOpen(true);
      setIsSelecting(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      setIsSelecting(false);
      setHoveredTarget(null);
    };

    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("mousemove", onMouseMove, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [dialogOpen, isSelecting]);

  useEffect(() => {
    if (!dialogOpen || !selectedElement) {
      return;
    }

    let isCancelled = false;

    setIsCapturingScreenshot(true);
    captureTargetScreenshot(selectedElement)
      .then((dataUrl) => {
        if (!isCancelled) {
          setScreenshotDataUrl(dataUrl);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setScreenshotDataUrl(null);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsCapturingScreenshot(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [dialogOpen, selectedElement]);

  // Set cursor to crosshair when selecting
  useEffect(() => {
    if (isSelecting) {
      document.body.style.cursor = "crosshair";
    } else {
      document.body.style.cursor = "";
    }
    return () => {
      document.body.style.cursor = "";
    };
  }, [isSelecting]);

  if (isLoading || !isAdmin) {
    return null;
  }

  const resetComposer = () => {
    setDialogOpen(false);
    setSelectedElement(null);
    setSelectedTarget(null);
    setHoveredTarget(null);
    setScreenshotDataUrl(null);
    setForm(DEFAULT_FORM);
  };

  const refreshScreenshot = () => {
    if (!selectedElement) {
      return;
    }

    setIsCapturingScreenshot(true);
    captureTargetScreenshot(selectedElement)
      .then((dataUrl) => {
        setScreenshotDataUrl(dataUrl);
      })
      .catch(() => {
        toast.error("Unable to capture screenshot for this selection.");
      })
      .finally(() => {
        setIsCapturingScreenshot(false);
      });
  };

  const toggleSelectMode = () => {
    setDialogOpen(false);
    setSelectedElement(null);
    setSelectedTarget(null);
    setScreenshotDataUrl(null);
    setIsSelecting((current) => !current);
  };

  const handleSubmit = () => {
    if (!selectedTarget) {
      return;
    }

    if (!form.comment.trim()) {
      toast.error("Add a comment before submitting feedback.");
      return;
    }

    setIsSubmitting(true);

    void (async () => {
      try {
        const response = await fetch("/api/admin/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: form.title.trim() || undefined,
            comment: form.comment.trim(),
            requestType: "change_request",
            severity: "medium",
            pageUrl: window.location.href,
            pagePath: pathname,
            pageTitle: document.title || null,
            projectId: inferProjectId(pathname),
            screenshotDataUrl,
            target: {
              id: selectedTarget.targetId,
              selector: selectedTarget.selector,
              text: selectedTarget.text,
              tagName: selectedTarget.tagName,
              domPath: selectedTarget.domPath,
              rect: {
                x: selectedTarget.pageX,
                y: selectedTarget.pageY,
                width: selectedTarget.width,
                height: selectedTarget.height,
              },
            },
            metadata: {
              pathname,
              userAgent: navigator.userAgent,
            },
          }),
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "Feedback submission failed");
        }

        if (payload.githubIssue?.url) {
          toast.success("Feedback submitted and GitHub issue created.");
        } else if (payload.githubWarning) {
          toast.success(
            "Feedback saved, but GitHub issue creation needs configuration.",
          );
        } else {
          toast.success("Feedback submitted.");
        }

        resetComposer();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Feedback submission failed";
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  return (
    <>
      {hoveredRect && isSelecting && (
        <div
          className="pointer-events-none fixed z-[9998] rounded-md border-2 border-primary bg-primary/10 ring-1 ring-primary/30"
          style={{
            left: hoveredRect.left,
            top: hoveredRect.top,
            width: hoveredRect.width,
            height: hoveredRect.height,
          }}
        />
      )}

      <div
        {...feedbackTargetProps("admin.feedback-widget")}
        {...{ [ADMIN_FEEDBACK_OVERLAY_ATTRIBUTE]: "true" }}
        className="fixed bottom-5 right-5 z-[9999] flex items-center gap-2"
      >
        {isSelecting && (
          <div className="hidden rounded-full bg-foreground px-3 py-1.5 text-xs text-background shadow-sm md:block">
            Click an element · Esc to cancel
          </div>
        )}
        {/* eslint-disable-next-line design-system/no-design-violations -- floating action button with custom shape */}
        <button
          type="button"
          onClick={toggleSelectMode}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full shadow-sm transition-all",
            isSelecting
              ? "bg-foreground text-background hover:bg-foreground/90"
              : "bg-background text-foreground border border-border hover:bg-muted",
          )}
          aria-label={isSelecting ? "Cancel feedback" : "Feedback mode"}
        >
          {isSelecting ? (
            <Sparkles className="h-5 w-5" />
          ) : (
            <ListFilter className="h-5 w-5" />
          )}
        </button>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetComposer();
          }
          setDialogOpen(open);
        }}
      >
        <DialogContent
          className="max-w-xl gap-0 overflow-hidden p-0"
          {...{ [ADMIN_FEEDBACK_OVERLAY_ATTRIBUTE]: "true" }}
        >
          <DialogHeader className="border-b border-border px-6 py-5">
            <DialogTitle>Submit Admin Feedback</DialogTitle>
            <DialogDescription>
              Describe what should change. The app will attach the page context and selected element automatically.
            </DialogDescription>
          </DialogHeader>

          {selectedTarget && (
            <div className="space-y-6 px-6 py-5">
              <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                <p className="text-sm font-medium text-foreground">
                  {selectedTarget.text || "Selected area"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Feedback will be attached to this part of the page automatically.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback-title">Title</Label>
                <Input
                  id="feedback-title"
                  placeholder="Optional"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback-comment">Description</Label>
                <Textarea
                  id="feedback-comment"
                  rows={7}
                  placeholder="Describe what should change."
                  value={form.comment}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      comment: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label>Screenshot</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Optional. Upload an image or capture the selected area.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload />
                      Upload
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={refreshScreenshot}
                      disabled={isCapturingScreenshot}
                    >
                      {isCapturingScreenshot ? (
                        <>
                          <RefreshCw className="animate-spin" />
                          Capturing
                        </>
                      ) : screenshotDataUrl ? (
                        <>
                          <RefreshCw />
                          Retake
                        </>
                      ) : (
                        <>
                          <Camera />
                          Capture
                        </>
                      )}
                    </Button>
                    {screenshotDataUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setScreenshotDataUrl(null)}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
                  {screenshotDataUrl ? (
                    <img
                      src={screenshotDataUrl}
                      alt="Selected area screenshot"
                      className="h-56 w-full object-cover object-top"
                    />
                  ) : (
                    <div
                      className="flex h-56 cursor-pointer flex-col items-center justify-center gap-3 px-6 text-center transition-colors hover:bg-muted/40"
                      onClick={() => fileInputRef.current?.click()}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm">
                        <Upload className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          Click to upload a screenshot
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Or use the Capture button to grab the selected area.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-border px-6 py-4">
            <Button type="button" variant="outline" onClick={resetComposer}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
