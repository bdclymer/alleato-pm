"use client";

import * as React from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  Lightbulb,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  DEFAULT_ALLEATO_AI_PROFILE_ID,
  findAlleatoAiProfile,
  type AlleatoAiUserProfile,
} from "@/config/aiPersonalization";
import {
  alleatoAiPromptChips,
  buildAlleatoAiActions,
  buildAlleatoAiScriptedResponse,
  buildAlleatoAiWelcome,
  OPEN_ALLEATO_AI_FEEDBACK_EVENT,
  type AlleatoAiAction,
} from "@/lib/alleato-ai-onboarding";
import { useCurrentUserProfile } from "@/hooks/use-current-user-profile";
import { apiFetch } from "@/lib/api-client";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const ONBOARDING_DISMISSED_KEY = "alleato-ai-onboarding-dismissed-profile";
const SELECTED_PROFILE_KEY = "alleato-ai-demo-profile";

type FeedbackType = "Issue" | "Wishlist" | "General thought";
type FeedbackPriority = "Low" | "Medium" | "High";

type FeedbackFormState = {
  type: FeedbackType;
  priority: FeedbackPriority;
  description: string;
  expectedOutcome: string;
};

const DEFAULT_FEEDBACK_FORM: FeedbackFormState = {
  type: "Issue",
  priority: "Medium",
  description: "",
  expectedOutcome: "",
};

export function AlleatoAiOnboarding() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const { profile: currentUserProfile } = useCurrentUserProfile({
    enabled: !pathname.startsWith("/auth"),
  });

  const [selectedProfileId, setSelectedProfileId] = React.useState(
    DEFAULT_ALLEATO_AI_PROFILE_ID,
  );
  const [welcomeOpen, setWelcomeOpen] = React.useState(false);
  const [assistantOpen, setAssistantOpen] = React.useState(false);
  const [feedbackOpen, setFeedbackOpen] = React.useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = React.useState(false);
  const [feedbackForm, setFeedbackForm] =
    React.useState<FeedbackFormState>(DEFAULT_FEEDBACK_FORM);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = React.useState(false);
  const [assistantResponse, setAssistantResponse] = React.useState("");
  const [chatInput, setChatInput] = React.useState("");

  React.useEffect(() => {
    const queryProfile = searchParams.get("aiProfile");
    const storedProfile =
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(SELECTED_PROFILE_KEY);
    const nextProfile = queryProfile ?? storedProfile ?? DEFAULT_ALLEATO_AI_PROFILE_ID;

    setSelectedProfileId(nextProfile);
    if (queryProfile) {
      window.localStorage.setItem(SELECTED_PROFILE_KEY, queryProfile);
    }
  }, [searchParams]);

  const personalizationProfile = React.useMemo(
    () =>
      findAlleatoAiProfile({
        profileId: selectedProfileId,
        email: currentUserProfile?.email,
        displayName: currentUserProfile?.fullName,
      }),
    [currentUserProfile?.email, currentUserProfile?.fullName, selectedProfileId],
  );

  const welcomeMessage = React.useMemo(
    () => buildAlleatoAiWelcome(personalizationProfile),
    [personalizationProfile],
  );
  const actions = React.useMemo(
    () => buildAlleatoAiActions(personalizationProfile),
    [personalizationProfile],
  );

  React.useEffect(() => {
    if (pathname.startsWith("/auth")) {
      return;
    }

    const dismissedForProfile = window.localStorage.getItem(
      ONBOARDING_DISMISSED_KEY,
    );
    if (dismissedForProfile !== personalizationProfile.userId) {
      setWelcomeOpen(true);
      setAssistantOpen(true);
    }
  }, [pathname, personalizationProfile.userId]);

  React.useEffect(() => {
    const openFeedback = () => {
      setFeedbackSubmitted(false);
      setFeedbackForm(DEFAULT_FEEDBACK_FORM);
      setFeedbackOpen(true);
      setAssistantOpen(true);
    };

    window.addEventListener(OPEN_ALLEATO_AI_FEEDBACK_EVENT, openFeedback);
    return () =>
      window.removeEventListener(OPEN_ALLEATO_AI_FEEDBACK_EVENT, openFeedback);
  }, []);

  if (pathname.startsWith("/auth")) {
    return null;
  }

  const dismissWelcome = () => {
    window.localStorage.setItem(
      ONBOARDING_DISMISSED_KEY,
      personalizationProfile.userId,
    );
    setWelcomeOpen(false);
    setAssistantOpen(false);
  };

  const restartWelcome = () => {
    window.localStorage.removeItem(ONBOARDING_DISMISSED_KEY);
    setWelcomeOpen(true);
    setAssistantOpen(true);
  };

  const handleAction = (action: AlleatoAiAction) => {
    if (action.id === "feedback") {
      setFeedbackSubmitted(false);
      setFeedbackForm(DEFAULT_FEEDBACK_FORM);
      setFeedbackOpen(true);
      return;
    }

    if (action.id === "explore") {
      dismissWelcome();
      return;
    }

    dismissWelcome();
    if (action.href) {
      router.push(action.href);
    }
  };

  const submitFeedback = () => {
    const trimmedDescription = feedbackForm.description.trim();
    if (!trimmedDescription) {
      toast.error("Add a short note before submitting feedback.");
      return;
    }

    setIsSubmittingFeedback(true);

    void (async () => {
      try {
        const expectedOutcome = feedbackForm.expectedOutcome.trim();
        const comment = [
          trimmedDescription,
          expectedOutcome
            ? `\nExpected or wished outcome:\n${expectedOutcome}`
            : "",
        ].join("");

        const payload = await apiFetch<{
          feedbackId?: string;
          githubIssue?: { url?: string } | null;
          githubWarning?: string | null;
        }>("/api/admin/feedback", {
          method: "POST",
          body: JSON.stringify({
            title: `${feedbackForm.type}: ${trimmedDescription.slice(0, 90)}`,
            comment,
            requestType: mapFeedbackTypeToRequestType(feedbackForm.type),
            severity: feedbackForm.priority.toLowerCase(),
            pageUrl: window.location.href,
            pagePath: pathname || "/",
            pageTitle: document.title || null,
            projectId: inferProjectId(pathname),
            screenshotDataUrl: null,
            target: {
              id: "alleato-ai-feedback",
              selector: "[data-feedback-id='app.main-content'], main, body",
              text: feedbackForm.type,
              tagName: "main",
              domPath: pathname || "/",
              rect: null,
            },
            metadata: {
              source: "alleato-ai-onboarding",
              feedbackType: feedbackForm.type,
              priority: feedbackForm.priority,
              profileId: personalizationProfile.userId,
              profileName: personalizationProfile.displayName,
              expectedOutcome,
              userAgent: navigator.userAgent,
            },
          }),
        });

        if (payload.githubIssue?.url) {
          toast.success("Feedback submitted and GitHub issue created.");
        } else if (payload.githubWarning) {
          toast.success("Feedback saved for review.");
        } else {
          toast.success("Feedback submitted.");
        }

        setFeedbackSubmitted(true);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Feedback submission failed";
        toast.error(message);
      } finally {
        setIsSubmittingFeedback(false);
      }
    })();
  };

  const askScriptedPrompt = (prompt: string) => {
    if (/feedback/i.test(prompt)) {
      setFeedbackSubmitted(false);
      setFeedbackForm({ ...DEFAULT_FEEDBACK_FORM, type: "General thought" });
      setFeedbackOpen(true);
      return;
    }

    setAssistantResponse(
      buildAlleatoAiScriptedResponse(personalizationProfile, prompt, pathname),
    );
    setAssistantOpen(true);
  };

  const handleComposerSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = chatInput.trim();
    if (!prompt) {
      return;
    }

    window.localStorage.setItem(
      ONBOARDING_DISMISSED_KEY,
      personalizationProfile.userId,
    );
    setWelcomeOpen(false);
    askScriptedPrompt(prompt);
    setChatInput("");
  };

  return (
    <>
      <div className="fixed bottom-5 right-4 z-40 flex flex-col items-end gap-3 sm:right-5">
        {assistantOpen && (
          <section
            className="max-h-[calc(100svh-10rem)] w-[calc(100vw-1.5rem)] max-w-md overflow-hidden rounded-3xl bg-background shadow-md"
            aria-label="Alleato AI assistant"
          >
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className="alleato-ai-mark-bg flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                  <Image
                    src="/favicon-light.png"
                    alt=""
                    width={22}
                    height={22}
                    className="h-5 w-5 rounded"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">Alleato AI</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {welcomeOpen
                      ? `Welcome, ${personalizationProfile.displayName}`
                      : `Demo guidance for ${personalizationProfile.displayName}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Share feedback"
                  onClick={() => {
                    setFeedbackSubmitted(false);
                    setFeedbackForm(DEFAULT_FEEDBACK_FORM);
                    setFeedbackOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Collapse Alleato AI"
                  onClick={() => setAssistantOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="max-h-[calc(100svh-15rem)] overflow-y-auto">
              {welcomeOpen ? (
                <div className="space-y-4 p-4">
                  <div className="rounded-2xl bg-muted/50 p-4 text-sm leading-6 text-foreground">
                    <p
                      role="heading"
                      aria-level={2}
                      className="mb-2 text-base font-semibold text-foreground"
                    >
                      {welcomeMessage.greeting}
                    </p>
                    <div className="space-y-3">
                      <WelcomeSection>{welcomeMessage.relevance}</WelcomeSection>
                      <WelcomeSection>{welcomeMessage.coCreation}</WelcomeSection>
                      <WelcomeSection>{welcomeMessage.feedbackGuidance}</WelcomeSection>
                      <WelcomeSection>{welcomeMessage.suggestedNextStep}</WelcomeSection>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-1">
                    {actions
                      .filter((action) => action.id !== "explore")
                      .map((action) => (
                      <Button
                        key={action.id}
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto justify-start p-0 text-left"
                        onClick={() => handleAction(action)}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>

                  <div className="flex flex-col items-start gap-1 pt-1">
                    {personalizationProfile.focusAreas.map((area) => (
                      <Button
                        key={area}
                        type="button"
                        variant="link"
                        size="xs"
                        onClick={() =>
                          setAssistantResponse(
                            `I will keep ${area.toLowerCase()} in mind as you explore this page.`,
                          )
                        }
                        className="h-auto p-0 text-xs text-muted-foreground"
                      >
                        {area}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 p-4">
                  <div className="rounded-2xl bg-muted/50 p-3 text-sm leading-6 text-foreground">
                    {assistantResponse ||
                      "I can help you choose where to start, explain the current page, or capture feedback as you explore. Responses in this testing build are scripted from your onboarding profile."}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {alleatoAiPromptChips.map((prompt) => (
                      <Button
                        key={prompt}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => askScriptedPrompt(prompt)}
                        className="h-auto min-h-9 justify-start rounded-full whitespace-normal px-3 py-1.5 text-left text-xs"
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={restartWelcome}>
                      Restart welcome
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={handleComposerSubmit}
              className="p-3"
            >
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-background p-2">
                <Input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Ask a question..."
                  variant="inline"
                  className="h-10 flex-1 px-2 focus-visible:ring-0"
                  aria-label="Ask Alleato AI"
                />
                <Button
                  type="submit"
                  size="icon-sm"
                  className="rounded-full"
                  aria-label="Send message"
                  disabled={!chatInput.trim()}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </section>
        )}

        <Button
          type="button"
          className={cn(
            "h-14 w-14 rounded-full p-0 shadow-sm",
            assistantOpen && "bg-foreground text-background hover:bg-foreground/90",
            !assistantOpen && "alleato-ai-mark-bg",
            isMobile && "h-12 w-12",
          )}
          onClick={() => setAssistantOpen((open) => !open)}
          aria-label={assistantOpen ? "Collapse Alleato AI" : "Open Alleato AI"}
        >
          {assistantOpen ? (
            <ChevronDown className="size-6" strokeWidth={2} />
          ) : (
            <Image
              src="/favicon-light.png"
              alt=""
              width={24}
              height={24}
              className="h-6 w-6 rounded"
            />
          )}
          <span className="sr-only">Alleato AI</span>
        </Button>
      </div>

      <FeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        form={feedbackForm}
        setForm={setFeedbackForm}
        submitted={feedbackSubmitted}
        onSubmit={submitFeedback}
        isSubmitting={isSubmittingFeedback}
        pageContext={pathname}
        profile={personalizationProfile}
      />
    </>
  );
}

function WelcomeSection({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-6 text-foreground/85">{children}</p>;
}

function inferProjectId(pathname: string) {
  const match = pathname.match(/^\/(\d+)(?:\/|$)/);
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapFeedbackTypeToRequestType(type: FeedbackType) {
  if (type === "Issue") {
    return "bug";
  }

  if (type === "Wishlist") {
    return "change_request";
  }

  return "question";
}

function FeedbackDialog({
  open,
  onOpenChange,
  form,
  setForm,
  submitted,
  onSubmit,
  isSubmitting,
  pageContext,
  profile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: FeedbackFormState;
  setForm: React.Dispatch<React.SetStateAction<FeedbackFormState>>;
  submitted: boolean;
  onSubmit: () => void;
  isSubmitting: boolean;
  pageContext: string;
  profile: AlleatoAiUserProfile;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
        {submitted ? (
          <div className="space-y-4 py-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <DialogHeader>
              <DialogTitle>Feedback captured</DialogTitle>
              <DialogDescription>
                Thanks, {profile.displayName}. Your note was submitted through
                the admin feedback workflow with this page context attached.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Share feedback with Alleato</DialogTitle>
              <DialogDescription>
                Send an issue, wishlist idea, or general thought. The current
                page is included automatically.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Feedback type</Label>
                <RadioGroup
                  value={form.type}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      type: value as FeedbackType,
                    }))
                  }
                  className="grid gap-2 sm:grid-cols-3"
                >
                  {(["Issue", "Wishlist", "General thought"] as const).map(
                    (type) => (
                      <Label
                        key={type}
                        className={cn(
                          "flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm",
                          form.type === type && "border-primary bg-primary/5",
                        )}
                      >
                        <RadioGroupItem value={type} />
                        {type === "Wishlist" && <Lightbulb className="h-3.5 w-3.5" />}
                        <span>{type}</span>
                      </Label>
                    ),
                  )}
                </RadioGroup>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
                <div className="space-y-2">
                  <Label>Current page/context</Label>
                  <div className="min-h-11 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    {pageContext || "/"}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        priority: value as FeedbackPriority,
                      }))
                    }
                  >
                    <SelectTrigger className="min-h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alleato-ai-feedback-description">Description</Label>
                <Textarea
                  id="alleato-ai-feedback-description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="What felt off, unclear, missing, or worth exploring?"
                  className="min-h-28"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="alleato-ai-feedback-expected">
                  What did you expect or wish would happen?
                </Label>
                <Textarea
                  id="alleato-ai-feedback-expected"
                  value={form.expectedOutcome}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      expectedOutcome: event.target.value,
                    }))
                  }
                  placeholder="Describe the ideal version if you were designing it."
                  className="min-h-20"
                />
              </div>

              <div className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                Screenshot attachment is ready as a future hook. For this test
                build, page context and your written note are captured.
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit feedback"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function openAlleatoAiFeedback() {
  window.dispatchEvent(new CustomEvent(OPEN_ALLEATO_AI_FEEDBACK_EVENT));
}
