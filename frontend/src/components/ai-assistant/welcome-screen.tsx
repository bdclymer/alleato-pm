"use client";

import type { ReactNode } from "react";
import {
  CalendarCheckIcon,
  TrendingUpIcon,
  UsersIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { Shimmer } from "@/components/ai-elements/shimmer";

const SUGGESTIONS = [
  {
    prompt: "What needs my attention this week?",
    title: "Weekly Focus",
    description: "Deadlines, action items, and urgent tasks across projects",
    icon: CalendarCheckIcon,
  },
  {
    prompt: "Analyze our financial position",
    title: "Financial Analysis",
    description: "Budgets, contracts, and cash flow across your portfolio",
    icon: TrendingUpIcon,
  },
  {
    prompt: "Prepare me for the next OAC meeting",
    title: "Meeting Prep",
    description: "Talking points, updates, and action items for your next OAC",
    icon: UsersIcon,
  },
  {
    prompt: "Which projects are at risk?",
    title: "Risk Review",
    description: "Identify projects with overruns, delays, or missing data",
    icon: AlertTriangleIcon,
  },
];

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string) => void;
  children?: ReactNode;
}

export function WelcomeScreen({
  onSelectPrompt,
  children,
}: WelcomeScreenProps) {
  return (
    <div className="flex size-full flex-col items-center justify-center px-4">
      <Shimmer as="p" className="text-lg font-normal" duration={3} spread={1}>
        Where should we begin?
      </Shimmer>

      {/* Input slot — rendered between title and suggestions */}
      {children && (
        <div className="mt-5 w-full max-w-2xl">{children}</div>
      )}

      {/* Suggestion cards — icon + title + description */}
      <div className="mt-4 grid w-full max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.prompt}
            type="button"
            onClick={() => onSelectPrompt(s.prompt)}
            className="flex flex-col gap-2 rounded-xl bg-muted/40 p-4 text-left transition-all hover:bg-muted/70 hover:shadow-xs"
          >
            <s.icon className="h-5 w-5 text-primary/60" />
            <span className="text-sm font-medium text-foreground">
              {s.title}
            </span>
            <span className="text-xs leading-relaxed text-muted-foreground">
              {s.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
