"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronRight, Edit2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageContainer, ProjectPageHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type DivisionTotal,
  type EstimateAllowanceRow,
  type EstimateAlternateRow,
  type EstimateLineItemRow,
  type EstimateRow,
  calculateEstimateSummary,
} from "@/lib/schemas/estimates";

import {
  formatCurrency,
  formatDate,
  getStatusLabel,
} from "../estimates-table-utils";

// ─── GC Template Definition ─────────────────────────────────────────────────

type UnitBasis = "Weeks" | "Months" | "LS" | "EA" | "LF" | "SF";

interface GCTemplateItem {
  cost_code: string;
  description: string;
  default_rate: number;
  unit_basis: UnitBasis;
  fixed_qty?: number;
}

const GC_TEMPLATE: GCTemplateItem[] = [
  { cost_code: "3128", description: "Project Manager", default_rate: 3796, unit_basis: "Weeks" },
  { cost_code: "3144", description: "Superintendent", default_rate: 3375, unit_basis: "Weeks" },
  { cost_code: "3129", description: "PM Fuel", default_rate: 100, unit_basis: "Weeks" },
  { cost_code: "3130", description: "PM Truck", default_rate: 550, unit_basis: "Months" },
  { cost_code: "3245", description: "Office Supplies", default_rate: 150, unit_basis: "Months" },
  { cost_code: "3247", description: "Printing & Copying", default_rate: 750, unit_basis: "LS", fixed_qty: 3 },
  { cost_code: "3329", description: "Leed Documentation", default_rate: 0, unit_basis: "LS", fixed_qty: 0 },
  { cost_code: "4126", description: "Permit Requirements", default_rate: 15000, unit_basis: "LS", fixed_qty: 1 },
  { cost_code: "4523", description: "Testing & Inspections", default_rate: 3500, unit_basis: "LS", fixed_qty: 1 },
  { cost_code: "5113", description: "Temporary Electric", default_rate: 1000, unit_basis: "Months" },
  { cost_code: "5216", description: "First Aid/Safety Supplies", default_rate: 75, unit_basis: "Months" },
  { cost_code: "5213", description: "Field Office", default_rate: 650, unit_basis: "Months" },
  { cost_code: "5217", description: "Safety Inspections", default_rate: 150, unit_basis: "Months" },
  { cost_code: "5219", description: "Temp Toilets", default_rate: 350, unit_basis: "Months" },
  { cost_code: "6113", description: "Software Licensing", default_rate: 1500, unit_basis: "LS", fixed_qty: 1 },
  { cost_code: "6500", description: "Travel & Entertainment", default_rate: 12000, unit_basis: "Months" },
  { cost_code: "7333", description: "Misc Small Tools", default_rate: 500, unit_basis: "Months" },
  { cost_code: "7336", description: "Equipment Rental", default_rate: 750, unit_basis: "Months" },
  { cost_code: "7413", description: "Progress Cleaning", default_rate: 650, unit_basis: "Months" },
  { cost_code: "7419", description: "Dumpsters", default_rate: 750, unit_basis: "EA", fixed_qty: 6 },
  { cost_code: "—", description: "Temp Fencing", default_rate: 10, unit_basis: "LF", fixed_qty: 0 },
  { cost_code: "7423", description: "Final Cleaning", default_rate: 0.50, unit_basis: "SF", fixed_qty: 5000 },
];

function getDefaultQty(item: GCTemplateItem, durationWeeks: number): number {
  if (item.fixed_qty !== undefined) return item.fixed_qty;
  if (item.unit_basis === "Weeks") return durationWeeks;
  if (item.unit_basis === "Months") return Math.ceil(durationWeeks / 4);
  return 1;
}

// ─── GC Row State ────────────────────────────────────────────────────────────

interface GCRow {
  cost_code: string;
  description: string;
  qty: number;
  unit: string;
  rate: number;
}

function buildInitialGCRows(durationWeeks: number): GCRow[] {
  return GC_TEMPLATE.map((t) => ({
    cost_code: t.cost_code,
    description: t.description,
    qty: getDefaultQty(t, durationWeeks),
    unit: t.unit_basis,
    rate: t.default_rate,
  }));
}

// ─── QTO Template Definition ─────────────────────────────────────────────────

interface QTOTemplateLineItem {
  description: string;
  default_qty: number | null;
  unit: string;
  material_unit_price: number;
  subcontract_unit_price: number;
  comment_type: string | null;
}

interface QTOTemplateDivision {
  code: string;
  name: string;
  items: QTOTemplateLineItem[];
}

const QTO_TEMPLATE: QTOTemplateDivision[] = [
  {
    code: "00", name: "Design", items: [
      { description: "Alleato Coordination", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Boundary Survey", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Topographic Survey", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Geotechnical Survey", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Civil Design", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Architectural Design", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Structural", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "MEP Design", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  {
    code: "01", name: "General Conditions", items: [
      { description: "Application Fees", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "State Release", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Local Permits", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Local Planning", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  { code: "02", name: "Existing Conditions", items: [] },
  {
    code: "03", name: "Concrete", items: [
      { description: "Transformer Pads", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Generator Pads", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Bollard Concrete", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Rebar", default_qty: null, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Concrete Subcontractor", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  { code: "04", name: "Masonry", items: [] },
  {
    code: "05", name: "Metals", items: [
      { description: "Reinforce Joists", default_qty: null, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: "included_in" },
      { description: "Internal Contingency", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: "internal" },
      { description: "Design", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  {
    code: "06", name: "Wood, Plastics & Composites", items: [
      { description: "Hardi Board", default_qty: null, unit: "sf", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Exterior Plywood / Blocking", default_qty: null, unit: "sf", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Framing Labor", default_qty: null, unit: "sf", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Interior Framing Material", default_qty: null, unit: "sf", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "FRP", default_qty: null, unit: "sf", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Acoustical Panels", default_qty: null, unit: "sf", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Misc Blocking / Backing", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  {
    code: "07", name: "Thermal & Moisture Protection", items: [
      { description: "Insulation", default_qty: null, unit: "sf", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Roofing", default_qty: null, unit: "sf", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  {
    code: "08", name: "Openings", items: [
      { description: "Storefront / Curtain Wall", default_qty: null, unit: "sf", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "HM Frames", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Wood Doors", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Door Hardware", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Overhead Doors", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Access Doors", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  {
    code: "09", name: "Finishes", items: [
      { description: "Drywall", default_qty: null, unit: "sf", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "ACT Ceiling", default_qty: null, unit: "sf", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Flooring — VCT", default_qty: null, unit: "sf", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Flooring — Carpet", default_qty: null, unit: "sf", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Flooring — Epoxy", default_qty: null, unit: "sf", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Painting", default_qty: null, unit: "sf", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Tile", default_qty: null, unit: "sf", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  { code: "10", name: "Specialties", items: [] },
  {
    code: "11", name: "Equipment", items: [
      { description: "By Owner", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: "excluded" },
    ],
  },
  { code: "12", name: "Furnishings", items: [] },
  {
    code: "21", name: "Fire Suppression", items: [
      { description: "Fire Sprinkler System", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  {
    code: "22", name: "Plumbing", items: [
      { description: "Plumbing Rough-In", default_qty: null, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Plumbing Fixtures", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Water Heater", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Gas Piping", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  {
    code: "23", name: "HVAC", items: [
      { description: "RTU Units", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Ductwork", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Controls", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Exhaust Fans", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "HVAC Subcontractor", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  {
    code: "26", name: "Electrical", items: [
      { description: "Electrical Rough-In", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Switchgear / Panels", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Lighting", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Generator", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  {
    code: "27", name: "Communications", items: [
      { description: "Low Voltage / Data", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  {
    code: "28", name: "Electronic Safety & Security", items: [
      { description: "Fire Alarm System", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  {
    code: "31", name: "Earthwork", items: [
      { description: "Mobilization", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Clearing & Grubbing", default_qty: null, unit: "AC", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Mass Grading", default_qty: null, unit: "CY", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Fine Grading", default_qty: null, unit: "sf", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Import / Export Fill", default_qty: null, unit: "CY", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Erosion Control", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Dewatering", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Rock Excavation", default_qty: null, unit: "CY", material_unit_price: 0, subcontract_unit_price: 0, comment_type: "plug_number" },
    ],
  },
  {
    code: "32", name: "Exterior Improvements", items: [
      { description: "Asphalt Paving", default_qty: null, unit: "sf", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Concrete Curb & Gutter", default_qty: null, unit: "LF", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Concrete Sidewalks", default_qty: null, unit: "sf", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Striping", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Signage", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Landscaping", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Irrigation", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Fencing", default_qty: null, unit: "LF", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  {
    code: "33", name: "Utilities / Storm / Drain", items: [
      { description: "Storm Drainage", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Utility Connections", default_qty: 1, unit: "lot", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
];

// ─── QTO Row State ──────────────────────────────────────────────────────────

interface QTORow {
  id: string; // client-side key
  division_code: string;
  description: string;
  qty: number | null;
  unit: string;
  material_unit_price: number;
  subcontract_unit_price: number;
  material_cost: number;
  subcontract_cost: number;
  total_cost: number;
  comment_type: string | null;
}

function buildInitialQTORows(): QTORow[] {
  const rows: QTORow[] = [];
  for (const div of QTO_TEMPLATE) {
    for (const item of div.items) {
      const qty = item.default_qty ?? 0;
      const matCost = qty * item.material_unit_price;
      const subCost = qty * item.subcontract_unit_price;
      rows.push({
        id: `${div.code}-${item.description}`,
        division_code: div.code,
        description: item.description,
        qty: item.default_qty,
        unit: item.unit,
        material_unit_price: item.material_unit_price,
        subcontract_unit_price: item.subcontract_unit_price,
        material_cost: matCost,
        subcontract_cost: subCost,
        total_cost: matCost + subCost,
        comment_type: item.comment_type,
      });
    }
  }
  return rows;
}

function recalcQTORow(row: QTORow): QTORow {
  const qty = row.qty ?? 0;
  const matCost = qty * row.material_unit_price;
  const subCost = qty * row.subcontract_unit_price;
  return { ...row, material_cost: matCost, subcontract_cost: subCost, total_cost: matCost + subCost };
}

// ─── Settings State ──────────────────────────────────────────────────────────

interface EstimateSettings {
  project_duration_weeks: number;
  contingency_amount: number;
  insurance_rate: number;
  fee_rate: number;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface EstimateDetailClientProps {
  projectId: string;
  projectName: string;
  estimate: EstimateRow;
  lineItems: EstimateLineItemRow[];
  divisionTotals: DivisionTotal[];
  alternates: EstimateAlternateRow[];
  allowances: EstimateAllowanceRow[];
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function EstimateDetailClient({
  projectId,
  estimate,
  lineItems: _lineItems,
  divisionTotals,
  alternates,
  allowances,
}: EstimateDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState("gc");
  const [isSavingSettings, setIsSavingSettings] = React.useState(false);

  // Inline-editable estimate settings
  const [settings, setSettings] = React.useState<EstimateSettings>({
    project_duration_weeks: estimate.project_duration_weeks ?? 12,
    contingency_amount: estimate.contingency_amount ?? 0,
    insurance_rate: estimate.insurance_rate ?? 0.0125,
    fee_rate: estimate.fee_rate ?? 0.1,
  });

  // GC template rows — recalculate qty when duration changes
  const [gcRows, setGcRows] = React.useState<GCRow[]>(() =>
    buildInitialGCRows(estimate.project_duration_weeks ?? 12)
  );

  // QTO template rows — pre-populated from template, all divisions collapsed
  const [qtoRows, setQtoRows] = React.useState<QTORow[]>(buildInitialQTORows);

  // When duration changes, update qty for time-based rows
  React.useEffect(() => {
    setGcRows((prev) =>
      prev.map((row, i) => {
        const template = GC_TEMPLATE[i];
        if (template.fixed_qty !== undefined) return row;
        const newQty =
          template.unit_basis === "Weeks"
            ? settings.project_duration_weeks
            : Math.ceil(settings.project_duration_weeks / 4);
        return { ...row, qty: newQty };
      })
    );
  }, [settings.project_duration_weeks]);

  // GC total feeds into the live summary
  const gcTotal = React.useMemo(
    () => gcRows.reduce((sum, r) => sum + r.qty * r.rate, 0),
    [gcRows]
  );

  // QTO division totals from template rows
  const qtoDivisionTotals = React.useMemo(() => {
    const totals: Record<string, { material: number; subcontract: number; total: number; count: number }> = {};
    for (const row of qtoRows) {
      if (!totals[row.division_code]) totals[row.division_code] = { material: 0, subcontract: 0, total: 0, count: 0 };
      totals[row.division_code].material += row.material_cost;
      totals[row.division_code].subcontract += row.subcontract_cost;
      totals[row.division_code].total += row.total_cost;
      totals[row.division_code].count += 1;
    }
    return totals;
  }, [qtoRows]);

  // Merged division totals: GC overlay for 01 + QTO template totals + DB totals
  const effectiveDivisionTotals = React.useMemo((): DivisionTotal[] => {
    const allCodes = new Set<string>();
    for (const d of divisionTotals) allCodes.add(d.division_code);
    for (const div of QTO_TEMPLATE) allCodes.add(div.code);
    allCodes.add("01"); // always show GC

    const result: DivisionTotal[] = [];
    for (const code of Array.from(allCodes).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
      const db = divisionTotals.find((d) => d.division_code === code);
      const qto = qtoDivisionTotals[code];
      const templateDiv = QTO_TEMPLATE.find((d) => d.code === code);
      const divName = templateDiv?.name ?? db?.division_name ?? `Division ${code}`;

      let total = (db?.division_total ?? 0) + (qto?.total ?? 0);
      if (code === "01") total += gcTotal;

      if (total > 0) {
        result.push({
          division_code: code,
          division_name: divName,
          material_total: (db?.material_total ?? 0) + (qto?.material ?? 0),
          labor_total: db?.labor_total ?? 0,
          equipment_total: db?.equipment_total ?? 0,
          subcontract_total: (db?.subcontract_total ?? 0) + (qto?.subcontract ?? 0) + (code === "01" ? gcTotal : 0),
          division_total: total,
          line_count: (db?.line_count ?? 0) + (qto?.count ?? 0),
        });
      }
    }
    return result;
  }, [divisionTotals, gcTotal, qtoDivisionTotals]);

  const summary = calculateEstimateSummary(effectiveDivisionTotals, settings);

  // Auto-save settings with debounce
  const saveSettingsTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateSetting = <K extends keyof EstimateSettings>(
    key: K,
    value: EstimateSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    if (saveSettingsTimeout.current) clearTimeout(saveSettingsTimeout.current);
    saveSettingsTimeout.current = setTimeout(async () => {
      setIsSavingSettings(true);
      try {
        const res = await fetch(
          `/api/projects/${projectId}/estimates/${estimate.estimate_id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [key]: value }),
          }
        );
        if (!res.ok) throw new Error("Failed to save");
      } catch {
        toast.error("Failed to save settings");
      } finally {
        setIsSavingSettings(false);
      }
    }, 800);
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
              <ArrowLeft />
              Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(`/${projectId}/estimates/${estimate.estimate_id}/edit`)
              }
            >
              <Edit2 className="mr-1 h-4 w-4" />
              Edit
            </Button>
          </div>
        }
      />

      <PageContainer>
        {/* ── Two-Column Workbook Layout ─────────────────────────────────── */}
        <div className="flex gap-6 items-start">
          {/* ── Left Column: Sticky Summary ──────────────────────────────── */}
          <div className="w-[380px] shrink-0 sticky top-4 space-y-0">
            {/* Settings Strip */}
            <div className="border border-border rounded-t-md bg-muted/30 px-4 py-3 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
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

            {/* Division Summary Table */}
            <div className="border-x border-border bg-card">
              <div className="px-4 py-2 border-b border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Division Summary
                </p>
              </div>
              <div className="divide-y divide-border/50">
                {effectiveDivisionTotals.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-muted-foreground">
                    No costs yet.
                  </p>
                ) : (
                  effectiveDivisionTotals.map((dt) => (
                    <div
                      key={dt.division_code}
                      className="flex items-center justify-between px-4 py-2"
                    >
                      <span className="text-xs text-muted-foreground leading-tight">
                        <span className="font-medium text-foreground">{dt.division_code}</span>
                        {" "}
                        {dt.division_name}
                      </span>
                      <span className="text-xs font-medium text-foreground tabular-nums">
                        {formatCurrency(dt.division_total)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Totals Footer */}
            <div className="border border-border rounded-b-md bg-card divide-y divide-border/50">
              <SummaryRow label="Subtotal" value={formatCurrency(summary.subtotal)} />
              <SummaryRow
                label={`Contingency`}
                value={formatCurrency(summary.contingency)}
              />
              <SummaryRow
                label={`Insurance (${(settings.insurance_rate * 100).toFixed(2)}%)`}
                value={formatCurrency(summary.insurance)}
              />
              <SummaryRow
                label={`Fee (${(settings.fee_rate * 100).toFixed(1)}%)`}
                value={formatCurrency(summary.fee)}
              />
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-semibold text-foreground">Grand Total</span>
                <span className="text-base font-bold text-primary tabular-nums">
                  {formatCurrency(summary.grand_total)}
                </span>
              </div>
            </div>
          </div>

          {/* ── Right Column: Working Area ────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="gc">General Conditions</TabsTrigger>
                <TabsTrigger value="takeoff">Quantity Takeoff</TabsTrigger>
                <TabsTrigger value="alternates">Alternates &amp; Allowances</TabsTrigger>
              </TabsList>

              {/* ── General Conditions Tab ─────────────────────────────────── */}
              <TabsContent value="gc" className="mt-4">
                <GCTemplateTab
                  rows={gcRows}
                  onRowChange={(idx, field, value) => {
                    setGcRows((prev) => {
                      const next = [...prev];
                      next[idx] = { ...next[idx], [field]: value };
                      return next;
                    });
                  }}
                />
              </TabsContent>

              {/* ── Quantity Takeoff Tab ───────────────────────────────────── */}
              <TabsContent value="takeoff" className="mt-4">
                <QTOTemplateTab
                  rows={qtoRows}
                  onRowChange={(id, field, value) => {
                    setQtoRows((prev) =>
                      prev.map((r) => {
                        if (r.id !== id) return r;
                        const updated = { ...r, [field]: value };
                        return recalcQTORow(updated);
                      })
                    );
                  }}
                  onAddRow={(divisionCode) => {
                    const newRow: QTORow = {
                      id: `${divisionCode}-new-${Date.now()}`,
                      division_code: divisionCode,
                      description: "",
                      qty: null,
                      unit: "EA",
                      material_unit_price: 0,
                      subcontract_unit_price: 0,
                      material_cost: 0,
                      subcontract_cost: 0,
                      total_cost: 0,
                      comment_type: null,
                    };
                    setQtoRows((prev) => [...prev, newRow]);
                  }}
                  onDeleteRow={(id) => {
                    setQtoRows((prev) => prev.filter((r) => r.id !== id));
                  }}
                />
              </TabsContent>

              {/* ── Alternates & Allowances Tab ───────────────────────────── */}
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
                              <Badge
                                variant={alt.alternate_type === "deduct" ? "destructive" : "default"}
                              >
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
                        {allowances.map((alw) => (
                          <tr key={alw.allowance_id} className="border-b border-border/50">
                            <td className="py-2 pr-4">{alw.allowance_number}</td>
                            <td className="py-2 pr-4">{alw.description}</td>
                            <td className="py-2 pr-4 text-muted-foreground">
                              {alw.scope_type?.replace(/_/g, " ") ?? "—"}
                            </td>
                            <td className="py-2 text-right">{formatCurrency(alw.amount)}</td>
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
      </PageContainer>

    </>
  );
}

// ─── SettingField ─────────────────────────────────────────────────────────────

function SettingField({
  label,
  value,
  onChange,
  isCurrency,
  isPercent,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  isCurrency?: boolean;
  isPercent?: boolean;
}) {
  const [localVal, setLocalVal] = React.useState(String(value));

  React.useEffect(() => {
    setLocalVal(String(value));
  }, [value]);

  const commit = () => {
    const parsed = parseFloat(localVal);
    if (!Number.isNaN(parsed)) onChange(parsed);
    else setLocalVal(String(value));
  };

  return (
    <div>
      <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
      <div className="relative">
        {isCurrency && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            $
          </span>
        )}
        <Input
          className={`h-7 text-xs ${isCurrency ? "pl-4" : ""} ${isPercent ? "pr-4" : ""}`}
          value={localVal}
          onChange={(e) => setLocalVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
        />
        {isPercent && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            %
          </span>
        )}
      </div>
    </div>
  );
}

// ─── SummaryRow ───────────────────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground tabular-nums">{value}</span>
    </div>
  );
}

// ─── GCTemplateTab ────────────────────────────────────────────────────────────

function GCTemplateTab({
  rows,
  onRowChange,
}: {
  rows: GCRow[];
  onRowChange: (idx: number, field: "qty" | "rate", value: number) => void;
}) {
  const total = rows.reduce((sum, r) => sum + r.qty * r.rate, 0);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-3 font-medium w-16">Code</th>
              <th className="pb-2 pr-3 font-medium">Description</th>
              <th className="pb-2 pr-3 text-right font-medium w-20">Qty</th>
              <th className="pb-2 pr-3 font-medium w-16">Unit</th>
              <th className="pb-2 pr-3 text-right font-medium w-24">Rate</th>
              <th className="pb-2 text-right font-medium w-28">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <GCRowItem
                key={`${row.cost_code}-${idx}`}
                row={row}
                onQtyChange={(v) => onRowChange(idx, "qty", v)}
                onRateChange={(v) => onRowChange(idx, "rate", v)}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border">
              <td colSpan={5} className="pt-3 text-sm font-medium text-foreground">
                Total General Conditions
              </td>
              <td className="pt-3 text-right text-sm font-semibold text-foreground tabular-nums">
                {formatCurrency(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── GCRowItem ────────────────────────────────────────────────────────────────

function GCRowItem({
  row,
  onQtyChange,
  onRateChange,
}: {
  row: GCRow;
  onQtyChange: (v: number) => void;
  onRateChange: (v: number) => void;
}) {
  const rowTotal = row.qty * row.rate;

  return (
    <tr className="border-b border-border/30 hover:bg-muted/20 group">
      <td className="py-1.5 pr-3 text-xs text-muted-foreground align-middle">
        {row.cost_code}
      </td>
      <td className="py-1.5 pr-3 align-middle">
        <span className="text-sm text-foreground">{row.description}</span>
      </td>
      <td className="py-1.5 pr-3 align-middle">
        <InlineNumberInput
          value={row.qty}
          onChange={onQtyChange}
          className="text-right w-full"
        />
      </td>
      <td className="py-1.5 pr-3 text-xs text-muted-foreground align-middle">
        {row.unit}
      </td>
      <td className="py-1.5 pr-3 align-middle">
        <InlineNumberInput
          value={row.rate}
          onChange={onRateChange}
          className="text-right w-full"
          step="0.01"
        />
      </td>
      <td className="py-1.5 text-right align-middle tabular-nums text-sm font-medium text-foreground">
        {formatCurrency(rowTotal)}
      </td>
    </tr>
  );
}

// ─── InlineNumberInput ────────────────────────────────────────────────────────

function InlineNumberInput({
  value,
  onChange,
  className,
  step = "1",
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
  step?: string;
}) {
  const [localVal, setLocalVal] = React.useState(String(value));

  React.useEffect(() => {
    setLocalVal(String(value));
  }, [value]);

  const commit = () => {
    const parsed = parseFloat(localVal);
    if (!Number.isNaN(parsed) && parsed >= 0) onChange(parsed);
    else setLocalVal(String(value));
  };

  return (
    <Input
      type="number"
      step={step}
      min="0"
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
      className={`h-7 text-xs border-transparent bg-transparent focus:border-border focus:bg-background transition-colors ${className ?? ""}`}
    />
  );
}

// ─── QTOTemplateTab ──────────────────────────────────────────────────────────

function QTOTemplateTab({
  rows,
  onRowChange,
  onAddRow,
  onDeleteRow,
}: {
  rows: QTORow[];
  onRowChange: (id: string, field: keyof QTORow, value: number | string | null) => void;
  onAddRow: (divisionCode: string) => void;
  onDeleteRow: (id: string) => void;
}) {
  const [expandedDivisions, setExpandedDivisions] = React.useState<Set<string>>(new Set());

  const toggleDivision = (code: string) => {
    setExpandedDivisions((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const expandAll = () => setExpandedDivisions(new Set(QTO_TEMPLATE.map((d) => d.code)));
  const collapseAll = () => setExpandedDivisions(new Set());

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">
          {QTO_TEMPLATE.length} divisions · Click to expand and edit line items
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={collapseAll}>
            Collapse All
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-border overflow-hidden divide-y divide-border">
        {QTO_TEMPLATE.map((div) => {
          const divRows = rows.filter((r) => r.division_code === div.code);
          const divTotal = divRows.reduce((sum, r) => sum + r.total_cost, 0);
          const isExpanded = expandedDivisions.has(div.code);

          return (
            <QTODivisionSection
              key={div.code}
              code={div.code}
              name={div.name}
              itemCount={divRows.length}
              total={divTotal}
              isExpanded={isExpanded}
              onToggle={() => toggleDivision(div.code)}
              rows={divRows}
              onRowChange={onRowChange}
              onAddRow={() => onAddRow(div.code)}
              onDeleteRow={onDeleteRow}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── QTODivisionSection ─────────────────────────────────────────────────────

function QTODivisionSection({
  code,
  name,
  itemCount,
  total,
  isExpanded,
  onToggle,
  rows,
  onRowChange,
  onAddRow,
  onDeleteRow,
}: {
  code: string;
  name: string;
  itemCount: number;
  total: number;
  isExpanded: boolean;
  onToggle: () => void;
  rows: QTORow[];
  onRowChange: (id: string, field: keyof QTORow, value: number | string | null) => void;
  onAddRow: () => void;
  onDeleteRow: (id: string) => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between bg-muted/30 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
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
            ({itemCount} {itemCount === 1 ? "item" : "items"})
          </span>
        </span>
        <span className="text-sm font-medium tabular-nums text-foreground">
          {total > 0 ? formatCurrency(total) : "—"}
        </span>
      </button>

      {isExpanded && (
        <div className="bg-card">
          {rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pl-10 pr-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 text-right font-medium w-20">Qty</th>
                    <th className="px-3 py-2 font-medium w-16">Unit</th>
                    <th className="px-3 py-2 text-right font-medium w-24">Mat $/unit</th>
                    <th className="px-3 py-2 text-right font-medium w-24">Sub $/unit</th>
                    <th className="px-3 py-2 text-right font-medium w-28">Total</th>
                    <th className="px-3 py-2 w-8 sr-only">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <QTORowItem
                      key={row.id}
                      row={row}
                      onFieldChange={(field, value) => onRowChange(row.id, field, value)}
                      onDelete={() => onDeleteRow(row.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="pl-10 py-3 text-xs text-muted-foreground italic">
              No default items — add one below
            </p>
          )}

          <div className="pl-10 py-2 border-t border-border/30">
            <button
              type="button"
              onClick={onAddRow}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add item
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── QTORowItem ─────────────────────────────────────────────────────────────

function QTORowItem({
  row,
  onFieldChange,
  onDelete,
}: {
  row: QTORow;
  onFieldChange: (field: keyof QTORow, value: number | string | null) => void;
  onDelete: () => void;
}) {
  return (
    <tr className="border-b border-border/20 hover:bg-muted/20 group">
      <td className="pl-10 pr-3 py-1.5 align-middle">
        <InlineTextInput
          value={row.description}
          onChange={(v) => onFieldChange("description", v)}
          placeholder="Line item description"
        />
      </td>
      <td className="px-3 py-1.5 align-middle">
        <InlineNumberInput
          value={row.qty ?? 0}
          onChange={(v) => onFieldChange("qty", v)}
          className="text-right w-full"
          step="0.01"
        />
      </td>
      <td className="px-3 py-1.5 align-middle">
        <InlineTextInput
          value={row.unit}
          onChange={(v) => onFieldChange("unit", v)}
          className="w-full"
          placeholder="EA"
        />
      </td>
      <td className="px-3 py-1.5 align-middle">
        <InlineNumberInput
          value={row.material_unit_price}
          onChange={(v) => onFieldChange("material_unit_price", v)}
          className="text-right w-full"
          step="0.01"
        />
      </td>
      <td className="px-3 py-1.5 align-middle">
        <InlineNumberInput
          value={row.subcontract_unit_price}
          onChange={(v) => onFieldChange("subcontract_unit_price", v)}
          className="text-right w-full"
          step="0.01"
        />
      </td>
      <td className="px-3 py-1.5 text-right align-middle tabular-nums text-sm font-medium text-foreground">
        {row.total_cost > 0 ? formatCurrency(row.total_cost) : "—"}
      </td>
      <td className="px-3 py-1.5 align-middle">
        <button
          type="button"
          aria-label="Remove line item"
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

// ─── InlineTextInput ────────────────────────────────────────────────────────

function InlineTextInput({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [localVal, setLocalVal] = React.useState(value);

  React.useEffect(() => {
    setLocalVal(value);
  }, [value]);

  const commit = () => {
    if (localVal !== value) onChange(localVal);
  };

  return (
    <Input
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
      placeholder={placeholder}
      className={`h-7 text-xs border-transparent bg-transparent focus:border-border focus:bg-background transition-colors ${className ?? ""}`}
    />
  );
}
