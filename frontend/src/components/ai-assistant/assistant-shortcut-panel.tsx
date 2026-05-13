"use client";

import {
  ClipboardListIcon,
  FileTextIcon,
  ListChecksIcon,
  SparklesIcon,
  TrendingUpIcon,
  UsersRoundIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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

export function AssistantShortcutPanel({
  disabled = false,
  onSelectPrompt,
}: AssistantShortcutPanelProps) {
  return (
    <div className="space-y-5">
      {ASSISTANT_SHORTCUT_GROUPS.map((group) => (
        <section key={group.id} className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
            <SparklesIcon className="h-3.5 w-3.5" />
            {group.label}
          </div>
          <div className="flex flex-wrap gap-2">
            {group.shortcuts.map((shortcut) => {
              const Icon = shortcutIcon[shortcut.icon];
              return (
                <Button
                  key={shortcut.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  className={cn(
                    "h-8 rounded-full px-3 text-xs font-medium",
                    "bg-background/80 shadow-none hover:bg-muted/60",
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
      ))}
    </div>
  );
}
