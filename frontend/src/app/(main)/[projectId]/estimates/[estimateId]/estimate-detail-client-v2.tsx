"use client";

import * as React from "react";
import { CheckCircle2, ChevronDown, ChevronRight, ExternalLink, Mail, Printer, Plus, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageShell, PageTabs } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Modal as Dialog,
  ModalContent as DialogContent,
  ModalDescription as DialogDescription,
  ModalFooter as DialogFooter,
  ModalHeader as DialogHeader,
  ModalTitle as DialogTitle,
} from "@/components/ui/unified-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";
import { SeedBudgetFromEstimateModal } from "@/components/domain/estimates/SeedBudgetFromEstimateModal";
import { ExpandableSearch } from "@/components/tables/unified/expandable-search";
import type { Database } from "@/types/database.types";
import type {
  EstimateAllowanceRow,
  EstimateAlternateRow,
  EstimateRow,
} from "@/lib/schemas/estimates";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GcItem = Database["public"]["Tables"]["estimate_gc_items"]["Row"];
type DetailItem = Database["public"]["Tables"]["estimate_detail_items"]["Row"];
type SublistSub = Database["public"]["Tables"]["estimate_sublist_subs"]["Row"];
type CallLog = Database["public"]["Tables"]["estimate_sublist_call_logs"]["Row"];
type ScopeItem = Database["public"]["Tables"]["estimate_sublist_scope_items"]["Row"];
type BidItem = Database["public"]["Tables"]["estimate_sublist_bid_items"]["Row"];

interface EstimateDetailClientV2Props {
  projectId: string;
  projectName: string;
  estimate: EstimateRow;
  gcItems: GcItem[];
  detailItems: DetailItem[];
  sublistSubs: SublistSub[];
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

/** Maps CSI division codes → trade keywords to match against company vendor_class / type */
const CSI_DIVISION_TRADES: Record<string, string[]> = {
  "02": ["demolition", "environmental", "existing conditions", "abatement"],
  "03": ["concrete", "structural concrete"],
  "04": ["masonry", "brick", "block"],
  "05": ["steel", "metals", "structural steel", "iron"],
  "06": ["carpentry", "wood", "millwork", "cabinetry", "framing"],
  "07": ["roofing", "waterproofing", "insulation", "caulking", "sealants", "moisture protection"],
  "08": ["doors", "windows", "glazing", "openings", "hardware"],
  "09": ["drywall", "painting", "flooring", "tile", "finishes", "ceilings", "acoustical"],
  "10": ["specialties", "toilet", "signage", "lockers"],
  "11": ["equipment"],
  "12": ["furnishings", "furniture", "blinds"],
  "13": ["special construction"],
  "14": ["elevator", "conveying", "escalator"],
  "21": ["fire sprinkler", "fire suppression", "sprinkler"],
  "22": ["plumbing", "mechanical", "piping"],
  "23": ["hvac", "mechanical", "heating", "cooling", "ventilation", "air conditioning"],
  "25": ["automation", "controls", "building automation", "bas"],
  "26": ["electrical", "electric", "lighting", "power"],
  "27": ["data", "communications", "low voltage", "telecom", "av", "audio visual"],
  "28": ["security", "fire alarm", "access control", "cctv", "electronic safety"],
  "31": ["earthwork", "grading", "excavation", "site work"],
  "32": ["paving", "landscaping", "site improvements", "concrete flatwork", "exterior"],
  "33": ["utilities", "underground", "site utilities"],
  "50": ["design", "architect", "engineer"],
};

function companyMatchesDivision(company: { vendor_class?: string | null; type?: string | null }, divisionCode: string): boolean {
  const keywords = CSI_DIVISION_TRADES[divisionCode];
  if (!keywords) return false;
  const haystack = `${company.vendor_class ?? ""} ${company.type ?? ""}`.toLowerCase();
  return keywords.some((kw) => haystack.includes(kw));
}

const DETAIL_DIVISIONS: Array<{
  division_code: string;
  division_header: string;
  rows: Array<{ cost_code: string; cost_type: string; name: string }>;
}> = [
  { division_code: "02", division_header: "02-0000 Existing Conditions", rows: [
    { cost_code: "02-0150", cost_type: "Expense",     name: "Maint. & Site Remediation" },
    { cost_code: "02-2113", cost_type: "Expense",     name: "Site Surveys" },
    { cost_code: "02-2219", cost_type: "Expense",     name: "Traffic Assessment" },
    { cost_code: "02-2400", cost_type: "Expense",     name: "Environmental Assessments" },
    { cost_code: "02-2600", cost_type: "Expense",     name: "Hazard Material Assessments" },
    { cost_code: "02-4113", cost_type: "Subcontract", name: "Selective Site Demolition" },
    { cost_code: "02-4116", cost_type: "Subcontract", name: "Structure Demolition" },
    { cost_code: "02-4119", cost_type: "Subcontract", name: "Selective Interior Demolition" },
    { cost_code: "02-6500", cost_type: "Subcontract", name: "UG Storage Tank Removal" },
    { cost_code: "02-8213", cost_type: "Subcontract", name: "Asbestos Abatement" },
  ]},
  { division_code: "03", division_header: "03-0000 Concrete", rows: [
    { cost_code: "03-3500", cost_type: "", name: "Concrete Finishing" },
  ]},
  { division_code: "04", division_header: "04-0000 Masonry", rows: [
    { cost_code: "04-2000", cost_type: "", name: "Unit Masonry-Brick" },
    { cost_code: "04-2200", cost_type: "", name: "Concrete Unit Masonry-Block" },
    { cost_code: "04-4300", cost_type: "", name: "Stone Masonry" },
    { cost_code: "04-7200", cost_type: "", name: "Cast Stone Masonry" },
    { cost_code: "04-7300", cost_type: "", name: "Manufactured Stone Masonry" },
  ]},
  { division_code: "05", division_header: "05-0000 Metals", rows: [
    { cost_code: "05-1100", cost_type: "", name: "Miscellaneous Metals" },
    { cost_code: "05-1200", cost_type: "", name: "Structural Steel Framing" },
    { cost_code: "05-2000", cost_type: "", name: "Metal Joists" },
    { cost_code: "05-3000", cost_type: "", name: "Metal Decking" },
    { cost_code: "05-4100", cost_type: "", name: "Structural Metal Stud Framing" },
    { cost_code: "05-5100", cost_type: "", name: "Metal Stairs" },
    { cost_code: "05-5133", cost_type: "", name: "Metal Ladders" },
    { cost_code: "05-5813", cost_type: "", name: "Column Covers" },
    { cost_code: "05-5823", cost_type: "", name: "Formed Metal Guards" },
    { cost_code: "05-5900", cost_type: "", name: "Metal Specialties" },
    { cost_code: "05-7000", cost_type: "", name: "Decorative Metal" },
  ]},
  { division_code: "06", division_header: "06-0000 Woods Plastics and Composites", rows: [
    { cost_code: "06-1000", cost_type: "", name: "Rough Carpentry" },
    { cost_code: "06-1100", cost_type: "", name: "Wood Framing" },
  ]},
  { division_code: "07", division_header: "07-0000 Thermal & Moisture Protection", rows: [
    { cost_code: "07-2100", cost_type: "", name: "Thermal Insulation" },
    { cost_code: "07-2500", cost_type: "", name: "Weather Barriers" },
  ]},
  { division_code: "08", division_header: "08-0000 Openings", rows: [
    { cost_code: "08-1113", cost_type: "", name: "Hollow Metal Door and Frames" },
    { cost_code: "08-3600", cost_type: "", name: "Overhead Doors" },
    { cost_code: "08-7100", cost_type: "", name: "Door Hardware" },
    { cost_code: "08-7900", cost_type: "", name: "Hardware Accessories" },
  ]},
  { division_code: "09", division_header: "09-0000 Finishes", rows: [
    { cost_code: "09-2116", cost_type: "", name: "Gypsum Board Assemblies" },
    { cost_code: "09-5100", cost_type: "", name: "Acoustical Ceilings" },
    { cost_code: "09-6013", cost_type: "", name: "Floor Prep" },
    { cost_code: "09-6200", cost_type: "", name: "Specialty Flooring" },
    { cost_code: "09-6513", cost_type: "", name: "Resilient Base" },
    { cost_code: "09-9123", cost_type: "", name: "Interior Painting" },
  ]},
  { division_code: "10", division_header: "10-0000 Specialties", rows: [
    { cost_code: "10-1116", cost_type: "", name: "Markerboards" },
    { cost_code: "10-1139", cost_type: "", name: "Visual Display Rails" },
    { cost_code: "10-1300", cost_type: "", name: "Directories" },
    { cost_code: "10-1400", cost_type: "", name: "Signage" },
    { cost_code: "10-2113", cost_type: "", name: "Toilet Compartments" },
    { cost_code: "10-2123", cost_type: "", name: "Cubicle Curtains and Track" },
    { cost_code: "10-2233", cost_type: "", name: "Accordion Folding Partitions" },
    { cost_code: "10-2613", cost_type: "", name: "Corner Guards" },
    { cost_code: "10-2616", cost_type: "", name: "Bumper Guards" },
    { cost_code: "10-2623", cost_type: "", name: "Fiberglass Reinf Prot Covering" },
    { cost_code: "10-2813", cost_type: "", name: "Toilet Accessories" },
    { cost_code: "10-4000", cost_type: "", name: "Safety Specialties" },
    { cost_code: "10-4116", cost_type: "", name: "Knox Box" },
    { cost_code: "10-4416", cost_type: "", name: "Fire Extinguishers" },
    { cost_code: "10-5100", cost_type: "", name: "Lockers" },
    { cost_code: "10-5523", cost_type: "", name: "Mail Boxes" },
    { cost_code: "10-7313", cost_type: "", name: "Awnings" },
    { cost_code: "10-7316", cost_type: "", name: "Canopies" },
    { cost_code: "10-7500", cost_type: "", name: "Flagpoles" },
    { cost_code: "10-8200", cost_type: "", name: "Grilles and Screens" },
  ]},
  { division_code: "11", division_header: "11-0000 Equipment", rows: [
    { cost_code: "11-1200", cost_type: "", name: "Parking Control Equipment" },
    { cost_code: "11-1300", cost_type: "", name: "Loading Dock Equipment" },
    { cost_code: "11-4000", cost_type: "", name: "Foodservice Equipment" },
    { cost_code: "11-6000", cost_type: "", name: "Entertainment and Recreation Equipment" },
    { cost_code: "11-7000", cost_type: "", name: "Healthcare Equipment" },
  ]},
  { division_code: "12", division_header: "12-0000 Furnishings", rows: [
    { cost_code: "12-2100", cost_type: "", name: "Window Blinds" },
    { cost_code: "12-3000", cost_type: "", name: "Casework" },
    { cost_code: "12-3500", cost_type: "", name: "Specialty Casework" },
    { cost_code: "12-4813", cost_type: "", name: "Entrance Floor Mats and Frames" },
    { cost_code: "12-5100", cost_type: "", name: "Office Furniture" },
    { cost_code: "12-9000", cost_type: "", name: "Other Furnishings" },
  ]},
  { division_code: "13", division_header: "13-0000 Special Construction", rows: [
    { cost_code: "13-2100", cost_type: "", name: "Controlled Environment Rooms" },
    { cost_code: "13-2213", cost_type: "", name: "Paint Booths" },
    { cost_code: "13-2400", cost_type: "", name: "Special Activity Rooms" },
    { cost_code: "13-3400", cost_type: "", name: "Fabricated Engr Structures" },
    { cost_code: "13-4900", cost_type: "", name: "Radiation Protection" },
  ]},
  { division_code: "14", division_header: "14-0000 Conveying Equipment", rows: [
    { cost_code: "14-2000", cost_type: "", name: "Elevators" },
    { cost_code: "14-4200", cost_type: "", name: "Wheelchair Lifts" },
  ]},
  { division_code: "21", division_header: "21-0000 Fire Suppression", rows: [
    { cost_code: "21-1100", cost_type: "", name: "Facility Fire-Suppression Water" },
    { cost_code: "21-1200", cost_type: "", name: "Fire-Suppression Standpipes" },
    { cost_code: "21-1223", cost_type: "", name: "Hose Valve Stations" },
    { cost_code: "21-1313", cost_type: "", name: "Wet-Pipe Sprinkler System" },
    { cost_code: "21-1316", cost_type: "", name: "Dry-Pipe Sprinkler Systems" },
    { cost_code: "21-1319", cost_type: "", name: "Preaction Sprinkler Systems" },
    { cost_code: "21-2000", cost_type: "", name: "Fire-Extinguishing System" },
    { cost_code: "21-3000", cost_type: "", name: "Fire Pumps" },
    { cost_code: "21-4000", cost_type: "", name: "Fire-Suppression Water Storage" },
  ]},
  { division_code: "22", division_header: "22-0000 Plumbing", rows: [
    { cost_code: "22-1000", cost_type: "", name: "Plumbing Piping" },
    { cost_code: "22-1116", cost_type: "", name: "Domestic Water Piping" },
    { cost_code: "22-1123", cost_type: "", name: "Domestic Water Pumps" },
    { cost_code: "22-1316", cost_type: "", name: "Sanitary Waste and Vent Piping" },
    { cost_code: "22-1319", cost_type: "", name: "Grease Removal Devices" },
    { cost_code: "22-1326", cost_type: "", name: "Sanitary Waste Separators" },
    { cost_code: "22-1416", cost_type: "", name: "Roof Drains and Leaders" },
    { cost_code: "22-1500", cost_type: "", name: "Gen Serv Compress-Air Systems" },
    { cost_code: "22-4513", cost_type: "", name: "Emergency Showers" },
    { cost_code: "22-4516", cost_type: "", name: "Eyewash Equipment" },
    { cost_code: "22-4713", cost_type: "", name: "Drinking Fountains" },
    { cost_code: "22-6000", cost_type: "", name: "Medical Gas System" },
  ]},
  { division_code: "23", division_header: "23-0000 HVAC", rows: [
    { cost_code: "23-0700", cost_type: "", name: "HVAC Insulation" },
    { cost_code: "23-1123", cost_type: "", name: "Facility Natural-Gas Piping" },
    { cost_code: "23-3000", cost_type: "", name: "HVAC Air Distribution" },
    { cost_code: "23-3439", cost_type: "", name: "HVLS Fans" },
    { cost_code: "23-3800", cost_type: "", name: "Summer Ventilation" },
    { cost_code: "23-5600", cost_type: "", name: "Solar Energy Heating Equipment" },
    { cost_code: "23-7000", cost_type: "", name: "Central HVAC Equipment" },
    { cost_code: "23-8000", cost_type: "", name: "Decentralized HVAC Equipment" },
  ]},
  { division_code: "25", division_header: "25-0000 Integrated Automation", rows: [
    { cost_code: "25-5000", cost_type: "", name: "Energy Management System" },
  ]},
  { division_code: "26", division_header: "26-0000 Electrical", rows: [
    { cost_code: "26-1000", cost_type: "", name: "Med-Volt Elect Distribution" },
    { cost_code: "26-2000", cost_type: "", name: "Low-Volt Elect Distribution" },
    { cost_code: "26-3100", cost_type: "", name: "Photovoltaic Collectors" },
    { cost_code: "26-3200", cost_type: "", name: "Packaged Generators" },
    { cost_code: "26-3343", cost_type: "", name: "Charging Equipment" },
    { cost_code: "26-5100", cost_type: "", name: "Interior Lighting" },
    { cost_code: "26-5213", cost_type: "", name: "Emergency and Exit Lighting" },
    { cost_code: "26-5500", cost_type: "", name: "Special Purpose Lighting" },
    { cost_code: "26-5600", cost_type: "", name: "Exterior Lighting" },
  ]},
  { division_code: "27", division_header: "27-0000 Communications", rows: [
    { cost_code: "27-1000", cost_type: "", name: "Structured Cabling" },
    { cost_code: "27-3000", cost_type: "", name: "Voice Communications" },
    { cost_code: "27-4000", cost_type: "", name: "Audio-Video Communications" },
  ]},
  { division_code: "28", division_header: "28-0000 Electronic Safety and Security", rows: [
    { cost_code: "28-1000", cost_type: "", name: "Access Control" },
    { cost_code: "28-2000", cost_type: "", name: "Electronic Surveillance" },
    { cost_code: "28-4000", cost_type: "", name: "Electronic Monitoring and Control" },
    { cost_code: "28-4600", cost_type: "", name: "Fire Detection and Alarm" },
  ]},
  { division_code: "31", division_header: "31-0000 Earthwork", rows: [
    { cost_code: "31-1100", cost_type: "", name: "Clearing and Grubbing" },
    { cost_code: "31-2213", cost_type: "", name: "Rough Grading" },
    { cost_code: "31-2219", cost_type: "", name: "Finish Grading" },
    { cost_code: "31-2316", cost_type: "", name: "Excavation" },
    { cost_code: "31-2319", cost_type: "", name: "Dewatering" },
    { cost_code: "31-2500", cost_type: "", name: "Erosion Control (Permanent)" },
    { cost_code: "31-3200", cost_type: "", name: "Soil Stabilization" },
    { cost_code: "31-3219", cost_type: "", name: "Geogrid Soil Stabilization" },
    { cost_code: "31-3700", cost_type: "", name: "Riprap" },
    { cost_code: "31-4800", cost_type: "", name: "Underpinning" },
    { cost_code: "31-5000", cost_type: "", name: "Excav Support and Protection" },
    { cost_code: "31-6000", cost_type: "", name: "Special Foundations & Load Bearing" },
    { cost_code: "31-6200", cost_type: "", name: "Driven Piles" },
    { cost_code: "31-6613", cost_type: "", name: "Aggregate Piles/Geopiers" },
    { cost_code: "31-6615", cost_type: "", name: "Helical Foundation Piles" },
  ]},
  { division_code: "32", division_header: "32-0000 Exterior Improvements", rows: [
    { cost_code: "32-0523", cost_type: "", name: "Cement and Concrete Exterior" },
    { cost_code: "32-1123", cost_type: "", name: "Aggregate Base Courses" },
    { cost_code: "32-1216", cost_type: "", name: "Asphalt Paving" },
    { cost_code: "32-1236", cost_type: "", name: "Seal Coating" },
    { cost_code: "32-1313", cost_type: "", name: "Concrete Paving" },
    { cost_code: "32-1373", cost_type: "", name: "Concrete Paving Joint Sealants" },
    { cost_code: "32-1500", cost_type: "", name: "Aggregate Surfacing" },
    { cost_code: "32-1613", cost_type: "", name: "Curbs and Gutters" },
    { cost_code: "32-1623", cost_type: "", name: "Sidewalks" },
    { cost_code: "32-1633", cost_type: "", name: "Driveways" },
    { cost_code: "32-1713", cost_type: "", name: "Parking Bumpers" },
    { cost_code: "32-1723", cost_type: "", name: "Pavement Markings" },
    { cost_code: "32-3113", cost_type: "", name: "Chain Link Fences and Gates" },
    { cost_code: "32-3213", cost_type: "", name: "CIP Concrete Retaining Walls" },
    { cost_code: "32-3300", cost_type: "", name: "Site Furnishings" },
    { cost_code: "32-3500", cost_type: "", name: "Screening Devices" },
    { cost_code: "32-3900", cost_type: "", name: "Manufactured Site Specialties" },
    { cost_code: "32-7000", cost_type: "", name: "Wetlands" },
    { cost_code: "32-8000", cost_type: "", name: "Irrigation" },
    { cost_code: "32-9000", cost_type: "", name: "Planting" },
  ]},
  { division_code: "33", division_header: "33-0000 Utilities", rows: [
    { cost_code: "33-0504", cost_type: "", name: "Utility Relocations" },
    { cost_code: "33-1000", cost_type: "", name: "Water Utilities" },
    { cost_code: "33-1413", cost_type: "", name: "Public Water Utility Distribution" },
    { cost_code: "33-3111", cost_type: "", name: "Public Sanitary Sewerage" },
    { cost_code: "33-3113", cost_type: "", name: "Site Sanitary Sewerage" },
    { cost_code: "33-3123", cost_type: "", name: "Sanitary Sewerage Force Main" },
    { cost_code: "33-3200", cost_type: "", name: "Sanitary Sewerage Equipment" },
    { cost_code: "33-4000", cost_type: "", name: "Stormwater Utilities" },
    { cost_code: "33-4116", cost_type: "", name: "Subsurface Drainage" },
    { cost_code: "33-4200", cost_type: "", name: "Stormwater Conveyance" },
    { cost_code: "33-4231", cost_type: "", name: "Stormwater Area Drains" },
    { cost_code: "33-7119", cost_type: "", name: "Elect Underground Ducts & MHs" },
  ]},
  { division_code: "34", division_header: "34-0000 Transportation", rows: [
    { cost_code: "34-1100", cost_type: "", name: "Rail Tracks" },
    { cost_code: "34-4100", cost_type: "", name: "Road Signaling & Control Equipment" },
    { cost_code: "34-7200", cost_type: "", name: "Railway Construction" },
  ]},
  { division_code: "35", division_header: "35-0000 Waterway and Marine Construction", rows: [
    { cost_code: "35-3000", cost_type: "", name: "Coastal Construction" },
  ]},
  { division_code: "50", division_header: "50-0000 Design Services", rows: [
    { cost_code: "50-1000", cost_type: "", name: "Site Investigation Report / Phase 1" },
    { cost_code: "50-1250", cost_type: "", name: "Geotechnical Report" },
    { cost_code: "50-2000", cost_type: "", name: "Architectural Design" },
    { cost_code: "50-2500", cost_type: "", name: "Wetlands Studies" },
    { cost_code: "50-3000", cost_type: "", name: "Environmental Phase 2 Studies" },
    { cost_code: "50-3500", cost_type: "", name: "Arch, Endangered & Threat Species" },
    { cost_code: "50-4100", cost_type: "", name: "Traffic Engineering Study" },
    { cost_code: "50-4200", cost_type: "", name: "Traffic Engineering Design" },
    { cost_code: "50-4500", cost_type: "", name: "Facility Engineering" },
    { cost_code: "50-5000", cost_type: "", name: "Structural Engineering" },
    { cost_code: "50-5500", cost_type: "", name: "HVAC Engineering" },
    { cost_code: "50-6000", cost_type: "", name: "Plumbing Engineering" },
    { cost_code: "50-6500", cost_type: "", name: "Electrical Engineering" },
    { cost_code: "50-7000", cost_type: "", name: "Fire Protection Engineering" },
    { cost_code: "50-7500", cost_type: "", name: "FA/Security System Engineering" },
    { cost_code: "50-8000", cost_type: "", name: "Specialty Engineering" },
    { cost_code: "50-8500", cost_type: "", name: "Miscellaneous Engineering" },
    { cost_code: "50-9100", cost_type: "", name: "ALTA Survey" },
    { cost_code: "50-9200", cost_type: "", name: "Topographic Survey" },
    { cost_code: "51-1000", cost_type: "", name: "Space Planning" },
  ]},
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

const WEEKS_PER_MONTH = 4.334;

function calculateDurationWeeks(months: number): number {
  return Number((Math.max(months, 0) * WEEKS_PER_MONTH).toFixed(3));
}

function getEffectiveQty(item: GcItem, durationMonths: number, durationWeeks: number): number {
  if (item.qty_basis === "weeks") return durationWeeks;
  if (item.qty_basis === "months") {
    return durationMonths > 0 ? durationMonths : Math.ceil(durationWeeks / WEEKS_PER_MONTH);
  }
  return item.qty || 1;
}

function computeGcTotal(items: GcItem[], durationMonths: number, durationWeeks: number): number {
  return items.reduce((sum, item) => {
    const qty = getEffectiveQty(item, durationMonths, durationWeeks);
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
  onFocus,
  onBlur: onBlurProp,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
}) {
  const [local, setLocal] = React.useState(value);
  React.useEffect(() => { setLocal(value); }, [value]);
  const commit = () => { if (local !== value) onChange(local); };
  return (
    <Input
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={(e) => { commit(); onBlurProp?.(e); }}
      onFocus={onFocus}
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
  currency,
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
  step?: string;
  min?: string;
  currency?: boolean;
}) {
  const [local, setLocal] = React.useState(String(value));
  const [editing, setEditing] = React.useState(false);

  React.useEffect(() => {
    if (!editing) setLocal(String(value));
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    const parsed = parseFloat(local);
    if (!Number.isNaN(parsed)) onChange(parsed);
    else setLocal(String(value));
  };

  if (!editing) {
    return (
      <div
        role="button"
        tabIndex={0}
        className={`flex h-7 cursor-text items-center justify-end rounded px-2 text-xs tabular-nums text-foreground hover:bg-muted/40 ${className ?? ""}`}
        onClick={() => setEditing(true)}
        onFocus={() => setEditing(true)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setEditing(true); }}
      >
        {currency ? formatCurrencyFull(value) : value}
      </div>
    );
  }

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
       
      autoFocus
      className={`h-7 border-transparent bg-transparent text-xs transition-colors focus:border-border focus:bg-background ${className ?? ""}`}
    />
  );
}

/** Standalone duration field: a clean pill-style editable number with a trailing unit label */
function DurationField({
  value,
  onChange,
  unit,
  readOnly = false,
  title,
}: {
  value: number;
  onChange: (v: number) => void;
  unit: string;
  readOnly?: boolean;
  title?: string;
}) {
  const [local, setLocal] = React.useState(String(value));
  React.useEffect(() => { setLocal(String(value)); }, [value]);
  const commit = () => {
    if (readOnly) return;
    const parsed = parseFloat(local);
    if (!Number.isNaN(parsed)) onChange(parsed);
    else setLocal(String(value));
  };
  return (
    <div
      className={`flex h-8 items-center rounded-md border border-border text-xs transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30 ${readOnly ? "bg-muted/30 text-muted-foreground" : "bg-background"}`}
      title={title}
    >
      <Input
        type="number"
        step="0.5"
        min="0"
        value={local}
        readOnly={readOnly}
        aria-readonly={readOnly || undefined}
        onChange={(e) => {
          if (!readOnly) setLocal(e.target.value);
        }}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        className="h-auto w-16 border-0 bg-transparent pl-3 pr-1 text-right text-xs tabular-nums shadow-none outline-none ring-0 focus-visible:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className="pr-2.5 text-muted-foreground">{unit}</span>
    </div>
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
      <SelectTrigger className={`h-7 w-full border-transparent bg-transparent text-xs focus:border-border focus:bg-background ${className ?? ""}`}>
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
  projectName,
  estimate,
  gcItems: initialGcItems,
  detailItems: initialDetailItems,
  sublistSubs: initialSublistSubs,
}: EstimateDetailClientV2Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState("summary");
  const [gcItems, setGcItems] = React.useState<GcItem[]>(initialGcItems);
  const templateLoaded = React.useRef(false);
  const [detailItems, setDetailItems] = React.useState<DetailItem[]>(initialDetailItems);
  const [sublistSubs, setSublistSubs] = React.useState<SublistSub[]>(initialSublistSubs);

  // Estimate-level editable fields
  const initialDurationMonths = estimate.project_duration_months ?? 0;
  const [durationMonths, setDurationMonths] = React.useState<number>(
    initialDurationMonths
  );
  const [durationWeeks, setDurationWeeks] = React.useState<number>(
    calculateDurationWeeks(initialDurationMonths)
  );
  const [contingencyAmount, setContingencyAmount] = React.useState<number>(
    estimate.contingency_amount ?? 0
  );
  const [insuranceRate, setInsuranceRate] = React.useState<number>(
    estimate.insurance_rate ?? 0.0125
  );
  const [feeRate, setFeeRate] = React.useState<number>(estimate.fee_rate ?? 0.1);

  const [isDirty, setIsDirty] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // Template state
  type GcTemplate = { template_id: string; name: string; created_at: string };
  type GcTemplateItem = { cost_code: string; description: string; cost_type: string; qty_basis: string | null; rate: number | null; allocation: number | null; sort_order?: number | null };
  const [templates, setTemplates] = React.useState<GcTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = React.useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = React.useState(false);
  const [templateName, setTemplateName] = React.useState("");
  const [isSavingTemplate, setIsSavingTemplate] = React.useState(false);
  const [showSeedBudget, setShowSeedBudget] = React.useState(false);
  const [pendingTemplate, setPendingTemplate] = React.useState<GcTemplate | null>(null);
  const [showLoadConfirm, setShowLoadConfirm] = React.useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = React.useState(false);

  const fetchTemplates = React.useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const data = await apiFetch<GcTemplate[]>("/api/estimates/gc-templates");
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const handleCreateTemplate = async () => {
    if (!templateName.trim()) return;
    setIsSavingTemplate(true);
    try {
      const items: GcTemplateItem[] = gcItems.map((item) => ({
        cost_code: item.cost_code,
        description: item.description,
        cost_type: item.cost_type,
        qty_basis: item.qty_basis,
        rate: item.rate,
        allocation: item.allocation,
        sort_order: item.sort_order,
      }));
      await apiFetch("/api/estimates/gc-templates", {
        method: "POST",
        body: JSON.stringify({ name: templateName.trim(), items }),
      });
      toast.success(`Template "${templateName.trim()}" saved`);
      setShowCreateTemplate(false);
      setTemplateName("");
    } catch {
      toast.error("Failed to save template");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleSelectTemplate = (template: GcTemplate) => {
    setPendingTemplate(template);
    setShowLoadConfirm(true);
  };

  const insertGcTemplateItems = React.useCallback(
    async (templateItems: GcTemplateItem[]): Promise<GcItem[]> => {
      return apiFetch<GcItem[]>(
        `/api/projects/${projectId}/estimates/${estimate.estimate_id}/gc-items`,
        {
          method: "POST",
          body: JSON.stringify({
            items: templateItems.map((item, idx) => ({
              ...item,
              sort_order: item.sort_order ?? idx + 1,
            })),
          }),
        }
      );
    },
    [projectId, estimate.estimate_id]
  );

  const handleConfirmLoadTemplate = async () => {
    if (!pendingTemplate) return;
    setIsLoadingTemplate(true);
    try {
      // Bulk-delete all existing GC items in one server-side query
      await apiFetch(`/api/projects/${projectId}/estimates/${estimate.estimate_id}/gc-items`, {
        method: "DELETE",
      });
      // Fetch full template to get items
      const allTemplates = await apiFetch<Array<GcTemplate & { items: GcTemplateItem[] }>>("/api/estimates/gc-templates");
      const templateList = Array.isArray(allTemplates) ? allTemplates : [];
      const full = templateList.find((t) => t.template_id === pendingTemplate.template_id);
      const templateItems: GcTemplateItem[] = (full as unknown as { items: GcTemplateItem[] } | undefined)?.items ?? [];
      const created = await insertGcTemplateItems(templateItems);
      setGcItems(created);
      toast.success(`Loaded template "${pendingTemplate.name}"`);
    } catch (error) {
      console.error("Failed to load estimate GC template", error);
      toast.error("Template could not be loaded. Try again.");
    } finally {
      setIsLoadingTemplate(false);
      setShowLoadConfirm(false);
      setPendingTemplate(null);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 300));
    setIsDirty(false);
    setIsSaving(false);
    toast.success("Changes saved");
  };

  // Patch estimate helper
  const patchEstimate = React.useCallback(
    async (fields: Record<string, unknown>) => {
      try {
        await apiFetch(`/api/projects/${projectId}/estimates/${estimate.estimate_id}`, {
          method: "PUT",
          body: JSON.stringify({ ...fields, estimate_id: estimate.estimate_id }),
        });
        setIsDirty(true);
      } catch (err) {
        console.error("Failed to save estimate fields", err);
        toast.error("Failed to save");
      }
    },
    [projectId, estimate.estimate_id]
  );

  const handleDurationMonthsBlur = (val: number) => {
    const weeks = calculateDurationWeeks(val);
    setDurationMonths(val);
    setDurationWeeks(weeks);
    void patchEstimate({
      project_duration_months: val,
      project_duration_weeks: weeks,
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
      setIsDirty(true);
    } catch (err) {
      toast.error("Failed to save");
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
      toast.error("Failed to add row");
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
      toast.error("Failed to delete");
    }
  };

  const loadGcTemplate = React.useCallback(async () => {
    try {
      const items = await insertGcTemplateItems(GC_TEMPLATE);
      setGcItems(items);
    } catch (err) {
      console.error("Failed to auto-load estimate GC template", err);
      toast.error("General Conditions template could not be loaded. Try Actions > Load Template.");
    }
  }, [insertGcTemplateItems]);

  // Auto-load GC template on first render if no GC items exist yet
  React.useEffect(() => {
    if (initialGcItems.length === 0 && !templateLoaded.current) {
      templateLoaded.current = true;
      void loadGcTemplate();
    }
  }, [initialGcItems.length, loadGcTemplate]);

  const detailTemplateLoaded = React.useRef(false);

  const loadDetailTemplate = React.useCallback(async () => {
    try {
      let sortOrder = 0;
      const created = await Promise.all(
        DETAIL_DIVISIONS.flatMap((div) =>
          div.rows.map((row) => {
            sortOrder += 1;
            return apiFetch<DetailItem>(
              `/api/projects/${projectId}/estimates/${estimate.estimate_id}/detail-items`,
              {
                method: "POST",
                body: JSON.stringify({
                  division_code: div.division_code,
                  division_name: div.division_header.replace(/^\d+-\d+\s+/, ""),
                  cost_code: row.cost_code,
                  cost_type: row.cost_type || null,
                  cost_code_name: row.name,
                  estimated_amount: 0,
                  sort_order: sortOrder,
                }),
              }
            );
          })
        )
      );
      setDetailItems(created);
    } catch (err) {
      toast.error("Failed to load detail template");
    }
  }, [projectId, estimate.estimate_id]);

  // Auto-load detail template if no detail items exist yet
  React.useEffect(() => {
    if (initialDetailItems.length === 0 && !detailTemplateLoaded.current) {
      detailTemplateLoaded.current = true;
      void loadDetailTemplate();
    }
  }, [initialDetailItems.length, loadDetailTemplate]);

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
      setIsDirty(true);
    } catch (err) {
      toast.error("Failed to save");
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
      toast.error("Failed to add row");
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
      toast.error("Failed to delete");
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
      setIsDirty(true);
    } catch (err) {
      console.error("Failed to save estimate sublist sub", err);
      toast.error("Failed to save");
    }
  };

  const deleteSublistSub = React.useCallback(
    async (sub: SublistSub): Promise<boolean> => {
      const label = sub.company || `Division ${sub.division_code} sub`;
      if (!window.confirm(`Delete ${label} from the sublist?`)) return false;

      try {
        await apiFetch(
          `/api/projects/${projectId}/estimates/${estimate.estimate_id}/sublist/${sub.id}`,
          { method: "DELETE" }
        );
        setSublistSubs((prev) => prev.filter((item) => item.id !== sub.id));
        setIsDirty(true);
        toast.success("Sub deleted");
        return true;
      } catch (error) {
        console.error("Failed to delete estimate sublist sub", error);
        toast.error("Failed to delete sub");
        return false;
      }
    },
    [projectId, estimate.estimate_id]
  );

  // Add a single new row to a division (unlimited slots — PRP 1.3)
  const ensureSublistRows = React.useCallback(
    async (divCode: string, divName: string): Promise<SublistSub | null> => {
      const existing = sublistSubs.filter((s) => s.division_code === divCode);
      const nextPos = (existing.reduce((max, s) => Math.max(max, s.position ?? 0), 0)) + 1;
      try {
        const created = await apiFetch<SublistSub>(
          `/api/projects/${projectId}/estimates/${estimate.estimate_id}/sublist`,
          {
            method: "POST",
            body: JSON.stringify({
              division_code: divCode,
              division_name: divName,
              position: nextPos,
            }),
          }
        );
        setSublistSubs((prev) => [...prev, created]);
        return created;
      } catch (error) {
        console.error("Failed to create estimate sublist row", error);
        toast.error("Failed to add sub");
        return null;
      }
    },
    [sublistSubs, projectId, estimate.estimate_id]
  );

  // Award a sub (un-awards all others in the same division atomically)
  const awardSub = React.useCallback(
    async (subId: number, revoke = false) => {
      try {
        const subBefore = sublistSubs.find((s) => s.id === subId);
        const updated = await apiFetch<SublistSub>(
          `/api/projects/${projectId}/estimates/${estimate.estimate_id}/sublist/${subId}/award`,
          { method: "POST", body: JSON.stringify({ revoke }) }
        );
        // Refresh all subs in same division from server response
        setSublistSubs((prev) => {
          const divCode = prev.find((s) => s.id === subId)?.division_code;
          return prev.map((s) => {
            if (s.division_code !== divCode) return s;
            if (s.id === subId) return revoke ? { ...s, is_awarded: false } : (updated ?? { ...s, is_awarded: true });
            return { ...s, is_awarded: false };
          });
        });

        if (revoke) {
          toast.success("Award revoked");
        } else {
          // Offer to create a subcontract from the awarded bid
          const divName = ALL_DIVISIONS.find((d) => d.code === subBefore?.division_code)?.name ?? subBefore?.division_code ?? "";
          const hasCompany = !!subBefore?.company_id;
          const hasPrice = typeof subBefore?.price === "number" && subBefore.price > 0;

          if (hasCompany && hasPrice) {
            const params = new URLSearchParams({
              type: "subcontract",
              vendor_id: subBefore!.company_id!,
              title: `Division ${subBefore!.division_code} ${divName} — ${subBefore!.company ?? ""}`,
              amount: String(subBefore!.price),
              description: `Subcontract for Division ${subBefore!.division_code} (${divName}) work.`,
            });
            toast.success("Sub awarded!", {
              description: `${subBefore!.company ?? "Sub"} awarded for Division ${subBefore!.division_code}.`,
              action: {
                label: "Create Subcontract →",
                onClick: () => router.push(`/${projectId}/commitments/new?${params.toString()}`),
              },
              duration: 8000,
            });
          } else {
            toast.success("Sub awarded");
          }
        }
      } catch {
        toast.error("Failed to update award");
      }
    },
    [projectId, estimate.estimate_id, sublistSubs, router]
  );

  // ---------------------------------------------------------------------------
  // Summary calculations
  // ---------------------------------------------------------------------------

  const gcTotal = React.useMemo(() => computeGcTotal(gcItems, durationMonths, durationWeeks), [gcItems, durationMonths, durationWeeks]);
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

  const handleExportPDF = () => {
    const html = buildPrintHTML({
      estimate, projectName, gcItems, detailItems,
      gcTotal, detailTotalsByDiv, subtotal,
      contingencyAmount, insurance, insuranceRate, fee, feeRate, grandTotal,
    });
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const actionsMenu = (
    <div className="flex items-center gap-2">
      {isDirty && (
        <Button size="sm" onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      )}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1.5">
          Actions
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem
          onClick={() => toast.info("Import to Prime Contract SOV — coming soon")}
        >
          Import to Prime Contract SOV
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={estimate.status !== "approved"}
          onClick={() => setShowSeedBudget(true)}
          title={
            estimate.status !== "approved"
              ? "Estimate must be approved before seeding the budget"
              : undefined
          }
        >
          Seed Budget from Estimate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportPDF}>
          <Printer className="h-4 w-4" />
          Export PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => { setTemplateName(""); setShowCreateTemplate(true); }}
        >
          Create Template
        </DropdownMenuItem>
        <DropdownMenuSub onOpenChange={(open) => { if (open) void fetchTemplates(); }}>
          <DropdownMenuSubTrigger>Load Template</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-52">
            {templatesLoading ? (
              <DropdownMenuItem disabled>Loading…</DropdownMenuItem>
            ) : templates.length === 0 ? (
              <DropdownMenuItem disabled>No templates saved</DropdownMenuItem>
            ) : (
              templates.map((t) => (
                <DropdownMenuItem key={t.template_id} onClick={() => handleSelectTemplate(t)}>
                  {t.name}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push(`/${projectId}/estimates/new?variationOf=${estimate.estimate_id}`)}
        >
          New Variation
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    {/* Create Template dialog */}
    <Dialog open={showCreateTemplate} onOpenChange={setShowCreateTemplate}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Save the current General Conditions items as a reusable template.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-2">
          <Label htmlFor="template-name">Template name</Label>
          <Input
            id="template-name"
            placeholder="e.g. Warehouse Standard GC"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleCreateTemplate(); }}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCreateTemplate(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleCreateTemplate()} disabled={!templateName.trim() || isSavingTemplate}>
            {isSavingTemplate ? "Saving…" : "Save Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Load Template overwrite confirmation */}
    <Dialog open={showLoadConfirm} onOpenChange={setShowLoadConfirm}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Load Template</DialogTitle>
          <DialogDescription>
            Loading <strong>&ldquo;{pendingTemplate?.name}&rdquo;</strong> will replace all current
            General Conditions items. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setShowLoadConfirm(false); setPendingTemplate(null); }}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleConfirmLoadTemplate()}
            disabled={isLoadingTemplate}
          >
            {isLoadingTemplate ? "Loading…" : "Replace & Load"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  );

  return (
    <PageShell
      variant="detail"
      title={estimate.title}
      description={`${estimate.status} · R${estimate.revision}`}
      actions={actionsMenu}
    >
      {/* Tabs row — duration fields share the same line on the GC tab */}
      <div className="flex items-center gap-4">
        <div className="flex-1 overflow-hidden">
          <PageTabs
            variant="inline"
            tabs={[
              { label: "Summary",            href: "summary", isActive: activeTab === "summary" },
              { label: "General Conditions", href: "gc",      isActive: activeTab === "gc" },
              { label: "Details",            href: "details", isActive: activeTab === "details" },
              { label: "SubList",            href: "sublist", isActive: activeTab === "sublist" },
            ]}
            onTabClick={(href) => setActiveTab(href)}
          />
        </div>
        {activeTab === "gc" && (
          <div className="mb-2 flex shrink-0 items-center gap-2 md:mb-3">
            <DurationField value={durationMonths} onChange={handleDurationMonthsBlur} unit="mo" />
            <DurationField
              value={durationWeeks}
              onChange={() => undefined}
              unit="wk"
              readOnly
              title="Calculated from months x 4.334"
            />
          </div>
        )}
      </div>

      {/* Tab content */}
      <div className="mt-2">
        {activeTab === "gc" && (
          <GcTab
            gcItems={gcItems}
            durationMonths={durationMonths}
            durationWeeks={durationWeeks}
            onPatchItem={patchGcItem}
            onAddRow={addGcRow}
            onDeleteRow={deleteGcRow}
          />
        )}
        {activeTab === "details" && (
          <DetailsTab
            detailItems={detailItems}
            onPatchItem={patchDetailItem}
            onAddRow={addDetailRow}
            onDeleteRow={deleteDetailRow}
          />
        )}
        {activeTab === "sublist" && (
          <SubListTab
            sublistSubs={sublistSubs}
            projectId={projectId}
            estimateId={String(estimate.estimate_id)}
            detailTotalsByDiv={detailTotalsByDiv}
            onPatchSub={patchSublistSub}
            onEnsureRows={ensureSublistRows}
            onAwardSub={awardSub}
            onDeleteSub={deleteSublistSub}
          />
        )}
        {activeTab === "summary" && (
          <SummaryTab
            estimate={estimate}
            projectName={projectName}
            gcItems={gcItems}
            detailItems={detailItems}
            gcTotal={gcTotal}
            detailTotalsByDiv={detailTotalsByDiv}
            subtotal={subtotal}
            contingencyAmount={contingencyAmount}
            insuranceRate={insuranceRate}
            feeRate={feeRate}
            insurance={insurance}
            fee={fee}
            grandTotal={grandTotal}
            durationMonths={durationMonths}
            durationWeeks={durationWeeks}
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
        )}
      </div>

      <SeedBudgetFromEstimateModal
        open={showSeedBudget}
        onOpenChange={setShowSeedBudget}
        projectId={projectId}
        estimateId={estimate.estimate_id}
        estimateTitle={estimate.title}
      />
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
  onPatchItem,
  onAddRow,
  onDeleteRow,
}: {
  gcItems: GcItem[];
  durationMonths: number;
  durationWeeks: number;
  onPatchItem: (id: number, fields: Partial<GcItem>) => Promise<void>;
  onAddRow: () => Promise<void>;
  onDeleteRow: (id: number) => Promise<void>;
}) {
  const gcTotal = computeGcTotal(gcItems, durationMonths, durationWeeks);

  return (
    <div className="space-y-3">
      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
              <th className="py-2 pl-3 pr-2 font-medium">Cost Code</th>
              <th className="px-2 py-2 font-medium">Description</th>
              <th className="w-32 px-2 py-2 font-medium">Cost Type</th>
              <th className="w-20 px-2 py-2 text-right font-medium">Qty</th>
              <th className="w-16 px-2 py-2 font-medium">Unit</th>
              <th className="w-32 px-2 py-2 text-right font-medium">Rate</th>
              <th className="w-24 px-2 py-2 text-right font-medium">Alloc %</th>
              <th className="w-28 px-2 py-2 text-right font-medium">Total</th>
              <th className="w-8 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {gcItems.map((item) => {
              const isWeeksBasis = item.qty_basis === "weeks";
              const isMonthsBasis = item.qty_basis === "months";
              const isDerived = isWeeksBasis || isMonthsBasis;
              const qtyEffective = getEffectiveQty(item, durationMonths, durationWeeks);
              const rowTotal = qtyEffective * (item.rate ?? 0) * (item.allocation ?? 0);

              return (
                <tr key={item.id} className="group border-b border-border/30 hover:bg-muted/20">
                  <td className="py-1 pl-3 pr-2">
                    <span className="inline-flex h-7 w-24 items-center px-2 text-xs tabular-nums text-foreground">
                      {item.cost_code}
                    </span>
                  </td>
                  <td className="px-2 py-1">
                    <span className="inline-flex h-7 min-w-44 items-center px-2 text-xs text-foreground">
                      {item.description}
                    </span>
                  </td>
                  <td className="w-32 px-2 py-1">
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
                        value={item.qty || 1}
                        onChange={(v) => void onPatchItem(item.id, { qty: v })}
                        className="w-full text-right"
                      />
                    )}
                  </td>
                  <td className="px-2 py-1">
                    <InlineSelect
                      value={item.qty_basis ?? item.unit ?? "ls"}
                      options={[
                        { value: "weeks", label: "weeks" },
                        { value: "months", label: "months" },
                        { value: "ls", label: "ls" },
                        { value: "sf", label: "sf" },
                        { value: "ea", label: "ea" },
                        { value: "lf", label: "lf" },
                      ]}
                      onValueChange={(v) => void onPatchItem(item.id, { qty_basis: v })}
                      className="w-24"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <InlineNumber
                      value={item.rate ?? 0}
                      onChange={(v) => void onPatchItem(item.id, { rate: v })}
                      className="w-full text-right"
                      currency
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
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-xs">
        {/* Single header row for all divisions */}
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
            <th className="py-2 pl-4 pr-2 font-medium">Cost Code</th>
            <th className="w-28 px-2 py-2 font-medium">Cost Type</th>
            <th className="px-2 py-2 font-medium">Cost Code Name</th>
            <th className="px-2 py-2 font-medium">Work Description</th>
            <th className="w-36 px-2 py-2 text-right font-medium">Est. Amount / Bid</th>
            <th className="px-2 py-2 font-medium">Sub Name / Plug</th>
            <th className="w-8 px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {DETAIL_DIVISIONS.map((div) => {
            const rows = detailItems.filter((i) => i.division_code === div.division_code);
            const divTotal = rows.reduce((s, i) => s + (i.estimated_amount ?? 0), 0);
            return (
              <React.Fragment key={div.division_code}>
                {/* Division separator row — styled like a merged cell */}
                <tr className="border-b border-t border-border bg-muted/60">
                  <td colSpan={5} className="py-2 pl-4 pr-2">
                    <span className="font-semibold text-foreground">{div.division_header}</span>
                  </td>
                  <td colSpan={2} className="py-2 pr-4 text-right font-medium tabular-nums text-muted-foreground">
                    {divTotal > 0 ? formatCurrency(divTotal) : ""}
                  </td>
                </tr>

                {/* Line item rows */}
                {rows.map((item) => (
                  <tr key={item.id} className="group border-b border-border/20 hover:bg-muted/20">
                    <td className="py-1 pl-4 pr-2">
                      <span className="inline-flex h-7 w-22 items-center px-2 text-xs tabular-nums text-foreground">
                        {item.cost_code ?? ""}
                      </span>
                    </td>
                    <td className="px-2 py-1">
                      <InlineSelect
                        value={item.cost_type ?? ""}
                        options={COST_TYPE_OPTIONS.map((o) => ({ value: o, label: o }))}
                        onValueChange={(v) => void onPatchItem(item.id, { cost_type: v || null })}
                        placeholder="—"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <span className="inline-flex h-7 min-w-40 items-center px-2 text-xs text-foreground">
                        {item.cost_code_name ?? ""}
                      </span>
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
                        currency
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

                {/* Add row for this division */}
                <tr className="border-b border-border/10">
                  <td colSpan={7} className="py-1 pl-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto gap-1 p-0 text-[11px] text-muted-foreground/60 hover:text-muted-foreground"
                      onClick={() => void onAddRow(div.division_code, div.division_header.replace(/^\d+-\d+\s+/, ""))}
                    >
                      <Plus className="h-3 w-3" />
                      Add row
                    </Button>
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
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

type Company = Database["public"]["Tables"]["companies"]["Row"];

function SubListTab({
  sublistSubs,
  projectId,
  estimateId,
  detailTotalsByDiv,
  onPatchSub,
  onEnsureRows,
  onAwardSub,
  onDeleteSub,
}: {
  sublistSubs: SublistSub[];
  projectId: string;
  estimateId: string;
  detailTotalsByDiv: Record<string, number>;
  onPatchSub: (id: number, fields: Partial<SublistSub>) => Promise<void>;
  onEnsureRows: (divCode: string, divName: string) => Promise<SublistSub | null>;
  onAwardSub: (subId: number, revoke?: boolean) => Promise<void>;
  onDeleteSub: (sub: SublistSub) => Promise<boolean>;
}) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterIntend, setFilterIntend] = React.useState("all");
  const [filterBid, setFilterBid] = React.useState("all");
  const [sortConfig, setSortConfig] = React.useState<{ col: keyof SublistSub; dir: "asc" | "desc" } | null>(null);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [companySearch, setCompanySearch] = React.useState("");
  const [openComboboxId, setOpenComboboxId] = React.useState<number | null>(null);
  const [openComboboxDivision, setOpenComboboxDivision] = React.useState<string>("");

  // Call log state
  const [callLogsBySubId, setCallLogsBySubId] = React.useState<Record<number, CallLog[]>>({});
  const [openCallLogSubId, setOpenCallLogSubId] = React.useState<number | null>(null);
  const [callLogOutcome, setCallLogOutcome] = React.useState<string>("");
  const [callLogNotes, setCallLogNotes] = React.useState<string>("");
  const [callLogSubmitting, setCallLogSubmitting] = React.useState(false);

  const loadCallLogs = React.useCallback(async (subId: number) => {
    try {
      const logs = await apiFetch<CallLog[]>(
        `/api/projects/${projectId}/estimates/${estimateId}/sublist/${subId}/call-logs`
      );
      setCallLogsBySubId((prev) => ({ ...prev, [subId]: logs ?? [] }));
    } catch (error) {
      console.error("Failed to load estimate sub call logs", error);
    }
  }, [projectId, estimateId]);

  const openCallLog = React.useCallback((subId: number) => {
    setOpenCallLogSubId(subId);
    setCallLogOutcome("");
    setCallLogNotes("");
    void loadCallLogs(subId);
  }, [loadCallLogs]);

  const submitCallLog = React.useCallback(async (subId: number) => {
    if (!callLogOutcome) return;
    setCallLogSubmitting(true);
    try {
      const log = await apiFetch<CallLog>(
        `/api/projects/${projectId}/estimates/${estimateId}/sublist/${subId}/call-logs`,
        { method: "POST", body: JSON.stringify({ outcome: callLogOutcome, notes: callLogNotes || undefined }) }
      );
      if (log) {
        setCallLogsBySubId((prev) => ({ ...prev, [subId]: [log, ...(prev[subId] ?? [])] }));
        // Update phone_follow_up on the sub row to reflect latest outcome
        await onPatchSub(subId, { phone_follow_up: callLogOutcome === "Reached" ? "Yes" : "No" });
      }
      setCallLogOutcome("");
      setCallLogNotes("");
      toast.success("Call logged");
    } catch (error) {
      console.error("Failed to log estimate sub call", error);
      toast.error("Failed to log call");
    } finally {
      setCallLogSubmitting(false);
    }
  }, [projectId, estimateId, callLogOutcome, callLogNotes, onPatchSub]);

  // Scope package state
  const [scopeItemsByDiv, setScopeItemsByDiv] = React.useState<Record<string, ScopeItem[]>>({});
  const [expandedScopeDivs, setExpandedScopeDivs] = React.useState<Set<string>>(new Set());
  const [newScopeDesc, setNewScopeDesc] = React.useState<Record<string, string>>({});

  const loadScopeItems = React.useCallback(async (divCode: string) => {
    try {
      const items = await apiFetch<ScopeItem[]>(
        `/api/projects/${projectId}/estimates/${estimateId}/scope-items?division_code=${divCode}`
      );
      setScopeItemsByDiv((prev) => ({ ...prev, [divCode]: items ?? [] }));
    } catch (error) {
      console.error("Failed to load estimate scope items", error);
    }
  }, [projectId, estimateId]);

  // Division benchmark cache (5.3) — must be before toggleScopeDiv to avoid TDZ
  const [benchmarkCache, setBenchmarkCache] = React.useState<Record<string, { count: number; min: number | null; max: number | null; avg: number | null; source: string }>>({});

  const loadBenchmark = React.useCallback(async (divCode: string) => {
    if (benchmarkCache[divCode] !== undefined) return;
    setBenchmarkCache((prev) => ({ ...prev, [divCode]: { count: 0, min: null, max: null, avg: null, source: "none" } }));
    try {
      const data = await apiFetch<{ count: number; min: number | null; max: number | null; avg: number | null; source: string }>(
        `/api/estimates/benchmark?division_code=${divCode}`
      );
      if (data) setBenchmarkCache((prev) => ({ ...prev, [divCode]: data }));
    } catch (error) {
      console.error("Failed to load estimate benchmark", error);
    }
  }, [benchmarkCache]);

  const toggleScopeDiv = React.useCallback((divCode: string) => {
    setExpandedScopeDivs((prev) => {
      const next = new Set(prev);
      if (next.has(divCode)) {
        next.delete(divCode);
      } else {
        next.add(divCode);
        if (!scopeItemsByDiv[divCode]) void loadScopeItems(divCode);
        if (!benchmarkCache[divCode]) void loadBenchmark(divCode);
      }
      return next;
    });
  }, [scopeItemsByDiv, loadScopeItems, benchmarkCache, loadBenchmark]);

  const addScopeItem = React.useCallback(async (divCode: string) => {
    const desc = (newScopeDesc[divCode] ?? "").trim();
    if (!desc) return;
    try {
      const item = await apiFetch<ScopeItem>(
        `/api/projects/${projectId}/estimates/${estimateId}/scope-items`,
        {
          method: "POST",
          body: JSON.stringify({ division_code: divCode, description: desc, sort_order: (scopeItemsByDiv[divCode]?.length ?? 0) }),
        }
      );
      if (item) {
        setScopeItemsByDiv((prev) => ({ ...prev, [divCode]: [...(prev[divCode] ?? []), item] }));
        setNewScopeDesc((prev) => ({ ...prev, [divCode]: "" }));
      }
    } catch {
      toast.error("Failed to add scope item");
    }
  }, [projectId, estimateId, newScopeDesc, scopeItemsByDiv]);

  const toggleScopeItemChecked = React.useCallback(async (divCode: string, item: ScopeItem) => {
    const updated = { ...item, is_checked: !item.is_checked };
    setScopeItemsByDiv((prev) => ({
      ...prev,
      [divCode]: (prev[divCode] ?? []).map((s) => s.id === item.id ? updated : s),
    }));
    try {
      await apiFetch(
        `/api/projects/${projectId}/estimates/${estimateId}/scope-items/${item.id}`,
        { method: "PATCH", body: JSON.stringify({ is_checked: updated.is_checked }) }
      );
    } catch {
      // revert
      setScopeItemsByDiv((prev) => ({
        ...prev,
        [divCode]: (prev[divCode] ?? []).map((s) => s.id === item.id ? item : s),
      }));
    }
  }, [projectId, estimateId]);

  const deleteScopeItem = React.useCallback(async (divCode: string, itemId: number) => {
    setScopeItemsByDiv((prev) => ({
      ...prev,
      [divCode]: (prev[divCode] ?? []).filter((s) => s.id !== itemId),
    }));
    try {
      await apiFetch(
        `/api/projects/${projectId}/estimates/${estimateId}/scope-items/${itemId}`,
        { method: "DELETE" }
      );
    } catch {
      toast.error("Failed to delete scope item");
      void loadScopeItems(divCode);
    }
  }, [projectId, estimateId, loadScopeItems]);

  // Bid items state (structured bid entry per sub)
  const [bidItemsBySubId, setBidItemsBySubId] = React.useState<Record<number, BidItem[]>>({});
  const [expandedBidSubIds, setExpandedBidSubIds] = React.useState<Set<number>>(new Set());
  const [newBidDesc, setNewBidDesc] = React.useState<Record<number, string>>({});
  const [newBidAmount, setNewBidAmount] = React.useState<Record<number, string>>({});

  const deleteSub = React.useCallback(async (sub: SublistSub) => {
    const deleted = await onDeleteSub(sub);
    if (!deleted) return;
    setExpandedBidSubIds((prev) => {
      const next = new Set(prev);
      next.delete(sub.id);
      return next;
    });
    setBidItemsBySubId((prev) => {
      const next = { ...prev };
      delete next[sub.id];
      return next;
    });
    setNewBidDesc((prev) => {
      const next = { ...prev };
      delete next[sub.id];
      return next;
    });
    setNewBidAmount((prev) => {
      const next = { ...prev };
      delete next[sub.id];
      return next;
    });
    setCallLogsBySubId((prev) => {
      const next = { ...prev };
      delete next[sub.id];
      return next;
    });
    setOpenCallLogSubId((current) => (current === sub.id ? null : current));
  }, [onDeleteSub]);

  const loadBidItems = React.useCallback(async (subId: number) => {
    try {
      const items = await apiFetch<BidItem[]>(
        `/api/projects/${projectId}/estimates/${estimateId}/sublist/${subId}/bid-items`
      );
      setBidItemsBySubId((prev) => ({ ...prev, [subId]: items ?? [] }));
    } catch (error) {
      console.error("Failed to load sublist bid items", error);
    }
  }, [projectId, estimateId]);

  const toggleBidExpand = React.useCallback((subId: number) => {
    setExpandedBidSubIds((prev) => {
      const next = new Set(prev);
      if (next.has(subId)) {
        next.delete(subId);
      } else {
        next.add(subId);
        if (!bidItemsBySubId[subId]) void loadBidItems(subId);
      }
      return next;
    });
  }, [bidItemsBySubId, loadBidItems]);

  const addBidItem = React.useCallback(async (subId: number) => {
    const desc = (newBidDesc[subId] ?? "").trim();
    const amount = parseFloat(newBidAmount[subId] ?? "0") || 0;
    if (!desc) return;
    try {
      const item = await apiFetch<BidItem>(
        `/api/projects/${projectId}/estimates/${estimateId}/sublist/${subId}/bid-items`,
        { method: "POST", body: JSON.stringify({ description: desc, amount }) }
      );
      if (item) {
        setBidItemsBySubId((prev) => ({ ...prev, [subId]: [...(prev[subId] ?? []), item] }));
        setNewBidDesc((prev) => ({ ...prev, [subId]: "" }));
        setNewBidAmount((prev) => ({ ...prev, [subId]: "" }));
        // Update local sub price
        const newTotal = [...(bidItemsBySubId[subId] ?? []), item]
          .filter((b) => !b.is_excluded)
          .reduce((s, b) => s + Number(b.amount), 0);
        void onPatchSub(subId, { price: newTotal });
      }
    } catch {
      toast.error("Failed to add bid item");
    }
  }, [projectId, estimateId, newBidDesc, newBidAmount, bidItemsBySubId, onPatchSub]);

  const patchBidItem = React.useCallback(async (subId: number, itemId: number, fields: Partial<BidItem>) => {
    setBidItemsBySubId((prev) => ({
      ...prev,
      [subId]: (prev[subId] ?? []).map((b) => b.id === itemId ? { ...b, ...fields } : b),
    }));
    try {
      await apiFetch(
        `/api/projects/${projectId}/estimates/${estimateId}/sublist/${subId}/bid-items/${itemId}`,
        { method: "PATCH", body: JSON.stringify(fields) }
      );
      // Recompute local total
      const updatedItems = (bidItemsBySubId[subId] ?? []).map((b) => b.id === itemId ? { ...b, ...fields } : b);
      const total = updatedItems.filter((b) => !b.is_excluded).reduce((s, b) => s + Number(b.amount), 0);
      void onPatchSub(subId, { price: total });
    } catch {
      toast.error("Failed to update bid item");
    }
  }, [projectId, estimateId, bidItemsBySubId, onPatchSub]);

  const deleteBidItem = React.useCallback(async (subId: number, itemId: number) => {
    const remaining = (bidItemsBySubId[subId] ?? []).filter((b) => b.id !== itemId);
    setBidItemsBySubId((prev) => ({ ...prev, [subId]: remaining }));
    try {
      await apiFetch(
        `/api/projects/${projectId}/estimates/${estimateId}/sublist/${subId}/bid-items/${itemId}`,
        { method: "DELETE" }
      );
      const total = remaining.filter((b) => !b.is_excluded).reduce((s, b) => s + Number(b.amount), 0);
      void onPatchSub(subId, { price: total });
    } catch {
      toast.error("Failed to delete bid item");
      void loadBidItems(subId);
    }
  }, [projectId, estimateId, bidItemsBySubId, onPatchSub, loadBidItems]);

  // Smart suggestions state (5.2)
  type SuggestedCompany = {
    id: string; name: string;
    contact_name?: string | null; contact_email?: string | null; contact_phone?: string | null;
    vendor_class?: string | null; type?: string | null;
    is_trade_match: boolean; prior_contracts: number;
    bid_history: { total: number; awarded: number } | null;
    score: number;
  };
  const [suggestionsCache, setSuggestionsCache] = React.useState<Record<string, SuggestedCompany[]>>({});
  const [expandedSuggestions, setExpandedSuggestions] = React.useState<Set<string>>(new Set());

  const loadSuggestions = React.useCallback(async (divCode: string, excludeIds: string[]) => {
    const qs = new URLSearchParams({ division_code: divCode, limit: "6" });
    if (excludeIds.length) qs.set("exclude_company_ids", excludeIds.join(","));
    try {
      const data = await apiFetch<SuggestedCompany[]>(`/api/estimates/suggest-subs?${qs.toString()}`);
      if (data) setSuggestionsCache((prev) => ({ ...prev, [divCode]: data }));
    } catch (error) {
      console.error("Failed to load suggested companies", error);
    }
  }, []);

  const toggleSuggestions = React.useCallback((divCode: string, excludeIds: string[]) => {
    setExpandedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(divCode)) {
        next.delete(divCode);
      } else {
        next.add(divCode);
        if (!suggestionsCache[divCode]) void loadSuggestions(divCode, excludeIds);
      }
      return next;
    });
  }, [suggestionsCache, loadSuggestions]);

  // Bid invitation modal state
  const [bidInviteSubId, setBidInviteSubId] = React.useState<number | null>(null);
  const [bidInviteDueDate, setBidInviteDueDate] = React.useState("");
  const [bidInviteMessage, setBidInviteMessage] = React.useState("");
  const [bidInviteSending, setBidInviteSending] = React.useState(false);

  const sendBidInvitation = React.useCallback(async () => {
    if (!bidInviteSubId) return;
    setBidInviteSending(true);
    try {
      const result = await apiFetch<{ success: boolean; draft?: { webLink?: string | null }; recipient?: string }>(
        `/api/projects/${projectId}/estimates/${estimateId}/sublist/${bidInviteSubId}/bid-invitation`,
        {
          method: "POST",
          body: JSON.stringify({
            bid_due_date: bidInviteDueDate || undefined,
            custom_message: bidInviteMessage || undefined,
          }),
        }
      );
      if (result?.success) {
        // Update local email_sent state
        void onPatchSub(bidInviteSubId, { email_sent: "Yes" });
        toast.success("Bid invitation draft created in Outlook", {
          description: result.draft?.webLink
            ? undefined
            : `Draft sent to ${result.recipient ?? "recipient"}`,
          action: result.draft?.webLink
            ? { label: "Open in Outlook", onClick: () => window.open(result.draft!.webLink!, "_blank") }
            : undefined,
          duration: 8000,
        });
        setBidInviteSubId(null);
        setBidInviteDueDate("");
        setBidInviteMessage("");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send bid invitation");
    } finally {
      setBidInviteSending(false);
    }
  }, [bidInviteSubId, bidInviteDueDate, bidInviteMessage, projectId, estimateId, onPatchSub]);

  // Company bid history cache (5.1)
  const [bidHistoryCache, setBidHistoryCache] = React.useState<Record<string, { total_bids: number; awarded: number; win_rate: number; avg_price: number | null; divisions: { code: string; bids: number; awarded: number }[] }>>({});

  const loadBidHistory = React.useCallback(async (companyId: string) => {
    if (bidHistoryCache[companyId] !== undefined) return; // already cached
    setBidHistoryCache((prev) => ({ ...prev, [companyId]: { total_bids: 0, awarded: 0, win_rate: 0, avg_price: null, divisions: [] } }));
    try {
      const data = await apiFetch<{ total_bids: number; awarded: number; win_rate: number; avg_price: number | null; divisions: { code: string; bids: number; awarded: number }[] }>(
        `/api/companies/${companyId}/bid-history`
      );
      if (data) setBidHistoryCache((prev) => ({ ...prev, [companyId]: data }));
    } catch (error) {
      console.error("Failed to load company bid history", error);
    }
  }, [bidHistoryCache]);

  // Load companies once on mount
  React.useEffect(() => {
    const supabaseClient = createClient();
    supabaseClient
      .from("companies")
      .select("id, name, contact_name, contact_email, contact_phone, type, vendor_class, is_vendor")
      .order("name", { ascending: true })
      .limit(2000)
      .then(({ data }) => { if (data) setCompanies(data as Company[]); });
  }, []);

  const filteredCompanies = React.useMemo(() => {
    const q = companySearch.toLowerCase();
    const nameMatches = q
      ? companies.filter((c) => c.name.toLowerCase().includes(q))
      : companies;

    if (openComboboxDivision) {
      // Sort trade-matching companies to the top
      const matching: Company[] = [];
      const rest: Company[] = [];
      for (const c of nameMatches) {
        if (companyMatchesDivision(c, openComboboxDivision)) matching.push(c);
        else rest.push(c);
      }
      return [...matching, ...rest].slice(0, 50);
    }

    return nameMatches.slice(0, 50);
  }, [companies, companySearch, openComboboxDivision]);

  const selectCompany = React.useCallback(
    async (sub: SublistSub, company: Company) => {
      setOpenComboboxId(null);
      setCompanySearch("");
      await onPatchSub(sub.id, {
        company_id: company.id,
        company: company.name,
        contact_name: company.contact_name ?? sub.contact_name,
        email: company.contact_email ?? sub.email,
        cell: company.contact_phone ?? sub.cell,
      });
    },
    [onPatchSub],
  );

  const hasActiveFilter = Boolean(searchQuery || filterIntend !== "all" || filterBid !== "all" || sortConfig);

  const toggleSort = (col: keyof SublistSub) => {
    setSortConfig((prev) =>
      prev?.col === col
        ? prev.dir === "asc"
          ? { col, dir: "desc" }
          : null
        : { col, dir: "asc" },
    );
  };

  const filteredSubs = React.useMemo(() => {
    let rows = [...sublistSubs];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.company ?? "").toLowerCase().includes(q) ||
          (r.contact_name ?? "").toLowerCase().includes(q) ||
          (r.email ?? "").toLowerCase().includes(q),
      );
    }
    if (filterIntend !== "all") rows = rows.filter((r) => r.intend_to_submit === filterIntend);
    if (filterBid !== "all") rows = rows.filter((r) => r.bid_received === filterBid);
    if (sortConfig) {
      rows.sort((a, b) => {
        const av =
          sortConfig.col === "price"
            ? (Number(a[sortConfig.col]) || 0)
            : String(a[sortConfig.col] ?? "").toLowerCase();
        const bv =
          sortConfig.col === "price"
            ? (Number(b[sortConfig.col]) || 0)
            : String(b[sortConfig.col] ?? "").toLowerCase();
        return sortConfig.dir === "asc"
          ? av < bv ? -1 : av > bv ? 1 : 0
          : av > bv ? -1 : av < bv ? 1 : 0;
      });
    }
    return rows;
  }, [sublistSubs, searchQuery, filterIntend, filterBid, sortConfig]);

  const visibleDivisions = React.useMemo(
    () =>
      hasActiveFilter
        ? ALL_DIVISIONS.filter((div) => filteredSubs.some((s) => s.division_code === div.code))
        : ALL_DIVISIONS,
    [filteredSubs, hasActiveFilter],
  );

  const SortTh = ({
    col,
    label,
    className,
  }: {
    col: keyof SublistSub;
    label: string;
    className?: string;
  }) => (
    <th
      className={`cursor-pointer select-none px-2 py-2 font-medium hover:text-foreground ${sortConfig?.col === col ? "text-foreground" : ""} ${className ?? ""}`}
      onClick={() => toggleSort(col)}
    >
      <span className="flex items-center gap-0.5">
        {label}
        <ChevronDown
          className={`h-3 w-3 shrink-0 transition-transform ${
            sortConfig?.col === col
              ? sortConfig.dir === "asc"
                ? "rotate-180 opacity-80"
                : "opacity-80"
              : "opacity-20"
          }`}
        />
      </span>
    </th>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex items-center">
          <ExpandableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search company or contact..."
            ariaLabel="Search sublist"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterIntend} onValueChange={setFilterIntend}>
            <SelectTrigger className="h-9 w-40 text-sm">
              <SelectValue placeholder="Intend to submit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All subs</SelectItem>
              <SelectItem value="Yes" className="text-xs">Intending: Yes</SelectItem>
              <SelectItem value="No" className="text-xs">Intending: No</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterBid} onValueChange={setFilterBid}>
            <SelectTrigger className="h-9 w-36 text-sm">
              <SelectValue placeholder="Bid received" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All bids</SelectItem>
              <SelectItem value="Yes" className="text-xs">Bid received</SelectItem>
              <SelectItem value="No" className="text-xs">No bid yet</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1 text-sm text-muted-foreground"
              onClick={() => {
                setSearchQuery("");
                setFilterIntend("all");
                setFilterBid("all");
                setSortConfig(null);
              }}
            >
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
        <span className="text-sm text-muted-foreground md:ml-auto">
          {filteredSubs.length} sub{filteredSubs.length !== 1 ? "s" : ""}
          {hasActiveFilter ? " matching" : " total"}
        </span>
      </div>

      {/* Single unified table */}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-full text-xs">
          <thead className="sticky top-0 z-20 bg-card">
            <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
              <th className="w-10 py-2.5 pl-4 pr-2 font-medium">#</th>
              <SortTh col="company" label="Company" />
              <SortTh col="intend_to_submit" label="Intend?" className="w-24" />
              <th className="w-28 px-2 py-2.5 text-left text-xs font-medium text-muted-foreground">Bid Invite</th>
              <th className="w-28 px-2 py-2.5 text-left text-xs font-medium text-muted-foreground">Last Call</th>
              <SortTh col="bid_received" label="Bid Rec'd?" className="w-24" />
              <SortTh col="contact_name" label="Contact" />
              <SortTh col="email" label="Email" />
              <SortTh col="cell" label="Cell" />
              <SortTh col="price" label="Price" className="w-28 text-right" />
              <th className="px-2 py-2 font-medium">Comments</th>
              <th className="w-10 py-2 pr-4 font-medium" />
            </tr>
          </thead>
          <tbody>
            {visibleDivisions.map((div, visIdx) => {
              const divRows = filteredSubs.filter((s) => s.division_code === div.code);
              const intendCount = divRows.filter((r) => r.intend_to_submit === "Yes").length;
              const bidCount = divRows.filter((r) => r.bid_received === "Yes").length;
              const lowestBid = divRows.reduce<number | null>(
                (min, r) => (r.price && r.price > 0 ? (min === null || r.price < min ? r.price : min) : min),
                null,
              );

              const awardedSub = divRows.find((r) => r.is_awarded);
              const estimateBudget = detailTotalsByDiv[div.code] ?? 0;

              return (
                <React.Fragment key={div.code}>
                  {visIdx > 0 && (
                    <tr aria-hidden="true">
                      <td colSpan={12} className="h-3 bg-background p-0" />
                    </tr>
                  )}

                  {/* Division group header */}
                  <tr className="border-y border-border bg-muted/50">
                    <td colSpan={12} className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="mr-2 flex min-w-56 items-center gap-2">
                          <span className="font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">
                            {div.code}
                          </span>
                          <span className="text-sm font-semibold text-foreground">
                            {div.name}
                          </span>
                        </div>
                        {intendCount > 0 && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            {intendCount} intending
                          </span>
                        )}
                        {bidCount > 0 && (
                          <span className="rounded-full bg-status-success/10 px-2 py-0.5 text-[10px] font-medium text-status-success">
                            {bidCount} bid{bidCount !== 1 ? "s" : ""} received
                          </span>
                        )}
                        {awardedSub && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-status-warning/10 px-2 py-0.5 text-[10px] font-medium text-status-warning">
                            <CheckCircle2 className="h-3 w-3" />
                            Awarded: {awardedSub.company ?? "Unassigned"}
                          </span>
                        )}
                        <span className="ml-auto flex flex-wrap items-center justify-end gap-3 text-[10px] text-muted-foreground">
                          {estimateBudget > 0 && (
                            <span>Budget: {formatCurrencyFull(estimateBudget)}</span>
                          )}
                          {lowestBid !== null && (
                            <span className={lowestBid <= estimateBudget || estimateBudget === 0 ? "text-status-success" : "text-destructive"}>
                              Low bid: {formatCurrencyFull(lowestBid)}
                            </span>
                          )}
                          {(() => {
                            const bm = benchmarkCache[div.code];
                            if (!bm || bm.count === 0 || bm.min === null || bm.max === null) return null;
                            return (
                              <span
                                className="cursor-help border-b border-dashed border-muted-foreground/40"
                                title={`Historical range based on ${bm.count} ${bm.source === "awarded_bids" ? "awarded bid" : "estimate"}${bm.count !== 1 ? "s" : ""}`}
                              >
                                Hist. {formatCurrencyFull(bm.min)}–{formatCurrencyFull(bm.max)}
                              </span>
                            );
                          })()}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 gap-1 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                          onClick={() => toggleScopeDiv(div.code)}
                        >
                          {expandedScopeDivs.has(div.code) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          Scope
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 gap-1 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            const existingIds = divRows.map((s) => s.company_id).filter(Boolean) as string[];
                            toggleSuggestions(div.code, existingIds);
                          }}
                        >
                          {expandedSuggestions.has(div.code) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          Suggest
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 gap-1 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                          onClick={() => void onEnsureRows(div.code, div.name)}
                        >
                          <Plus className="h-3 w-3" /> Add sub
                        </Button>
                      </div>
                    </td>
                  </tr>

                  {/* Scope Package (collapsible) */}
                  {expandedScopeDivs.has(div.code) && (
                    <tr>
                      <td colSpan={12} className="bg-muted/10 px-6 py-3">
                        <div className="max-w-2xl">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              Scope Package — Division {div.code}
                            </p>
                            <Button
                              variant="ghost"
                              type="button"
                              size="sm"
                              className="h-6 gap-1 px-2 text-[10px] text-muted-foreground hover:text-primary"
                              onClick={async () => {
                                try {
                                  const result = await apiFetch<{ seeded: number; items: ScopeItem[] }>(
                                    `/api/projects/${projectId}/estimates/${estimateId}/scope-items/seed`,
                                    { method: "POST", body: JSON.stringify({ division_code: div.code }) }
                                  );
                                  if (result && result.seeded > 0) {
                                    setScopeItemsByDiv((prev) => ({
                                      ...prev,
                                      [div.code]: [...(prev[div.code] ?? []), ...result.items],
                                    }));
                                    toast.success(`Added ${result.seeded} scope items from estimate`);
                                  } else {
                                    toast.info("No new items to seed from estimate");
                                  }
                                } catch {
                                  toast.error("Failed to seed scope items");
                                }
                              }}
                            >
                              <Plus className="h-3 w-3" /> Seed from estimate
                            </Button>
                          </div>
                          <div className="mb-2 space-y-1">
                            {(scopeItemsByDiv[div.code] ?? []).length === 0 ? (
                              <p className="text-xs text-muted-foreground">No scope items yet. Add items below or seed from the estimate.</p>
                            ) : (
                              (scopeItemsByDiv[div.code] ?? []).map((item) => (
                                <div key={item.id} className="group flex items-start gap-2">
                                  <Checkbox
                                    checked={item.is_checked}
                                    onCheckedChange={() => void toggleScopeItemChecked(div.code, item)}
                                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                                  />
                                  <span className={`flex-1 text-xs ${item.is_checked ? "text-foreground" : "text-muted-foreground line-through"}`}>
                                    {item.description}
                                    {item.notes && <span className="ml-1 text-muted-foreground">— {item.notes}</span>}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    type="button"
                                    size="icon"
                                    className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100"
                                    onClick={() => void deleteScopeItem(div.code, item.id)}
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                              ))
                            )}
                          </div>
                          <div className="flex gap-1.5">
                            <Input
                              placeholder="Add scope item…"
                              value={newScopeDesc[div.code] ?? ""}
                              onChange={(e) => setNewScopeDesc((prev) => ({ ...prev, [div.code]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === "Enter") void addScopeItem(div.code); }}
                              className="h-7 flex-1 text-xs"
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => void addScopeItem(div.code)}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Smart suggestions panel (5.2) */}
                  {expandedSuggestions.has(div.code) && (
                    <tr>
                      <td colSpan={12} className="bg-muted/20 px-6 py-3">
                        <div className="max-w-2xl">
                          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            Suggested Subs — Division {div.code}
                          </p>
                          {!suggestionsCache[div.code] ? (
                            <p className="text-xs text-muted-foreground">Loading suggestions…</p>
                          ) : suggestionsCache[div.code]!.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No suggestions found for this division.</p>
                          ) : (
                            <div className="space-y-1">
                              {suggestionsCache[div.code]!.map((company) => (
                                <div key={company.id} className="flex items-center gap-3 px-2 py-1.5">
                                  <div className="flex-1 min-w-0">
                                    <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                                      {company.name}
                                      {company.is_trade_match && (
                                        <span className="rounded bg-primary/10 px-1 py-0.5 text-[9px] font-medium text-primary">Trade</span>
                                      )}
                                      {company.prior_contracts > 0 && (
                                        <span className="text-[9px] text-muted-foreground">{company.prior_contracts} prior contract{company.prior_contracts !== 1 ? "s" : ""}</span>
                                      )}
                                      {company.bid_history && company.bid_history.total > 0 && (
                                        <span className="text-[9px] text-muted-foreground">
                                          · {Math.round((company.bid_history.awarded / company.bid_history.total) * 100)}% win rate
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    type="button"
                                    className="h-6 shrink-0 px-2 text-[10px]"
                                    onClick={async () => {
                                      // Use returned sub directly — avoids stale closure grabbing wrong row
                                      const newSub = await onEnsureRows(div.code, div.name);
                                      if (newSub) {
                                        await onPatchSub(newSub.id, {
                                          company: company.name,
                                          company_id: company.id,
                                          contact_name: company.contact_name ?? null,
                                          email: company.contact_email ?? null,
                                          cell: company.contact_phone ?? null,
                                        });
                                      }
                                      // Remove from suggestions list
                                      setSuggestionsCache((prev) => ({
                                        ...prev,
                                        [div.code]: (prev[div.code] ?? []).filter((c) => c.id !== company.id),
                                      }));
                                    }}
                                  >
                                    + Add
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Sub rows */}
                  {divRows.map((sub, idx) => (
                    <React.Fragment key={sub.id}>
                    <tr
                      className={`border-b border-border/30 transition-colors hover:bg-muted/30 ${sub.is_awarded ? "bg-status-warning/5" : ""}`}
                    >
                      <td className="py-1.5 pl-4 pr-2 text-muted-foreground">
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-1.5 font-mono text-[10px] tabular-nums">
                          {sub.position ?? idx + 1}
                        </span>
                      </td>

                      {/* Company — combobox linked to Directory */}
                      <td className="px-2 py-1">
                        <div className="relative">
                          {openComboboxId === sub.id ? (
                            <div
                              className="absolute left-0 top-0 z-50 w-72 rounded-md border border-border bg-popover shadow-sm"
                              data-sublist-company-picker-id={sub.id}
                              onBlur={(event) => {
                                const nextTarget = event.relatedTarget as HTMLElement | null;
                                if (nextTarget?.closest(`[data-sublist-company-picker-id="${sub.id}"]`)) {
                                  return;
                                }
                                setOpenComboboxId((prev) => prev === sub.id ? null : prev);
                              }}
                            >
                              <div className="border-b border-border p-2">
                                <Input
                                  autoFocus
                                  placeholder="Search company..."
                                  value={companySearch}
                                  onChange={(e) => setCompanySearch(e.target.value)}
                                  className="h-7 text-xs"
                                  onKeyDown={(e) => { if (e.key === "Escape") { setOpenComboboxId(null); setCompanySearch(""); } }}
                                />
                              </div>
                              <div className="max-h-48 overflow-y-auto">
                                {filteredCompanies.length === 0 ? (
                                  <p className="px-3 py-4 text-center text-xs text-muted-foreground">No companies found</p>
                                ) : (
                                  filteredCompanies.map((c) => {
                                    const isTradeMatch = companyMatchesDivision(c, sub.division_code);
                                    return (
                                      <Button
                                        key={c.id}
                                        variant="ghost"
                                        type="button"
                                        className="flex h-auto w-full flex-col items-start gap-0.5 rounded-none px-3 py-1.5 text-xs"
                                        onClick={() => void selectCompany(sub, c)}
                                      >
                                        <span className="flex w-full items-center gap-1.5">
                                          <span className="font-medium text-foreground">{c.name}</span>
                                          {isTradeMatch && (
                                            <span className="rounded bg-primary/10 px-1 py-0.5 text-[9px] font-medium text-primary">Trade</span>
                                          )}
                                        </span>
                                        {(c.type ?? c.vendor_class) && (
                                          <span className="text-[10px] text-muted-foreground">{c.type ?? c.vendor_class}</span>
                                        )}
                                      </Button>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          ) : null}
                          <InlineText
                            value={sub.company ?? ""}
                            onChange={(v) => void onPatchSub(sub.id, { company: v || null, company_id: v ? sub.company_id : null })}
                            placeholder="Company name"
                            onFocus={() => {
                              setOpenComboboxId(sub.id);
                              setOpenComboboxDivision(sub.division_code);
                              if (sub.company_id && !bidHistoryCache[sub.company_id]) void loadBidHistory(sub.company_id);
                            }}
                            onBlur={(event) => {
                              const nextTarget = event.relatedTarget as HTMLElement | null;
                              if (nextTarget?.closest(`[data-sublist-company-picker-id="${sub.id}"]`)) {
                                return;
                              }
                              setTimeout(() => setOpenComboboxId((prev) => prev === sub.id ? null : prev), 150);
                            }}
                          />
                          {sub.company_id && (() => {
                            const history = bidHistoryCache[sub.company_id];
                            if (!history || history.total_bids === 0) return null;
                            return (
                              <span
                                className="mt-0.5 block text-[9px] text-muted-foreground"
                                title={`${history.total_bids} bid${history.total_bids !== 1 ? "s" : ""} — ${history.win_rate}% win rate${history.avg_price ? ` — avg ${formatCurrencyFull(history.avg_price)}` : ""}`}
                              >
                                {history.total_bids} bid{history.total_bids !== 1 ? "s" : ""} · {history.win_rate}% wins
                              </span>
                            );
                          })()}
                        </div>
                      </td>

                      <td className="w-24 px-2 py-1">
                        <InlineSelect
                          value={sub.intend_to_submit ?? ""}
                          options={INTEND_OPTIONS}
                          onValueChange={(v) => void onPatchSub(sub.id, { intend_to_submit: v || null })}
                          placeholder="—"
                        />
                      </td>
                      {/* Email Sent — send bid invitation via Outlook */}
                      <td className="w-28 px-2 py-1">
                        {sub.email_sent === "Yes" ? (
                          <span className="flex items-center gap-1 text-xs text-status-success">
                            <Mail className="h-3 w-3" /> Sent
                          </span>
                        ) : sub.email ? (
                          <Button
                            variant="ghost"
                            type="button"
                            size="sm"
                            className="h-6 w-full justify-start gap-1 px-1.5 text-xs text-primary hover:text-primary"
                            onClick={() => setBidInviteSubId(sub.id)}
                          >
                            <Mail className="h-3 w-3" /> Send invite
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </td>
                      {/* Phone Follow-Up — call log popover */}
                      <td className="w-28 px-2 py-1">
                        <div className="relative">
                          <Button
                            variant="ghost"
                            type="button"
                            size="sm"
                            className="h-6 w-full justify-start px-1.5 text-xs"
                            onClick={() => openCallLog(sub.id)}
                          >
                            {sub.phone_follow_up ? (
                              <span className={sub.phone_follow_up === "Yes" ? "text-status-success" : "text-muted-foreground"}>
                                {sub.phone_follow_up === "Yes" ? "Reached" : "No contact"}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">Log call</span>
                            )}
                          </Button>
                          {openCallLogSubId === sub.id && (
                            <div
                              className="absolute left-0 top-8 z-50 w-72 rounded-md border border-border bg-popover p-3 shadow-sm"
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-xs font-medium">Log phone call</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  type="button"
                                  className="h-5 w-5"
                                  onClick={() => setOpenCallLogSubId(null)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="mb-2 grid grid-cols-2 gap-1">
                                {(["Reached", "Voicemail", "No Answer", "Declined"] as const).map((outcome) => (
                                  <Button
                                    key={outcome}
                                    variant={callLogOutcome === outcome ? "default" : "outline"}
                                    type="button"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => setCallLogOutcome(outcome)}
                                  >
                                    {outcome}
                                  </Button>
                                ))}
                              </div>
                              <Input
                                placeholder="Notes (optional)"
                                value={callLogNotes}
                                onChange={(e) => setCallLogNotes(e.target.value)}
                                className="mb-2 h-7 text-xs"
                              />
                              <Button
                                type="button"
                                size="sm"
                                className="h-7 w-full text-xs"
                                disabled={!callLogOutcome || callLogSubmitting}
                                onClick={() => void submitCallLog(sub.id)}
                              >
                                {callLogSubmitting ? "Saving…" : "Log call"}
                              </Button>
                              {/* History */}
                              {(callLogsBySubId[sub.id] ?? []).length > 0 && (
                                <div className="mt-3 border-t border-border pt-2">
                                  <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">History</p>
                                  <div className="max-h-32 space-y-1 overflow-y-auto">
                                    {(callLogsBySubId[sub.id] ?? []).map((log) => (
                                      <div key={log.id} className="text-[10px] text-muted-foreground">
                                        <span className="font-medium text-foreground">{log.outcome}</span>
                                        {" — "}
                                        {new Date(log.called_at).toLocaleDateString()}
                                        {log.notes && <span className="block pl-2 text-muted-foreground">{log.notes}</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="w-24 px-2 py-1">
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
                      <td className="w-28 px-2 py-1">
                        <div className="flex items-center gap-0.5">
                          <InlineNumber
                            value={sub.price ?? 0}
                            onChange={(v) => void onPatchSub(sub.id, { price: v || null })}
                            className="flex-1 text-right"
                            currency
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            className="h-5 w-5 shrink-0 text-muted-foreground/40 hover:text-primary"
                            title="Detail bid"
                            onClick={() => toggleBidExpand(sub.id)}
                          >
                            {expandedBidSubIds.has(sub.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </Button>
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <InlineText
                          value={sub.comments ?? ""}
                          onChange={(v) => void onPatchSub(sub.id, { comments: v || null })}
                          placeholder="Comments"
                        />
                      </td>

                      {/* Award action + Use bid */}
                      <td className="w-28 py-1 pr-2 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          {sub.is_awarded && sub.price && sub.price > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              className="h-6 gap-1 px-1.5 text-[10px] text-muted-foreground hover:text-primary"
                              title="Flow this bid into the estimate detail"
                              onClick={() => {
                                void apiFetch(
                                  `/api/projects/${projectId}/estimates/${estimateId}/sublist/${sub.id}/use-bid`,
                                  { method: "POST" }
                                ).then(() => toast.success("Bid flowed into estimate"));
                              }}
                            >
                              Use bid
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            className={`h-7 w-7 ${sub.is_awarded ? "text-status-warning hover:text-status-warning/80" : "text-muted-foreground/30 hover:text-status-warning"}`}
                            title={sub.is_awarded ? "Revoke award" : "Award this sub"}
                            onClick={() => void onAwardSub(sub.id, sub.is_awarded)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            className="h-7 w-7 text-muted-foreground/40 hover:text-destructive"
                            title="Delete sub"
                            aria-label={`Delete ${sub.company || "sub"} from sublist`}
                            onClick={() => void deleteSub(sub)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>

                    {/* Bid detail panel */}
                    {expandedBidSubIds.has(sub.id) && (
                      <tr>
                        <td colSpan={12} className="bg-muted/10 px-8 py-3">
                          <div className="max-w-xl">
                            <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              Bid Line Items — {sub.company ?? "Sub"}
                            </p>
                            <div className="mb-2 space-y-1">
                              {(bidItemsBySubId[sub.id] ?? []).length === 0 ? (
                                <p className="text-xs text-muted-foreground">No line items. Add items below or enter lump sum in the price field.</p>
                              ) : (
                                (bidItemsBySubId[sub.id] ?? []).map((item) => (
                                  <div key={item.id} className="group flex items-center gap-2">
                                    <Checkbox
                                      checked={!item.is_excluded}
                                      onCheckedChange={(v) => void patchBidItem(sub.id, item.id, { is_excluded: !v })}
                                      className="h-3.5 w-3.5 shrink-0"
                                      title={item.is_excluded ? "Excluded from total" : "Included"}
                                    />
                                    <span className={`flex-1 text-xs ${item.is_excluded ? "text-muted-foreground line-through" : "text-foreground"}`}>
                                      {item.description}
                                    </span>
                                    <span className={`w-24 shrink-0 text-right text-xs ${item.is_excluded ? "text-muted-foreground line-through" : "font-medium text-foreground"}`}>
                                      {formatCurrencyFull(Number(item.amount))}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      type="button"
                                      size="icon"
                                      className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100"
                                      onClick={() => void deleteBidItem(sub.id, item.id)}
                                    >
                                      <X className="h-2.5 w-2.5" />
                                    </Button>
                                  </div>
                                ))
                              )}
                              {(bidItemsBySubId[sub.id] ?? []).length > 0 && (
                                <div className="border-t border-border/40 pt-1 text-right text-xs font-semibold text-foreground">
                                  Total: {formatCurrencyFull(
                                    (bidItemsBySubId[sub.id] ?? []).filter((b) => !b.is_excluded).reduce((s, b) => s + Number(b.amount), 0)
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1.5">
                              <Input
                                placeholder="Description"
                                value={newBidDesc[sub.id] ?? ""}
                                onChange={(e) => setNewBidDesc((prev) => ({ ...prev, [sub.id]: e.target.value }))}
                                className="h-7 flex-1 text-xs"
                              />
                              <Input
                                placeholder="$0"
                                type="number"
                                value={newBidAmount[sub.id] ?? ""}
                                onChange={(e) => setNewBidAmount((prev) => ({ ...prev, [sub.id]: e.target.value }))}
                                className="h-7 w-24 text-right text-xs"
                              />
                              <Button
                                type="button"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => void addBidItem(sub.id)}
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  ))}

                </React.Fragment>
              );
            })}

            {/* Empty state when all filtered out */}
            {visibleDivisions.length === 0 && (
              <tr>
                <td colSpan={12} className="py-12 text-center">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-foreground">No subs match the current filters</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-muted-foreground"
                      onClick={() => {
                        setSearchQuery("");
                        setFilterIntend("all");
                        setFilterBid("all");
                        setSortConfig(null);
                      }}
                    >
                      Clear filters
                    </Button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Bid Comparison Summary (PRP 3.3) ─────────────────────────────── */}
      {(() => {
        const divsWithBids = ALL_DIVISIONS.filter((div) => {
          const rows = sublistSubs.filter((s) => s.division_code === div.code && s.price && s.price > 0);
          return rows.length > 0;
        });
        if (divsWithBids.length === 0) return null;

        return (
          <div className="overflow-hidden rounded-md border border-border">
            <div className="border-b border-border bg-muted/30 px-4 py-2">
              <span className="text-xs font-semibold text-foreground">Bid Comparison</span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 text-left text-muted-foreground">
                  <th className="py-2 pl-4 font-medium">Division</th>
                  <th className="px-3 py-2 text-right font-medium">Est. Budget</th>
                  <th className="px-3 py-2 text-right font-medium">Bids</th>
                  <th className="px-3 py-2 text-right font-medium">Low Bid</th>
                  <th className="px-3 py-2 text-right font-medium">Avg Bid</th>
                  <th className="px-3 py-2 text-right font-medium">Δ Budget</th>
                  <th className="px-3 py-2 font-medium">Awarded</th>
                </tr>
              </thead>
              <tbody>
                {divsWithBids.map((div) => {
                  const rows = sublistSubs.filter((s) => s.division_code === div.code && s.price && s.price > 0);
                  const budget = detailTotalsByDiv[div.code] ?? 0;
                  const prices = rows.map((r) => r.price!);
                  const low = Math.min(...prices);
                  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
                  const delta = budget > 0 ? low - budget : null;
                  const awarded = sublistSubs.find((s) => s.division_code === div.code && s.is_awarded);
                  return (
                    <tr key={div.code} className="border-b border-border/20 hover:bg-muted/20">
                      <td className="py-2 pl-4 font-medium text-foreground">{div.code} – {div.name}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {budget > 0 ? formatCurrencyFull(budget) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{rows.length}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium text-foreground">
                        {formatCurrencyFull(low)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {formatCurrencyFull(avg)}
                      </td>
                      <td className={`px-3 py-2 text-right tabular-nums font-medium ${delta === null ? "text-muted-foreground" : delta <= 0 ? "text-status-success" : "text-destructive"}`}>
                        {delta === null ? "—" : `${delta > 0 ? "+" : ""}${formatCurrencyFull(delta)}`}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {awarded ? (
                          <span className="font-medium text-status-warning">★ {awarded.company ?? "—"}</span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* ── Bid Leveling View (PRP 3.2) ───────────────────────────────────── */}
      {(() => {
        // Only show for divisions that have scope items loaded AND at least 2 subs with bid items
        const levelableDivs = ALL_DIVISIONS.filter((div) => {
          const scopeItems = scopeItemsByDiv[div.code] ?? [];
          const subsWithBids = sublistSubs.filter((s) =>
            s.division_code === div.code && (bidItemsBySubId[s.id] ?? []).length > 0
          );
          return scopeItems.length > 0 && subsWithBids.length >= 1;
        });
        if (levelableDivs.length === 0) return null;

        return (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">Bid Leveling</span>
              <span className="text-[10px] text-muted-foreground">(open scope + bid items to populate)</span>
            </div>
            {levelableDivs.map((div) => {
              const scopeItems = scopeItemsByDiv[div.code] ?? [];
              const divSubs = sublistSubs.filter((s) => s.division_code === div.code && (bidItemsBySubId[s.id] ?? []).length > 0);

              return (
                <div key={div.code} className="overflow-hidden rounded-md border border-border">
                  <div className="border-b border-border bg-muted/30 px-4 py-2">
                    <span className="text-xs font-semibold text-foreground">Division {div.code} — {div.name}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/40 bg-muted/10">
                          <th className="min-w-48 px-3 py-2 text-left font-medium text-muted-foreground">Scope Item</th>
                          {divSubs.map((sub) => (
                            <th key={sub.id} className="min-w-28 px-3 py-2 text-right font-medium text-muted-foreground">
                              {sub.company ?? `Sub ${sub.position ?? sub.id}`}
                              {sub.is_awarded && <span className="ml-1 text-status-warning">★</span>}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {scopeItems.map((scopeItem) => (
                          <tr key={scopeItem.id} className="border-b border-border/20">
                            <td className={`px-3 py-1.5 ${!scopeItem.is_checked ? "text-muted-foreground line-through" : "text-foreground"}`}>
                              {scopeItem.description}
                            </td>
                            {divSubs.map((sub) => {
                              const bidItem = (bidItemsBySubId[sub.id] ?? []).find((b) => b.scope_item_id === scopeItem.id);
                              if (!bidItem) return (
                                <td key={sub.id} className="px-3 py-1.5 text-right text-muted-foreground/50">—</td>
                              );
                              return (
                                <td key={sub.id} className={`px-3 py-1.5 text-right ${bidItem.is_excluded ? "text-muted-foreground line-through" : "font-medium text-foreground"}`}>
                                  {bidItem.is_excluded ? <span className="text-[10px]">Excl.</span> : formatCurrencyFull(Number(bidItem.amount))}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        {/* Totals row */}
                        <tr className="border-t border-border/60 bg-muted/20">
                          <td className="px-3 py-2 font-semibold text-foreground">Total</td>
                          {divSubs.map((sub) => {
                            const total = (bidItemsBySubId[sub.id] ?? [])
                              .filter((b) => !b.is_excluded)
                              .reduce((s, b) => s + Number(b.amount), 0);
                            const budget = detailTotalsByDiv[div.code] ?? 0;
                            const delta = budget > 0 ? total - budget : null;
                            return (
                              <td key={sub.id} className="px-3 py-2 text-right">
                                <div className="font-semibold text-foreground">{formatCurrencyFull(total)}</div>
                                {delta !== null && (
                                  <div className={`text-[10px] ${delta > 0 ? "text-destructive" : "text-status-success"}`}>
                                    {delta > 0 ? "+" : ""}{formatCurrencyFull(delta)} vs budget
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ── Bid Invitation Modal (PRP 2.2) ────────────────────────────────── */}
      <Dialog open={bidInviteSubId !== null} onOpenChange={(open) => { if (!open) setBidInviteSubId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Bid Invitation</DialogTitle>
            <DialogDescription>
              {(() => {
                const sub = sublistSubs.find((s) => s.id === bidInviteSubId);
                return sub
                  ? `Draft an Outlook bid invitation to ${sub.company ?? "this sub"} (${sub.email ?? "—"}).`
                  : "Draft a bid invitation email via Outlook.";
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Bid Due Date (optional)</Label>
              <Input
                type="date"
                value={bidInviteDueDate}
                onChange={(e) => setBidInviteDueDate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Additional message (optional)</Label>
              <Textarea
                value={bidInviteMessage}
                onChange={(e) => setBidInviteMessage(e.target.value)}
                placeholder="Any special instructions or notes to include..."
                rows={3}
                className="text-sm"
              />
            </div>
            <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
              A draft email will be created in your Outlook inbox. The draft includes the project name, division, scope of work items, and due date. Review and send from Outlook.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setBidInviteSubId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={bidInviteSending}
              onClick={() => void sendBidInvitation()}
              className="gap-1.5"
            >
              <Mail className="h-3.5 w-3.5" />
              {bidInviteSending ? "Creating draft…" : "Create Outlook Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary Tab
// ---------------------------------------------------------------------------

const ALLEATO_CONTACTS = [
  { name: "Brandon Clymer", title: "CEO", email: "bclymer@alleatogroup.com", phone: "317.760.0088" },
  { name: "Jesse Dawson", title: "Vice President", email: "jdawson@alleatogroup.com", phone: "502.612.2089" },
] as const;

function buildPrintHTML(opts: {
  estimate: EstimateRow;
  projectName: string;
  gcItems: GcItem[];
  detailItems: DetailItem[];
  gcTotal: number;
  detailTotalsByDiv: Record<string, number>;
  subtotal: number;
  contingencyAmount: number;
  insurance: number;
  insuranceRate: number;
  fee: number;
  feeRate: number;
  grandTotal: number;
}): string {
  const fmt = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v);
  const divRows = [
    { code: "01", name: "General Conditions", total: opts.gcTotal },
    ...ALL_DIVISIONS.filter((d) => (opts.detailTotalsByDiv[d.code] ?? 0) > 0).map((d) => ({
      code: d.code,
      name: d.name,
      total: opts.detailTotalsByDiv[d.code] ?? 0,
    })),
  ];
  const divisionRows = divRows.map((d) => `<tr><td style="padding:5px 12px;border-bottom:1px solid #e5e7eb;">${d.code} – ${d.name}</td><td style="padding:5px 12px;text-align:right;border-bottom:1px solid #e5e7eb;font-variant-numeric:tabular-nums;">${fmt(d.total)}</td></tr>`).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Estimate – ${opts.estimate.title}</title>
<style>
  body{font-family:system-ui,sans-serif;font-size:11px;color:#111;margin:0;padding:24px;}
  table{width:100%;border-collapse:collapse;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #d97706;}
  .logo{font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#d97706;}
  .contacts{display:flex;gap:32px;font-size:10px;line-height:1.6;}
  .contact-block{min-width:160px;}
  .contact-name{font-weight:700;}
  .project-bar{background:#f3f4f6;padding:10px 12px;border-radius:4px;margin-bottom:16px;display:flex;gap:32px;font-size:10px;}
  .project-bar span{color:#6b7280;}
  .project-bar strong{color:#111;}
  th{background:#1f2937;color:#fff;padding:8px 12px;text-align:left;font-size:10px;letter-spacing:.05em;text-transform:uppercase;}
  th:last-child{text-align:right;}
  .subtotal td{font-weight:600;background:#f9fafb;}
  .total td{font-weight:800;font-size:13px;background:#1f2937;color:#fff;}
  .total td:last-child{color:#fbbf24;}
  @media print{body{padding:12px;}button{display:none;}}
</style></head><body>
<div class="header">
  <div><div class="logo">ALLEATO</div><div style="font-size:10px;color:#6b7280;margin-top:4px;">Alleato Group LLC</div></div>
  <div class="contacts">${ALLEATO_CONTACTS.map((c) => `<div class="contact-block"><div class="contact-name">${c.name}</div><div>${c.title}</div><div>${c.email}</div><div>${c.phone}</div></div>`).join("")}</div>
</div>
<div class="project-bar">
  <div><span>Project: </span><strong>${opts.projectName}</strong></div>
  <div><span>Estimate: </span><strong>${opts.estimate.title}</strong></div>
  ${opts.estimate.location ? `<div><span>Location: </span><strong>${opts.estimate.location}</strong></div>` : ""}
  ${opts.estimate.estimate_date ? `<div><span>Date: </span><strong>${opts.estimate.estimate_date}</strong></div>` : ""}
  ${opts.estimate.estimator ? `<div><span>Estimator: </span><strong>${opts.estimate.estimator}</strong></div>` : ""}
  <div><span>Revision: </span><strong>R${opts.estimate.revision}</strong></div>
</div>
<table>
  <thead><tr><th>Division</th><th style="text-align:right;">Total</th></tr></thead>
  <tbody>${divisionRows}</tbody>
  <tfoot>
    <tr class="subtotal"><td style="padding:7px 12px;border-top:2px solid #e5e7eb;">Subtotal</td><td style="padding:7px 12px;text-align:right;border-top:2px solid #e5e7eb;">${fmt(opts.subtotal)}</td></tr>
    ${opts.contingencyAmount > 0 ? `<tr><td style="padding:5px 12px;">Contingency</td><td style="padding:5px 12px;text-align:right;">${fmt(opts.contingencyAmount)}</td></tr>` : ""}
    <tr><td style="padding:5px 12px;">Insurance (${(opts.insuranceRate * 100).toFixed(2)}%)</td><td style="padding:5px 12px;text-align:right;">${fmt(opts.insurance)}</td></tr>
    <tr><td style="padding:5px 12px;border-bottom:2px solid #e5e7eb;">Fee (${(opts.feeRate * 100).toFixed(1)}%)</td><td style="padding:5px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">${fmt(opts.fee)}</td></tr>
    <tr class="total"><td style="padding:10px 12px;">TOTAL ESTIMATE</td><td style="padding:10px 12px;text-align:right;">${fmt(opts.grandTotal)}</td></tr>
  </tfoot>
</table>
</body></html>`;
}

function SummaryTab({
  estimate,
  projectName,
  gcItems,
  detailItems,
  gcTotal,
  detailTotalsByDiv,
  subtotal,
  contingencyAmount,
  insuranceRate,
  feeRate,
  insurance,
  fee,
  grandTotal,
  durationMonths,
  durationWeeks,
  onContingencyBlur,
  onInsuranceRateBlur,
  onFeeRateBlur,
}: {
  estimate: EstimateRow;
  projectName: string;
  gcItems: GcItem[];
  detailItems: DetailItem[];
  gcTotal: number;
  detailTotalsByDiv: Record<string, number>;
  subtotal: number;
  contingencyAmount: number;
  insuranceRate: number;
  feeRate: number;
  insurance: number;
  fee: number;
  grandTotal: number;
  durationMonths: number;
  durationWeeks: number;
  onContingencyBlur: (v: number) => void;
  onInsuranceRateBlur: (v: number) => void;
  onFeeRateBlur: (v: number) => void;
}) {
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const toggle = (code: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  return (
    <div className="space-y-5">
      {/* ── Letterhead ─────────────────────────────────────────────── */}
      <div className="rounded-lg p-5">
        <div className="flex items-start justify-between gap-6">
          {/* Logo + address */}
          <div className="flex items-start gap-4">
            <img
              src="/Alleato-Group-Logo_Dark.png"
              alt="Alleato Group LLC"
              className="h-12 w-auto object-contain"
            />
          </div>

          {/* Contacts */}
          <div className="flex shrink-0 gap-8">
            {ALLEATO_CONTACTS.map((c) => (
              <div key={c.email} className="text-xs">
                <p className="font-semibold text-foreground">{c.name}</p>
                <p className="text-muted-foreground">{c.title}</p>
                <p className="text-muted-foreground">{c.email}</p>
                <p className="text-muted-foreground">{c.phone}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Project info bar */}
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-xs text-foreground">
          <span><span>Project: </span><span className="font-medium">{projectName}</span></span>
          {estimate.location && (
            <span><span>Location: </span><span className="font-medium">{estimate.location}</span></span>
          )}
          {estimate.estimate_date && (
            <span><span>Date: </span><span className="font-medium">{estimate.estimate_date}</span></span>
          )}
          {estimate.estimator && (
            <span><span>Estimator: </span><span className="font-medium">{estimate.estimator}</span></span>
          )}
          <span><span>Revision: </span><span className="font-medium">R{estimate.revision}</span></span>
        </div>
      </div>

      {/* ── Division breakdown (expandable) ─────────────────────────── */}
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="border-b border-border bg-muted/30 px-4 py-2.5">
          <span className="text-xs font-semibold text-foreground">Division Breakdown</span>
        </div>
        <table className="w-full text-xs">
          <thead />
          <tbody>
            {/* ── GC – Division 01 ── */}
            {gcTotal > 0 && (
              <>
                <tr
                  className="cursor-pointer border-b border-border/40 hover:bg-muted/20"
                  onClick={() => toggle("01")}
                >
                  <td className="flex items-center gap-1.5 py-2.5 pl-4 pr-2 font-medium text-foreground">
                    {expanded.has("01") ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                    <span>01 – General Conditions</span>
                  </td>
                  <td className="py-2.5 pr-4 text-right font-medium tabular-nums text-foreground">
                    {formatCurrencyFull(gcTotal)}
                  </td>
                </tr>
                {expanded.has("01") && gcItems.map((item) => {
                  const qty = getEffectiveQty(item, durationMonths, durationWeeks);
                  const rowTotal = qty * (item.rate ?? 0) * (item.allocation ?? 0);
                  return (
                    <tr key={item.id} className="border-b border-border/20 bg-muted/10">
                      <td className="py-1.5 pl-10 pr-2 text-muted-foreground">
                        <span className="font-mono text-[10px] text-muted-foreground/70">{item.cost_code}</span>
                        <span className="ml-2">{item.description}</span>
                      </td>
                      <td className="py-1.5 pr-4 text-right tabular-nums text-muted-foreground">
                        {rowTotal > 0 ? formatCurrencyFull(rowTotal) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </>
            )}

            {/* ── Other divisions ── */}
            {ALL_DIVISIONS.map((div) => {
              const total = detailTotalsByDiv[div.code] ?? 0;
              const rows = detailItems.filter((i) => i.division_code === div.code);
              const isOpen = expanded.has(div.code);
              return (
                <React.Fragment key={div.code}>
                  <tr
                    className={`border-b border-border/20 ${total > 0 ? "cursor-pointer hover:bg-muted/20" : ""}`}
                    onClick={() => total > 0 && toggle(div.code)}
                  >
                    <td className="flex items-center gap-1.5 py-2 pl-4 pr-2 text-foreground">
                      {total > 0
                        ? (isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />)
                        : <span className="h-3.5 w-3.5" />
                      }
                      <span className={total === 0 ? "text-muted-foreground" : ""}>
                        {div.code} – {div.name}
                      </span>
                    </td>
                    <td className={`py-2 pr-4 text-right tabular-nums ${total > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                      {total > 0 ? formatCurrencyFull(total) : "—"}
                    </td>
                  </tr>
                  {isOpen && rows.map((item) => (
                    <tr key={item.id} className="border-b border-border/20 bg-muted/10">
                      <td className="py-1.5 pl-10 pr-2 text-muted-foreground">
                        {item.cost_code && <span className="font-mono text-[10px] text-muted-foreground/70 mr-2">{item.cost_code}</span>}
                        <span>{item.cost_code_name ?? item.work_description ?? "—"}</span>
                        {item.sub_name && <span className="ml-2 text-[10px] text-muted-foreground/60">· {item.sub_name}</span>}
                      </td>
                      <td className="py-1.5 pr-4 text-right tabular-nums text-muted-foreground">
                        {(item.estimated_amount ?? 0) > 0 ? formatCurrencyFull(item.estimated_amount ?? 0) : "—"}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/20">
              <td className="py-2.5 pl-4 text-xs font-semibold text-foreground">Subtotal</td>
              <td className="py-2.5 pr-4 text-right text-sm font-bold tabular-nums text-foreground">
                {formatCurrencyFull(subtotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Financial rollup ────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="border-b border-border bg-muted/30 px-4 py-2.5">
          <span className="text-xs font-semibold text-foreground">Markups &amp; Fees</span>
        </div>
        <div className="divide-y divide-border/30">
          <SummaryMarkupLine
            label="Contingency"
            rateValue={null}
            dollarValue={contingencyAmount}
            onDollarChange={onContingencyBlur}
          />
          <SummaryMarkupLine
            label="Insurance"
            rateValue={insuranceRate * 100}
            dollarValue={insurance}
            onRateChange={onInsuranceRateBlur}
            rateSuffix="%"
          />
          <SummaryMarkupLine
            label="Fee"
            rateValue={feeRate * 100}
            dollarValue={fee}
            onRateChange={onFeeRateBlur}
            rateSuffix="%"
          />
          <div className="flex items-center justify-between bg-foreground/5 px-4 py-3">
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

function SummaryMarkupLine({
  label,
  rateValue,
  dollarValue,
  onRateChange,
  onDollarChange,
  rateSuffix,
}: {
  label: string;
  rateValue: number | null;
  dollarValue: number;
  onRateChange?: (v: number) => void;
  onDollarChange?: (v: number) => void;
  rateSuffix?: string;
}) {
  const [localRate, setLocalRate] = React.useState(rateValue !== null ? String(rateValue) : "");
  const [localDollar, setLocalDollar] = React.useState(String(dollarValue));

  React.useEffect(() => { if (rateValue !== null) setLocalRate(String(rateValue)); }, [rateValue]);
  React.useEffect(() => { setLocalDollar(String(dollarValue)); }, [dollarValue]);

  const commitRate = () => {
    const parsed = parseFloat(localRate);
    if (!Number.isNaN(parsed) && onRateChange) onRateChange(parsed);
    else setLocalRate(rateValue !== null ? String(rateValue) : "");
  };
  const commitDollar = () => {
    const parsed = parseFloat(localDollar);
    if (!Number.isNaN(parsed) && onDollarChange) onDollarChange(parsed);
    else setLocalDollar(String(dollarValue));
  };

  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        {/* rate input */}
        {rateValue !== null && onRateChange && (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={localRate}
              onChange={(e) => setLocalRate(e.target.value)}
              onBlur={commitRate}
              onKeyDown={(e) => e.key === "Enter" && commitRate()}
              className="h-6 w-16 text-right text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            {rateSuffix && <span className="text-xs text-muted-foreground">{rateSuffix}</span>}
          </div>
        )}
        {/* dollar amount */}
        {onDollarChange ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={localDollar}
              onChange={(e) => setLocalDollar(e.target.value)}
              onBlur={commitDollar}
              onKeyDown={(e) => e.key === "Enter" && commitDollar()}
              className="h-6 w-28 text-right text-xs tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
        ) : (
          <span className="w-28 text-right text-xs tabular-nums text-foreground">
            {formatCurrencyFull(dollarValue)}
          </span>
        )}
      </div>
    </div>
  );
}
