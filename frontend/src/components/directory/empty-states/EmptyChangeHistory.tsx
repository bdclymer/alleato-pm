import { History } from "lucide-react";
import { EmptyState } from "@/components/ds";

interface EmptyChangeHistoryProps {
  entityType?: "company" | "user" | "project";
}

export function EmptyChangeHistory({
  entityType = "project",
}: EmptyChangeHistoryProps) {
  const entityLabel =
    entityType === "company"
      ? "company"
      : entityType === "user"
        ? "user"
        : "project";

  return (
    <EmptyState
      icon={<History className="h-12 w-12" />}
      title="No change history"
      description={`No changes have been recorded for this ${entityLabel} yet. All modifications will appear here.`}
    />
  );
}
