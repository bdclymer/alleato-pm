"use client";

import * as React from "react";
import {
  DollarSign,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Building,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface ProjectStat {
  title: string;
  value: string | number;
  subValue?: string;
  change?: {
    value: number;
    isPositive: boolean;
  };
  icon: React.ReactNode;
  href?: string;
  status?: "success" | "warning" | "error" | "neutral";
}

interface ProjectStatsCardsProps {
  projectId: string;
}

export function ProjectStatsCards({ projectId }: ProjectStatsCardsProps) {
  // Mock data - in production this would come from Supabase
  const stats: ProjectStat[] = [
    {
      title: "Contract Value",
      value: "$12,450,000",
      subValue: "Prime Contract",
      icon: <DollarSign className="w-4 h-4" />,
      href: `/${projectId}/prime-contracts`,
      status: "neutral",
    },
    {
      title: "Budget Status",
      value: "78%",
      subValue: "Committed: $9.7M",
      change: { value: 2.3, isPositive: true },
      icon: <TrendingUp className="w-4 h-4" />,
      href: `/${projectId}/budget`,
      status: "success",
    },
    {
      title: "Change Orders",
      value: 12,
      subValue: "Total: $450,000",
      change: { value: 3, isPositive: false },
      icon: <FileText className="w-4 h-4" />,
      href: `/${projectId}/change-orders`,
      status: "warning",
    },
    {
      title: "Open RFIs",
      value: 8,
      subValue: "4 Overdue",
      icon: <AlertCircle className="w-4 h-4" />,
      href: `/${projectId}/rfis`,
      status: "error",
    },
    {
      title: "Schedule Status",
      value: "On Track",
      subValue: "65% Complete",
      icon: <Calendar className="w-4 h-4" />,
      href: `/${projectId}/schedule`,
      status: "success",
    },
    {
      title: "Active Commitments",
      value: 24,
      subValue: "Total: $8.2M",
      icon: <FileText className="w-4 h-4" />,
      href: `/${projectId}/commitments`,
      status: "neutral",
    },
    {
      title: "Pending Submittals",
      value: 15,
      subValue: "6 In Review",
      icon: <Clock className="w-4 h-4" />,
      href: `/${projectId}/submittals`,
      status: "warning",
    },
    {
      title: "Project Duration",
      value: "240 Days",
      subValue: "156 Days Remaining",
      icon: <Building className="w-4 h-4" />,
      href: `/${projectId}/schedule`,
      status: "neutral",
    },
  ];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "success":
        return "text-success bg-success/10";
      case "warning":
        return "text-warning bg-warning/10";
      case "error":
        return "text-destructive bg-destructive/10";
      default:
        return "text-info bg-info/10";
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Link
          key={index}
          href={stat.href || "#"}
          className="block hover:no-underline"
        >
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm font-medium text-foreground">
                  {stat.title}
                </CardTitle>
                <div
                  className={`p-2 rounded-lg ${getStatusColor(stat.status)}`}
                >
                  {stat.icon}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </p>
                  {stat.change && (
                    <span
                      className={`text-xs font-medium ${
                        stat.change.isPositive
                          ? "text-success"
                          : "text-destructive"
                      }`}
                    >
                      {stat.change.isPositive ? "+" : ""}
                      {stat.change.value}%
                    </span>
                  )}
                </div>
                {stat.subValue && (
                  <p className="text-sm text-foreground">{stat.subValue}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
