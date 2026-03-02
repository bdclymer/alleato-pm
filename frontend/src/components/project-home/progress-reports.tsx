"use client";

import * as React from "react";
import { FileText, Download, Calendar, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ProgressReport {
  id: string;
  title: string;
  date: Date;
  type: "weekly" | "monthly" | "daily";
  status: "draft" | "published";
  completionPercentage: number;
  keyHighlights?: string[];
  author: string;
}

interface ProgressReportsProps {
  projectId: string;
}

export function ProgressReports({ projectId }: ProgressReportsProps) {
  // Mock data - in production this would come from Supabase
  const mockReports: ProgressReport[] = [
    {
      id: "1",
      title: "Week 12 Progress Report",
      date: new Date("2024-03-15"),
      type: "weekly",
      status: "published",
      completionPercentage: 78,
      keyHighlights: [
        "Foundation work completed",
        "Steel structure 60% complete",
        "MEP installation started",
      ],
      author: "John Smith",
    },
    {
      id: "2",
      title: "February Monthly Report",
      date: new Date("2024-02-29"),
      type: "monthly",
      status: "published",
      completionPercentage: 65,
      keyHighlights: [
        "Sitework completed ahead of schedule",
        "Resolved permitting issues",
        "Material deliveries on track",
      ],
      author: "Jane Doe",
    },
    {
      id: "3",
      title: "Daily Progress - March 18",
      date: new Date("2024-03-18"),
      type: "daily",
      status: "draft",
      completionPercentage: 80,
      keyHighlights: [
        "Concrete pour completed for Level 2",
        "15 workers on site",
        "Weather delay expected tomorrow",
      ],
      author: "Mike Johnson",
    },
  ];

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
          <FileText className="w-4 h-4" />
          Create Report
        </Button>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {mockReports.map((report) => (
          <Card key={report.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
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
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>{report.completionPercentage}% Complete</span>
                    </div>
                    <span>by {report.author}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-muted rounded-full h-2 mb-4">
                    <div
                      className="bg-info h-2 rounded-full transition-all"
                      style={{ width: `${report.completionPercentage}%` }}
                    />
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
                  <button
                    className="text-muted-foreground hover:text-foreground p-1"
                    title="Download Report"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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
