"use client";

import * as React from "react";
import { FileText, Download, Calendar } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { EmptyState } from "@/components/ds";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useProgressReports } from "@/hooks/use-progress-reports";

interface ProgressReport {
  id: string;
  title: string;
  date: Date;
  type: "weekly" | "monthly" | "daily";
  status: "draft" | "published";
  keyHighlights?: string[];
  author: string;
}

interface ProgressReportsProps {
  projectId: string;
}

export function ProgressReports({ projectId }: ProgressReportsProps) {
  const numericProjectId = Number(projectId);
  const reportsQuery = useProgressReports(numericProjectId);
  const reports: ProgressReport[] =
    reportsQuery.data?.reports.map((report) => ({
      id: report.id,
      title: report.title,
      date: new Date(report.week_end),
      type: report.report_type,
      status: report.status === "sent" ? "published" : "draft",
      keyHighlights: report.past_week_highlights
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      author: report.created_by ?? "Unknown",
    })) ?? [];

  const getTypeColor = (type: string) => {
    switch (type) {
      case "weekly":
        return "bg-blue-100 text-blue-700";
      case "monthly":
        return "bg-purple-100 text-purple-700";
      case "daily":
        return "bg-green-100 text-green-700";
      default:
        return "bg-muted text-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    return status === "published"
      ? "bg-success/10 text-success"
      : "bg-warning/10 text-warning";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground">
          Track project progress through detailed reports
        </p>
        <Button size="sm" className="gap-2">
          <FileText />
          Create Report
        </Button>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {reportsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading reports...</p>
        ) : reportsQuery.error ? (
          <EmptyState
            icon={<FileText />}
            title="Progress reports could not be loaded"
            description={reportsQuery.error.message}
          />
        ) : reports.length === 0 ? (
          <EmptyState
            icon={<FileText />}
            title="No progress reports"
            description="Progress reports will appear here after they are created for this project."
          />
        ) : (
          reports.map((report) => (
          <Card key={report.id} className="hover:shadow-xs transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    {/* eslint-disable-next-line design-system/no-raw-heading */}
                    <h4 className="text-sm font-semibold text-foreground">
                      {report.title}
                    </h4>
                    <Badge
                      variant="secondary"
                      className={getTypeColor(report.type)}
                    >
                      {report.type}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={getStatusColor(report.status)}
                    >
                      {report.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{format(report.date, "MMM d, yyyy")}</span>
                    </div>
                    <span>by {report.author}</span>
                  </div>

                  {/* Key Highlights */}
                  {report.keyHighlights && report.keyHighlights.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-foreground">
                        Key Highlights:
                      </p>
                      <ul className="text-xs text-foreground space-y-0.5">
                        {report.keyHighlights.map((highlight, index) => (
                          <li key={index} className="flex items-start gap-1">
                            <span className="text-muted-foreground mt-0.5">•</span>
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <Link
                    href={`/${projectId}/reports/${report.id}`}
                    className="text-link hover:text-link-hover text-sm"
                  >
                    View
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    title="Download Report"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          ))
        )}
      </div>

      {/* View All Link */}
      <div className="text-center pt-2">
        <Link
          href={`/${projectId}/reports`}
          className="text-sm text-link hover:text-link-hover hover:underline"
        >
          View all reports →
        </Link>
      </div>
    </div>
  );
}
