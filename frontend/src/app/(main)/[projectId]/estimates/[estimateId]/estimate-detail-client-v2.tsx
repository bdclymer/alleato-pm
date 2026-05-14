"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api-client";
import type { Database } from "@/types/database.types";
import type {
  DivisionTotal,
  EstimateAllowanceRow,
  EstimateAlternateRow,
  EstimateLineItemRow,
  EstimateRow,
} from "@/lib/schemas/estimates";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GcItem = Database["public"]["Tables"]["estimate_gc_items"]["Row"];
type DetailItem = Database["public"]["Tables"]["estimate_detail_items"]["Row"];
type SublistSub = Database["public"]["Tables"]["estimate_sublist_subs"]["Row"];

interface EstimateDetailClientV2Props {
  projectId: string;
  projectName: string;
  estimate: EstimateRow;
  gcItems: GcItem[];
  detailItems: DetailItem[];
  sublistSubs: SublistSub[];
  // legacy props (not used in V2 tabs but kept for possible future use)
  lineItems: EstimateLineItemRow[];
  divisionTotals: DivisionTotal[];
  alternates: EstimateAlternateRow[];
  allowances: EstimateAllowanceRow[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GC_TEMPLATE: Array<{
  cost_code: string;
  description: string;
  cost_type: string;
  qty_basis: string;
  rate: number;
  allocation: number;
}> = [
  { cost_code: "01-3120", description: "Vice President", cost_type: "Revenue", qty_basis: "weeks", rate: 7031, allocation: 0.15 },
  { cost_code: "01-3126", description: "Pre-construction", cost_type: "Revenue", qty_basis: "weeks", rate: 3796, allocation: 0.20 },
  { cost_code: "01-3127", description: "Sr. Project Manager", cost_type: "Labor", qty_basis: "weeks", rate: 4218, allocation: 0.25 },
  { cost_code: "01-3128", description: "Project Manager", cost_type: "Labor", qty_basis: "weeks", rate: 3515, allocation: 1.00 },
  { cost_code: "01-3129", description: "Asst. Project Manager", cost_type: "Labor", qty_basis: "weeks", rate: 2812, allocation: 0 },
  { cost_code: "01-3130", description: "Project Engineer", cost_type: "Labor", qty_basis: "weeks", rate: 2531, allocation: 0 },
  { cost_code: "01-3131", description: "Field Engineer", cost_type: "Labor", qty_basis: "weeks", rate: 2250, allocation: 0 },
  { cost_code: "01-3132", description: "Intern", cost_type: "Labor", qty_basis: "weeks", rate: 1350, allocation: 0 },
  { cost_code: "01-3142", description: "General Superintendent", cost_type: "Labor", qty_basis: "weeks", rate: 6328, allocation: 0 },
  { cost_code: "01-3143", description: "Sr. Superintendent", cost_type: "Labor", qty_basis: "weeks", rate: 4218, allocation: 0 },
  { cost_code: "01-3144", description: "Superintendent", cost_type: "Labor", qty_basis: "weeks", rate: 3515, allocation: 1.00 },
  { cost_code: "01-3145", description: "Asst. Superintendent", cost_type: "Labor", qty_basis: "weeks", rate: 2812, allocation: 0 },
  { cost_code: "01-3223", description: "Construction Layout", cost_type: "Expense", qty_basis: "months", rate: 150, allocation: 1 },
  { cost_code: "01-3236", description: "Aerial & Periodic Drones", cost_type: "Expense", qty_basis: "months", rate: 350, allocation: 0.25 },
  { cost_code: "01-3238", description: "Jobsite Security", cost_type: "Expense", qty_basis: "ls", rate: 500, allocation: 1 },
  { cost_code: "01-3245", description: "Office Supplies", cost_type: "Expense", qty_basis: "months", rate: 500, allocation: 1 },
  { cost_code: "01-3247", description: "Printing & Copying", cost_type: "Expense", qty_basis: "months", rate: 500, allocation: 1 },
  { cost_code: "01-3249", description: "Postage & Courier", cost_type: "Expense", qty_basis: "months", rate: 750, allocation: 1 },
  { cost_code: "01-3329", description: "LEED Documentation", cost_type: "Expense", qty_basis: "months", rate: 650, allocation: 0 },
  { cost_code: "01-3514", description: "Legal Fees", cost_type: "Expense", qty_basis: "ls", rate: 0, allocation: 0 },
  { cost_code: "01-4123", description: "Fees", cost_type: "Expense", qty_basis: "sf", rate: 1.25, allocation: 0 },
  { cost_code: "01-4124", description: "Sanitary Fees", cost_type: "Expense", qty_basis: "sf", rate: 1.25, allocation: 0 },
  { cost_code: "01-4126", description: "Permit Requirements", cost_type: "Expense", qty_basis: "ls", rate: 0, allocation: 1 },
  { cost_code: "01-4523", description: "Testing and Inspections", cost_type: "Expense", qty_basis: "ls", rate: 0, allocation: 0 },
  { cost_code: "01-4533", description: "Municipality Inspections", cost_type: "Expense", qty_basis: "ea", rate: 0, allocation: 0 },
  { cost_code: "01-4613", description: "Winter Conditions", cost_type: "Expense", qty_basis: "ls", rate: 0, allocation: 0 },
  { cost_code: "01-5113", description: "Temporary Electric", cost_type: "Expense", qty_basis: "months", rate: 500, allocation: 1 },
  { cost_code: "01-5116", description: "Temporary Fire Protection", cost_type: "Expense", qty_basis: "months", rate: 0, allocation: 0 },
  { cost_code: "01-5119", description: "Temporary Fuel", cost_type: "Expense", qty_basis: "weeks", rate: 150, allocation: 1 },
  { cost_code: "01-5123", description: "Temporary HVAC", cost_type: "Expense", qty_basis: "months", rate: 0, allocation: 0 },
  { cost_code: "01-5126", description: "Temporary Lighting", cost_type: "Expense", qty_basis: "ls", rate: 5000, allocation: 1 },
  { cost_code: "01-5129", description: "Temporary Gas", cost_type: "Expense", qty_basis: "months", rate: 0, allocation: 0 },
  { cost_code: "01-5133", description: "Temporary Internet/Telecomm", cost_type: "Expense", qty_basis: "months", rate: 250, allocation: 1 },
  { cost_code: "01-5136", description: "Temporary Water", cost_type: "Expense", qty_basis: "months", rate: 0, allocation: 0 },
  { cost_code: "01-5213", description: "Field Offices", cost_type: "Expense", qty_basis: "months", rate: 1200, allocation: 0.15 },
  { cost_code: "01-5214", description: "Temporary Storage", cost_type: "Expense", qty_basis: "months", rate: 1000, allocation: 0 },
  { cost_code: "01-5216", description: "First Aid / Safety Supplies", cost_type: "Expense", qty_basis: "months", rate: 350, allocation: 1 },
  { cost_code: "01-5217", description: "Safety Inspections", cost_type: "Expense", qty_basis: "months", rate: 450, allocation: 0 },
  { cost_code: "01-5219", description: "Temporary Toilets", cost_type: "Expense", qty_basis: "months", rate: 350, allocation: 1 },
  { cost_code: "01-5419", description: "Temporary Cranes", cost_type: "Expense", qty_basis: "ls", rate: 0, allocation: 0 },
  { cost_code: "01-5423", description: "Temp Scaffolding & Platforms", cost_type: "Expense", qty_basis: "ls", rate: 0, allocation: 0 },
  { cost_code: "01-5513", description: "Temporary Access Roads", cost_type: "Expense", qty_basis: "ls", rate: 0, allocation: 0 },
  { cost_code: "01-5519", description: "Temporary Parking Areas", cost_type: "Expense", qty_basis: "ls", rate: 0, allocation: 0 },
  { cost_code: "01-5623", description: "Temporary Barricades", cost_type: "Expense", qty_basis: "ls", rate: 500, allocation: 1 },
  { cost_code: "01-5626", description: "Temporary Fencing", cost_type: "Expense", qty_basis: "lf", rate: 0, allocation: 0 },
  { cost_code: "01-5639", description: "Temp Tree & Plant Protection", cost_type: "Expense", qty_basis: "ls", rate: 0, allocation: 0 },
  { cost_code: "01-5713", description: "Temp Erosion and Sediment", cost_type: "Expense", qty_basis: "ls", rate: 0, allocation: 0 },
  { cost_code: "01-5813", description: "Temporary Project Signage", cost_type: "Expense", qty_basis: "ls", rate: 0, allocation: 0 },
  { cost_code: "01-6113", description: "Software Licensing", cost_type: "Expense", qty_basis: "months", rate: 1000, allocation: 0.25 },
  { cost_code: "01-6115", description: "Performance and Payment Bonds", cost_type: "Expense", qty_basis: "ls", rate: 0, allocation: 0 },
  { cost_code: "01-6119", description: "Maintenance Bond", cost_type: "Expense", qty_basis: "ls", rate: 0, allocation: 0 },
  { cost_code: "01-6500", description: "Travel", cost_type: "Expense", qty_basis: "months", rate: 4000, allocation: 0 },
  { cost_code: "01-6502", description: "Truck Allowance", cost_type: "Expense", qty_basis: "months", rate: 750, allocation: 0 },
  { cost_code: "01-6503", description: "Truck Fuel", cost_type: "Expense", qty_basis: "months", rate: 300, allocation: 0 },
  { cost_code: "01-6504", description: "Recruitment", cost_type: "Expense", qty_basis: "ls", rate: 0, allocation: 0 },
  { cost_code: "01-6505", description: "Marketing", cost_type: "Expense", qty_basis: "months", rate: 250, allocation: 0 },
  { cost_code: "01-7123", description: "Construction Surveying", cost_type: "Expense", qty_basis: "ls", rate: 0, allocation: 0 },
  { cost_code: "01-7329", description: "Cutting and Patching", cost_type: "Expense", qty_basis: "ls", rate: 0, allocation: 0 },
  { cost_code: "01-7333", description: "Misc Small Tools", cost_type: "Expense", qty_basis: "months", rate: 1000, allocation: 0 },
  { cost_code: "01-7336", description: "Equipment Rental", cost_type: "Expense", qty_basis: "months", rate: 500, allocation: 0 },
  { cost_code: "01-7413", description: "Progress Cleaning", cost_type: "Expense", qty_basis: "months", rate: 1000, allocation: 1 },
  { cost_code: "01-7416", description: "Site Maintenance", cost_type: "Expense", qty_basis: "months", rate: 0, allocation: 0 },
  { cost_code: "01-7419", description: "Dumpsters", cost_type: "Expense", qty_basis: "ea", rate: 750, allocation: 1 },
  { cost_code: "01-7423", description: "Final Cleaning", cost_type: "Subcontract", qty_basis: "sf", rate: 0.75, allocation: 0 },
  { cost_code: "01-7425", description: "General Labor", cost_type: "Expense", qty_basis: "months", rate: 1000, allocation: 0 },
  { cost_code: "01-7433", description: "Window Washing", cost_type: "Subcontract", qty_basis: "sf", rate: 0, allocation: 0 },
  { cost_code: "01-7823", description: "Operation and Maintenance Data", cost_type: "Expense", qty_basis: "ls", rate: 0, allocation: 0 },
  { cost_code: "01-7836", description: "Warranties", cost_type: "Expense", qty_basis: "ls", rate: 0, allocation: 0 },
  { cost_code: "01-7841", description: "Project Final Photos", cost_type: "Expense", qty_basis: "ls", rate: 500, allocation: 0 },
  { cost_code: "01-8113", description: "Sust Design Reqmts/LEED Reqmts", cost_type: "Expense", qty_basis: "ls", rate: 0, allocation: 0 },
  { cost_code: "01-9119", description: "Facility Commissioning", cost_type: "Expense", qty_basis: "ls", rate: 0, allocation: 0 },
];

const ALL_DIVISIONS: Array<{ code: string; name: string }> = [
  { code: "02", name: "Existing Conditions" },
  { code: "03", name: "Concrete" },
  { code: "04", name: "Masonry" },
  { code: "05", name: "Metals" },
  { code: "06", name: "Wood Plastics & Composites" },
  { code: "07", name: "Thermal & Moisture Protection" },
  { code: "08", name: "Openings" },
  { code: "09", name: "Finishes" },
  { code: "10", name: "Specialties" },
  { code: "11", name: "Equipment" },
  { code: "12", name: "Furnishings" },
  { code: "13", name: "Special Construction" },
  { code: "14", name: "Conveying Equipment" },
  { code: "21", name: "Fire Suppression" },
  { code: "22", name: "Plumbing" },
  { code: "23", name: "HVAC" },
  { code: "25", name: "Integrated Automation" },
  { code: "26", name: "Electrical" },
  { code: "27", name: "Communications" },
  { code: "28", name: "Electronic Safety & Security" },
  { code: "31", name: "Earthwork" },
  { code: "32", name: "Exterior Improvements" },
  { code: "33", name: "Utilities" },
  { code: "34", name: "Transportation" },
  { code: "50", name: "Design" },
];

const COST_TYPE_OPTIONS = ["Labor", "Expense", "Subcontract", "Revenue"] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getEffectiveQty(item: GcItem, durationMonths: number): number {
  if (item.qty_basis === "weeks") return Math.round(durationMonths * 4.334 * 10) / 10;
  if (item.qty_basis === "months") return durationMonths;
  return item.qty ?? 0;
}

function computeGcTotal(items: GcItem[], durationMonths: number): number {
  return items.reduce((sum, item) => {
    const qty = getEffectiveQty(item, durationMonths);
    return sum + qty * (item.rate ?? 0) * (item.allocation ?? 0);
  }, 0);
}

function computeDetailDivisionTotal(items: DetailItem[], divCode: string): number {
  return items
    .filter((i) => i.division_code === divCode)
    .reduce((sum, i) => sum + (i.estimated_amount ?? 0), 0);
}

// ---------------------------------------------------------------------------
// Inline input components
// ---------------------------------------------------------------------------

function InlineText({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [local, setLocal] = React.useState(value);
  React.useEffect(() => { setLocal(value); }, [value]);
  const commit = () => { if (local !== value) onChange(local); };
  return (
    <Input
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
      placeholder={placeholder}
      className={`h-7 border-transparent bg-transparent text-xs transition-colors focus:border-border focus:bg-background ${className ?? ""}`}
    />
  );
}

function InlineNumber({
  value,
  onChange,
  className,
  step,
  min,
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
  step?: string;
  min?: string;
}) {
  const [local, setLocal] = React.useState(String(value));
  React.useEffect(() => { setLocal(String(value)); }, [value]);
  const commit = () => {
    const parsed = parseFloat(local);
    if (!Number.isNaN(parsed)) onChange(parsed);
    else setLocal(String(value));
  };
  return (
    <Input
      type="number"
      step={step ?? "0.01"}
      min={min ?? "0"}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
      className={`h-7 border-transparent bg-transparent text-xs transition-colors focus:border-border focus:bg-background ${className ?? ""}`}
    />
  );
}

function InlineSelect({
  value,
  options,
  onValueChange,
  placeholder,
  className,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onValueChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Select value={value || ""} onValueChange={onValueChange}>
      <SelectTrigger className={`h-7 border-transparent bg-transparent text-xs focus:border-border focus:bg-background ${className ?? ""}`}>
        <SelectValue placeholder={placeholder ?? "—"} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-xs">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function EstimateDetailClientV2({
  projectId,
  estimate,
  gcItems: initialGcItems,
  detailItems: initialDetailItems,
  sublistSubs: initialSublistSubs,
}: EstimateDetailClientV2Props) {
  const [activeTab, setActiveTab] = React.useState("gc");
  const [gcItems, setGcItems] = React.useState<GcItem[]>(initialGcItems);
  const [detailItems, setDetailItems] = React.useState<DetailItem[]>(initialDetailItems);
  const [sublistSubs, setSublistSubs] = React.useState<SublistSub[]>(initialSublistSubs);

  // Estimate-level editable fields
  const [durationMonths, setDurationMonths] = React.useState<number>(
    estimate.project_duration_months ?? 0
  );
  const [contingencyAmount, setContingencyAmount] = React.useState<number>(
    estimate.contingency_amount ?? 0
  );
  const [insuranceRate, setInsuranceRate] = React.useState<number>(
    estimate.insurance_rate ?? 0.0125
  );
  const [feeRate, setFeeRate] = React.useState<number>(estimate.fee_rate ?? 0.1);

  const durationWeeks = Math.round(durationMonths * 4.334 * 10) / 10;

  // Patch estimate helper
  const patchEstimate = React.useCallback(
    async (fields: Record<string, unknown>) => {
      try {
        await apiFetch(`/api/projects/${projectId}/estimates/${estimate.estimate_id}`, {
          method: "PUT",
          body: JSON.stringify({ ...fields, estimate_id: estimate.estimate_id }),
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    },
    [projectId, estimate.estimate_id]
  );

  const handleDurationMonthsBlur = (val: number) => {
    setDurationMonths(val);
    void patchEstimate({
      project_duration_months: val,
      project_duration_weeks: Math.round(val * 4.334 * 10) / 10,
    });
  };

  // ---------------------------------------------------------------------------
  // GC items handlers
  // ---------------------------------------------------------------------------

  const patchGcItem = async (id: number, fields: Partial<GcItem>) => {
    try {
      const updated = await apiFetch<GcItem>(
        `/api/projects/${projectId}/estimates/${estimate.estimate_id}/gc-items/${id}`,
        { method: "PATCH", body: JSON.stringify(fields) }
      );
      setGcItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const addGcRow = async () => {
    const nextOrder = gcItems.reduce((max, i) => Math.max(max, i.sort_order ?? 0), 0) + 1;
    try {
      const created = await apiFetch<GcItem>(
        `/api/projects/${projectId}/estimates/${estimate.estimate_id}/gc-items`,
        {
          method: "POST",
          body: JSON.stringify({
            cost_code: "",
            description: "",
            cost_type: "Expense",
            qty_basis: "ls",
            rate: 0,
            allocation: 1,
            sort_order: nextOrder,
          }),
        }
      );
      setGcItems((prev) => [...prev, created]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add row");
    }
  };

  const deleteGcRow = async (id: number) => {
    const prev = gcItems;
    setGcItems((items) => items.filter((i) => i.id !== id));
    try {
      await apiFetch(
        `/api/projects/${projectId}/estimates/${estimate.estimate_id}/gc-items/${id}`,
        { method: "DELETE" }
      );
    } catch (err) {
      setGcItems(prev);
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const loadGcTemplate = async () => {
    try {
      const items = await Promise.all(
        GC_TEMPLATE.map((t, idx) =>
          apiFetch<GcItem>(
            `/api/projects/${projectId}/estimates/${estimate.estimate_id}/gc-items`,
            {
              method: "POST",
              body: JSON.stringify({ ...t, sort_order: idx + 1 }),
            }
          )
        )
      );
      setGcItems(items);
      toast.success("Template loaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load template");
    }
  };

  // ---------------------------------------------------------------------------
  // Detail items handlers
  // ---------------------------------------------------------------------------

  const patchDetailItem = async (id: number, fields: Partial<DetailItem>) => {
    try {
      const updated = await apiFetch<DetailItem>(
        `/api/projects/${projectId}/estimates/${estimate.estimate_id}/detail-items/${id}`,
        { method: "PATCH", body: JSON.stringify(fields) }
      );
      setDetailItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const addDetailRow = async (divCode: string, divName: string) => {
    const divRows = detailItems.filter((i) => i.division_code === divCode);
    const nextOrder = divRows.reduce((max, i) => Math.max(max, i.sort_order ?? 0), 0) + 1;
    try {
      const created = await apiFetch<DetailItem>(
        `/api/projects/${projectId}/estimates/${estimate.estimate_id}/detail-items`,
        {
          method: "POST",
          body: JSON.stringify({
            division_code: divCode,
            division_name: divName,
            estimated_amount: 0,
            sort_order: nextOrder,
          }),
        }
      );
      setDetailItems((prev) => [...prev, created]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add row");
    }
  };

  const deleteDetailRow = async (id: number) => {
    const prev = detailItems;
    setDetailItems((items) => items.filter((i) => i.id !== id));
    try {
      await apiFetch(
        `/api/projects/${projectId}/estimates/${estimate.estimate_id}/detail-items/${id}`,
        { method: "DELETE" }
      );
    } catch (err) {
      setDetailItems(prev);
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  // ---------------------------------------------------------------------------
  // Sublist handlers
  // ---------------------------------------------------------------------------

  const patchSublistSub = async (id: number, fields: Partial<SublistSub>) => {
    try {
      const updated = await apiFetch<SublistSub>(
        `/api/projects/${projectId}/estimates/${estimate.estimate_id}/sublist/${id}`,
        { method: "PATCH", body: JSON.stringify(fields) }
      );
      setSublistSubs((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  };

  // Ensure 5 rows exist for a given division (creates them if missing)
  const ensureSublistRows = React.useCallback(
    async (divCode: string, divName: string) => {
      const existing = sublistSubs.filter((s) => s.division_code === divCode);
      const missing: number[] = [];
      for (let pos = 1; pos <= 5; pos++) {
        if (!existing.find((s) => s.position === pos)) missing.push(pos);
      }
      if (missing.length === 0) return;
      try {
        const created = await Promise.all(
          missing.map((pos) =>
            apiFetch<SublistSub>(
              `/api/projects/${projectId}/estimates/${estimate.estimate_id}/sublist`,
              {
                method: "POST",
                body: JSON.stringify({
                  division_code: divCode,
                  division_name: divName,
                  position: pos,
                }),
              }
            )
          )
        );
        setSublistSubs((prev) => [...prev, ...created]);
      } catch {
        // silently ignore — rows will be created on first edit
      }
    },
    [sublistSubs, projectId, estimate.estimate_id]
  );

  // ---------------------------------------------------------------------------
  // Summary calculations
  // ---------------------------------------------------------------------------

  const gcTotal = React.useMemo(() => computeGcTotal(gcItems, durationMonths), [gcItems, durationMonths]);
  const detailTotalsByDiv = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const div of ALL_DIVISIONS) {
      map[div.code] = computeDetailDivisionTotal(detailItems, div.code);
    }
    return map;
  }, [detailItems]);
  const detailTotal = Object.values(detailTotalsByDiv).reduce((s, v) => s + v, 0);
  const subtotal = gcTotal + detailTotal;
  const contingency = contingencyAmount;
  const insurance = Math.round(subtotal * insuranceRate * 100) / 100;
  const fee = Math.round((subtotal + insurance) * feeRate * 100) / 100;
  const grandTotal = subtotal + contingency + insurance + fee;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <PageShell
      variant="detail"
      title={estimate.title}
      description={`${estimate.status} · R${estimate.revision}`}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line">
          <TabsTrigger value="gc">General Conditions</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="sublist">SubList</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* TAB 1: General Conditions */}
        {/* ================================================================ */}
        <TabsContent value="gc" className="mt-4">
          <GcTab
            gcItems={gcItems}
            durationMonths={durationMonths}
            durationWeeks={durationWeeks}
            onDurationMonthsBlur={handleDurationMonthsBlur}
            onPatchItem={patchGcItem}
            onAddRow={addGcRow}
            onDeleteRow={deleteGcRow}
            onLoadTemplate={loadGcTemplate}
          />
        </TabsContent>

        {/* ================================================================ */}
        {/* TAB 2: Details */}
        {/* ================================================================ */}
        <TabsContent value="details" className="mt-4">
          <DetailsTab
            detailItems={detailItems}
            onPatchItem={patchDetailItem}
            onAddRow={addDetailRow}
            onDeleteRow={deleteDetailRow}
          />
        </TabsContent>

        {/* ================================================================ */}
        {/* TAB 3: SubList */}
        {/* ================================================================ */}
        <TabsContent value="sublist" className="mt-4">
          <SubListTab
            sublistSubs={sublistSubs}
            onPatchSub={patchSublistSub}
            onEnsureRows={ensureSublistRows}
          />
        </TabsContent>

        {/* ================================================================ */}
        {/* TAB 4: Summary */}
        {/* ================================================================ */}
        <TabsContent value="summary" className="mt-4">
          <SummaryTab
            durationMonths={durationMonths}
            gcTotal={gcTotal}
            detailTotalsByDiv={detailTotalsByDiv}
            subtotal={subtotal}
            contingencyAmount={contingencyAmount}
            insuranceRate={insuranceRate}
            feeRate={feeRate}
            insurance={insurance}
            fee={fee}
            grandTotal={grandTotal}
            onDurationMonthsBlur={handleDurationMonthsBlur}
            onContingencyBlur={(v) => {
              setContingencyAmount(v);
              void patchEstimate({ contingency_amount: v });
            }}
            onInsuranceRateBlur={(v) => {
              setInsuranceRate(v / 100);
              void patchEstimate({ insurance_rate: v / 100 });
            }}
            onFeeRateBlur={(v) => {
              setFeeRate(v / 100);
              void patchEstimate({ fee_rate: v / 100 });
            }}
          />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// GC Tab
// ---------------------------------------------------------------------------

function GcTab({
  gcItems,
  durationMonths,
  durationWeeks,
  onDurationMonthsBlur,
  onPatchItem,
  onAddRow,
  onDeleteRow,
  onLoadTemplate,
}: {
  gcItems: GcItem[];
  durationMonths: number;
  durationWeeks: number;
  onDurationMonthsBlur: (v: number) => void;
  onPatchItem: (id: number, fields: Partial<GcItem>) => Promise<void>;
  onAddRow: () => Promise<void>;
  onDeleteRow: (id: number) => Promise<void>;
  onLoadTemplate: () => Promise<void>;
}) {
  const gcTotal = computeGcTotal(gcItems, durationMonths);

  return (
    <div className="space-y-3">
      {/* Duration header */}
      <div className="flex items-center gap-4 rounded-md bg-card px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground">Project Duration</span>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Months</label>
          <InlineNumber
            value={durationMonths}
            onChange={onDurationMonthsBlur}
            className="w-20 border border-border bg-background"
            step="0.5"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Weeks (derived)</span>
          <span className="inline-flex h-7 w-20 items-center rounded-md bg-muted px-2 text-xs text-muted-foreground tabular-nums">
            {durationWeeks}
          </span>
        </div>
        {gcItems.length === 0 && (
          <Button size="sm" variant="outline" className="ml-auto h-7 text-xs" onClick={onLoadTemplate}>
            Load Template
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
              <th className="py-2 pl-3 pr-2 font-medium">Cost Code</th>
              <th className="px-2 py-2 font-medium">Description</th>
              <th className="w-28 px-2 py-2 font-medium">Cost Type</th>
              <th className="w-20 px-2 py-2 text-right font-medium">Qty</th>
              <th className="w-16 px-2 py-2 font-medium">Unit</th>
              <th className="w-24 px-2 py-2 text-right font-medium">Rate</th>
              <th className="w-20 px-2 py-2 text-right font-medium">Alloc %</th>
              <th className="w-28 px-2 py-2 text-right font-medium">Total</th>
              <th className="w-8 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {gcItems.map((item) => {
              const isWeeksBasis = item.qty_basis === "weeks";
              const isMonthsBasis = item.qty_basis === "months";
              const isDerived = isWeeksBasis || isMonthsBasis;
              const qtyEffective = getEffectiveQty(item, durationMonths);
              const rowTotal = qtyEffective * (item.rate ?? 0) * (item.allocation ?? 0);

              return (
                <tr key={item.id} className="group border-b border-border/30 hover:bg-muted/20">
                  <td className="py-1 pl-3 pr-2">
                    <InlineText
                      value={item.cost_code}
                      onChange={(v) => void onPatchItem(item.id, { cost_code: v })}
                      className="w-24"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <InlineText
                      value={item.description}
                      onChange={(v) => void onPatchItem(item.id, { description: v })}
                      placeholder="Description"
                      className="min-w-44"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <InlineSelect
                      value={item.cost_type}
                      options={COST_TYPE_OPTIONS.map((o) => ({ value: o, label: o }))}
                      onValueChange={(v) => void onPatchItem(item.id, { cost_type: v })}
                    />
                  </td>
                  <td className="px-2 py-1 text-right">
                    {isDerived ? (
                      <span className="inline-flex h-7 items-center justify-end px-2 text-muted-foreground tabular-nums">
                        {qtyEffective}
                      </span>
                    ) : (
                      <InlineNumber
                        value={item.qty ?? 0}
                        onChange={(v) => void onPatchItem(item.id, { qty: v })}
                        className="w-full text-right"
                      />
                    )}
                  </td>
                  <td className="px-2 py-1 text-muted-foreground">
                    {item.qty_basis ?? item.unit ?? "—"}
                  </td>
                  <td className="px-2 py-1">
                    <InlineNumber
                      value={item.rate ?? 0}
                      onChange={(v) => void onPatchItem(item.id, { rate: v })}
                      className="w-full text-right"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <InlineNumber
                      value={Math.round((item.allocation ?? 0) * 100)}
                      onChange={(v) => void onPatchItem(item.id, { allocation: v / 100 })}
                      className="w-full text-right"
                      min="0"
                      step="1"
                    />
                  </td>
                  <td className="px-2 py-1 text-right font-medium tabular-nums text-foreground">
                    {formatCurrency(rowTotal)}
                  </td>
                  <td className="px-2 py-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Delete row"
                      onClick={() => void onDeleteRow(item.id)}
                      className="h-6 p-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/20">
              <td colSpan={7} className="py-2 pl-3 text-xs font-semibold text-foreground">
                Total General Conditions
              </td>
              <td className="py-2 pr-3 text-right text-sm font-bold tabular-nums text-foreground">
                {formatCurrency(gcTotal)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => void onAddRow()}>
        <Plus className="h-3.5 w-3.5" />
        Add Row
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Details Tab
// ---------------------------------------------------------------------------

function DetailsTab({
  detailItems,
  onPatchItem,
  onAddRow,
  onDeleteRow,
}: {
  detailItems: DetailItem[];
  onPatchItem: (id: number, fields: Partial<DetailItem>) => Promise<void>;
  onAddRow: (divCode: string, divName: string) => Promise<void>;
  onDeleteRow: (id: number) => Promise<void>;
}) {
  return (
    <div className="space-y-3">
      {ALL_DIVISIONS.map((div) => {
        const rows = detailItems.filter((i) => i.division_code === div.code);
        const divTotal = rows.reduce((s, i) => s + (i.estimated_amount ?? 0), 0);
        return (
          <div key={div.code} className="overflow-hidden rounded-md border border-border">
            {/* Division header */}
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2">
              <span className="text-xs font-semibold text-foreground">
                {div.code} {div.name}
              </span>
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                {divTotal > 0 ? formatCurrency(divTotal) : "—"}
              </span>
            </div>

            {/* Rows */}
            {rows.length > 0 && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50 text-left text-muted-foreground">
                    <th className="py-1.5 pl-4 pr-2 font-medium">Cost Code</th>
                    <th className="px-2 py-1.5 font-medium">Cost Type</th>
                    <th className="px-2 py-1.5 font-medium">Cost Code Name</th>
                    <th className="px-2 py-1.5 font-medium">Work Description</th>
                    <th className="w-32 px-2 py-1.5 text-right font-medium">Est. Amount / Bid</th>
                    <th className="px-2 py-1.5 font-medium">Sub Name / Plug</th>
                    <th className="w-8 px-2 py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => (
                    <tr key={item.id} className="group border-b border-border/20 hover:bg-muted/20">
                      <td className="py-1 pl-4 pr-2">
                        <InlineText
                          value={item.cost_code ?? ""}
                          onChange={(v) => void onPatchItem(item.id, { cost_code: v || null })}
                          placeholder="Code"
                          className="w-20"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <InlineSelect
                          value={item.cost_type ?? ""}
                          options={COST_TYPE_OPTIONS.map((o) => ({ value: o, label: o }))}
                          onValueChange={(v) => void onPatchItem(item.id, { cost_type: v || null })}
                          placeholder="Type"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <InlineText
                          value={item.cost_code_name ?? ""}
                          onChange={(v) => void onPatchItem(item.id, { cost_code_name: v || null })}
                          placeholder="Name"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <InlineText
                          value={item.work_description ?? ""}
                          onChange={(v) => void onPatchItem(item.id, { work_description: v || null })}
                          placeholder="Description"
                          className="min-w-40"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <InlineNumber
                          value={item.estimated_amount ?? 0}
                          onChange={(v) => void onPatchItem(item.id, { estimated_amount: v })}
                          className="w-full text-right"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <InlineText
                          value={item.sub_name ?? ""}
                          onChange={(v) => void onPatchItem(item.id, { sub_name: v || null })}
                          placeholder="Sub name"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Delete row"
                          onClick={() => void onDeleteRow(item.id)}
                          className="h-6 p-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Add row */}
            <div className="px-4 py-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-auto gap-1 p-0 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => void onAddRow(div.code, div.name)}
              >
                <Plus className="h-3 w-3" />
                Add row
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SubList Tab
// ---------------------------------------------------------------------------

const INTEND_OPTIONS = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
];
const EMAIL_SENT_OPTIONS = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
  { value: "Other", label: "Other" },
];
const PHONE_OPTIONS = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
  { value: "Voicemail", label: "Voicemail" },
];
const BID_OPTIONS = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
  { value: "Other", label: "Other" },
];

function SubListTab({
  sublistSubs,
  onPatchSub,
  onEnsureRows,
}: {
  sublistSubs: SublistSub[];
  onPatchSub: (id: number, fields: Partial<SublistSub>) => Promise<void>;
  onEnsureRows: (divCode: string, divName: string) => Promise<void>;
}) {
  // SubList skips Div 01 General Conditions
  const subListDivisions = ALL_DIVISIONS;

  return (
    <div className="space-y-4">
      {subListDivisions.map((div) => {
        const rows = sublistSubs.filter((s) => s.division_code === div.code);
        // Fill 5 positions
        const filled: (SublistSub | null)[] = Array.from({ length: 5 }, (_, i) => {
          return rows.find((r) => r.position === i + 1) ?? null;
        });
        const intendYesCount = rows.filter((r) => r.intend_to_submit === "Yes").length;

        return (
          <div key={div.code} className="overflow-hidden rounded-md border border-border">
            <div
              className="flex items-center gap-2 border-b border-border bg-card px-4 py-2 cursor-pointer"
              onClick={() => void onEnsureRows(div.code, div.name)}
            >
              <span className="text-xs font-semibold text-foreground">
                {div.code} {div.name}
              </span>
              {intendYesCount > 0 && (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  {intendYesCount} intending
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50 text-left text-muted-foreground">
                    <th className="py-1.5 pl-4 pr-2 font-medium w-6">#</th>
                    <th className="px-2 py-1.5 font-medium">Company</th>
                    <th className="px-2 py-1.5 font-medium w-28">Intend to Submit?</th>
                    <th className="px-2 py-1.5 font-medium w-24">Email Sent?</th>
                    <th className="px-2 py-1.5 font-medium w-28">Phone Follow Up?</th>
                    <th className="px-2 py-1.5 font-medium w-24">Bid Received?</th>
                    <th className="px-2 py-1.5 font-medium">Contact</th>
                    <th className="px-2 py-1.5 font-medium">Email</th>
                    <th className="px-2 py-1.5 font-medium">Cell</th>
                    <th className="px-2 py-1.5 font-medium w-28 text-right">Price</th>
                    <th className="px-2 py-1.5 font-medium">Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {filled.map((sub, idx) => {
                    const pos = idx + 1;
                    if (!sub) {
                      return (
                        <tr key={pos} className="border-b border-border/20">
                          <td className="py-1.5 pl-4 pr-2 text-muted-foreground">{pos}</td>
                          <td colSpan={10} className="px-2 py-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto gap-1 p-0 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => void onEnsureRows(div.code, div.name)}
                            >
                              <Plus className="h-3 w-3" /> Add sub
                            </Button>
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={sub.id} className="border-b border-border/20 hover:bg-muted/20">
                        <td className="py-1 pl-4 pr-2 text-muted-foreground">{pos}</td>
                        <td className="px-2 py-1">
                          <InlineText
                            value={sub.company ?? ""}
                            onChange={(v) => void onPatchSub(sub.id, { company: v || null })}
                            placeholder="Company name"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <InlineSelect
                            value={sub.intend_to_submit ?? ""}
                            options={INTEND_OPTIONS}
                            onValueChange={(v) => void onPatchSub(sub.id, { intend_to_submit: v || null })}
                            placeholder="—"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <InlineSelect
                            value={sub.email_sent ?? ""}
                            options={EMAIL_SENT_OPTIONS}
                            onValueChange={(v) => void onPatchSub(sub.id, { email_sent: v || null })}
                            placeholder="—"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <InlineSelect
                            value={sub.phone_follow_up ?? ""}
                            options={PHONE_OPTIONS}
                            onValueChange={(v) => void onPatchSub(sub.id, { phone_follow_up: v || null })}
                            placeholder="—"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <InlineSelect
                            value={sub.bid_received ?? ""}
                            options={BID_OPTIONS}
                            onValueChange={(v) => void onPatchSub(sub.id, { bid_received: v || null })}
                            placeholder="—"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <InlineText
                            value={sub.contact_name ?? ""}
                            onChange={(v) => void onPatchSub(sub.id, { contact_name: v || null })}
                            placeholder="Name"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <InlineText
                            value={sub.email ?? ""}
                            onChange={(v) => void onPatchSub(sub.id, { email: v || null })}
                            placeholder="email@..."
                          />
                        </td>
                        <td className="px-2 py-1">
                          <InlineText
                            value={sub.cell ?? ""}
                            onChange={(v) => void onPatchSub(sub.id, { cell: v || null })}
                            placeholder="Phone"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <InlineNumber
                            value={sub.price ?? 0}
                            onChange={(v) => void onPatchSub(sub.id, { price: v || null })}
                            className="w-full text-right"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <InlineText
                            value={sub.comments ?? ""}
                            onChange={(v) => void onPatchSub(sub.id, { comments: v || null })}
                            placeholder="Comments"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary Tab
// ---------------------------------------------------------------------------

function SummaryTab({
  durationMonths,
  gcTotal,
  detailTotalsByDiv,
  subtotal,
  contingencyAmount,
  insuranceRate,
  feeRate,
  insurance,
  fee,
  grandTotal,
  onDurationMonthsBlur,
  onContingencyBlur,
  onInsuranceRateBlur,
  onFeeRateBlur,
}: {
  durationMonths: number;
  gcTotal: number;
  detailTotalsByDiv: Record<string, number>;
  subtotal: number;
  contingencyAmount: number;
  insuranceRate: number;
  feeRate: number;
  insurance: number;
  fee: number;
  grandTotal: number;
  onDurationMonthsBlur: (v: number) => void;
  onContingencyBlur: (v: number) => void;
  onInsuranceRateBlur: (v: number) => void;
  onFeeRateBlur: (v: number) => void;
}) {
  const detailTotal = Object.values(detailTotalsByDiv).reduce((s, v) => s + v, 0);

  return (
    <div className="max-w-2xl space-y-6">
      {/* Duration */}
      <div className="flex items-center gap-3 rounded-md bg-card px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground">Project Duration (Months)</span>
        <InlineNumber
          value={durationMonths}
          onChange={onDurationMonthsBlur}
          className="w-20 border border-border bg-background"
          step="0.5"
        />
        <span className="text-xs text-muted-foreground">
          = {Math.round(durationMonths * 4.334 * 10) / 10} weeks
        </span>
      </div>

      {/* Division totals */}
      <div className="overflow-hidden rounded-md border border-border">
        <div className="border-b border-border bg-muted/30 px-4 py-2">
          <span className="text-xs font-semibold text-foreground">Division Breakdown</span>
        </div>
        <table className="w-full text-xs">
          <tbody>
            {/* GC row */}
            <tr className="border-b border-border/30 hover:bg-muted/10">
              <td className="py-2 pl-4 pr-2 font-medium text-foreground">01 General Conditions</td>
              <td className="py-2 pr-4 text-right font-medium tabular-nums text-foreground">
                {formatCurrencyFull(gcTotal)}
              </td>
            </tr>
            {ALL_DIVISIONS.map((div) => {
              const tot = detailTotalsByDiv[div.code] ?? 0;
              return (
                <tr key={div.code} className="border-b border-border/20 hover:bg-muted/10">
                  <td className="py-1.5 pl-4 pr-2 text-muted-foreground">
                    <span className="font-medium text-foreground">{div.code}</span> {div.name}
                  </td>
                  <td className="py-1.5 pr-4 text-right tabular-nums text-muted-foreground">
                    {tot > 0 ? formatCurrencyFull(tot) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Financial rollup */}
      <div className="overflow-hidden rounded-md border border-border">
        <div className="border-b border-border bg-muted/30 px-4 py-2">
          <span className="text-xs font-semibold text-foreground">Financial Summary</span>
        </div>
        <div className="divide-y divide-border/30">
          <SummaryLineReadOnly label="GC Subtotal" value={gcTotal} />
          <SummaryLineReadOnly label="Other Divisions Subtotal" value={detailTotal} />
          <SummaryLineReadOnly label="Subtotal" value={subtotal} bold />

          <SummaryLineEditable
            label="Contingency ($)"
            value={contingencyAmount}
            displayValue={formatCurrencyFull(contingencyAmount)}
            onBlur={onContingencyBlur}
          />

          <SummaryLineEditable
            label={`Insurance (${(insuranceRate * 100).toFixed(2)}%)`}
            value={insuranceRate * 100}
            displayValue={formatCurrencyFull(insurance)}
            suffix="%"
            onBlur={onInsuranceRateBlur}
          />

          <SummaryLineEditable
            label={`Fee (${(feeRate * 100).toFixed(1)}%)`}
            value={feeRate * 100}
            displayValue={formatCurrencyFull(fee)}
            suffix="%"
            onBlur={onFeeRateBlur}
          />

          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-bold text-foreground">Grand Total</span>
            <span className="text-base font-bold tabular-nums text-primary">
              {formatCurrencyFull(grandTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryLineReadOnly({
  label,
  value,
  bold,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <span className={`text-xs ${bold ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
      <span className={`text-xs tabular-nums ${bold ? "font-semibold text-foreground" : "text-foreground"}`}>
        {formatCurrencyFull(value)}
      </span>
    </div>
  );
}

function SummaryLineEditable({
  label,
  value,
  displayValue,
  suffix,
  onBlur,
}: {
  label: string;
  value: number;
  displayValue: string;
  suffix?: string;
  onBlur: (v: number) => void;
}) {
  const [editMode, setEditMode] = React.useState(false);
  const [local, setLocal] = React.useState(String(value));

  React.useEffect(() => {
    setLocal(String(value));
  }, [value]);

  const commit = () => {
    const parsed = parseFloat(local);
    if (!Number.isNaN(parsed)) onBlur(parsed);
    else setLocal(String(value));
    setEditMode(false);
  };

  return (
    <div className="flex items-center justify-between px-4 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs tabular-nums text-foreground">{displayValue}</span>
        {editMode ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              type="number"
              step="0.01"
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => e.key === "Enter" && commit()}
              className="h-6 w-20 text-xs"
            />
            {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[10px] text-muted-foreground"
            onClick={() => setEditMode(true)}
          >
            edit
          </Button>
        )}
      </div>
    </div>
  );
}
