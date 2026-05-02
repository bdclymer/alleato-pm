import type { EstimateLineItem } from "@/lib/schemas/estimates";

type UnitBasis = "Weeks" | "Months" | "LS" | "EA" | "LF" | "SF";

export interface GCTemplateItem {
  cost_code: string;
  description: string;
  default_rate: number;
  unit_basis: UnitBasis;
  fixed_qty?: number;
}

export interface QTOTemplateLineItem {
  description: string;
  default_qty: number | null;
  unit: string;
  material_unit_price: number;
  subcontract_unit_price: number;
  comment_type: EstimateLineItem["comment_type"];
}

export interface QTOTemplateDivision {
  code: string;
  name: string;
  items: QTOTemplateLineItem[];
}

export const GC_TEMPLATE: GCTemplateItem[] = [
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
  { cost_code: "7423", description: "Final Cleaning", default_rate: 0.5, unit_basis: "SF", fixed_qty: 5000 },
];

export const QTO_TEMPLATE: QTOTemplateDivision[] = [
  {
    code: "00", name: "Design", items: [
      { description: "Alleato Coordination", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Boundary Survey", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Topographic Survey", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Geotechnical Survey", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Civil Design", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Architectural Design", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Structural", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "MEP Design", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  {
    code: "01", name: "General Conditions", items: [
      { description: "Application Fees", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "State Release", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Local Permits", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Local Planning", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  { code: "02", name: "Existing Conditions", items: [] },
  {
    code: "03", name: "Concrete", items: [
      { description: "Transformer Pads", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Generator Pads", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Bollard Concrete", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Rebar", default_qty: null, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Concrete Subcontractor", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  { code: "04", name: "Masonry", items: [] },
  {
    code: "05", name: "Metals", items: [
      { description: "Reinforce Joists", default_qty: null, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: "included_in" },
      { description: "Internal Contingency", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: "internal" },
      { description: "Design", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  {
    code: "06", name: "Wood, Plastics & Composites", items: [
      { description: "Hardi Board", default_qty: null, unit: "SF", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Exterior Plywood / Blocking", default_qty: null, unit: "SF", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Framing Labor", default_qty: null, unit: "SF", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Interior Framing Material", default_qty: null, unit: "SF", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "FRP", default_qty: null, unit: "SF", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Acoustical Panels", default_qty: null, unit: "SF", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Misc Blocking / Backing", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  {
    code: "07", name: "Thermal & Moisture Protection", items: [
      { description: "Insulation", default_qty: null, unit: "SF", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Roofing", default_qty: null, unit: "SF", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  {
    code: "08", name: "Openings", items: [
      { description: "Storefront / Curtain Wall", default_qty: null, unit: "SF", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "HM Frames", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Wood Doors", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Door Hardware", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Overhead Doors", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Access Doors", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  {
    code: "09", name: "Finishes", items: [
      { description: "Drywall", default_qty: null, unit: "SF", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "ACT Ceiling", default_qty: null, unit: "SF", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Flooring — VCT", default_qty: null, unit: "SF", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Flooring — Carpet", default_qty: null, unit: "SF", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Flooring — Epoxy", default_qty: null, unit: "SF", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Painting", default_qty: null, unit: "SF", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Tile", default_qty: null, unit: "SF", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  { code: "10", name: "Specialties", items: [] },
  {
    code: "11", name: "Equipment", items: [
      { description: "By Owner", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: "excluded" },
    ],
  },
  { code: "12", name: "Furnishings", items: [] },
  {
    code: "21", name: "Fire Suppression", items: [
      { description: "Fire Sprinkler System", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  {
    code: "22", name: "Plumbing", items: [
      { description: "Plumbing Rough-In", default_qty: null, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Plumbing Fixtures", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Water Heater", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Gas Piping", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  {
    code: "23", name: "HVAC", items: [
      { description: "RTU Units", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Ductwork", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Controls", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Exhaust Fans", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "HVAC Subcontractor", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  {
    code: "26", name: "Electrical", items: [
      { description: "Electrical Rough-In", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Switchgear / Panels", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Lighting", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Generator", default_qty: null, unit: "EA", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  {
    code: "27", name: "Communications", items: [
      { description: "Low Voltage / Data", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  {
    code: "28", name: "Electronic Safety & Security", items: [
      { description: "Fire Alarm System", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  {
    code: "31", name: "Earthwork", items: [
      { description: "Mobilization", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Clearing & Grubbing", default_qty: null, unit: "AC", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Mass Grading", default_qty: null, unit: "CY", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Fine Grading", default_qty: null, unit: "SF", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Import / Export Fill", default_qty: null, unit: "CY", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Erosion Control", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Dewatering", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Rock Excavation", default_qty: null, unit: "CY", material_unit_price: 0, subcontract_unit_price: 0, comment_type: "plug_number" },
    ],
  },
  {
    code: "32", name: "Exterior Improvements", items: [
      { description: "Asphalt Paving", default_qty: null, unit: "SF", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Concrete Curb & Gutter", default_qty: null, unit: "LF", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Concrete Sidewalks", default_qty: null, unit: "SF", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Striping", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Signage", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Landscaping", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Irrigation", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Fencing", default_qty: null, unit: "LF", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
  {
    code: "33", name: "Utilities / Storm / Drain", items: [
      { description: "Storm Drainage", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
      { description: "Utility Connections", default_qty: 1, unit: "LOT", material_unit_price: 0, subcontract_unit_price: 0, comment_type: null },
    ],
  },
];

export const DIVISION_NAME_BY_CODE = Object.fromEntries(
  QTO_TEMPLATE.map((division) => [division.code, division.name])
) as Record<string, string>;

export function getDefaultGCQuantity(item: GCTemplateItem, durationWeeks: number): number {
  if (item.fixed_qty !== undefined) return item.fixed_qty;
  if (item.unit_basis === "Weeks") return durationWeeks;
  if (item.unit_basis === "Months") return Math.ceil(durationWeeks / 4);
  return 1;
}

export function buildInitialEstimateTemplateLineItems(
  durationWeeks: number
): Array<Omit<EstimateLineItem, "line_item_id">> {
  const gcRows = GC_TEMPLATE.map((item, index) => ({
    line_number: index + 1,
    division_code: "01",
    description: item.description,
    quantity: getDefaultGCQuantity(item, durationWeeks),
    unit: item.unit_basis,
    material_unit_price: 0,
    material_cost: 0,
    labor_crew_size: null,
    labor_hours: null,
    labor_man_hours: 0,
    labor_rate: null,
    labor_cost: 0,
    equipment_duration: null,
    equipment_unit: null,
    equipment_rate: null,
    equipment_cost: 0,
    subcontract_unit_price: item.default_rate,
    subcontract_cost: 0,
    total_cost: 0,
    comments: null,
    comment_type: null,
    vendor_name: null,
    gc_cost_code: item.cost_code,
    sort_order: index,
  }));

  let sortOrder = gcRows.length;
  const qtoRows = QTO_TEMPLATE.flatMap((division) =>
    division.items.map((item, index) => ({
      line_number: index + 1,
      division_code: division.code,
      description: item.description,
      quantity: item.default_qty,
      unit: item.unit,
      material_unit_price: item.material_unit_price,
      material_cost: 0,
      labor_crew_size: null,
      labor_hours: null,
      labor_man_hours: 0,
      labor_rate: null,
      labor_cost: 0,
      equipment_duration: null,
      equipment_unit: null,
      equipment_rate: null,
      equipment_cost: 0,
      subcontract_unit_price: item.subcontract_unit_price,
      subcontract_cost: 0,
      total_cost: 0,
      comments: null,
      comment_type: item.comment_type,
      vendor_name: null,
      gc_cost_code: null,
      sort_order: sortOrder++,
    }))
  );

  return [...gcRows, ...qtoRows];
}
