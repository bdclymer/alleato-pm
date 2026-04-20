"use client";

import * as React from "react";
import Link from "next/link";
import {
  Home,
  Users,
  FileText,
  Image,
  HelpCircle,
  ClipboardCheck,
  Calendar,
  Users2,
  CalendarDays,
  CheckSquare,
  DollarSign,
  FileSignature,
  Handshake,
  Receipt,
  FileEdit,
  LucideIcon,
} from "lucide-react";
import { ProjectTool } from "@/types/project-home";
import { cn } from "@/lib/utils";

interface ProjectToolsGridProps {
  tools: ProjectTool[];
  projectId: string;
  title: string;
}

const iconMap: Record<string, LucideIcon> = {
  Home,
  Users,
  FileText,
  Image,
  HelpCircle,
  ClipboardCheck,
  Calendar,
  Users2,
  CalendarDays,
  CheckSquare,
  DollarSign,
  FileSignature,
  Handshake,
  Receipt,
  FileEdit,
};

export function ProjectToolsGrid({
  tools,
  projectId,
  title,
}: ProjectToolsGridProps) {
  return (
    <div className="bg-background rounded-md border border-border p-6">
      {/* eslint-disable-next-line design-system/no-raw-heading */}
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tools.map((tool) => {
          const Icon = iconMap[tool.icon] || FileText;
          const href = tool.href.replace("[projectId]", projectId);

          return (
            <Link
              key={tool.id}
              href={href}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-md border border-border",
                "hover:border-primary hover:bg-orange-50/50 transition-colors",
                "group",
              )}
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10">
                <Icon className="w-5 h-5 text-foreground group-hover:text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground group-hover:text-primary">
                  {tool.name}
                </p>
                {tool.itemCount !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    {tool.itemCount} items
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
