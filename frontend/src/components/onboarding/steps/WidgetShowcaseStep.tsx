"use client";

import * as React from "react";
import { Bug, HelpCircle, Lightbulb, MessageSquare, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { onboardingCopy } from "@/lib/onboarding/copy";
import { type AskAlleatoFeedbackTag } from "@/lib/ask-alleato/feedback-tag-mapping";
import { cn } from "@/lib/utils";

export function WidgetShowcaseStep() {
  const [tab, setTab] = React.useState<"ai" | "feedback">("ai");

  return (
    <div>
      <h1 className="mb-2 text-[22px] font-semibold leading-snug tracking-tight text-foreground">
        {onboardingCopy.widget.headline}
      </h1>
      <p className="mb-5 text-[13.5px] leading-relaxed text-muted-foreground">
        {onboardingCopy.widget.body}
      </p>
      <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
        <div className="flex border-b">
          <PreviewTabButton active={tab === "ai"} onClick={() => setTab("ai")}>
            <Sparkles className="size-3.5" />
            {onboardingCopy.widget.askTab}
          </PreviewTabButton>
          <PreviewTabButton active={tab === "feedback"} onClick={() => setTab("feedback")}>
            <MessageSquare className="size-3.5" />
            {onboardingCopy.widget.feedbackTab}
          </PreviewTabButton>
        </div>
        <div className="p-4">{tab === "ai" ? <AIPreview /> : <FeedbackPreview />}</div>
      </div>
      <div className="mt-3.5 text-center text-[12px] text-muted-foreground">
        {onboardingCopy.widget.previewNote}
      </div>
    </div>
  );
}

function PreviewTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        "h-auto flex-1 rounded-none border-b-2 py-3 text-[13px] font-medium transition-colors hover:bg-muted/50",
        active
          ? "border-primary bg-background text-foreground"
          : "border-transparent bg-muted/50 text-muted-foreground",
      )}
    >
      {children}
    </Button>
  );
}

function AIPreview() {
  return (
    <div>
      <div className="mb-2.5 rounded-lg bg-muted/50 p-3">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {onboardingCopy.widget.tryAsking}
        </div>
        <div className="flex flex-col gap-1.5 text-[13px] text-foreground">
          {onboardingCopy.widget.examples.map((example) => (
            <span key={example}>- {example}</span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
        <Sparkles className="size-3.5 shrink-0 text-muted-foreground" />
        <Input
          placeholder={onboardingCopy.widget.inputPlaceholder}
          className="h-7 border-0 p-0 text-[13px] shadow-none focus-visible:ring-0"
          readOnly
        />
        <Button size="sm" className="h-7 px-2.5 text-xs">
          Ask
        </Button>
      </div>
    </div>
  );
}

function FeedbackPreview() {
  const [tag, setTag] = React.useState<AskAlleatoFeedbackTag | null>(null);
  return (
    <div>
      <Textarea
        placeholder={onboardingCopy.widget.feedbackPlaceholder}
        className="min-h-16 text-[13px]"
        readOnly
      />
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <TagButton label="Bug" icon={Bug} active={tag === "Bug"} onClick={() => setTag("Bug")} />
        <TagButton label="Idea" icon={Lightbulb} active={tag === "Idea"} onClick={() => setTag("Idea")} />
        <TagButton label="Confused" icon={HelpCircle} active={tag === "Confused"} onClick={() => setTag("Confused")} />
      </div>
      <Button size="sm" className="mt-3 h-8" disabled>
        <Send className="mr-1.5 size-3" />
        Send feedback
      </Button>
      <div className="mt-2.5 text-[11.5px] text-muted-foreground">
        {onboardingCopy.widget.feedbackFooter}
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
  label: AskAlleatoFeedbackTag;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      onClick={onClick}
      className={cn(
        "h-7 rounded-full text-[11px]",
        active
          ? "border-primary/30 bg-primary/5 text-primary"
          : "bg-background text-muted-foreground hover:border-primary/30 hover:text-primary",
      )}
    >
      <Icon className="size-3" />
      {label}
    </Button>
  );
}
