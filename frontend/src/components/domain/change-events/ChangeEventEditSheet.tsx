"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/api-client";
import type { ChangeEventDetail } from "@/types/change-events";

interface FormState {
  title: string;
  status: string;
  type: string;
  scope: string;
  origin: string;
  reason: string;
  description: string;
  expectingRevenue: boolean;
  lineItemRevenueSource: string;
}

interface ChangeEventEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  changeEventId: string;
  changeEvent: ChangeEventDetail;
  onSaved: () => void;
}

const TYPE_OPTIONS = [
  "Owner Change",
  "Design Change",
  "Allowance",
  "Contingency",
  "Scope Gap",
  "TBD",
  "Transfer",
  "Unforeseen Condition",
  "Value Engineering",
  "Owner Requested",
  "Constructability Issue",
];

const SCOPE_OPTIONS = ["TBD", "In Scope", "Out of Scope", "Allowance"];

const ORIGIN_OPTIONS = ["Internal", "RFI", "Field", "Emails", "Meetings", "RFI's"];

const REASON_OPTIONS = [
  "Allowance",
  "Back Charge",
  "Client Request",
  "Design Development",
  "Existing Condition",
];

const STATUS_OPTIONS = [
  "Open",
  "Pending Approval",
  "Approved",
  "Rejected",
  "Closed",
];

const REVENUE_SOURCE_OPTIONS = [
  "Match Revenue to Latest Cost",
  "Enter manually",
  "Quantity x Unit Cost",
];

const NONE_SENTINEL = "__none__";

function buildInitialState(ce: ChangeEventDetail): FormState {
  return {
    title: ce.title ?? "",
    status: ce.status ?? "Open",
    type: ce.type ?? "",
    scope: ce.scope ?? "TBD",
    origin: ce.origin ?? "",
    reason: ce.reason ?? "",
    description: ce.description ?? "",
    expectingRevenue: ce.expectingRevenue ?? ce.expecting_revenue ?? true,
    lineItemRevenueSource: ce.lineItemRevenueSource ?? ce.line_item_revenue_source ?? "",
  };
}

export function ChangeEventEditSheet({
  open,
  onOpenChange,
  projectId,
  changeEventId,
  changeEvent,
  onSaved,
}: ChangeEventEditSheetProps) {
  const [form, setForm] = useState<FormState>(() => buildInitialState(changeEvent));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(buildInitialState(changeEvent));
    }
  }, [open, changeEvent]);

  const set = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        status: form.status,
        type: form.type,
        scope: form.scope,
        description: form.description.trim() || null,
        expectingRevenue: form.expectingRevenue,
      };
      if (form.origin) payload.origin = form.origin;
      if (form.reason) payload.reason = form.reason;
      if (form.expectingRevenue && form.lineItemRevenueSource) {
        payload.lineItemRevenueSource = form.lineItemRevenueSource;
      }

      await apiFetch(
        `/api/projects/${projectId}/change-events/${changeEventId}`,
        { method: "PATCH", body: JSON.stringify(payload) },
      );
      toast.success("Change event saved");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to save change event", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  }, [form, projectId, changeEventId, onSaved, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl flex flex-col overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Change Event</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-5 px-6 py-3 overflow-y-auto">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="ce-title">Title</Label>
            <Input
              id="ce-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Change event title"
            />
          </div>

          {/* Status + Type row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Scope + Origin row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Scope</Label>
              <Select value={form.scope} onValueChange={(v) => set("scope", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  {SCOPE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Origin</Label>
              <Select
                value={form.origin || NONE_SENTINEL}
                onValueChange={(v) => set("origin", v === NONE_SENTINEL ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select origin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_SENTINEL}>None</SelectItem>
                  {ORIGIN_OPTIONS.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Change Reason */}
          <div className="space-y-1.5">
            <Label>Change Reason</Label>
            <Select
              value={form.reason || NONE_SENTINEL}
              onValueChange={(v) => set("reason", v === NONE_SENTINEL ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_SENTINEL}>None</SelectItem>
                {REASON_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="ce-description">Description</Label>
            <Textarea
              id="ce-description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Add a description..."
              rows={4}
            />
          </div>

          {/* Expecting Revenue toggle */}
          <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2.5">
            <Label htmlFor="ce-revenue" className="cursor-pointer">
              Expecting Revenue
            </Label>
            <Switch
              id="ce-revenue"
              checked={form.expectingRevenue}
              onCheckedChange={(v) => set("expectingRevenue", v)}
            />
          </div>

          {/* Revenue Source — only when expecting revenue */}
          {form.expectingRevenue && (
            <div className="space-y-1.5">
              <Label>Revenue Source</Label>
              <Select
                value={form.lineItemRevenueSource || NONE_SENTINEL}
                onValueChange={(v) =>
                  set("lineItemRevenueSource", v === NONE_SENTINEL ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select revenue source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_SENTINEL}>None</SelectItem>
                  {REVENUE_SOURCE_OPTIONS.map((rs) => (
                    <SelectItem key={rs} value={rs}>{rs}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <SheetFooter className="border-t border-border">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
