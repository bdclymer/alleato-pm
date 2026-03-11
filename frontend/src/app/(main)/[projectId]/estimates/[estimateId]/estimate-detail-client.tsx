"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageContainer, ProjectPageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CSI_DIVISIONS } from "@/hooks/use-cost-codes";
import {
  type EstimateRow,
  type EstimateLineItemRow,
  type EstimateAlternateRow,
  type EstimateAllowanceRow,
  type DivisionTotal,
  calculateEstimateSummary,
  calculateLineItemCosts,
} from "@/lib/schemas/estimates";
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusLabel,
} from "../estimates-table-utils";

// ─── Line Item Add Dialog ────────────────────────────────────────────────────
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EstimateDetailClientProps {
  projectId: string;
  projectName: string;
  estimate: EstimateRow;
  lineItems: EstimateLineItemRow[];
  divisionTotals: DivisionTotal[];
  alternates: EstimateAlternateRow[];
  allowances: EstimateAllowanceRow[];
}

export function EstimateDetailClient({
  projectId,
  projectName,
  estimate,
  lineItems,
  divisionTotals,
  alternates,
  allowances,
}: EstimateDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState("takeoff");
  const [addLineDialogOpen, setAddLineDialogOpen] = React.useState(false);
  const [selectedDivision, setSelectedDivision] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const summary = calculateEstimateSummary(divisionTotals, estimate);

  // Group line items by division
  const lineItemsByDivision = React.useMemo(() => {
    const groups: Record<string, EstimateLineItemRow[]> = {};
    for (const item of lineItems) {
      if (!groups[item.division_code]) groups[item.division_code] = [];
      groups[item.division_code].push(item);
    }
    return groups;
  }, [lineItems]);

  // Get sorted division codes (union of existing items + divisions with data)
  const sortedDivisionCodes = React.useMemo(() => {
    const codes = new Set([
      ...Object.keys(lineItemsByDivision),
      ...divisionTotals.map((d) => d.division_code),
    ]);
    return Array.from(codes).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [lineItemsByDivision, divisionTotals]);

  const getDivisionName = (code: string): string => {
    const found = CSI_DIVISIONS.find((d) => d.code === code);
    return found?.name ?? `Division ${code}`;
  };

  const getDivisionTotal = (code: string): number => {
    const dt = divisionTotals.find((d) => d.division_code === code);
    return dt?.division_total ?? 0;
  };

  const handleAddLineItem = async (formData: FormData) => {
    setIsSubmitting(true);
    try {
      const divisionCode = formData.get("division_code") as string;
      const description = formData.get("description") as string;
      const quantity = parseFloat(formData.get("quantity") as string) || 0;
      const unit = formData.get("unit") as string;
      const subcontractUnitPrice =
        parseFloat(formData.get("subcontract_unit_price") as string) || 0;

      const costs = calculateLineItemCosts({
        quantity,
        subcontract_unit_price: subcontractUnitPrice,
      });

      const response = await fetch(
        `/api/projects/${projectId}/estimates/${estimate.estimate_id}/line-items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            division_code: divisionCode,
            description,
            quantity,
            unit,
            subcontract_unit_price: subcontractUnitPrice,
            ...costs,
            sort_order: lineItems.length,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to add line item");
      toast.success("Line item added");
      setAddLineDialogOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to add line item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLineItem = async (lineItemId: number) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/estimates/${estimate.estimate_id}/line-items/${lineItemId}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error("Failed to delete line item");
      toast.success("Line item deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete line item");
    }
  };

  return (
    <>
      <ProjectPageHeader
        title={estimate.title}
        description={`${getStatusLabel(estimate.status)} · R${estimate.revision} · ${formatDate(estimate.estimate_date)}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/${projectId}/estimates`)}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(
                  `/${projectId}/estimates/${estimate.estimate_id}/edit`
                )
              }
            >
              <Edit2 className="mr-1 h-4 w-4" />
              Edit
            </Button>
          </div>
        }
      />

      <PageContainer>
        {/* Summary KPIs */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <SummaryCard label="Subtotal" value={formatCurrency(summary.subtotal)} />
          <SummaryCard label="Contingency" value={formatCurrency(summary.contingency)} />
          <SummaryCard
            label={`Insurance (${((estimate.insurance_rate ?? 0) * 100).toFixed(2)}%)`}
            value={formatCurrency(summary.insurance)}
          />
          <SummaryCard
            label={`Fee (${((estimate.fee_rate ?? 0) * 100).toFixed(1)}%)`}
            value={formatCurrency(summary.fee)}
          />
          <SummaryCard
            label="Grand Total"
            value={formatCurrency(summary.grand_total)}
            highlight
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="takeoff">Quantity Takeoff</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="gc">General Conditions</TabsTrigger>
            <TabsTrigger value="alternates">
              Alternates & Allowances
            </TabsTrigger>
          </TabsList>

          {/* ── Quantity Takeoff Tab ─────────────────────────────── */}
          <TabsContent value="takeoff" className="mt-4 space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {lineItems.length} line items across{" "}
                {sortedDivisionCodes.length} divisions
              </p>
              <Button
                size="sm"
                onClick={() => setAddLineDialogOpen(true)}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Line Item
              </Button>
            </div>

            {sortedDivisionCodes.map((divCode) => {
              const items = lineItemsByDivision[divCode] || [];
              return (
                <DivisionGroup
                  key={divCode}
                  divisionCode={divCode}
                  divisionName={getDivisionName(divCode)}
                  divisionTotal={getDivisionTotal(divCode)}
                  items={items}
                  onDelete={handleDeleteLineItem}
                />
              );
            })}

            {sortedDivisionCodes.length === 0 && (
              <div className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
                <p className="text-sm">No line items yet.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => setAddLineDialogOpen(true)}
                >
                  Add your first line item
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ── Summary Tab ──────────────────────────────────────── */}
          <TabsContent value="summary" className="mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Division</th>
                    <th className="pb-2 pr-4 text-right font-medium">
                      Material
                    </th>
                    <th className="pb-2 pr-4 text-right font-medium">Labor</th>
                    <th className="pb-2 pr-4 text-right font-medium">
                      Equipment
                    </th>
                    <th className="pb-2 pr-4 text-right font-medium">
                      Subcontract
                    </th>
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {divisionTotals.map((dt) => (
                    <tr
                      key={dt.division_code}
                      className="border-b border-border/50"
                    >
                      <td className="py-2 pr-4 font-medium">
                        {dt.division_code} {dt.division_name}
                      </td>
                      <td className="py-2 pr-4 text-right text-muted-foreground">
                        {formatCurrency(dt.material_total)}
                      </td>
                      <td className="py-2 pr-4 text-right text-muted-foreground">
                        {formatCurrency(dt.labor_total)}
                      </td>
                      <td className="py-2 pr-4 text-right text-muted-foreground">
                        {formatCurrency(dt.equipment_total)}
                      </td>
                      <td className="py-2 pr-4 text-right text-muted-foreground">
                        {formatCurrency(dt.subcontract_total)}
                      </td>
                      <td className="py-2 text-right font-medium">
                        {formatCurrency(dt.division_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border font-medium">
                    <td className="pt-3">Subtotal</td>
                    <td colSpan={4} />
                    <td className="pt-3 text-right">
                      {formatCurrency(summary.subtotal)}
                    </td>
                  </tr>
                  {summary.contingency > 0 && (
                    <tr className="text-muted-foreground">
                      <td className="py-1">Contingency</td>
                      <td colSpan={4} />
                      <td className="py-1 text-right">
                        {formatCurrency(summary.contingency)}
                      </td>
                    </tr>
                  )}
                  <tr className="text-muted-foreground">
                    <td className="py-1">
                      Insurance ({((estimate.insurance_rate ?? 0) * 100).toFixed(2)}%)
                    </td>
                    <td colSpan={4} />
                    <td className="py-1 text-right">
                      {formatCurrency(summary.insurance)}
                    </td>
                  </tr>
                  <tr className="text-muted-foreground">
                    <td className="py-1">
                      Fee ({((estimate.fee_rate ?? 0) * 100).toFixed(1)}%)
                    </td>
                    <td colSpan={4} />
                    <td className="py-1 text-right">
                      {formatCurrency(summary.fee)}
                    </td>
                  </tr>
                  <tr className="border-t border-border text-base font-semibold">
                    <td className="pt-3">Grand Total</td>
                    <td colSpan={4} />
                    <td className="pt-3 text-right">
                      {formatCurrency(summary.grand_total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </TabsContent>

          {/* ── General Conditions Tab ────────────────────────── */}
          <TabsContent value="gc" className="mt-4">
            <GCTab
              items={lineItemsByDivision["01"] || []}
              projectDurationWeeks={estimate.project_duration_weeks}
            />
          </TabsContent>

          {/* ── Alternates & Allowances Tab ───────────────────── */}
          <TabsContent value="alternates" className="mt-4 space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-medium text-foreground">
                Alternates
              </h3>
              {alternates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No alternates defined.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">#</th>
                      <th className="pb-2 pr-4 font-medium">Description</th>
                      <th className="pb-2 pr-4 font-medium">Type</th>
                      <th className="pb-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alternates.map((alt) => (
                      <tr
                        key={alt.alternate_id}
                        className="border-b border-border/50"
                      >
                        <td className="py-2 pr-4">{alt.alternate_number}</td>
                        <td className="py-2 pr-4">{alt.description}</td>
                        <td className="py-2 pr-4">
                          <Badge
                            variant={
                              alt.alternate_type === "deduct"
                                ? "destructive"
                                : "default"
                            }
                          >
                            {alt.alternate_type}
                          </Badge>
                        </td>
                        <td className="py-2 text-right">
                          {formatCurrency(alt.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium text-foreground">
                Allowances
              </h3>
              {allowances.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No allowances defined.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">#</th>
                      <th className="pb-2 pr-4 font-medium">Description</th>
                      <th className="pb-2 pr-4 font-medium">Scope</th>
                      <th className="pb-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allowances.map((alw) => (
                      <tr
                        key={alw.allowance_id}
                        className="border-b border-border/50"
                      >
                        <td className="py-2 pr-4">{alw.allowance_number}</td>
                        <td className="py-2 pr-4">{alw.description}</td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {alw.scope_type?.replace(/_/g, " ") ?? "—"}
                        </td>
                        <td className="py-2 text-right">
                          {formatCurrency(alw.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </PageContainer>

      {/* ── Add Line Item Dialog ──────────────────────────────── */}
      <Dialog open={addLineDialogOpen} onOpenChange={setAddLineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Line Item</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddLineItem(new FormData(e.currentTarget));
            }}
            className="space-y-4"
          >
            <div>
              <Label>Division</Label>
              <Select
                name="division_code"
                value={selectedDivision}
                onValueChange={setSelectedDivision}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  {CSI_DIVISIONS.map((div) => (
                    <SelectItem key={div.code} value={div.code}>
                      {div.code} — {div.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                type="hidden"
                name="division_code"
                value={selectedDivision}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input name="description" placeholder="Line item description" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Quantity</Label>
                <Input
                  name="quantity"
                  type="number"
                  step="0.01"
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Input name="unit" placeholder="EA, SF, LOT..." />
              </div>
              <div>
                <Label>Sub Unit Price</Label>
                <Input
                  name="subcontract_unit_price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddLineDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold ${highlight ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  );
}

function DivisionGroup({
  divisionCode,
  divisionName,
  divisionTotal,
  items,
  onDelete,
}: {
  divisionCode: string;
  divisionName: string;
  divisionTotal: number;
  items: EstimateLineItemRow[];
  onDelete: (id: number) => void;
}) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div className="rounded-md border border-border">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between bg-muted/50 px-4 py-2 text-left"
      >
        <span className="text-sm font-medium">
          Division {divisionCode} — {divisionName}
          <span className="ml-2 text-xs text-muted-foreground">
            ({items.length} items)
          </span>
        </span>
        <span className="text-sm font-semibold">
          {formatCurrency(divisionTotal)}
        </span>
      </button>

      {!collapsed && items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">Description</th>
                <th className="px-4 py-2 text-right font-medium">Qty</th>
                <th className="px-4 py-2 font-medium">Unit</th>
                <th className="px-4 py-2 text-right font-medium">
                  Sub Unit $
                </th>
                <th className="px-4 py-2 text-right font-medium">Sub Cost</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
                <th className="px-4 py-2 font-medium">Comments</th>
                <th className="px-4 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.line_item_id}
                  className="border-b border-border/30 hover:bg-muted/30"
                >
                  <td className="px-4 py-1.5 text-muted-foreground">
                    {item.line_number ?? "—"}
                  </td>
                  <td className="px-4 py-1.5 font-medium">
                    {item.description || "—"}
                  </td>
                  <td className="px-4 py-1.5 text-right">
                    {item.quantity ?? "—"}
                  </td>
                  <td className="px-4 py-1.5 text-muted-foreground">
                    {item.unit || "—"}
                  </td>
                  <td className="px-4 py-1.5 text-right text-muted-foreground">
                    {item.subcontract_unit_price
                      ? formatCurrency(item.subcontract_unit_price)
                      : "—"}
                  </td>
                  <td className="px-4 py-1.5 text-right text-muted-foreground">
                    {item.subcontract_cost
                      ? formatCurrency(item.subcontract_cost)
                      : "—"}
                  </td>
                  <td className="px-4 py-1.5 text-right font-medium">
                    {formatCurrency(item.total_cost ?? 0)}
                  </td>
                  <td className="px-4 py-1.5 text-muted-foreground">
                    {item.comments || "—"}
                    {item.comment_type && (
                      <Badge variant="outline" className="ml-1 text-[10px]">
                        {item.comment_type}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-1.5">
                    <button
                      type="button"
                      onClick={() => onDelete(item.line_item_id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!collapsed && items.length === 0 && (
        <p className="px-4 py-3 text-sm text-muted-foreground">
          No line items in this division.
        </p>
      )}
    </div>
  );
}

function GCTab({
  items,
  projectDurationWeeks,
}: {
  items: EstimateLineItemRow[];
  projectDurationWeeks: number | null;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No General Conditions line items. Add line items to Division 01.
      </p>
    );
  }

  return (
    <div>
      {projectDurationWeeks && (
        <p className="mb-3 text-sm text-muted-foreground">
          Project Duration: {projectDurationWeeks} weeks
        </p>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Cost Code</th>
            <th className="pb-2 pr-4 font-medium">Description</th>
            <th className="pb-2 pr-4 text-right font-medium">Qty</th>
            <th className="pb-2 pr-4 font-medium">Unit</th>
            <th className="pb-2 pr-4 text-right font-medium">Rate</th>
            <th className="pb-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.line_item_id} className="border-b border-border/50">
              <td className="py-2 pr-4 text-muted-foreground">
                {item.gc_cost_code || "—"}
              </td>
              <td className="py-2 pr-4">{item.description || "—"}</td>
              <td className="py-2 pr-4 text-right">{item.quantity ?? "—"}</td>
              <td className="py-2 pr-4 text-muted-foreground">
                {item.unit || "—"}
              </td>
              <td className="py-2 pr-4 text-right text-muted-foreground">
                {item.subcontract_unit_price
                  ? formatCurrency(item.subcontract_unit_price)
                  : "—"}
              </td>
              <td className="py-2 text-right font-medium">
                {formatCurrency(item.total_cost ?? 0)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border font-medium">
            <td colSpan={5} className="pt-2">
              Total General Conditions
            </td>
            <td className="pt-2 text-right">
              {formatCurrency(
                items.reduce((sum, i) => sum + (i.total_cost ?? 0), 0)
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
