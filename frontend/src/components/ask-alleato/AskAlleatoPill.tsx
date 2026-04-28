"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ADMIN_FEEDBACK_OVERLAY_ATTRIBUTE, feedbackTargetProps } from "@/lib/admin-feedback/constants";

export function AskAlleatoPill({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      onClick={onClick}
      className="fixed bottom-5 right-4 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-background shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-foreground/90 sm:right-5"
      aria-label="Ask Alleato"
      {...feedbackTargetProps("ask-alleato.pill")}
      {...{ [ADMIN_FEEDBACK_OVERLAY_ATTRIBUTE]: "true" }}
    >
      <Sparkles className="size-4" />
      <span>Ask Alleato</span>
    </Button>
  );
}
