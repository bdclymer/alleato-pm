"use client";

import type { ComponentType } from "react";
import {
  BriefcaseBusinessIcon,
  CheckSquareIcon,
  FilePenLineIcon,
  HandIcon,
  LandmarkIcon,
  MessagesSquareIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AssistantShortcut = {
  label: string;
  prompt: string;
};

type AssistantShortcutGroup = {
  title: string;
  icon: ComponentType<{ className?: string }>;
  shortcuts: AssistantShortcut[];
};

const shortcutGroups: AssistantShortcutGroup[] = [
  {
    title: "Project Snapshot",
    icon: BriefcaseBusinessIcon,
    shortcuts: [
      {
        label: "Owner snapshot",
        prompt: "Give me the owner snapshot for this project.",
      },
      {
        label: "What changed",
        prompt: "What changed since last week? Show risks, money, meetings, and owner actions.",
      },
      {
        label: "Start here",
        prompt: "What should Brandon look at first on this project?",
      },
    ],
  },
  {
    title: "Tasks",
    icon: CheckSquareIcon,
    shortcuts: [
      {
        label: "Created today",
        prompt: "Show tasks created today.",
      },
      {
        label: "Owner-blocked",
        prompt: "Show owner-blocked tasks and recommended next actions.",
      },
      {
        label: "Missing owners",
        prompt: "Show meeting tasks without owners or due dates.",
      },
    ],
  },
  {
    title: "Meetings",
    icon: MessagesSquareIcon,
    shortcuts: [
      {
        label: "Meeting insights",
        prompt: "View meeting insights from this week.",
      },
      {
        label: "Decisions",
        prompt: "What decisions were made in recent meetings?",
      },
      {
        label: "Follow-ups",
        prompt: "What promises from meetings need follow-up?",
      },
    ],
  },
  {
    title: "Money And Risk",
    icon: LandmarkIcon,
    shortcuts: [
      {
        label: "Exposure",
        prompt: "Where are we exposed on money, schedule, or contract risk?",
      },
      {
        label: "Unbilled changes",
        prompt: "What approved changes are not billed?",
      },
      {
        label: "Margin movement",
        prompt: "Where is margin eroding and what should we do next?",
      },
    ],
  },
  {
    title: "Creative Studio",
    icon: FilePenLineIcon,
    shortcuts: [
      {
        label: "Client update",
        prompt: "Draft a client update from the project snapshot with source-backed facts.",
      },
      {
        label: "Difficult email",
        prompt: "Draft a difficult client email from the facts only.",
      },
      {
        label: "Case study",
        prompt: "Create a case study outline from this project's strongest source-backed highlights.",
      },
    ],
  },
  {
    title: "Take Action",
    icon: HandIcon,
    shortcuts: [
      {
        label: "Create tasks",
        prompt: "Create tasks from the latest meeting insights. Show previews before writing.",
      },
      {
        label: "Draft RFIs",
        prompt: "Draft RFIs from unresolved open questions. Show write previews first.",
      },
      {
        label: "Change events",
        prompt: "Create change event previews from current risks and exposure.",
      },
    ],
  },
];

export function AssistantShortcutPanel({
  onSelectPrompt,
  className,
}: {
  onSelectPrompt: (prompt: string) => void;
  className?: string;
}) {
  return (
    <section
      aria-label="Owner AI shortcuts"
      className={cn("grid gap-5 text-left sm:grid-cols-2", className)}
    >
      {shortcutGroups.map((group) => {
        const Icon = group.icon;
        return (
          <div key={group.title} className="min-w-0 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
              <span>{group.title}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.shortcuts.map((shortcut) => (
                <Button
                  key={shortcut.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-md px-3 text-xs font-medium"
                  onClick={() => onSelectPrompt(shortcut.prompt)}
                >
                  {shortcut.label}
                </Button>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
