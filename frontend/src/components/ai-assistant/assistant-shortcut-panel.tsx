"use client";

import {
  ClipboardListIcon,
  FileTextIcon,
  ListChecksIcon,
  MessageSquareTextIcon,
  SparklesIcon,
  TrendingUpIcon,
  UsersRoundIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionRuleHeading } from "@/components/layout/spacing";
import { cn } from "@/lib/utils";
import { ASSISTANT_SHORTCUT_GROUPS } from "./assistant-shortcuts";

type AssistantShortcutPanelProps = {
  disabled?: boolean;
  onSelectPrompt: (prompt: string) => void;
};

const shortcutIcon = {
  snapshot: FileTextIcon,
  tasks: ListChecksIcon,
  meetings: UsersRoundIcon,
  money: TrendingUpIcon,
  action: ClipboardListIcon,
} as const;

const featurePanels = [
  {
    id: "project-context",
    icon: FileTextIcon,
    title: "Project context",
    body: "Owner snapshots, budget movement, risks, RFIs, and schedule signals.",
  },
  {
    id: "source-review",
    icon: MessageSquareTextIcon,
    title: "Source review",
    body: "Meetings, Teams, emails, and documents pulled into one operating answer.",
  },
  {
    id: "next-actions",
    icon: ClipboardListIcon,
    title: "Next actions",
    body: "Draft owner updates, action queues, tasks, and write previews.",
  },
];

export function AssistantShortcutPanel({
  disabled = false,
  onSelectPrompt,
}: AssistantShortcutPanelProps) {
  const shortcuts = ASSISTANT_SHORTCUT_GROUPS.flatMap((group) => group.shortcuts);

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        {featurePanels.map((panel) => {
          const Icon = panel.icon;
          return (
            <section
              key={panel.id}
              className="rounded-lg bg-muted/25 px-4 py-4 text-left ring-1 ring-border/35"
            >
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <SectionRuleHeading label={panel.title} className="mb-2 pb-0" />
              <p className="mt-2 text-sm leading-5 text-muted-foreground">
                {panel.body}
              </p>
            </section>
          );
        })}
      </div>

      <section className="space-y-3 text-center">
        <div className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
          <SparklesIcon className="h-3.5 w-3.5" />
          Try these prompts
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {shortcuts.map((shortcut) => {
            const Icon = shortcutIcon[shortcut.icon];
            return (
              <Button
                key={shortcut.id}
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                className={cn(
                  "h-9 rounded-full px-3 text-xs font-medium",
                  "border-border/70 bg-background/70 shadow-none hover:bg-muted/60",
                )}
                onClick={() => onSelectPrompt(shortcut.prompt)}
              >
                <Icon className="h-3.5 w-3.5" />
                {shortcut.label}
              </Button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
