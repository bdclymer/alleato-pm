"use client";

import { useEffect, useState } from "react";
import { BaseModal, ModalBody, ModalFooter } from "./modals/BaseModal";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface HistoryEntry {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: {
    id: string;
    email: string;
    name: string;
  };
  changed_at: string;
  change_type: "create" | "update" | "delete";
  notes: string | null;
}

interface BudgetLineHistoryModalProps {
  open: boolean;
  onClose: () => void;
  lineItem: {
    id: string;
    description: string;
    costCode: string;
  };
  projectId: string;
}

export function BudgetLineHistoryModal({
  open,
  onClose,
  lineItem,
  projectId,
}: BudgetLineHistoryModalProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/projects/${projectId}/budget/lines/${lineItem.id}/history`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch change history");
        }

        const data = await response.json();
        setHistory(data.history || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [open, lineItem.id, projectId]);

  const formatFieldName = (fieldName: string) => {
    const fieldMap: Record<string, string> = {
      quantity: "Quantity",
      unit_cost: "Unit Cost",
      description: "Description",
      deleted: "Status",
    };
    return fieldMap[fieldName] || fieldName;
  };

  const formatValue = (fieldName: string, value: string | null) => {
    if (value === null || value === "") return "Empty";

    if (fieldName === "unit_cost") {
      const num = parseFloat(value);
      return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    if (fieldName === "quantity") {
      const num = parseFloat(value);
      return num.toLocaleString("en-US");
    }

    return value;
  };

  return (
    <BaseModal isOpen={open} onClose={onClose} title="Change History" size="md">
      <ModalBody className="space-y-4 bg-background">
        <div className="rounded-lg border border-border bg-muted px-4 py-4 shadow-sm">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Line Item
          </div>
          <div className="mt-1 font-semibold text-foreground">
            {lineItem.costCode}
          </div>
          <div className="text-sm text-muted-foreground">{lineItem.description}</div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading history...</div>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && history.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No changes recorded yet</p>
          </div>
        )}

        {!loading && !error && history.length > 0 && (
          <div className="space-y-4">
            {history.map((entry, index) => (
              <div
                key={entry.id}
                className={`border-l-4 ${
                  entry.change_type === "create"
                    ? "border-success/70"
                    : entry.change_type === "delete"
                      ? "border-destructive/70"
                      : "border-info/70"
                } pl-4 pb-4 ${index < history.length - 1 ? "mb-1" : ""} rounded-lg bg-background shadow-[0_10px_30px_-24px_rgba(0,0,0,0.45)]`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                      entry.change_type === "create"
                        ? "bg-success/10 text-success"
                        : entry.change_type === "delete"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-info/10 text-info"
                    }`}
                  >
                    {entry.change_type === "create" && (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    )}
                    {entry.change_type === "delete" && (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                    {entry.change_type === "update" && (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">
                      {entry.changed_by.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.changed_at), {
                        addSuffix: true,
                      })}
                    </div>
                    <div className="mt-2 text-sm">
                      {entry.change_type === "create" && (
                        <span className="text-foreground">
                          Created {formatFieldName(entry.field_name)}:{" "}
                          <span className="font-medium text-success">
                            {formatValue(entry.field_name, entry.new_value)}
                          </span>
                        </span>
                      )}
                      {entry.change_type === "delete" && (
                        <span className="text-foreground">
                          Deleted this line item
                        </span>
                      )}
                      {entry.change_type === "update" && (
                        <span className="text-foreground">
                          Changed {formatFieldName(entry.field_name)} from{" "}
                          <span className="line-through text-destructive">
                            {formatValue(entry.field_name, entry.old_value)}
                          </span>{" "}
                          to{" "}
                          <span className="font-medium text-success">
                            {formatValue(entry.field_name, entry.new_value)}
                          </span>
                        </span>
                      )}
                    </div>
                    {entry.notes && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Notes: {entry.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button
          variant="outline"
          onClick={onClose}
          className="w-full sm:w-auto"
        >
          Close
        </Button>
      </ModalFooter>
    </BaseModal>
  );
}
