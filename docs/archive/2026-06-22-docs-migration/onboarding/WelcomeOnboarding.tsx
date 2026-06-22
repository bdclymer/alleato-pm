"use client";

/**
 * WelcomeOnboarding (v3)
 * ----------------------
 * v3 changes from v2:
 *   - Step 1 copy rewritten: removes negative framing ("frustrated"), adds
 *     aspirational/co-creation tone, "you're seeing it in the bones"
 *   - Tester Pact restructured into two-column "What we'll do / What we ask"
 *     (removes personal name attribution; speed itself becomes the promise)
 *   - All other steps preserved from v2
 */

import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Bug,
  Lightbulb,
  HelpCircle,
  ArrowRight,
  Send,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OnboardingInsight = {
  kind: "pattern" | "risk" | "decision";
  text: string;
  meta: string;
};

export type FeedbackTag = "Bug" | "Idea" | "Confused";

export type FeedbackPayload = {
  text: string;
  tag: FeedbackTag | null;
};

export interface WelcomeOnboardingProps {
  userName?: string;
  insights?: OnboardingInsight[];
  stats?: {
    fixesShipped: number;
    activeTesters: number;
    launchesThisWeek: number;
  };
  forceOpen?: boolean;
  storageKey?: string;
  onSubmitFeedback?: (payload: FeedbackPayload) => Promise<void> | void;
  onAskAI?: (question: string) => Promise<void> | void;
  onCreateTestProject?: () => void;
  onComplete?: () => void;
}

const DEFAULT_INSIGHTS: OnboardingInsight[] = [
  {
    kind: "pattern",
    text:
      "Fire suppression appeared in 9 of 14 meetings. It isn't on any agenda or RFI.",
    meta: "4 projects · trending up",
  },
  {
    kind: "risk",
    text:
      "RFI #047 was discussed 4 times across 3 weeks. Still unresolved. Owner: not assigned.",
    meta: "Surfaced from transcripts",
  },
  {
    kind: "decision",
    text:
      "On 4/12 the team agreed to switch to Type-K connectors. Not in any document, contract, or submittal.",
    meta: "Auto-extracted",
  },
];

const DEFAULT_STATS = {
  fixesShipped: 47,
  activeTesters: 12,
  launchesThisWeek: 3,
};

const STORAGE_KEY_DEFAULT = "alleato_onboarding_completed_v3";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WelcomeOnboarding({
  userName,
  insights = DEFAULT_INSIGHTS,
  stats = DEFAULT_STATS,
  forceOpen,
  storageKey = STORAGE_KEY_DEFAULT,
  onSubmitFeedback,
  onAskAI,
  onCreateTestProject,
  onComplete,
}: WelcomeOnboardingProps) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      return;
    }
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem(storageKey);
    if (!seen) setOpen(true);
  }, [forceOpen, storageKey]);

  const total = 4;

  const close = (completed: boolean) => {
    if (typeof window !== "undefined" && completed) {
      window.localStorage.setItem(storageKey, new Date().toISOString());
    }
    setOpen(false);
    if (completed) onComplete?.();
  };

  const next = () => {
    if (step < total - 1) setStep((s) => s + 1);
    else close(true);
  };
  const back = () => setStep((s) => Math.max(0, s - 1));
  const skip = () => close(true);

  const handleCreateTestProject = () => {
    close(true);
    onCreateTestProject?.();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && close(false)}>
        <DialogContent className="max-w-[560px] gap-0 p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-orange-600" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Alleato OS · Welcome
              </span>
            </div>
            <StepDots current={step} total={total} />
          </div>

          <div className="px-7 py-7 min-h-[400px]">
            {step === 0 && <PactStep stats={stats} />}
            {step === 1 && <WowStep userName={userName} insights={insights} />}
            {step === 2 && <WidgetShowcaseStep />}
            {step === 3 && (
              <MissionStep onCreateTestProject={handleCreateTestProject} />
            )}
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
            <button
              onClick={skip}
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip tour
            </button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={back}
                disabled={step === 0}
                className="h-9"
              >
                Back
              </Button>
              <Button
                size="sm"
                onClick={next}
                className={cn(
                  "h-9",
                  step === total - 1 && "bg-orange-600 hover:bg-orange-700"
                )}
              >
                {step === total - 1 ? "Start exploring" : "Continue"}
                <ArrowRight className="ml-1.5 size-3.5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AskAlleatoPill
        visible={!open}
        onSubmitFeedback={onSubmitFeedback}
        onAskAI={onAskAI}
      />
    </>
  );
}

// ===========================================================================
// Step 1 — The Foundation (rewritten)
// ===========================================================================

function PactStep({
  stats,
}: {
  stats: NonNullable<WelcomeOnboardingProps["stats"]>;
}) {
  return (
    <div className="flex flex-col h-full">
      <Badge
        variant="outline"
        className="w-fit mb-5 border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-50 font-medium"
      >
        <span className="size-1.5 rounded-full bg-amber-600 mr-1.5" />
        Internal beta · You're shaping this
      </Badge>

      <h1 className="text-2xl font-semibold tracking-tight leading-tight mb-3">
        You're not testing software.
        <br />
        You're shaping it.
      </h1>
      <p className="text-sm leading-relaxed text-muted-foreground mb-6">
        Whatever you've ever wanted a platform like this to do — this is where
        it gets built. Some of what you'd expect isn't here yet. Some of what
        is here will feel rough.{" "}
        <span className="text-foreground font-medium">
          That's the point: you're seeing it in the bones, so what gets built
          next is what you actually need.
        </span>{" "}
        The AI assistant lives one click away on every page. Stuck, curious, or
        got an idea? Click <strong className="font-medium">Ask Alleato</strong>.
        Watch how fast things move.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted/50 border-l-2 border-orange-600 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
            What we'll do
          </div>
          <ul className="flex flex-col gap-2 text-[13px] leading-snug text-foreground">
            <li className="flex gap-2">
              <span className="text-orange-600 shrink-0">→</span>
              <span>Ship updates fast — often within a day</span>
            </li>
            <li className="flex gap-2">
              <span className="text-orange-600 shrink-0">→</span>
              <span>Read every piece of feedback, every time</span>
            </li>
            <li className="flex gap-2">
              <span className="text-orange-600 shrink-0">→</span>
              <span>Build what construction actually needs</span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl bg-muted/50 border-l-2 border-foreground/20 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
            What we ask
          </div>
          <ul className="flex flex-col gap-2 text-[13px] leading-snug text-foreground">
            <li className="flex gap-2">
              <span className="text-muted-foreground shrink-0">→</span>
              <span>Tell us what's missing or off</span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground shrink-0">→</span>
              <span>Use Ask Alleato when stuck — faster than guessing</span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground shrink-0">→</span>
              <span>Be specific. Vague feedback is hard to fix</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-auto pt-5 flex gap-4 text-xs text-muted-foreground">
        <Stat n={stats.fixesShipped} label="fixes shipped this month" />
        <Stat n={stats.activeTesters} label="testers active" />
        <Stat n={stats.launchesThisWeek} label="launches this week" />
      </div>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <span>
      <span className="font-medium text-foreground">{n}</span> {label}
    </span>
  );
}

// ===========================================================================
// Step 2 — The Wow
// ===========================================================================

function WowStep({
  userName,
  insights,
}: {
  userName?: string;
  insights: OnboardingInsight[];
}) {
  const [shown, setShown] = React.useState(0);

  React.useEffect(() => {
    setShown(0);
    const timers = insights.map((_, i) =>
      setTimeout(() => setShown((n) => Math.max(n, i + 1)), 250 + i * 350)
    );
    return () => timers.forEach(clearTimeout);
  }, [insights]);

  const greeting = userName
    ? `Hey ${userName}. I read your last 14 meetings.`
    : "I read your last 14 meetings.";

  return (
    <div>
      <Badge
        variant="outline"
        className="mb-4 border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-50 font-medium"
      >
        <Sparkles className="size-3 mr-1.5" />
        What Procore can't do
      </Badge>
      <h1 className="text-[22px] font-semibold tracking-tight leading-snug mb-2">
        {greeting}
      </h1>
      <p className="text-[13.5px] text-muted-foreground mb-5">
        Every meeting. Every transcript. Three patterns that didn't exist in any
        single document:
      </p>

      <div className="flex flex-col gap-2.5 mb-5">
        {insights.slice(0, 3).map((ins, i) => (
          <InsightRow key={i} insight={ins} visible={i < shown} />
        ))}
      </div>

      <div className="p-3.5 rounded-lg bg-muted/50 border-l-2 border-orange-600 text-[12.5px] leading-relaxed text-muted-foreground">
        <span className="text-foreground font-medium">
          This isn't a one-time demo.
        </span>{" "}
        Your AI assistant lives in the bottom-right of every page — ask it
        anything, anytime.
      </div>
    </div>
  );
}

function InsightRow({
  insight,
  visible,
}: {
  insight: OnboardingInsight;
  visible: boolean;
}) {
  const meta = {
    pattern: { label: "Pattern", fg: "text-emerald-700", bg: "bg-emerald-50" },
    risk: { label: "Risk", fg: "text-red-700", bg: "bg-red-50" },
    decision: { label: "Decision", fg: "text-violet-700", bg: "bg-violet-50" },
  }[insight.kind];

  return (
    <div
      className={cn(
        "flex gap-3 p-3.5 rounded-lg border bg-background transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1.5"
      )}
    >
      <span
        className={cn(
          "shrink-0 h-fit text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded",
          meta.fg,
          meta.bg
        )}
      >
        {meta.label}
      </span>
      <div className="flex-1">
        <div className="text-[13.5px] leading-relaxed text-foreground">
          {insight.text}
        </div>
        <div className="text-[11px] text-muted-foreground mt-1">
          {insight.meta}
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Step 3 — Widget Showcase
// ===========================================================================

function WidgetShowcaseStep() {
  const [tab, setTab] = React.useState<"ai" | "feedback">("ai");

  return (
    <div>
      <h1 className="text-[22px] font-semibold tracking-tight leading-snug mb-2">
        One widget. Two superpowers.
      </h1>
      <p className="text-[13.5px] text-muted-foreground mb-5 leading-relaxed">
        The pill in the bottom-right travels with you on every page. Ask the AI
        anything, or send feedback when something's off.
      </p>

      <div className="bg-background border rounded-xl overflow-hidden shadow-sm">
        <div className="flex border-b">
          <button
            onClick={() => setTab("ai")}
            className={cn(
              "flex-1 py-3 text-[13px] font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5",
              tab === "ai"
                ? "bg-background text-foreground border-orange-600"
                : "bg-muted/50 text-muted-foreground border-transparent"
            )}
          >
            <Sparkles className="size-3.5" />
            Ask AI
          </button>
          <button
            onClick={() => setTab("feedback")}
            className={cn(
              "flex-1 py-3 text-[13px] font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5",
              tab === "feedback"
                ? "bg-background text-foreground border-orange-600"
                : "bg-muted/50 text-muted-foreground border-transparent"
            )}
          >
            <MessageSquare className="size-3.5" />
            Send feedback
          </button>
        </div>

        <div className="p-4">
          {tab === "ai" ? <AIPreview /> : <FeedbackPreview />}
        </div>
      </div>

      <div className="mt-3.5 text-[12px] text-muted-foreground text-center">
        Click the tabs above to preview both modes.
      </div>
    </div>
  );
}

function AIPreview() {
  return (
    <div>
      <div className="bg-muted/50 rounded-lg p-3 mb-2.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Try asking
        </div>
        <div className="flex flex-col gap-1.5 text-[13px] text-foreground">
          <span>→ What's blocking the Tampa project?</span>
          <span>→ Show me overdue RFIs assigned to me</span>
          <span>→ Summarize last week's owner meeting</span>
        </div>
      </div>
      <div className="flex gap-2 items-center px-3 py-2 border rounded-lg">
        <Sparkles className="size-3.5 text-muted-foreground shrink-0" />
        <Input
          placeholder="Ask anything about your projects..."
          className="border-0 shadow-none p-0 h-7 text-[13px] focus-visible:ring-0"
          readOnly
        />
        <Button size="sm" className="h-7 text-xs px-2.5">
          Ask
        </Button>
      </div>
    </div>
  );
}

function FeedbackPreview() {
  const [tag, setTag] = React.useState<FeedbackTag | null>(null);
  return (
    <div>
      <Textarea
        placeholder="Bug, idea, or just confused — anything works"
        className="min-h-[64px] text-[13px]"
        readOnly
      />
      <div className="flex gap-1.5 mt-2.5">
        <TagButton
          label="Bug"
          icon={Bug}
          active={tag === "Bug"}
          onClick={() => setTag("Bug")}
        />
        <TagButton
          label="Idea"
          icon={Lightbulb}
          active={tag === "Idea"}
          onClick={() => setTag("Idea")}
        />
        <TagButton
          label="Confused"
          icon={HelpCircle}
          active={tag === "Confused"}
          onClick={() => setTag("Confused")}
        />
      </div>
      <Button size="sm" className="mt-3 h-8" disabled>
        <Send className="size-3 mr-1.5" />
        Send feedback
      </Button>
      <div className="mt-2.5 text-[11.5px] text-muted-foreground">
        Every submission lands on the Client Feedback page within seconds.
      </div>
    </div>
  );
}

function TagButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border transition-colors",
        active
          ? "bg-orange-50 text-orange-900 border-orange-300"
          : "bg-background text-muted-foreground hover:border-orange-300 hover:text-orange-900"
      )}
    >
      <Icon className="size-3" />
      {label}
    </button>
  );
}

// ===========================================================================
// Step 4 — Mission
// ===========================================================================

function MissionStep({
  onCreateTestProject,
}: {
  onCreateTestProject: () => void;
}) {
  return (
    <div>
      <Badge
        variant="outline"
        className="mb-4 border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-50 font-medium"
      >
        Ready when you are
      </Badge>
      <h1 className="text-[22px] font-semibold tracking-tight leading-snug mb-2">
        Set up your first test project.
      </h1>
      <p className="text-[13.5px] text-muted-foreground mb-5 leading-relaxed">
        Walk through it like a real project — create it, add a meeting, run an
        RFI. Note what feels off as you go. Tell us in the widget.
      </p>

      <button
        type="button"
        onClick={onCreateTestProject}
        className="w-full p-5 rounded-2xl bg-foreground text-background hover:bg-foreground/90 transition-all flex items-center justify-between gap-3 shadow-lg shadow-orange-600/10 hover:shadow-orange-600/20 hover:-translate-y-px"
      >
        <div className="text-left">
          <div className="text-[15px] font-medium tracking-tight">
            Create your first test project
          </div>
          <div className="text-[12.5px] text-background/70 mt-0.5">
            Takes about 90 seconds. Real workflow, real data.
          </div>
        </div>
        <div className="bg-orange-600 size-8 rounded-full flex items-center justify-center shrink-0">
          <ArrowRight className="size-4" />
        </div>
      </button>

      <div className="mt-5 p-3.5 bg-muted/50 rounded-lg flex gap-3 items-start">
        <Sparkles className="size-4 text-orange-600 shrink-0 mt-0.5" />
        <div className="text-[12.5px] leading-relaxed text-muted-foreground">
          <strong className="text-foreground font-medium">
            Stuck or confused?
          </strong>{" "}
          Click{" "}
          <strong className="text-foreground font-medium">Ask Alleato</strong>{" "}
          in the bottom-right corner. The AI knows your projects, your meetings,
          and how the platform works. Use it like a teammate.
        </div>
      </div>

      <div className="mt-3.5 px-3.5 py-3 rounded-lg bg-orange-50/50 text-[12px] text-muted-foreground text-center">
        At the end of today, you'll see how much time the AI saved you.
      </div>
    </div>
  );
}

// ===========================================================================
// Ask Alleato Pill — persistent floating widget
// ===========================================================================

function AskAlleatoPill({
  visible,
  onSubmitFeedback,
  onAskAI,
}: {
  visible: boolean;
  onSubmitFeedback?: WelcomeOnboardingProps["onSubmitFeedback"];
  onAskAI?: WelcomeOnboardingProps["onAskAI"];
}) {
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<"ai" | "feedback">("ai");

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!visible) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-foreground text-background text-[13px] font-medium shadow-lg hover:scale-105 transition-transform"
        aria-label="Ask Alleato"
      >
        <Sparkles className="size-3.5" />
        Ask Alleato
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[440px] gap-0 p-0 overflow-hidden">
          <div className="flex border-b">
            <button
              onClick={() => setTab("ai")}
              className={cn(
                "flex-1 py-3 text-[13px] font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5",
                tab === "ai"
                  ? "text-foreground border-orange-600"
                  : "text-muted-foreground border-transparent bg-muted/30"
              )}
            >
              <Sparkles className="size-3.5" />
              Ask AI
            </button>
            <button
              onClick={() => setTab("feedback")}
              className={cn(
                "flex-1 py-3 text-[13px] font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5",
                tab === "feedback"
                  ? "text-foreground border-orange-600"
                  : "text-muted-foreground border-transparent bg-muted/30"
              )}
            >
              <MessageSquare className="size-3.5" />
              Send feedback
            </button>
          </div>

          <div className="p-5">
            {tab === "ai" ? (
              <AskAITab onAskAI={onAskAI} onClose={() => setOpen(false)} />
            ) : (
              <FeedbackTab
                onSubmitFeedback={onSubmitFeedback}
                onClose={() => setOpen(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AskAITab({
  onAskAI,
  onClose,
}: {
  onAskAI?: WelcomeOnboardingProps["onAskAI"];
  onClose: () => void;
}) {
  const [q, setQ] = React.useState("");
  const submit = async () => {
    if (!q.trim()) return;
    await onAskAI?.(q);
    onClose();
  };
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
        Ask anything
      </div>
      <Textarea
        autoFocus
        placeholder="What's blocking the Tampa project?"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="min-h-[100px] text-[13.5px]"
      />
      <div className="flex flex-col gap-1 mt-3 text-[12px] text-muted-foreground">
        <span className="font-medium uppercase tracking-wider text-[10px] mb-0.5">
          Examples
        </span>
        <button
          type="button"
          onClick={() => setQ("Show me overdue RFIs assigned to me")}
          className="text-left hover:text-foreground transition-colors"
        >
          → Show me overdue RFIs assigned to me
        </button>
        <button
          type="button"
          onClick={() => setQ("Summarize last week's owner meeting")}
          className="text-left hover:text-foreground transition-colors"
        >
          → Summarize last week's owner meeting
        </button>
        <button
          type="button"
          onClick={() =>
            setQ("Which projects are at risk based on recent meetings?")
          }
          className="text-left hover:text-foreground transition-colors"
        >
          → Which projects are at risk based on recent meetings?
        </button>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" onClick={submit} disabled={!q.trim()}>
          <Sparkles className="size-3 mr-1.5" />
          Ask
        </Button>
      </div>
    </div>
  );
}

function FeedbackTab({
  onSubmitFeedback,
  onClose,
}: {
  onSubmitFeedback?: WelcomeOnboardingProps["onSubmitFeedback"];
  onClose: () => void;
}) {
  const [text, setText] = React.useState("");
  const [tag, setTag] = React.useState<FeedbackTag | null>(null);
  const [sent, setSent] = React.useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    await onSubmitFeedback?.({ text, tag });
    setSent(true);
    setTimeout(() => {
      onClose();
      setText("");
      setTag(null);
      setSent(false);
    }, 1600);
  };

  if (sent) {
    return (
      <div className="py-6 text-center">
        <CheckCircle2 className="size-10 mx-auto mb-3 text-emerald-600" />
        <div className="font-medium">Got it. Logged.</div>
        <div className="text-[13px] text-muted-foreground mt-1">
          You'll see updates on the Client Feedback page.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
        What's on your mind?
      </div>
      <Textarea
        autoFocus
        placeholder="Bug, idea, or just confused — anything works"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="min-h-[100px] text-[13.5px]"
      />
      <div className="flex gap-1.5 mt-3">
        <TagButton
          label="Bug"
          icon={Bug}
          active={tag === "Bug"}
          onClick={() => setTag("Bug")}
        />
        <TagButton
          label="Idea"
          icon={Lightbulb}
          active={tag === "Idea"}
          onClick={() => setTag("Idea")}
        />
        <TagButton
          label="Confused"
          icon={HelpCircle}
          active={tag === "Confused"}
          onClick={() => setTag("Confused")}
        />
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" onClick={submit} disabled={!text.trim()}>
          <Send className="size-3 mr-1.5" />
          Send
        </Button>
      </div>
    </div>
  );
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i === current
              ? "w-6 bg-orange-600"
              : i < current
              ? "w-1.5 bg-muted-foreground/60"
              : "w-1.5 bg-muted-foreground/20"
          )}
        />
      ))}
    </div>
  );
}
