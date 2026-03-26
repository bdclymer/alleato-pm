"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Calendar, Upload, Camera, LucideIcon } from "lucide-react";
import { QuickAction } from "@/types/project-home";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  actions: QuickAction[];
  projectId: string;
}

const iconMap: Record<string, LucideIcon> = {
  Plus,
  Calendar,
  Upload,
  Camera,
};

export function QuickActions({ actions, projectId }: QuickActionsProps) {
  return (
    <div className="bg-background rounded-md border border-border p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {actions.map((action) => {
          const Icon = iconMap[action.icon] || Plus;
          const href = action.href.replace("[projectId]", projectId);

          return (
            <Link key={action.id} href={href}>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 h-10"
              >
                <Icon />
                {action.label}
              </Button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
