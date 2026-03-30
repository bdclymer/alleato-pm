"use client";

import { Button } from "@/components/ui/button";
import { FileCheck2, X } from "lucide-react";

interface ChangeEventStatusActionsProps {
  status: string | null;
  onStatusChange: (newStatus: string) => void;
}

export function ChangeEventStatusActions({
  status,
  onStatusChange,
}: ChangeEventStatusActionsProps) {
  const normalizedStatus = status?.toLowerCase().replace(/\s+/g, "_") ?? "";

  return (
    <div className="flex items-center gap-2 mb-4">
      {normalizedStatus === "open" && (
        <Button
          size="sm"
          onClick={() => onStatusChange("pending_approval")}
          data-testid="change-event-submit-approval"
        >
          <FileCheck2 className="mr-1.5 h-4 w-4" />
          Submit for Approval
        </Button>
      )}

      {(normalizedStatus === "pending_approval" ||
        normalizedStatus === "pending") && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStatusChange("approved")}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onStatusChange("rejected")}
          >
            Reject
          </Button>
        </>
      )}

      {normalizedStatus !== "closed" && normalizedStatus !== "converted" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onStatusChange("closed")}
        >
          <X className="mr-1.5 h-4 w-4" />
          Close
        </Button>
      )}
    </div>
  );
}
