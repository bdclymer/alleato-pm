import * as React from "react";
import type { ReactElement } from "react";
import { MoreHorizontal, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  ColumnConfig,
  DetailFieldConfig,
  FilterConfig,
  TableColumn,
} from "@/components/tables/unified";
import type {
  CompanyCreateDTO,
  CompanyUpdateDTO,
  ProjectCompany,
} from "@/services/companyService";

const COMPANY_TYPE_LABELS: Record<ProjectCompany["company_type"], string> = {
  YOUR_COMPANY: "Your Company",
  VENDOR: "Vendor",
  SUBCONTRACTOR: "Subcontractor",
  SUPPLIER: "Supplier",
  CONNECTED_COMPANY: "Connected Company",
};

type Variant = "default" | "secondary" | "outline" | "destructive";

/** Column metadata for the unified companies table. */
export const companyColumns: ColumnConfig[] = [
  { id: "company.name", label: "Company Name", alwaysVisible: true },
  { id: "company_type", label: "Type", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "business_phone", label: "Phone", defaultVisible: true },
  { id: "email_address", label: "Email", defaultVisible: true },
  { id: "company.city", label: "City", defaultVisible: false },
  { id: "company.state", label: "State", defaultVisible: false },
  { id: "user_count", label: "Users", defaultVisible: true },
  { id: "created_at", label: "Added", defaultVisible: false },
];

/** Filter menu definitions for the companies toolbar. */
export const companyFilters: FilterConfig[] = [
  {
    id: "company_type",
    label: "Type",
    type: "select",
    options: Object.entries(COMPANY_TYPE_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  },
  {
    id: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "ACTIVE", label: "Active" },
      { value: "INACTIVE", label: "Inactive" },
    ],
  },
];

/** Detail panel fields for company create/edit. */
export const companyDetailFields: DetailFieldConfig[] = [
  { id: "company.name", label: "Company Name", type: "text" },
  {
    id: "company_type",
    label: "Type",
    type: "select",
    options: Object.entries(COMPANY_TYPE_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  },
  {
    id: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "ACTIVE", label: "Active" },
      { value: "INACTIVE", label: "Inactive" },
    ],
  },
  { id: "business_phone", label: "Phone", type: "text" },
  { id: "email_address", label: "Email", type: "text" },
  { id: "company.address", label: "Address", type: "text" },
  { id: "company.city", label: "City", type: "text" },
  { id: "company.state", label: "State", type: "text" },
  { id: "company.zip", label: "ZIP", type: "text" },
  { id: "company.website", label: "Website", type: "text" },
];

/** Default visible column IDs for the companies table. */
export const companyDefaultVisibleColumns = companyColumns
  .filter((column) => column.defaultVisible !== false)
  .map((column) => column.id);

/** Variant selection for company type badge. */
export function getCompanyTypeVariant(type: ProjectCompany["company_type"]): Variant {
  const variants: Record<ProjectCompany["company_type"], Variant> = {
    YOUR_COMPANY: "default",
    VENDOR: "outline",
    SUBCONTRACTOR: "secondary",
    SUPPLIER: "outline",
    CONNECTED_COMPANY: "outline",
  };
  return variants[type];
}

/** Variant selection for company status badge. */
export function getCompanyStatusVariant(status: ProjectCompany["status"]): Variant {
  return status === "ACTIVE" ? "default" : "destructive";
}

/** Read a nested property (e.g., "company.name") from a company record. */
export function getCompanyNestedValue(
  item: ProjectCompany | null,
  path: string,
): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[part];
  }, item);
}

export function getCompanySortValue(
  item: ProjectCompany,
  columnId: string,
): string | number | null {
  switch (columnId) {
    case "company.name":
      return String(getCompanyNestedValue(item, "company.name") || "");
    case "company_type":
      return item.company_type || "";
    case "status":
      return item.status || "";
    case "business_phone":
      return item.business_phone || "";
    case "email_address":
      return item.email_address || "";
    case "company.city":
      return String(getCompanyNestedValue(item, "company.city") || "");
    case "company.state":
      return String(getCompanyNestedValue(item, "company.state") || "");
    case "user_count":
      return item.user_count || 0;
    case "created_at":
      return item.created_at ? new Date(item.created_at).getTime() : 0;
    default:
      return null;
  }
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return undefined;
}

/** Build update payload for the company update mutation. */
export function buildCompanyUpdatePayload(data: Partial<ProjectCompany>): CompanyUpdateDTO {
  const payload: CompanyUpdateDTO = {};

  const name = toStringValue(getCompanyNestedValue(data as ProjectCompany, "company.name"));
  const address = toStringValue(getCompanyNestedValue(data as ProjectCompany, "company.address"));
  const city = toStringValue(getCompanyNestedValue(data as ProjectCompany, "company.city"));
  const state = toStringValue(getCompanyNestedValue(data as ProjectCompany, "company.state"));
  const zip = toStringValue(getCompanyNestedValue(data as ProjectCompany, "company.zip"));
  const website = toStringValue(getCompanyNestedValue(data as ProjectCompany, "company.website"));

  if (name) payload.name = name;
  if (address !== undefined) payload.address = address;
  if (city !== undefined) payload.city = city;
  if (state !== undefined) payload.state = state;
  if (zip !== undefined) payload.zip = zip;
  if (website !== undefined) payload.website = website;

  const businessPhone = toStringValue(data.business_phone ?? undefined);
  const emailAddress = toStringValue(data.email_address ?? undefined);
  const erpVendorId = toStringValue(data.erp_vendor_id ?? undefined);

  if (businessPhone !== undefined) payload.business_phone = businessPhone;
  if (emailAddress !== undefined) payload.email_address = emailAddress;
  if (erpVendorId !== undefined) payload.erp_vendor_id = erpVendorId;

  if (data.company_type) payload.company_type = data.company_type;
  if (data.status) payload.status = data.status;
  if (data.logo_url !== undefined) payload.logo_url = data.logo_url || undefined;

  return payload;
}

/** Build create payload for the company create mutation. */
export function buildCompanyCreatePayload(
  data: Partial<ProjectCompany>,
): CompanyCreateDTO | null {
  const name = toStringValue(getCompanyNestedValue(data as ProjectCompany, "company.name"));
  if (!name) return null;

  return {
    name,
    address: toStringValue(getCompanyNestedValue(data as ProjectCompany, "company.address")),
    city: toStringValue(getCompanyNestedValue(data as ProjectCompany, "company.city")),
    state: toStringValue(getCompanyNestedValue(data as ProjectCompany, "company.state")),
    zip: toStringValue(getCompanyNestedValue(data as ProjectCompany, "company.zip")),
    business_phone: toStringValue(data.business_phone ?? undefined),
    email_address: toStringValue(data.email_address ?? undefined),
    erp_vendor_id: toStringValue(data.erp_vendor_id ?? undefined),
    company_type: data.company_type || "VENDOR",
  };
}

/** Build unified table columns for the companies table. */
export function buildCompanyTableColumns(): TableColumn<ProjectCompany>[] {
  return [
    {
      ...companyColumns[0],
      render: (item) => (
        <span className="font-medium">
          {String(getCompanyNestedValue(item, "company.name") || "")}
        </span>
      ),
      csvValue: (item) => String(getCompanyNestedValue(item, "company.name") || ""),
      sortValue: (item) => getCompanySortValue(item, "company.name"),
    },
    {
      ...companyColumns[1],
      render: (item) => (
        <Badge variant={getCompanyTypeVariant(item.company_type)}>
          {COMPANY_TYPE_LABELS[item.company_type]}
        </Badge>
      ),
      csvValue: (item) => item.company_type ?? "",
      sortValue: (item) => getCompanySortValue(item, "company_type"),
    },
    {
      ...companyColumns[2],
      render: (item) => (
        <Badge variant={getCompanyStatusVariant(item.status)}>{item.status}</Badge>
      ),
      csvValue: (item) => item.status ?? "",
      sortValue: (item) => getCompanySortValue(item, "status"),
    },
    {
      ...companyColumns[3],
      render: (item) => (
        <span className="text-muted-foreground">{item.business_phone || "-"}</span>
      ),
      csvValue: (item) => item.business_phone || "",
      sortValue: (item) => getCompanySortValue(item, "business_phone"),
    },
    {
      ...companyColumns[4],
      render: (item) => (
        <span className="text-muted-foreground">{item.email_address || "-"}</span>
      ),
      csvValue: (item) => item.email_address || "",
      sortValue: (item) => getCompanySortValue(item, "email_address"),
    },
    {
      ...companyColumns[5],
      render: (item) => (
        <span className="text-muted-foreground">
          {String(getCompanyNestedValue(item, "company.city") || "-")}
        </span>
      ),
      csvValue: (item) => String(getCompanyNestedValue(item, "company.city") || ""),
      sortValue: (item) => getCompanySortValue(item, "company.city"),
    },
    {
      ...companyColumns[6],
      render: (item) => (
        <span className="text-muted-foreground">
          {String(getCompanyNestedValue(item, "company.state") || "-")}
        </span>
      ),
      csvValue: (item) => String(getCompanyNestedValue(item, "company.state") || ""),
      sortValue: (item) => getCompanySortValue(item, "company.state"),
    },
    {
      ...companyColumns[7],
      render: (item) => <span>{item.user_count || 0}</span>,
      csvValue: (item) => String(item.user_count || 0),
      sortValue: (item) => getCompanySortValue(item, "user_count"),
    },
    {
      ...companyColumns[8],
      render: (item) => (
        <span className="text-muted-foreground">
          {item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}
        </span>
      ),
      csvValue: (item) => (item.created_at ? item.created_at : ""),
      sortValue: (item) => getCompanySortValue(item, "created_at"),
    },
  ];
}

/** Render the row actions menu for a company row. */
export function renderCompanyRowActions(
  item: ProjectCompany,
  onEdit: (company: ProjectCompany) => void,
): ReactElement {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(item)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Render a card view item for the companies page. */
export function renderCompanyCard(
  item: ProjectCompany,
  onClick: (company: ProjectCompany) => void,
): ReactElement {
  return (
    <div
      className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onClick(item)}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium">
          {String(getCompanyNestedValue(item, "company.name") || "")}
        </h3>
        <Badge variant={getCompanyStatusVariant(item.status)}>{item.status}</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-1">
        {COMPANY_TYPE_LABELS[item.company_type]}
      </p>
      {item.business_phone && (
        <p className="text-sm text-muted-foreground">{item.business_phone}</p>
      )}
    </div>
  );
}

/** Render a list view item for the companies page. */
export function renderCompanyList(
  item: ProjectCompany,
  onClick: (company: ProjectCompany) => void,
  selectedIds: string[],
  onSelectRow: (id: string, checked: boolean) => void,
): ReactElement {
  return (
    <div
      className="flex items-center justify-between py-2 px-4 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onClick(item)}
    >
      <div className="flex items-center gap-4">
        <Checkbox
          checked={selectedIds.includes(item.id)}
          onCheckedChange={(checked) => onSelectRow(item.id, Boolean(checked))}
          onClick={(event) => event.stopPropagation()}
        />
        <span className="font-medium">
          {String(getCompanyNestedValue(item, "company.name") || "")}
        </span>
        <Badge variant={getCompanyTypeVariant(item.company_type)} className="text-xs">
          {COMPANY_TYPE_LABELS[item.company_type]}
        </Badge>
      </div>
      <Badge variant={getCompanyStatusVariant(item.status)}>{item.status}</Badge>
    </div>
  );
}
