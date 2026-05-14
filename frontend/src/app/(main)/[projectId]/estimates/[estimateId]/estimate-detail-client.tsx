"use client";
/* eslint-disable design-system/no-raw-heading */

import * as React from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/ds";
import { PageShell } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api-client";
import { formatPercent } from "@/lib/format";
import {
  DIVISION_NAME_BY_CODE,
  GC_TEMPLATE,
  QTO_TEMPLATE,
  getDefaultGCQuantity,
} from "@/lib/estimates/template";
import {
  type DivisionTotal,
  type EstimateAllowanceRow,
  type EstimateAlternateRow,
  type EstimateLineItemRow,
  type EstimateRow,
  calculateEstimateSummary,
} from "@/lib/schemas/estimates";

import { formatCurrency, formatDate, getStatusLabel } from "../estimates-table-utils";

interface EstimateSettings {
  project_duration_weeks: number;
  contingency_amount: number;
  insurance_rate: number;
  fee_rate: number;
}

interface EstimateDetailClientProps {
  projectId: string;
  projectName: string;
  estimate: EstimateRow;
  lineItems: EstimateLineItemRow[];
  divisionTotals: DivisionTotal[];
  alternates: EstimateAlternateRow[];
  allowances: EstimateAllowanceRow[];
}

interface GCRowView {
  line_item_id: number;
  cost_code: string;
  description: string;
  qty: number;
  unit: string;
  rate: number;
}

interface QTORowView {
  line_item_id: number;
  division_code: string;
  description: string;
  qty: number | null;
  unit: string;
  material_unit_price: number;
  subcontract_unit_price: number;
  total_cost: number;
}

function normalizeNumber(value: number | null | undefined, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function computeDivisionTotals(lineItems: EstimateLineItemRow[]): DivisionTotal[] {
  const grouped = new Map<string, DivisionTotal>();

  for (const row of lineItems) {
    const code = row.division_code;
    const existing = grouped.get(code) ?? {
      division_code: code,
      division_name: DIVISION_NAME_BY_CODE[code] ?? `Division ${code}`,
      material_total: 0,
      labor_total: 0,
      equipment_total: 0,
      subcontract_total: 0,
      division_total: 0,
      line_count: 0,
    };

    existing.material_total += normalizeNumber(row.material_cost);
    existing.labor_total += normalizeNumber(row.labor_cost);
    existing.equipment_total += normalizeNumber(row.equipment_cost);
    existing.subcontract_total += normalizeNumber(row.subcontract_cost);
    existing.division_total += normalizeNumber(row.total_cost);
    existing.line_count += 1;

    grouped.set(code, existing);
  }

  return Array.from(grouped.values()).sort((a, b) =>
    a.division_code.localeCompare(b.division_code, undefined, { numeric: true })
  );
}

function mapGCViewRows(lineItems: EstimateLineItemRow[], durationWeeks: number): GCRowView[] {
  const gcByCode = new Map(
    lineItems.filter((item) => item.gc_cost_code).map((item) => [item.gc_cost_code ?? "", item])
  );

  return GC_TEMPLATE.map((template, index) => {
    const existing = gcByCode.get(template.cost_code);
    return {
      line_item_id: existing?.line_item_id ?? -(index + 1),
      cost_code: template.cost_code,
      description: existing?.description ?? template.description,
      qty: normalizeNumber(existing?.quantity, getDefaultGCQuantity(template, durationWeeks)),
      unit: existing?.unit ?? template.unit_basis,
      rate: normalizeNumber(existing?.subcontract_unit_price, template.default_rate),
    };
  }).filter((row) => row.line_item_id > 0);
}

function mapQTOViewRows(lineItems: EstimateLineItemRow[]): QTORowView[] {
  return lineItems
    .filter((item) => !item.gc_cost_code)
    .sort((a, b) => normalizeNumber(a.sort_order) - normalizeNumber(b.sort_order))
    .map((item) => ({
      line_item_id: item.line_item_id,
      division_code: item.division_code,
      description: item.description ?? "",
      qty: item.quantity,
      unit: item.unit ?? "",
      material_unit_price: normalizeNumber(item.material_unit_price),
      subcontract_unit_price: normalizeNumber(item.subcontract_unit_price),
      total_cost: normalizeNumber(item.total_cost),
    }));
}

export function EstimateDetailClient({
  projectId,
  estimate,
  lineItems,
  alternates,
  allowances,
}: EstimateDetailClientProps) {
  const [activeTab, setActiveTab] = React.useState("gc");
  const [isSavingSettings, setIsSavingSettings] = React.useState(false);
  const [localLineItems, setLocalLineItems] = React.useState<EstimateLineItemRow[]>(lineItems);
  const [settings, setSettings] = React.useState<EstimateSettings>({
    project_duration_weeks: estimate.project_duration_weeks ?? 12,
    contingency_amount: estimate.contingency_amount ?? 0,
    insurance_rate: estimate.insurance_rate ?? 0.0125,
    fee_rate: estimate.fee_rate ?? 0.1,
  });

  const divisionTotals = React.useMemo(
    () => computeDivisionTotals(localLineItems),
    [localLineItems]
  );
  const summary = React.useMemo(
    () => calculateEstimateSummary(divisionTotals, settings),
    [divisionTotals, settings]
  );
  const gcRows = React.useMemo(
    () => mapGCViewRows(localLineItems, settings.project_duration_weeks),
    [localLineItems, settings.project_duration_weeks]
  );
  const qtoRows = React.useMemo(() => mapQTOViewRows(localLineItems), [localLineItems]);

  const saveSettingsTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateLineItemState = React.useCallback(
    (lineItemId: number, updates: Partial<EstimateLineItemRow>) => {
      setLocalLineItems((prev) =>
        prev.map((item) =>
          item.line_item_id === lineItemId ? ({ ...item, ...updates } as EstimateLineItemRow) : item
        )
      );
    },
    []
  );

  const persistLineItem = React.useCallback(
    async (lineItemId: number, payload: Record<string, unknown>) => {
      const updated = await apiFetch<EstimateLineItemRow>(
        `/api/projects/${projectId}/estimates/${estimate.estimate_id}/line-items/${lineItemId}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        }
      );
      updateLineItemState(lineItemId, updated);
    },
    [estimate.estimate_id, projectId, updateLineItemState]
  );

  const updateSetting = <K extends keyof EstimateSettings>(
    key: K,
    value: EstimateSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    if (saveSettingsTimeout.current) clearTimeout(saveSettingsTimeout.current);

    saveSettingsTimeout.current = setTimeout(async () => {
      setIsSavingSettings(true);
      try {
        await apiFetch(`/api/projects/${projectId}/estimates/${estimate.estimate_id}`, {
          method: "PUT",
          body: JSON.stringify({ [key]: value }),
        });
      } catch {
        toast.error("Failed to save estimate settings");
      } finally {
        setIsSavingSettings(false);
      }
    }, 500);
  };

  const handleGCChange = React.useCallback(
    async (row: GCRowView, field: "qty" | "rate", value: number) => {
      const updates =
        field === "qty"
          ? { quantity: value }
          : { subcontract_unit_price: value };

      updateLineItemState(row.line_item_id, updates);

      try {
        const current = localLineItems.find((item) => item.line_item_id === row.line_item_id);
        await persistLineItem(row.line_item_id, {
          ...current,
          ...updates,
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save line item");
      }
    },
    [localLineItems, persistLineItem, updateLineItemState]
  );

  const handleQTOFieldChange = React.useCallback(
    async (
      row: QTORowView,
      field: "description" | "qty" | "unit" | "material_unit_price" | "subcontract_unit_price",
      value: number | string | null
    ) => {
      const updates =
        field === "qty"
          ? { quantity: value === null ? null : Number(value) }
          : field === "description"
            ? { description: String(value ?? "") }
            : field === "unit"
              ? { unit: String(value ?? "") }
              : { [field]: Number(value ?? 0) };

      updateLineItemState(row.line_item_id, updates);

      try {
        const current = localLineItems.find((item) => item.line_item_id === row.line_item_id);
        await persistLineItem(row.line_item_id, {
          ...current,
          ...updates,
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save line item");
      }
    },
    [localLineItems, persistLineItem, updateLineItemState]
  );

  const handleAddQTORow = React.useCallback(
    async (divisionCode: string) => {
      const nextSortOrder =
        localLineItems.reduce((max, item) => Math.max(max, normalizeNumber(item.sort_order)), 0) + 1;

      try {
        const created = await apiFetch<EstimateLineItemRow>(
          `/api/projects/${projectId}/estimates/${estimate.estimate_id}/line-items`,
          {
            method: "POST",
            body: JSON.stringify({
              division_code: divisionCode,
              description: "",
              quantity: null,
              unit: "EA",
              material_unit_price: 0,
              subcontract_unit_price: 0,
              sort_order: nextSortOrder,
            }),
          }
        );
        setLocalLineItems((prev) => [...prev, created]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to add line item");
      }
    },
    [estimate.estimate_id, localLineItems, projectId]
  );

  const handleDeleteQTORow = React.useCallback(
    async (lineItemId: number) => {
      const previous = localLineItems;
      setLocalLineItems((prev) => prev.filter((item) => item.line_item_id !== lineItemId));

      try {
        await apiFetch(
          `/api/projects/${projectId}/estimates/${estimate.estimate_id}/line-items/${lineItemId}`,
          { method: "DELETE" }
        );
      } catch (error) {
        setLocalLineItems(previous);
        toast.error(error instanceof Error ? error.message : "Failed to delete line item");
      }
    },
    [estimate.estimate_id, localLineItems, projectId]
  );

  return (
    <PageShell
      variant="detail"
      title={estimate.title}
      description={`${getStatusLabel(estimate.status)} · R${estimate.revision} · ${formatDate(estimate.estimate_date)}`}
      actions={undefined}
    >
      <div className="flex items-start gap-6">
          <div className="sticky top-4 w-96 shrink-0 space-y-0">
            <div className="rounded-t-md border border-border bg-muted/30 px-4 py-3 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Estimate Settings
                {isSavingSettings && (
                  <span className="ml-2 text-xs font-normal normal-case opacity-60">saving…</span>
                )}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <SettingField
                  label="Duration (weeks)"
                  value={settings.project_duration_weeks}
                  onChange={(v) => updateSetting("project_duration_weeks", Math.max(1, Math.round(v)))}
                />
                <SettingField
                  label="Contingency ($)"
                  value={settings.contingency_amount}
                  onChange={(v) => updateSetting("contingency_amount", v)}
                  isCurrency
                />
                <SettingField
                  label="Insurance rate (%)"
                  value={settings.insurance_rate * 100}
                  onChange={(v) => updateSetting("insurance_rate", v / 100)}
                  isPercent
                />
                <SettingField
                  label="Fee rate (%)"
                  value={settings.fee_rate * 100}
                  onChange={(v) => updateSetting("fee_rate", v / 100)}
                  isPercent
                />
              </div>
            </div>

            <div className="border-x border-border bg-card">
              <div className="border-b border-border px-4 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Division Summary
                </p>
              </div>
              <div className="divide-y divide-border/50">
                {divisionTotals.length === 0 ? (
                  <EmptyState
                    title="No costs yet"
                    description="Edit the General Conditions or Quantity Takeoff rows to build this estimate."
                  />
                ) : (
                  divisionTotals.map((total) => (
                    <div key={total.division_code} className="flex items-center justify-between px-4 py-2">
                      <span className="text-xs leading-tight text-muted-foreground">
                        <span className="font-medium text-foreground">{total.division_code}</span>{" "}
                        {total.division_name}
                      </span>
                      <span className="text-xs font-medium tabular-nums text-foreground">
                        {formatCurrency(total.division_total)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-b-md border-x border-b border-border bg-muted/20 divide-y divide-border/50">
              <SummaryRow label="Subtotal" value={formatCurrency(summary.subtotal)} />
              <SummaryRow label="Contingency" value={formatCurrency(summary.contingency)} />
              <SummaryRow
                label={`Insurance (${formatPercent(settings.insurance_rate * 100, 2)})`}
                value={formatCurrency(summary.insurance)}
              />
              <SummaryRow
                label={`Fee (${formatPercent(settings.fee_rate * 100, 1)})`}
                value={formatCurrency(summary.fee)}
              />
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-semibold text-foreground">Grand Total</span>
                <span className="text-base font-bold tabular-nums text-primary">
                  {formatCurrency(summary.grand_total)}
                </span>
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList variant="line">
                <TabsTrigger value="gc">General Conditions</TabsTrigger>
                <TabsTrigger value="takeoff">Quantity Takeoff</TabsTrigger>
                <TabsTrigger value="alternates">Alternates &amp; Allowances</TabsTrigger>
              </TabsList>

              <TabsContent value="gc" className="mt-4">
                <GCTemplateTab rows={gcRows} onRowChange={handleGCChange} />
              </TabsContent>

              <TabsContent value="takeoff" className="mt-4">
                <QTOTemplateTab
                  rows={qtoRows}
                  onRowChange={handleQTOFieldChange}
                  onAddRow={handleAddQTORow}
                  onDeleteRow={handleDeleteQTORow}
                />
              </TabsContent>

              <TabsContent value="alternates" className="mt-4 space-y-6">
                <div>
                  <h3 className="mb-3 text-sm font-medium text-foreground">Alternates</h3>
                  {alternates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No alternates defined.</p>
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
                          <tr key={alt.alternate_id} className="border-b border-border/50">
                            <td className="py-2 pr-4">{alt.alternate_number}</td>
                            <td className="py-2 pr-4">{alt.description}</td>
                            <td className="py-2 pr-4">
                              <Badge variant={alt.alternate_type === "deduct" ? "destructive" : "default"}>
                                {alt.alternate_type}
                              </Badge>
                            </td>
                            <td className="py-2 text-right">{formatCurrency(alt.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-medium text-foreground">Allowances</h3>
                  {allowances.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No allowances defined.</p>
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
                        {allowances.map((allowance) => (
                          <tr key={allowance.allowance_id} className="border-b border-border/50">
                            <td className="py-2 pr-4">{allowance.allowance_number}</td>
                            <td className="py-2 pr-4">{allowance.description}</td>
                            <td className="py-2 pr-4 text-muted-foreground">
                              {allowance.scope_type?.replace(/_/g, " ") ?? "—"}
                            </td>
                            <td className="py-2 text-right">{formatCurrency(allowance.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
    </PageShell>
  );
}

function SettingField({
  label,
  value,
  onChange,
  isCurrency,
  isPercent,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  isCurrency?: boolean;
  isPercent?: boolean;
}) {
  const [localValue, setLocalValue] = React.useState(String(value));

  React.useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  const commit = () => {
    const parsed = parseFloat(localValue);
    if (!Number.isNaN(parsed)) onChange(parsed);
    else setLocalValue(String(value));
  };

  return (
    <div>
      <p className="mb-1 text-[11px] text-muted-foreground">{label}</p>
      <div className="relative">
        {isCurrency && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>}
        <Input
          className={`h-7 text-xs ${isCurrency ? "pl-4" : ""} ${isPercent ? "pr-4" : ""}`}
          value={localValue}
          onChange={(event) => setLocalValue(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => event.key === "Enter" && commit()}
        />
        {isPercent && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function GCTemplateTab({
  rows,
  onRowChange,
}: {
  rows: GCRowView[];
  onRowChange: (row: GCRowView, field: "qty" | "rate", value: number) => void | Promise<void>;
}) {
  const total = rows.reduce((sum, row) => sum + row.qty * row.rate, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="w-16 pb-2 pr-3 font-medium">Code</th>
            <th className="pb-2 pr-3 font-medium">Description</th>
            <th className="w-20 pb-2 pr-3 text-right font-medium">Qty</th>
            <th className="w-16 pb-2 pr-3 font-medium">Unit</th>
            <th className="w-24 pb-2 pr-3 text-right font-medium">Rate</th>
            <th className="w-28 pb-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.line_item_id} className="border-b border-border/30 hover:bg-muted/20">
              <td className="py-1.5 pr-3 text-xs text-muted-foreground">{row.cost_code}</td>
              <td className="py-1.5 pr-3">{row.description}</td>
              <td className="py-1.5 pr-3">
                <InlineNumberInput value={row.qty} onChange={(value) => onRowChange(row, "qty", value)} className="w-full text-right" />
              </td>
              <td className="py-1.5 pr-3 text-xs text-muted-foreground">{row.unit}</td>
              <td className="py-1.5 pr-3">
                <InlineNumberInput
                  value={row.rate}
                  onChange={(value) => onRowChange(row, "rate", value)}
                  className="w-full text-right"
                  step="0.01"
                />
              </td>
              <td className="py-1.5 text-right font-medium tabular-nums text-foreground">
                {formatCurrency(row.qty * row.rate)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border">
            <td colSpan={5} className="pt-3 text-sm font-medium text-foreground">
              Total General Conditions
            </td>
            <td className="pt-3 text-right text-sm font-semibold tabular-nums text-foreground">
              {formatCurrency(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function QTOTemplateTab({
  rows,
  onRowChange,
  onAddRow,
  onDeleteRow,
}: {
  rows: QTORowView[];
  onRowChange: (
    row: QTORowView,
    field: "description" | "qty" | "unit" | "material_unit_price" | "subcontract_unit_price",
    value: number | string | null
  ) => void | Promise<void>;
  onAddRow: (divisionCode: string) => void | Promise<void>;
  onDeleteRow: (lineItemId: number) => void | Promise<void>;
}) {
  const divisionOrder = React.useMemo(() => {
    const templateCodes = QTO_TEMPLATE.map((division) => division.code);
    const dynamicCodes = Array.from(new Set(rows.map((row) => row.division_code))).filter(
      (code) => !templateCodes.includes(code)
    );
    return [...templateCodes, ...dynamicCodes];
  }, [rows]);

  const [expandedDivisions, setExpandedDivisions] = React.useState<Set<string>>(
    () => new Set(divisionOrder.slice(0, 4))
  );

  React.useEffect(() => {
    setExpandedDivisions((prev) => {
      const next = new Set(prev);
      if (next.size === 0 && divisionOrder.length > 0) {
        divisionOrder.slice(0, 4).forEach((code) => next.add(code));
      }
      return next;
    });
  }, [divisionOrder]);

  const toggleDivision = (code: string) => {
    setExpandedDivisions((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  return (
    <div className="space-y-0">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {divisionOrder.length} divisions · edit saved estimate rows directly
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExpandedDivisions(new Set(divisionOrder))}>
            Expand All
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExpandedDivisions(new Set())}>
            Collapse All
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-border divide-y divide-border">
        {divisionOrder.map((code) => {
          const divisionRows = rows.filter((row) => row.division_code === code);
          const total = divisionRows.reduce((sum, row) => sum + row.total_cost, 0);
          const isExpanded = expandedDivisions.has(code);
          const name = DIVISION_NAME_BY_CODE[code] ?? `Division ${code}`;

          return (
            <div key={code}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => toggleDivision(code)}
                className="flex h-auto w-full items-center justify-between rounded-none bg-muted/30 px-4 py-2.5 text-left hover:bg-muted/50"
              >
                <span className="flex items-center gap-2 text-sm">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium text-foreground">{code}</span>
                  <span className="text-muted-foreground">{name}</span>
                  <span className="text-xs text-muted-foreground/60">
                    ({divisionRows.length} {divisionRows.length === 1 ? "item" : "items"})
                  </span>
                </span>
                <span className="text-sm font-medium tabular-nums text-foreground">
                  {total > 0 ? formatCurrency(total) : "—"}
                </span>
              </Button>

              {isExpanded && (
                <div className="bg-card">
                  {divisionRows.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs text-muted-foreground">
                            <th className="py-2 pl-10 pr-3 font-medium">Description</th>
                            <th className="w-20 px-3 py-2 text-right font-medium">Qty</th>
                            <th className="w-16 px-3 py-2 font-medium">Unit</th>
                            <th className="w-24 px-3 py-2 text-right font-medium">Mat $/unit</th>
                            <th className="w-24 px-3 py-2 text-right font-medium">Sub $/unit</th>
                            <th className="w-28 px-3 py-2 text-right font-medium">Total</th>
                            <th className="w-8 px-3 py-2 sr-only">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {divisionRows.map((row) => (
                            <tr key={row.line_item_id} className="group border-b border-border/20 hover:bg-muted/20">
                              <td className="py-1.5 pl-10 pr-3">
                                <InlineTextInput
                                  value={row.description}
                                  onChange={(value) => onRowChange(row, "description", value)}
                                  placeholder="Line item description"
                                />
                              </td>
                              <td className="px-3 py-1.5">
                                <InlineNumberInput
                                  value={row.qty ?? 0}
                                  onChange={(value) => onRowChange(row, "qty", value)}
                                  className="w-full text-right"
                                  step="0.01"
                                />
                              </td>
                              <td className="px-3 py-1.5">
                                <InlineTextInput
                                  value={row.unit}
                                  onChange={(value) => onRowChange(row, "unit", value)}
                                  placeholder="EA"
                                />
                              </td>
                              <td className="px-3 py-1.5">
                                <InlineNumberInput
                                  value={row.material_unit_price}
                                  onChange={(value) => onRowChange(row, "material_unit_price", value)}
                                  className="w-full text-right"
                                  step="0.01"
                                />
                              </td>
                              <td className="px-3 py-1.5">
                                <InlineNumberInput
                                  value={row.subcontract_unit_price}
                                  onChange={(value) => onRowChange(row, "subcontract_unit_price", value)}
                                  className="w-full text-right"
                                  step="0.01"
                                />
                              </td>
                              <td className="px-3 py-1.5 text-right font-medium tabular-nums text-foreground">
                                {row.total_cost > 0 ? formatCurrency(row.total_cost) : "—"}
                              </td>
                              <td className="px-3 py-1.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  aria-label="Remove line item"
                                  onClick={() => onDeleteRow(row.line_item_id)}
                                  className="h-auto p-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="py-3 pl-10 text-xs italic text-muted-foreground">
                      No items yet for this division.
                    </p>
                  )}

                  <div className="border-t border-border/30 py-2 pl-10">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onAddRow(code)}
                      className="h-auto gap-1 p-0 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Plus className="h-3 w-3" />
                      Add item
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InlineNumberInput({
  value,
  onChange,
  className,
  step = "1",
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  step?: string;
}) {
  const [localValue, setLocalValue] = React.useState(String(value));

  React.useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  const commit = () => {
    const parsed = parseFloat(localValue);
    if (!Number.isNaN(parsed) && parsed >= 0) onChange(parsed);
    else setLocalValue(String(value));
  };

  return (
    <Input
      type="number"
      step={step}
      min="0"
      value={localValue}
      onChange={(event) => setLocalValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => event.key === "Enter" && commit()}
      className={`h-7 border-transparent bg-transparent text-xs transition-colors focus:border-border focus:bg-background ${className ?? ""}`}
    />
  );
}

function InlineTextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [localValue, setLocalValue] = React.useState(value);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const commit = () => {
    if (localValue !== value) onChange(localValue);
  };

  return (
    <Input
      value={localValue}
      onChange={(event) => setLocalValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => event.key === "Enter" && commit()}
      placeholder={placeholder}
      className="h-7 border-transparent bg-transparent text-xs transition-colors focus:border-border focus:bg-background"
    />
  );
}
