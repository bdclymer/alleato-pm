"use client";

import { ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ADMIN_FEEDBACK_OVERLAY_ATTRIBUTE, feedbackTargetProps } from "@/lib/admin-feedback/constants";

export function AskAlleatoPill({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant="outline"
      size="icon"
      className="fixed bottom-24 right-20 z-40 flex size-12 items-center justify-center rounded-full border-border bg-background text-foreground shadow-sm transition-all hover:bg-muted sm:bottom-8"
      aria-label="Feedback mode"
      {...feedbackTargetProps("ask-alleato.pill")}
      {...{ [ADMIN_FEEDBACK_OVERLAY_ATTRIBUTE]: "true" }}
    >
      <ListFilter className="size-5" />
    </Button>
  );
}
