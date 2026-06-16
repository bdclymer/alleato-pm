"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit, X, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DetailField, DetailFieldGrid, EmptyState } from "@/components/ds";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  PunchItemFormDialog,
  type PunchItemFormValues,
} from "@/components/domain/punch-items/punch-item-form-dialog";
import {
  PunchItemStatusBadge,
  PunchItemPriorityBadge,
} from "@/components/domain/punch-items/punch-item-status-badge";
import { useUpdatePunchItem } from "@/hooks/use-punch-items";
import type { Database } from "@/types/database.types";

type PunchItemRow = Database["public"]["Tables"]["punch_items"]["Row"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [year, month, day] = value.split("T")[0].split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Status transition map
// ---------------------------------------------------------------------------

const STATUS_TRANSITIONS: Record<
  PunchItemRow["status"],
  { label: string; next: PunchItemRow["status"] }[]
> = {
  draft: [{ label: "Initiate", next: "initiated" }],
  initiated: [
    { label: "Mark Work Required", next: "work_required" },
    { label: "Close", next: "closed" },
  ],
  work_required: [
    { label: "Re-initiate", next: "initiated" },
    { label: "Close", next: "closed" },
  ],
  closed: [{ label: "Reopen", next: "initiated" }],
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface PunchItemDetailProps {
  item: PunchItemRow | null;
  projectId: number;
  punchItemId: string;
}

export function PunchItemDetail({ item, projectId, punchItemId }: PunchItemDetailProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const updateMutation = useUpdatePunchItem(projectId);

  if (!item) {
    return (
      <EmptyState
        icon={<ClipboardList />}
        title="Punch item not found"
        description="This punch item could not be found or may have been deleted."
        action={<Button variant="outline" onClick={() => router.push(`/${projectId}/punch-list`)}><ArrowLeft />Back to Punch List</Button>}
      />
    );
  }

  const handleEditSubmit = (data: PunchItemFormValues) => {
    updateMutation.mutate(
      { punchItemId, data },
      { onSuccess: () => setEditOpen(false) },
    );
  };

  const handleStatusTransition = (next: PunchItemRow["status"]) => {
    updateMutation.mutate({ punchItemId, data: { status: next } });
  };

  const transitions = STATUS_TRANSITIONS[item.status] ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Back + actions bar */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/${projectId}/punch-list`)}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Punch List
        </Button>
        <div className="flex items-center gap-2">
          {transitions.map((t) => (
            <Button
              key={t.next}
              size="sm"
              variant="outline"
              disabled={updateMutation.isPending}
              onClick={() => handleStatusTransition(t.next)}
            >
              {t.label}
            </Button>
          ))}
          <Button size="sm" onClick={() => setEditOpen(true)}>
            <Edit className="mr-1 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            #{item.number}
          </span>
          <PunchItemStatusBadge status={item.status} />
          {item.priority && <PunchItemPriorityBadge priority={item.priority} />}
          {item.is_deleted && (
            <Badge variant="destructive">
              <X className="mr-1 h-3 w-3" />
              Deleted
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-semibold">{item.title}</h1>
        {item.description && (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {item.description}
          </p>
        )}
      </div>

      <Separator />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left — assignment + scheduling */}
        <div>
          <SectionTitle>Assignment</SectionTitle>
          <DetailFieldGrid columns={2} className="sm:grid-cols-1">
            <DetailField label="Assignee Company" value={item.assignee_company} />
            <DetailField label="Ball in Court" value={item.ball_in_court} />
            <DetailField label="Due Date" value={formatDate(item.due_date)} />
            <DetailField label="Date Notified" value={formatDateTime(item.date_notified)} />
            <DetailField label="Date Resolved" value={formatDateTime(item.date_resolved)} />
            <DetailField label="Date Closed" value={formatDateTime(item.date_closed)} />
          </DetailFieldGrid>
        </div>

        {/* Right — categorisation */}
        <div>
          <SectionTitle>Categorisation</SectionTitle>
          <DetailFieldGrid columns={2} className="sm:grid-cols-1">
            <DetailField label="Location" value={item.location} />
            <DetailField label="Trade" value={item.trade} />
            <DetailField label="Type" value={item.type} />
            <DetailField label="Reference" value={item.reference} />
            <DetailField label="Drawing Ref" value={item.drawing_reference} />
            <DetailField label="Cost Code" value={item.cost_code} />
            {item.cost_impact != null && (
              <DetailField label="Cost Impact" value={item.cost_impact} currency />
            )}
          </DetailFieldGrid>
        </div>
      </div>

      <Separator />

      {/* Audit */}
      <div>
        <SectionTitle>Audit</SectionTitle>
        <DetailFieldGrid columns={2}>
          <DetailField label="Created" value={formatDateTime(item.created_at)} />
          <DetailField label="Last Updated" value={formatDateTime(item.updated_at)} />
        </DetailFieldGrid>
      </div>

      {/* Edit dialog */}
      <PunchItemFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEditSubmit}
        defaultValues={item}
        isLoading={updateMutation.isPending}
        mode="edit"
        projectId={projectId}
      />
    </div>
  );
}
