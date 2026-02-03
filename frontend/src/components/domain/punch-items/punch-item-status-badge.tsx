"use client";

import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  },
  work_required: {
    label: "Work Required",
    className: "bg-orange-100 text-orange-700 hover:bg-orange-100",
  },
  initiated: {
    label: "Initiated",
    className: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  },
  closed: {
    label: "Closed",
    className: "bg-green-100 text-green-700 hover:bg-green-100",
  },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  low: {
    label: "Low",
    className: "bg-gray-100 text-gray-600 hover:bg-gray-100",
  },
  medium: {
    label: "Medium",
    className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  },
  high: {
    label: "High",
    className: "bg-red-100 text-red-700 hover:bg-red-100",
  },
};

interface PunchItemStatusBadgeProps {
  status: string;
}

export function PunchItemStatusBadge({ status }: PunchItemStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    className: "bg-muted text-foreground",
  };

  return <Badge className={config.className}>{config.label}</Badge>;
}

interface PunchItemPriorityBadgeProps {
  priority: string | null;
}

export function PunchItemPriorityBadge({
  priority,
}: PunchItemPriorityBadgeProps) {
  if (!priority) return <span className="text-muted-foreground">-</span>;

  const config = PRIORITY_CONFIG[priority] || {
    label: priority,
    className: "bg-muted text-foreground",
  };

  return <Badge className={config.className}>{config.label}</Badge>;
}
