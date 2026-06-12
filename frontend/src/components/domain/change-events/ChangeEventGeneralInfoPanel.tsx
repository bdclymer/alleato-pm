"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import type { ChangeEventDetail } from "@/types/change-events";
import { EntityAttachments, StatusBadge } from "@/components/ds";
import {
  ContentSectionStack,
  LabelValueRow,
  SectionRuleHeading,
} from "@/components/layout";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Options ────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "Open", label: "Open" },
  { value: "Pending Approval", label: "Pending Approval" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
  { value: "Closed", label: "Closed" },
  { value: "Void", label: "Void" },
];

const ORIGIN_OPTIONS = [
  { value: "Internal", label: "Internal" },
  { value: "RFI", label: "RFI" },
  { value: "Field", label: "Field" },
  { value: "Emails", label: "Emails" },
  { value: "Meetings", label: "Meetings" },
];

const TYPE_OPTIONS = [
  { value: "Owner Change", label: "Owner Change" },
  { value: "Design Change", label: "Design Change" },
  { value: "Allowance", label: "Allowance" },
  { value: "Contingency", label: "Contingency" },
  { value: "Scope Gap", label: "Scope Gap" },
  { value: "TBD", label: "TBD" },
  { value: "Transfer", label: "Transfer" },
  { value: "Unforeseen Condition", label: "Unforeseen Condition" },
  { value: "Value Engineering", label: "Value Engineering" },
  { value: "Owner Requested", label: "Owner Requested" },
  { value: "Constructability Issue", label: "Constructability Issue" },
];

const REASON_OPTIONS = [
  { value: "Allowance", label: "Allowance" },
  { value: "Back Charge", label: "Back Charge" },
  { value: "Client Request", label: "Client Request" },
  { value: "Design Development", label: "Design Development" },
  { value: "Existing Condition", label: "Existing Condition" },
];

const SCOPE_OPTIONS = [
  { value: "TBD", label: "TBD" },
  { value: "In Scope", label: "In Scope" },
  { value: "Out of Scope", label: "Out of Scope" },
  { value: "Allowance", label: "Allowance" },
];

const REVENUE_SOURCE_OPTIONS = [
  { value: "Match Revenue to Latest Cost", label: "Match Revenue to Latest Cost" },
  { value: "Enter manually", label: "Enter manually" },
  { value: "Quantity x Unit Cost", label: "Quantity x Unit Cost" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(value: string | number | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// ── Inline edit shell ──────────────────────────────────────────────────────────

interface EditShellProps {
  editing: boolean;
  onStartEdit: () => void;
  display: React.ReactNode;
  input: React.ReactNode;
  missing?: boolean;
}

function EditShell({ editing, onStartEdit, display, input, missing }: EditShellProps) {
  if (editing) return <>{input}</>;
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={onStartEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onStartEdit();
      }}
      className={cn(
        "inline-flex cursor-text rounded px-1 -mx-1 transition-colors hover:bg-muted/70 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/50",
        missing && "text-muted-foreground/50 italic",
      )}
    >
      <span className="text-sm">{display}</span>
    </span>
  );
}

// ── InlineText ─────────────────────────────────────────────────────────────────

interface InlineTextProps {
  value: string | null | undefined;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
  fieldKey: string;
  placeholder?: string;
}

function InlineText({ value, onSave, fieldKey, placeholder = "Not set" }: InlineTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraft(value ?? "");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const save = async () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== (value ?? "").trim()) {
      await onSave({ [fieldKey]: trimmed || null });
    }
  };

  return (
    <EditShell
      editing={editing}
      onStartEdit={startEdit}
      missing={!value}
      display={value || placeholder}
      input={
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void save()}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save();
            if (e.key === "Escape") { setDraft(value ?? ""); setEditing(false); }
          }}
          className="h-7 px-2 py-0.5 text-sm"
          placeholder={placeholder}
        />
      }
    />
  );
}

// ── InlineSelect ───────────────────────────────────────────────────────────────

interface InlineSelectProps {
  value: string | null | undefined;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
  fieldKey: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

function InlineSelect({ value, onSave, fieldKey, options, placeholder = "Not set" }: InlineSelectProps) {
  const [editing, setEditing] = useState(false);

  const startEdit = () => setEditing(true);

  const displayLabel = options.find((o) => o.value === value)?.label ?? value ?? placeholder;

  return (
    <EditShell
      editing={editing}
      onStartEdit={startEdit}
      missing={!value}
      display={displayLabel}
      input={
        <Select
          defaultValue={value ?? ""}
          open={editing}
          onOpenChange={(open) => { if (!open) setEditing(false); }}
          onValueChange={async (newVal) => {
            setEditing(false);
            await onSave({ [fieldKey]: newVal || null });
          }}
        >
          <SelectTrigger className="h-7 text-sm">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{placeholder}</SelectItem>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    />
  );
}

// ── InlineTextarea ─────────────────────────────────────────────────────────────

interface InlineTextareaProps {
  value: string | null | undefined;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
  fieldKey: string;
  placeholder?: string;
}

function InlineTextarea({ value, onSave, fieldKey, placeholder = "Add a description…" }: InlineTextareaProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const startEdit = () => {
    setDraft(value ?? "");
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const save = async () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== (value ?? "").trim()) {
      await onSave({ [fieldKey]: trimmed || null });
    }
  };

  if (editing) {
    return (
      <Textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void save()}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setDraft(value ?? ""); setEditing(false); }
        }}
        rows={4}
        className="resize-y text-sm"
        placeholder={placeholder}
      />
    );
  }

  return (
    <EditShell
      editing={false}
      onStartEdit={startEdit}
      missing={!value}
      display={
        value ? (
          <span className="whitespace-pre-wrap leading-relaxed">{value}</span>
        ) : (
          <span className="text-muted-foreground/50 italic">{placeholder}</span>
        )
      }
      input={null}
    />
  );
}

// ── InlineBoolToggle ───────────────────────────────────────────────────────────

interface InlineBoolToggleProps {
  value: boolean;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
  fieldKey: string;
}

function InlineBoolToggle({ value, onSave, fieldKey }: InlineBoolToggleProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => void onSave({ [fieldKey]: !value })}
      className="h-auto px-1 -mx-1 text-sm font-normal"
    >
      {value ? "Yes" : "No"}
    </Button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface ChangeEventGeneralInfoPanelProps {
  changeEvent: ChangeEventDetail;
  projectId: number;
  onFieldSaved?: () => void;
}

export function ChangeEventGeneralInfoPanel({
  changeEvent,
  projectId,
  onFieldSaved,
}: ChangeEventGeneralInfoPanelProps) {
  const changeEventId = String(changeEvent.id);
  const primeContractId = changeEvent.prime_contract_id ?? changeEvent.primeContractId;
  const primeContractDisplayName =
    (changeEvent.primeContract as { display_name?: string } | null)?.display_name ||
    changeEvent.primeContract?.title ||
    changeEvent.primeContract?.contract_number ||
    null;
  const lineItemRevenueSource =
    changeEvent.line_item_revenue_source ?? changeEvent.lineItemRevenueSource;
  const expectingRevenue =
    changeEvent.expectingRevenue ?? changeEvent.expecting_revenue ?? true;
  type TotalsShape = { revenueRom: string | number; costRom: string | number; nonCommittedCost: string | number };
  const totals: TotalsShape = ((changeEvent as unknown as Record<string, unknown>).totals as TotalsShape | undefined)
    ?? { revenueRom: "0", costRom: "0", nonCommittedCost: "0" };

  const save = useCallback(
    async (updates: Record<string, unknown>) => {
      try {
        await apiFetch(
          `/api/projects/${projectId}/change-events/${changeEventId}`,
          {
            method: "PATCH",
            body: JSON.stringify(updates),
          },
        );
        toast.success("Saved");
        onFieldSaved?.();
      } catch {
        toast.error("Failed to save");
      }
    },
    [projectId, changeEventId, onFieldSaved],
  );

  return (
    <ContentSectionStack>
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] gap-x-16 gap-y-10">
          {/* Left column */}
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-14 gap-y-8">
              {/* Details */}
              <div className="space-y-4">
                <SectionRuleHeading label="Details" className="[&_span]:text-primary" />
                <dl className="space-y-4 text-sm">
                  <LabelValueRow label="Number">
                    {changeEvent.number || `CE-${changeEvent.id}`}
                  </LabelValueRow>
                  <LabelValueRow label="Title">
                    <InlineText
                      value={changeEvent.title}
                      fieldKey="title"
                      onSave={save}
                    />
                  </LabelValueRow>
                  <LabelValueRow label="Status">
                    {changeEvent.status ? (
                      <InlineSelect
                        value={changeEvent.status}
                        fieldKey="status"
                        options={STATUS_OPTIONS}
                        onSave={save}
                      />
                    ) : (
                      <InlineSelect
                        value={null}
                        fieldKey="status"
                        options={STATUS_OPTIONS}
                        onSave={save}
                        placeholder="Set status"
                      />
                    )}
                  </LabelValueRow>
                  <LabelValueRow label="Expecting Revenue">
                    <InlineBoolToggle
                      value={expectingRevenue}
                      fieldKey="expectingRevenue"
                      onSave={save}
                    />
                  </LabelValueRow>
                  <LabelValueRow label="Revenue Source" missing={!lineItemRevenueSource}>
                    <InlineSelect
                      value={lineItemRevenueSource ?? null}
                      fieldKey="lineItemRevenueSource"
                      options={REVENUE_SOURCE_OPTIONS}
                      onSave={save}
                      placeholder="Not set"
                    />
                  </LabelValueRow>
                  <LabelValueRow label="Prime Contract" missing={!primeContractId}>
                    {primeContractId ? (
                      <a
                        href={`/${projectId}/prime-contracts/${primeContractId}`}
                        className="text-primary hover:underline text-sm"
                      >
                        {primeContractDisplayName || "Linked Prime Contract"}
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground/50 italic">Not set</span>
                    )}
                  </LabelValueRow>
                </dl>

                {/* Attachments */}
                <div className="pt-2">
                  <EntityAttachments
                    entityType="change_order"
                    entityId={String(changeEvent.id)}
                    projectId={String(projectId)}
                  />
                </div>
              </div>

              {/* Reason for Change */}
              <div>
                <SectionRuleHeading label="Reason for Change" className="[&_span]:text-primary" />
                <dl className="space-y-4 text-sm">
                  <LabelValueRow label="Origin" missing={!changeEvent.origin}>
                    <InlineSelect
                      value={changeEvent.origin ?? null}
                      fieldKey="origin"
                      options={ORIGIN_OPTIONS}
                      onSave={save}
                      placeholder="Not set"
                    />
                  </LabelValueRow>
                  <LabelValueRow label="Type" missing={!changeEvent.type}>
                    <InlineSelect
                      value={changeEvent.type ?? null}
                      fieldKey="type"
                      options={TYPE_OPTIONS}
                      onSave={save}
                      placeholder="Not set"
                    />
                  </LabelValueRow>
                  <LabelValueRow label="Scope" missing={!changeEvent.scope}>
                    <InlineSelect
                      value={changeEvent.scope ?? null}
                      fieldKey="scope"
                      options={SCOPE_OPTIONS}
                      onSave={save}
                      placeholder="Not set"
                    />
                  </LabelValueRow>
                  <LabelValueRow label="Change Reason" missing={!changeEvent.reason}>
                    <InlineSelect
                      value={changeEvent.reason ?? null}
                      fieldKey="reason"
                      options={REASON_OPTIONS}
                      onSave={save}
                      placeholder="Not set"
                    />
                  </LabelValueRow>
                  <LabelValueRow label="Description" missing={!changeEvent.description} stacked>
                    <InlineTextarea
                      value={stripHtml(changeEvent.description)}
                      fieldKey="description"
                      onSave={save}
                    />
                  </LabelValueRow>
                </dl>
              </div>
            </div>
          </div>

          {/* Right sidebar: Totals */}
          <div className="space-y-8">
            <div>
              <SectionRuleHeading label="Totals" className="[&_span]:text-primary" />
              <div className="rounded-md bg-muted p-6">
                <dl className="space-y-3 text-sm">
                  <LabelValueRow label="Revenue ROM">
                    {formatCurrency(totals.revenueRom)}
                  </LabelValueRow>
                  <LabelValueRow label="Cost ROM">
                    {formatCurrency(totals.costRom)}
                  </LabelValueRow>
                  <LabelValueRow label="Non-Committed Cost">
                    {formatCurrency(totals.nonCommittedCost)}
                  </LabelValueRow>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </section>
    </ContentSectionStack>
  );
}
