"use client";

import { ArrowRightIcon, LockKeyholeIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AssistantSuggestion } from "@/lib/ai/assistant-suggestion-resolver";
import { cn } from "@/lib/utils";

type AssistantSuggestionListProps = {
  disabled?: boolean;
  suggestions: AssistantSuggestion[];
  variant?: "inline" | "panel";
  onSelectPrompt: (prompt: string) => void;
};

export function AssistantSuggestionList({
  disabled = false,
  suggestions,
  variant = "inline",
  onSelectPrompt,
}: AssistantSuggestionListProps) {
  if (suggestions.length === 0) return null;

  return (
    <div
      className={cn(
        "text-left",
        variant === "panel" && "mb-4 rounded-lg bg-muted/45 px-3 py-3",
      )}
    >
      {variant === "panel" ? (
        <div className="mb-3 space-y-1">
          <p className="text-sm font-medium text-foreground">Welcome back.</p>
          <p className="text-xs leading-5 text-muted-foreground">
            Here are the most useful AI actions for where you are.
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <Button
            key={suggestion.id}
            type="button"
            variant={variant === "panel" ? "secondary" : "outline"}
            size="sm"
            disabled={disabled || suggestion.status === "not_ready"}
            className="h-8 max-w-full rounded-full px-3 text-xs font-medium"
            onClick={() => onSelectPrompt(suggestion.prompt)}
          >
            {suggestion.requiresApproval ? (
              <LockKeyholeIcon className="h-3 w-3" />
            ) : null}
            <span className="truncate">{suggestion.label}</span>
            {variant === "inline" ? (
              <ArrowRightIcon className="h-3 w-3 text-muted-foreground" />
            ) : null}
          </Button>
        ))}
      </div>
    </div>
  );
}
