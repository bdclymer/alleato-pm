"use client";

import type { ReactNode } from "react";
import {
  CalendarCheckIcon,
  TrendingUpIcon,
  UsersIcon,
  AlertTriangleIcon,
  FileTextIcon,
  HardHatIcon,
  ClipboardListIcon,
  MessagesSquareIcon,
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
}

export function WelcomeScreen({
  onSelectPrompt,
  children,
}: WelcomeScreenProps) {
  return (
    <div className="flex size-full flex-col items-center justify-center px-4">
      <Shimmer as="p" className="text-lg font-normal text-foreground" duration={3} spread={1}>
        Where should we begin?
      </Shimmer>

      {/* Input slot — rendered between title and suggestions */}
      {children && (
        <div className="mt-5 w-full max-w-2xl">{children}</div>
      )}

      {/* Suggestion cards — 4 columns, 2 rows */}
      <div className="mt-4 grid w-full max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.prompt}
            type="button"
            onClick={() => onSelectPrompt(s.prompt)}
            className="flex flex-col gap-2 rounded-xl bg-background/80 p-4 text-left transition-all hover:bg-background hover:shadow-xs"
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
