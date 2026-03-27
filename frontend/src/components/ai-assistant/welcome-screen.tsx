"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
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
import { createClient } from "@/lib/supabase/client";

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
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);
    };

    void fetchUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const displayName = useMemo(() => {
    const fullName =
      typeof user?.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name.trim()
        : "";

    if (fullName) {
      return fullName.split(" ")[0];
    }

    return user?.email?.split("@")[0] ?? "";
  }, [user]);

  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl">
        <div className="space-y-4 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            AI Strategist
          </p>
          <h1 className="font-sans text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {displayName ? `How can I help, ${displayName}?` : "How can I help?"}
          </h1>
        </div>

        {children && <div className="mx-auto mt-8 max-w-3xl">{children}</div>}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          {SUGGESTIONS.slice(0, 8).map((suggestion, index) => (
            <button
              key={suggestion.prompt}
              type="button"
              onClick={() => onSelectPrompt(suggestion.prompt)}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/40 sm:min-h-10 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm ${index >= 4 ? "hidden sm:inline-flex" : ""}`}
            >
              <suggestion.icon className="h-3.5 w-3.5 text-muted-foreground sm:h-4 sm:w-4" />
              {suggestion.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
