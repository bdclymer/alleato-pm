"use client";

import * as React from "react";
import {
  Search,
  Plus,
  X,
  Trash2,
  ArrowRight,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ds";
import type { ChangeEvent } from "@/types/change-events";
import { SectionRuleHeading } from "@/components/layout/spacing";

// =============================================================================
// Types
// =============================================================================

export interface GroupedCE {
  id: string;
  number: string;
  title: string;
  type: string;
  estimatedAmount: number;
}

export interface LocalLineItem {
  tempId: string;
  description: string;
  quantity: number;
  uom: string;
  unitCost: number;
  category: string;
}

export interface PCOFormValues {
  title: string;
  type: "CLIENT_REQUESTED" | "INTERNAL" | "MIXED";
  description: string;
  rfqRequired: boolean;
  changeReason: string;
  location: string;
  reference: string;
  requestReceivedFrom: string;
  dueDate: string;
  isPrivate: boolean;
  fieldChange: boolean;
  paidInFull: boolean;
}

interface PCOWorkspaceProps {
  availableChangeEvents: ChangeEvent[];
  isLoadingCEs: boolean;
  formValues: PCOFormValues;
  onFormChange: (values: PCOFormValues) => void;
  groupedCEs: GroupedCE[];
  onAddCE: (ce: ChangeEvent) => void;
  onRemoveCE: (ceId: string) => void;
  lineItems: LocalLineItem[];
  onAddLineItem: () => void;
  onUpdateLineItem: (tempId: string, field: keyof LocalLineItem, value: string | number) => void;
  onRemoveLineItem: (tempId: string) => void;
  markupPercentage: number;
  onMarkupChange: (value: number) => void;
  onCancel: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  isSaving: boolean;
  isSubmitting: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

// =============================================================================
// Component
// =============================================================================

export function PCOWorkspace({
  availableChangeEvents,
  isLoadingCEs,
  formValues,
  onFormChange,
  groupedCEs,
  onAddCE,
  onRemoveCE,
  lineItems,
  onAddLineItem,
  onUpdateLineItem,
  onRemoveLineItem,
  markupPercentage,
  onMarkupChange,
  onCancel,
  onSaveDraft,
  onSubmit,
  isSaving,
  isSubmitting,
}: PCOWorkspaceProps) {
  const [ceSearch, setCESearch] = React.useState("");

  // Filter available CEs that are not already grouped
  const groupedIds = new Set(groupedCEs.map((ce) => String(ce.id)));
  const filteredCEs = React.useMemo(() => {
    const search = ceSearch.toLowerCase().trim();
    return availableChangeEvents.filter((ce) => {
      if (groupedIds.has(String(ce.id))) return false;
      if (!search) return true;
      const num = ce.number ?? "";
      return (
        num.toLowerCase().includes(search) ||
        (ce.title ?? "").toLowerCase().includes(search)
      );
    });
  }, [availableChangeEvents, groupedIds, ceSearch]);

  // Financial calculations
  const subtotal = lineItems.reduce(
    (sum, li) => sum + li.quantity * li.unitCost,
    0,
  );
  const markupAmount = subtotal * (markupPercentage / 100);
  const total = subtotal + markupAmount;

  const canSubmit =
    formValues.title.trim() !== "" &&
    groupedCEs.length > 0 &&
    lineItems.length > 0;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
      {/* ── Left Panel: Change Event Pool ── */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <SectionRuleHeading label="Available Change Events" />
          <span className="text-xs tabular-nums text-muted-foreground">
            {filteredCEs.length}
          </span>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search change events..."
            value={ceSearch}
            onChange={(e) => setCESearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="max-h-96 space-y-1.5 overflow-y-auto pr-1">
          {isLoadingCEs && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading change events...
            </p>
          )}
          {!isLoadingCEs && filteredCEs.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No ungrouped change events available.
            </p>
          )}
          {filteredCEs.map((ce) => (
            <div
              key={String(ce.id)}
              className="flex items-center gap-3 rounded-md bg-muted/40 px-3 py-2.5"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {ce.number ?? `CE-${ce.id}`}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {ce.title}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAddCE(ce)}
                className="shrink-0"
              >
                Add
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel: PCO Form ── */}
      <div className="lg:col-span-3 space-y-8">
        {/* Form fields */}
        <section className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pco-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="pco-title"
              placeholder="Enter PCO title"
              value={formValues.title}
              onChange={(e) =>
                onFormChange({ ...formValues, title: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pco-type">Type</Label>
            <Select
              value={formValues.type}
              onValueChange={(value) =>
                onFormChange({
                  ...formValues,
                  type: value as PCOFormValues["type"],
                })
              }
            >
              <SelectTrigger id="pco-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CLIENT_REQUESTED">
                  Client Requested
                </SelectItem>
                <SelectItem value="INTERNAL">Internal</SelectItem>
                <SelectItem value="MIXED">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pco-description">Description</Label>
            <Textarea
              id="pco-description"
              placeholder="Describe this potential change order..."
              value={formValues.description}
              onChange={(e) =>
                onFormChange({ ...formValues, description: e.target.value })
              }
              rows={3}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="pco-rfq"
              checked={formValues.rfqRequired}
              onCheckedChange={(checked) =>
                onFormChange({ ...formValues, rfqRequired: checked })
              }
            />
            <Label htmlFor="pco-rfq">RFQ Required</Label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pco-change-reason">Change Reason</Label>
              <Input
                id="pco-change-reason"
                placeholder="Reason for change"
                value={formValues.changeReason}
                onChange={(e) =>
                  onFormChange({ ...formValues, changeReason: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pco-location">Location</Label>
              <Input
                id="pco-location"
                placeholder="Location"
                value={formValues.location}
                onChange={(e) =>
                  onFormChange({ ...formValues, location: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pco-reference">Reference</Label>
              <Input
                id="pco-reference"
                placeholder="Reference number or note"
                value={formValues.reference}
                onChange={(e) =>
                  onFormChange({ ...formValues, reference: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pco-received-from">Request Received From</Label>
              <Input
                id="pco-received-from"
                placeholder="Name or company"
                value={formValues.requestReceivedFrom}
                onChange={(e) =>
                  onFormChange({ ...formValues, requestReceivedFrom: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pco-due-date">Due Date</Label>
              <Input
                id="pco-due-date"
                type="date"
                value={formValues.dueDate}
                onChange={(e) =>
                  onFormChange({ ...formValues, dueDate: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <Switch
                id="pco-private"
                checked={formValues.isPrivate}
                onCheckedChange={(checked) =>
                  onFormChange({ ...formValues, isPrivate: checked })
                }
              />
              <Label htmlFor="pco-private">Private</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="pco-field-change"
                checked={formValues.fieldChange}
                onCheckedChange={(checked) =>
                  onFormChange({ ...formValues, fieldChange: checked })
                }
              />
              <Label htmlFor="pco-field-change">Field Change</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="pco-paid-in-full"
                checked={formValues.paidInFull}
                onCheckedChange={(checked) =>
                  onFormChange({ ...formValues, paidInFull: checked })
                }
              />
              <Label htmlFor="pco-paid-in-full">Paid in Full</Label>
            </div>
          </div>
        </section>

        {/* Grouped Change Events */}
        <section className="space-y-3">
          <SectionRuleHeading label="Grouped Change Events" />
          {groupedCEs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-md bg-muted/30 py-8">
              <Plus className="mb-2 h-5 w-5 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No change events grouped yet
              </p>
              <p className="text-xs text-muted-foreground/60">
                Add change events from the panel on the left
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {groupedCEs.map((ce) => (
                <div
                  key={ce.id}
                  className="flex items-center gap-3 rounded-md bg-muted/40 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {ce.number} &mdash; {ce.title}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveCE(ce.id)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Line Items */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionRuleHeading label="Line Items" />
            <Button variant="outline" size="sm" onClick={onAddLineItem}>
              <Plus className="mr-1 h-3 w-3" />
              Add Line Item
            </Button>
          </div>

          {lineItems.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No line items yet. Add at least one line item.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-48">Description</TableHead>
                    <TableHead className="w-20">Qty</TableHead>
                    <TableHead className="w-24">UOM</TableHead>
                    <TableHead className="w-28">Unit Cost</TableHead>
                    <TableHead className="w-28 text-right">Amount</TableHead>
                    <TableHead className="w-28">Category</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((li) => (
                    <TableRow key={li.tempId}>
                      <TableCell>
                        <Input
                          value={li.description}
                          onChange={(e) =>
                            onUpdateLineItem(
                              li.tempId,
                              "description",
                              e.target.value,
                            )
                          }
                          placeholder="Line item description"
                          className="text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={li.quantity || ""}
                          onChange={(e) =>
                            onUpdateLineItem(
                              li.tempId,
                              "quantity",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="text-sm text-right tabular-nums"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={li.uom}
                          onChange={(e) =>
                            onUpdateLineItem(
                              li.tempId,
                              "uom",
                              e.target.value,
                            )
                          }
                          placeholder="EA"
                          className="text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={li.unitCost || ""}
                          onChange={(e) =>
                            onUpdateLineItem(
                              li.tempId,
                              "unitCost",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="text-sm text-right tabular-nums"
                        />
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums font-medium text-foreground">
                        {formatCurrency(li.quantity * li.unitCost)}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={li.category}
                          onChange={(e) =>
                            onUpdateLineItem(
                              li.tempId,
                              "category",
                              e.target.value,
                            )
                          }
                          placeholder="Category"
                          className="text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveLineItem(li.tempId)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* Financial Summary */}
        <section className="space-y-3 border-t border-border pt-4">
          <SectionRuleHeading label="Financial Summary" />
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium tabular-nums text-foreground">
                {formatCurrency(subtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Markup</span>
                <Input
                  type="number"
                  value={markupPercentage || ""}
                  onChange={(e) =>
                    onMarkupChange(parseFloat(e.target.value) || 0)
                  }
                  className="w-20 text-right text-sm tabular-nums"
                  placeholder=""
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <span className="tabular-nums text-foreground">
                {formatCurrency(markupAmount)}
              </span>
            </div>
            <div className="border-t border-border pt-2 flex items-center justify-between">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-semibold tabular-nums text-foreground text-lg">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </section>

        {/* Action Bar */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-border bg-background pt-4 pb-2">
          <Button variant="outline" onClick={onCancel} disabled={isSaving || isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={onSaveDraft}
            disabled={isSaving || isSubmitting || !formValues.title.trim()}
          >
            {isSaving ? "Saving..." : "Save Draft"}
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || isSaving || !canSubmit}
          >
            {isSubmitting ? "Submitting..." : "Submit to Client"}
          </Button>
        </div>
      </div>
    </div>
  );
}
