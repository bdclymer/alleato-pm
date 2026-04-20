"use client";

import * as React from "react";
import {
  MapPin,
  Phone,
  Calendar,
  DollarSign,
  Building2,
  Users,
} from "lucide-react";
import { ProjectInfo } from "@/types/project-home";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";

interface ProjectInfoCardProps {
  project: ProjectInfo;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}


export function ProjectInfoCard({ project }: ProjectInfoCardProps) {
  const stageColors: Record<string, string> = {
    Bid: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    Preconstruction: "bg-primary/10 text-primary",
    "In Progress": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    Warranty: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    Complete: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  };

  return (
    <div className="bg-background rounded-md border border-border p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          {/* eslint-disable-next-line design-system/no-raw-heading */}
          <h2 className="text-lg font-semibold text-foreground">
            {project.name}
          </h2>
          <p className="text-sm text-muted-foreground">#{project.projectNumber}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "px-2 py-1 text-xs font-medium rounded",
              project.status === "Active"
                ? "bg-success/10 text-success"
                : "bg-muted text-foreground",
            )}
          >
            {project.status}
          </span>
          <span
            className={cn(
              "px-2 py-1 text-xs font-medium rounded",
              stageColors[project.stage] || "bg-muted text-foreground",
            )}
          >
            {project.stage}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Location */}
        <div className="flex items-start gap-4">
          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Location</p>
            <p className="text-sm text-foreground">
              {project.address}
              <br />
              {project.city}, {project.state} {project.zip}
            </p>
          </div>
        </div>

        {/* Phone */}
        {project.phone && (
          <div className="flex items-start gap-4">
            <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Phone</p>
              <p className="text-sm text-foreground">{project.phone}</p>
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="flex items-start gap-4">
          <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Schedule</p>
            <p className="text-sm text-foreground">
              {formatDate(project.startDate)} -{" "}
              {formatDate(project.estimatedCompletionDate)}
            </p>
          </div>
        </div>

        {/* Project Value */}
        {project.projectValue && (
          <div className="flex items-start gap-4">
            <DollarSign className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Project Value</p>
              <p className="text-sm text-foreground">
                {formatCurrency(project.projectValue)}
              </p>
            </div>
          </div>
        )}

        {/* Owner */}
        {project.owner && (
          <div className="flex items-start gap-4">
            <Building2 className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Owner</p>
              <p className="text-sm text-foreground">{project.owner}</p>
            </div>
          </div>
        )}

        {/* Type */}
        <div className="flex items-start gap-4">
          <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Type</p>
            <p className="text-sm text-foreground">{project.type}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
