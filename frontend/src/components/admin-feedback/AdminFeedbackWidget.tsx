"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Camera,
  ImagePlus,
  ListFilter,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  ADMIN_FEEDBACK_OVERLAY_ATTRIBUTE,
  FEEDBACK_LAUNCHER_POSITION_CLASS,
  OPEN_ADMIN_FEEDBACK_COMPOSER_EVENT,
  type AdminFeedbackRequestType,
  feedbackTargetProps,
} from "@/lib/admin-feedback/constants";
import {
  buildFeedbackTargetSnapshot,
  getSelectableElement,
  type FeedbackTargetSnapshot,
} from "@/lib/admin-feedback/targeting";
import { captureTargetScreenshot } from "@/lib/admin-feedback/screenshot";
import { useCurrentUserProfile } from "@/hooks/use-current-user-profile";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Modal as Dialog,
  ModalContent as DialogContent,
  ModalDescription as DialogDescription,
  ModalFooter as DialogFooter,
  ModalHeader as DialogHeader,
  ModalTitle as DialogTitle,
} from "@/components/ui/unified-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type FeedbackType = "Issue" | "Wishlist" | "General thought";
type PriorityLevel = "high" | "medium" | "low";

type SubmissionState = {
  title: string;
  comment: string;
  feedbackType: FeedbackType;
  priority: PriorityLevel;
  affectedTool: string;
};

type RectState = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const FEEDBACK_TYPES = ["Issue", "Wishlist", "General thought"] as const;
const PRIORITY_LEVELS: { value: PriorityLevel; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const TOOL_LIST = [
  "Budget",
  "Change Events",
  "Change Management",
  "Commitments",
  "Direct Costs",
  "Drawings",
  "Estimates",
  "Invoicing",
  "Prime Contracts",
  "RFIs",
  "Submittals",
  "Directory",
  "Schedule",
  "AI Assistant",
  "Portfolio",
  "Other",
] as const;

const TOOL_PATH_MAP: [string, string][] = [
  ["/budget", "Budget"],
  ["/change-events", "Change Events"],
  ["/change-management", "Change Management"],
  ["/commitments", "Commitments"],
  ["/direct-costs", "Direct Costs"],
  ["/drawings", "Drawings"],
  ["/estimates", "Estimates"],
  ["/invoicing", "Invoicing"],
  ["/prime-contracts", "Prime Contracts"],
  ["/rfis", "RFIs"],
  ["/submittals", "Submittals"],
  ["/directory", "Directory"],
  ["/schedule", "Schedule"],
  ["/ai-assistant", "AI Assistant"],
  ["/portfolio", "Portfolio"],
];

function inferToolFromPath(pathname: string): string {
  for (const [segment, name] of TOOL_PATH_MAP) {
    if (pathname.includes(segment)) return name;
  }
  return "";
}

function getDefaultForm(pathname: string): SubmissionState {
  return {
    title: "",
    comment: "",
    feedbackType: "Issue",
    priority: "medium",
    affectedTool: inferToolFromPath(pathname),
  };
}

function mapFeedbackTypeToRequestType(
  feedbackType: FeedbackType,
): AdminFeedbackRequestType {
  if (feedbackType === "Issue") {
    return "bug";
  }

  if (feedbackType === "Wishlist") {
    return "feature_request";
  }

  return "question";
}

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

function getBestComposerTarget() {
  const candidates = [
    "[role='dialog']:not([data-admin-feedback-root='true'])",
    "[data-feedback-id='app.main-content']",
    "main",
  ];

  for (const selector of candidates) {
    const target = document.querySelector(selector);
    if (target instanceof HTMLElement && target.offsetParent !== null) {
      return target;
    }
  }

  return document.body;
}

export function AdminFeedbackWidget({ showLauncher = true }: { showLauncher?: boolean }) {
  const pathname = usePathname()!;
  const { profile, isLoading } = useCurrentUserProfile();
  const isMobile = useIsMobile();
  const pagePath = pathname ?? "/";
  const [isSelecting, setIsSelecting] = useState(false);
  const [hoveredTarget, setHoveredTarget] =
    useState<FeedbackTargetSnapshot | null>(null);
  const [selectedTarget, setSelectedTarget] =
    useState<FeedbackTargetSnapshot | null>(null);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<SubmissionState>(() => getDefaultForm(pagePath));
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(
    null,
  );
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const frameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
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
    },
    [],
  );

  const hoveredRect = hoveredTarget ? getRectState(hoveredTarget) : null;
  const isImmersiveChatRoute =
    pagePath.startsWith("/ai-assistant") || pagePath.startsWith("/ai-avatar");

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
      .catch((err) => {
        console.error("[FeedbackWidget] Screenshot capture failed:", err);
        if (!isCancelled) {
          setScreenshotDataUrl(null);
          toast.error("Auto-capture failed — upload a screenshot instead.");
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

  useEffect(() => {
    const openComposer = () => {
      const target = getBestComposerTarget();

      if (!(target instanceof HTMLElement)) {
        toast.error("Unable to find page context for feedback.");
        return;
      }

      const snapshot = buildFeedbackTargetSnapshot(target);
      setIsSelecting(false);
      setSelectedElement(target);
      setSelectedTarget(snapshot);
      setHoveredTarget(snapshot);
      setScreenshotDataUrl(null);
      setForm(getDefaultForm(pagePath));
      setDialogOpen(true);
    };

    window.addEventListener(OPEN_ADMIN_FEEDBACK_COMPOSER_EVENT, openComposer);
    return () =>
      window.removeEventListener(
        OPEN_ADMIN_FEEDBACK_COMPOSER_EVENT,
        openComposer,
      );
  }, [pagePath]);

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

  if (isLoading || isImmersiveChatRoute) {
    return null;
  }

  const resetComposer = () => {
    setDialogOpen(false);
    setSelectedElement(null);
    setSelectedTarget(null);
    setHoveredTarget(null);
    setScreenshotDataUrl(null);
    setForm(getDefaultForm(pagePath));
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
        const payload = await apiFetch<{
          githubIssue?: { url?: string };
          githubWarning?: unknown;
        }>("/api/admin/feedback", {
          method: "POST",
          body: JSON.stringify({
            title: form.title.trim() || undefined,
            comment: form.comment.trim(),
            requestType: mapFeedbackTypeToRequestType(form.feedbackType),
            severity: form.feedbackType === "Issue" ? form.priority : "medium",
            pageUrl: window.location.href,
            pagePath,
            pageTitle: document.title || null,
            projectId: inferProjectId(pagePath),
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
              pathname: pagePath,
              feedbackType: form.feedbackType,
              priority: form.feedbackType === "Issue" ? form.priority : undefined,
              affectedTool: form.affectedTool || undefined,
              submitterName: profile?.fullName,
              submitterEmail: profile?.email,
              source: "admin-feedback-widget",
              userAgent: navigator.userAgent,
              viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
              },
              selectedText: selectedTarget.text,
              selectedSelector: selectedTarget.selector,
              selectedDomPath: selectedTarget.domPath,
            },
          }),
        });

        if (payload?.githubIssue?.url) {
          toast.success("Feedback submitted and GitHub issue created.");
        } else if (payload?.githubWarning) {
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

      {showLauncher && !isMobile && (
        <div
          {...feedbackTargetProps("admin.feedback-widget")}
          {...{ [ADMIN_FEEDBACK_OVERLAY_ATTRIBUTE]: "true" }}
          className={cn(
            FEEDBACK_LAUNCHER_POSITION_CLASS,
            "flex items-center gap-2 z-[9999]",
          )}
        >
          {isSelecting && (
            <div className="hidden rounded-full bg-foreground px-3 py-1.5 text-xs text-background shadow-sm md:block">
              Click an element · Esc to cancel
            </div>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleSelectMode}
            className={cn(
              "h-12 w-12 rounded-full shadow-sm",
              isSelecting
                ? "bg-foreground text-background hover:bg-foreground/90 border-foreground"
                : "bg-background text-foreground",
            )}
            aria-label={isSelecting ? "Cancel feedback" : "Feedback mode"}
          >
            {isSelecting ? (
              <Sparkles className="h-5 w-5" />
            ) : (
              <ListFilter className="h-5 w-5" />
            )}
          </Button>
        </div>
      )}

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
          size="form"
          className="max-h-[calc(100svh-2rem)] overflow-y-auto p-8"
          {...{ [ADMIN_FEEDBACK_OVERLAY_ATTRIBUTE]: "true" }}
        >
          <DialogHeader className="pb-4">
            <DialogTitle>Submit Admin Feedback</DialogTitle>
            <DialogDescription>
              Describe what should change. The app will attach the page context
              and selected element automatically.
            </DialogDescription>
          </DialogHeader>

          {selectedTarget && (
            <div className="space-y-8">
              <div className="flex gap-3">
                <div className="flex-1 space-y-3">
                  <Label>Type</Label>
                  <Select
                    value={form.feedbackType}
                    onValueChange={(feedbackType) =>
                      setForm((current) => ({
                        ...current,
                        feedbackType: feedbackType as FeedbackType,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {FEEDBACK_TYPES.map((feedbackType) => (
                        <SelectItem key={feedbackType} value={feedbackType}>
                          {feedbackType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {form.feedbackType === "Issue" && (
                  <div className="flex-1 space-y-3">
                    <Label>Priority</Label>
                    <Select
                      value={form.priority}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          priority: value as PriorityLevel,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_LEVELS.map(({ value, label }) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex-1 space-y-3">
                  <Label htmlFor="feedback-tool">Tool</Label>
                  <Select
                    value={form.affectedTool}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        affectedTool: value,
                      }))
                    }
                  >
                    <SelectTrigger id="feedback-tool">
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      {TOOL_LIST.map((tool) => (
                        <SelectItem key={tool} value={tool}>
                          {tool}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
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

              <div className="space-y-3">
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
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => fileInputRef.current?.click()}
                          aria-label="Upload screenshot"
                        >
                          <Upload className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Upload screenshot</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={refreshScreenshot}
                          disabled={isCapturingScreenshot}
                          aria-label={isCapturingScreenshot ? "Capturing" : screenshotDataUrl ? "Retake screenshot" : "Capture screenshot"}
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${isCapturingScreenshot ? "animate-spin" : ""}`} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isCapturingScreenshot ? "Capturing…" : screenshotDataUrl ? "Retake screenshot" : "Capture screenshot"}
                      </TooltipContent>
                    </Tooltip>
                    {screenshotDataUrl && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setScreenshotDataUrl(null)}
                            aria-label="Remove screenshot"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Remove screenshot</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>

                {screenshotDataUrl && (
                  <div className="w-full max-w-sm overflow-hidden rounded shadow-sm">
                    <div className="aspect-video">
                      { }
                      <img
                        src={screenshotDataUrl}
                        alt="Selected area screenshot"
                        className="h-full w-full object-contain object-top"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="link" onClick={resetComposer}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
