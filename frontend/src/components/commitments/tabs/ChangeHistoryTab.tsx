"use client";

import { memo } from "react";
import { History } from "lucide-react";

import { EmptyState } from "@/components/ds/empty-state";

interface ChangeHistoryTabProps {
  commitmentId: string;
}

export const ChangeHistoryTab = memo(function ChangeHistoryTab({
  commitmentId: _commitmentId,
}: ChangeHistoryTabProps) {
  return (
    <EmptyState
      icon={<History className="h-8 w-8" />}
      title="No change history available"
      description="Audit logging for commitment changes is not yet enabled. Future changes will be tracked here automatically."
    />
  );
});

ChangeHistoryTab.displayName = "ChangeHistoryTab";
