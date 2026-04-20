"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Send } from "lucide-react";

import { StatusBadge, EmptyState } from "@/components/ds";
import { Button } from "@/components/ui/button";
import type { ChangeEventRfq } from "@/types/change-events";
import { formatDate } from "@/lib/format";

type RfqWithResponseCount = ChangeEventRfq & { response_count?: number };

interface ChangeEventRfqsTabProps {
  projectId: number;
  changeEventId: string;
  onSendRfq?: () => void;
}

function formatMoney(value: number | string | null | undefined): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Sent: "bg-primary/10 text-primary",
  Responded: "bg-green-100 text-green-800",
  Closed: "bg-muted text-muted-foreground",
};

export function ChangeEventRfqsTab({
  projectId,
  changeEventId,
  onSendRfq,
}: ChangeEventRfqsTabProps) {
  const [rfqs, setRfqs] = useState<RfqWithResponseCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRfqs = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(
        `/api/projects/${projectId}/change-events/rfqs?changeEventId=${changeEventId}`,
      );
      if (!res.ok) return;
      const json = await res.json();
      const data: RfqWithResponseCount[] = Array.isArray(json)
        ? json
        : (json.data ?? []);
      setRfqs(data);
    } catch {
      // Non-critical
    } finally {
      setIsLoading(false);
    }
  }, [projectId, changeEventId]);

  useEffect(() => {
    void fetchRfqs();
  }, [fetchRfqs]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  if (rfqs.length === 0) {
    return (
      <EmptyState
        icon={<Send />}
        title="No RFQs"
        description="Send a Request for Quote to vendors for this change event."
        action={
          onSendRfq ? (
            <Button size="sm" variant="outline" onClick={onSendRfq}>
              <Plus />
              Send RFQ
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between pb-2">
        <p className="text-sm text-muted-foreground">
          {rfqs.length} RFQ{rfqs.length !== 1 ? "s" : ""}
        </p>
        {onSendRfq && (
          <Button size="sm" variant="outline" onClick={onSendRfq}>
            <Send className="mr-2 h-4 w-4" />
            New RFQ
          </Button>
        )}
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">RFQ #</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Title</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Due Date</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Est. Total</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Responses</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rfqs.map((rfq) => (
              <tr key={rfq.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">
                  {rfq.rfq_number}
                </td>
                <td className="px-4 py-3 font-medium">{rfq.title}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={rfq.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(rfq.due_date)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatMoney(rfq.estimated_total_amount)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {rfq.response_count ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
