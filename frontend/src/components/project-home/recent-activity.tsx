"use client";

import * as React from "react";
import Link from "next/link";
import {
  HelpCircle,
  ClipboardCheck,
  Calendar,
  FileEdit,
  Receipt,
  FileText,
  LucideIcon,
} from "lucide-react";
import { RecentActivity as RecentActivityType } from "@/types/project-home";
import { cn } from "@/lib/utils";

interface RecentActivityProps {
  activities: RecentActivityType[];
  projectId: string;
}

const activityIconMap: Record<string, LucideIcon> = {
  rfi: HelpCircle,
  submittal: ClipboardCheck,
  "daily-log": Calendar,
  "change-order": FileEdit,
  invoice: Receipt,
  document: FileText,
};

const activityColorMap: Record<string, string> = {
  rfi: "bg-blue-100 text-blue-600",
  submittal: "bg-green-100 text-green-600",
  "daily-log": "bg-purple-100 text-purple-600",
  "change-order": "bg-orange-100 text-orange-600",
  invoice: "bg-yellow-100 text-yellow-600",
  document: "bg-muted text-foreground",
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else if (days === 1) {
    return "Yesterday";
  } else {
    return `${days}d ago`;
  }
}

export function RecentActivity({ activities, projectId }: RecentActivityProps) {
  return (
    <div className="bg-background rounded-md border border-border p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Recent Activity
      </h3>
      <div className="space-y-4">
        {activities.map((activity) => {
          const Icon = activityIconMap[activity.type] || FileText;
          const colorClass =
            activityColorMap[activity.type] || "bg-muted text-foreground";
          const href = activity.link.replace("[projectId]", projectId);

          return (
            <Link
              key={activity.id}
              href={href}
              className="flex items-start gap-3 group"
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  colorClass,
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground group-hover:text-primary truncate">
                  {activity.title}
                </p>
                <p className="text-xs text-muted-foreground">{activity.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activity.user} • {formatRelativeTime(activity.timestamp)}
                </p>
              </div>
            </Link>
          );
        })}

        {activities.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No recent activity
          </p>
        )}
      </div>

      <Link
        href={`/projects/${projectId}/activity`}
        className="mt-4 block text-center text-sm text-primary hover:underline"
      >
        View all activity
      </Link>
    </div>
  );
}
