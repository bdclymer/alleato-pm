"use client";

import type { ReactNode } from "react";
import {
  CalendarCheckIcon,
  AlertTriangleIcon,
  FileTextIcon,
  HardHatIcon,
  ClipboardListIcon,
  MessagesSquareIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";
import { Shimmer } from "@/components/ai-elements/shimmer";

const SUGGESTIONS = [
  {
    prompt: "What needs my attention right now across all projects?",
    title: "Morning Briefing",
    description: "Overdue items, urgent decisions, and what's at risk today",
    icon: CalendarCheckIcon,
  },
  {
    prompt: "How are we tracking financially across the portfolio? Flag anything that concerns you.",
    title: "Financial Health",
    description: "Contract values, change order exposure, and collection status",
    icon: TrendingUpIcon,
  },
  {
    prompt: "Which projects are at risk and why? Be direct.",
    title: "Risk Scan",
    description: "Projects with overruns, delays, open RFIs, or stalled action items",
    icon: AlertTriangleIcon,
  },
  {
    prompt: "Who are the subcontractors on our active projects and what's their contract exposure?",
    title: "Vendor Overview",
    description: "Subcontractors, committed values, and contract status",
    icon: HardHatIcon,
  },
  {
    prompt: "What were the key decisions and action items from recent meetings?",
    title: "Meeting Recap",
    description: "Decisions made, commitments given, and what's still open",
    icon: MessagesSquareIcon,
  },
  {
    prompt: "What change orders are pending approval across our projects?",
    title: "Pending COs",
    description: "Unapproved change orders and their financial exposure",
    icon: FileTextIcon,
  },
  {
    prompt: "Who is behind on their action items? Which commitments from meetings haven't moved?",
    title: "Accountability",
    description: "Stalled action items and overdue owner commitments by person",
    icon: ClipboardListIcon,
  },
  {
    prompt: "Prepare me for our next OAC — what do I need to know and what should I raise?",
    title: "OAC Prep",
    description: "Status, open issues, and talking points for the owner meeting",
    icon: UsersIcon,
  },
];

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string) => void;
  children?: ReactNode;
  conversationCount?: number;
}

export function WelcomeScreen({
  onSelectPrompt,
  children,
  conversationCount,
}: WelcomeScreenProps) {
  return (
    <div className="flex size-full items-center justify-center overflow-y-auto px-4 py-8 sm:px-6 lg:px-10">
      <div className="w-full max-w-3xl">
        <div className="space-y-6 text-center">
          <Shimmer
            as="h1"
            className="text-balance font-serif text-4xl font-normal tracking-tight text-foreground sm:text-5xl"
            duration={3}
            spread={1}
          >
            Good morning{conversationCount ? "," : ""} Megan
          </Shimmer>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Ask about projects, meetings, budgets, vendors, and the next decisions that need attention.
          </p>
        </div>

        {children && <div className="mt-8">{children}</div>}

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {SUGGESTIONS.slice(0, 5).map((suggestion) => (
            <button
              key={suggestion.prompt}
              type="button"
              onClick={() => onSelectPrompt(suggestion.prompt)}
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted/40"
            >
              <suggestion.icon className="h-4 w-4 text-muted-foreground" />
              {suggestion.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
