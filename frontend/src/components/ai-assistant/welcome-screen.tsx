"use client";

import { PromptSuggestion } from "@/components/chat/prompt-suggestion";
import { BotIcon } from "lucide-react";

const SUGGESTED_PROMPTS = [
  "Summarize the latest OAC meeting",
  "What decisions were made about the schedule?",
  "Find action items from recent meetings",
  "What risks were discussed this week?",
  "Compare budget discussions across projects",
  "Show me RFI-related conversations",
];

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string) => void;
}

export function WelcomeScreen({ onSelectPrompt }: WelcomeScreenProps) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <BotIcon className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          How can I help with your projects?
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Ask me about meeting transcripts, decisions, risks, action items,
          and more from your project meetings.
        </p>
      </div>

      <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <PromptSuggestion
            key={prompt}
            variant="outline"
            size="default"
            className="h-auto whitespace-normal rounded-xl px-4 py-3 text-left text-sm"
            onClick={() => onSelectPrompt(prompt)}
          >
            {prompt}
          </PromptSuggestion>
        ))}
      </div>
    </div>
  );
}
