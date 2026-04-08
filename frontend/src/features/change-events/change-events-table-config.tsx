import { ChevronRight, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { ReactElement } from "react";

import { StatusBadge } from "@/components/ds";
import type {
  ColumnConfig,
  FilterConfig,
  TableColumn,
} from "@/components/tables/unified";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ChangeEvent } from "@/hooks/use-change-events";

const STATUS_FILTER_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "closed", label: "Closed" },
  { value: "void", label: "Void" },
];

const SCOPE_FILTER_OPTIONS = [
  { value: "tbd", label: "TBD" },
  { value: "in_scope", label: "In Scope" },
  { value: "out_of_scope", label: "Out of Scope" },
];

const TYPE_FILTER_OPTIONS = [
  { value: "Owner Change", label: "Owner Change" },
  { value: "Design Change", label: "Design Change" },
  { value: "Allowance", label: "Allowance" },
  { value: "Contingency", label: "Contingency" },
  { value: "TBD", label: "TBD" },
  { value: "Transfer", label: "Transfer" },
  { value: "Unforeseen Condition", label: "Unforeseen Condition" },
  { value: "Value Engineering", label: "Value Engineering" },
];

export const changeEventColumns: ColumnConfig[] = [
  { id: "number_title", label: "CE Number - Title", alwaysVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "scope", label: "Scope", defaultVisible: true },
  { id: "type", label: "Type", defaultVisible: true },
  { id: "reason", label: "Change Reason", defaultVisible: true },
  { id: "origin", label: "Origin", defaultVisible: true },
  { id: "revenue_prime_pco", label: "Prime PCO", defaultVisible: true },
  { id: "prime_pco_title", label: "Prime PCO Title", defaultVisible: true },
  { id: "cost_rom", label: "Cost ROM", defaultVisible: true },
  { id: "rfq_title", label: "RFQ Title", defaultVisible: true },
  { id: "commitment", label: "Commitment", defaultVisible: true },
  { id: "commitment_title", label: "Commitment Title", defaultVisible: true },
  { id: "created_at", label: "Created", defaultVisible: true },
];

const ORIGIN_FILTER_OPTIONS = [
  { value: "Internal", label: "Internal" },
  { value: "Owner", label: "Owner" },
  { value: "Subcontractor", label: "Subcontractor" },
  { value: "Architect", label: "Architect" },
  { value: "Engineer", label: "Engineer" },
];

const EXPECTING_REVENUE_FILTER_OPTIONS = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

export const changeEventFilters: FilterConfig[] = [
  {
    id: "status",
    label: "Status",
    type: "select",
    options: STATUS_FILTER_OPTIONS,
  },
  {
    id: "scope",
    label: "Scope",
    type: "select",
    options: SCOPE_FILTER_OPTIONS,
  },
  {
    id: "type",
    label: "Type",
    type: "select",
    options: TYPE_FILTER_OPTIONS,
  },
  {
    id: "origin",
    label: "Origin",
    type: "select",
    options: ORIGIN_FILTER_OPTIONS,
  },
  {
    id: "expecting_revenue",
    label: "Expecting Revenue",
    type: "select",
    options: EXPECTING_REVENUE_FILTER_OPTIONS,
  },
  {
    id: "over_under",
    label: "Over/Under",
    type: "select",
    options: [
      { value: "over", label: "Over Budget" },
      { value: "under", label: "Under Budget" },
    ],
  },
  {
    id: "budget",
    label: "Budget",
    type: "text",
  },
  {
    id: "budget_code_segments",
    label: "Budget Code Segments",
    type: "text",
  },
];

export const changeEventDefaultVisibleColumns = changeEventColumns
  .filter((column) => column.defaultVisible !== false)
  .map((column) => column.id);

function statusLabel(status: string | null | undefined): string {
  switch ((status ?? "").toLowerCase()) {
    case "open":
      return "Open";
    case "pending":
      return "Pending";
    case "closed":
      return "Closed";
    case "void":
      return "Void";
    default:
      return status || "-";
  }
}

function scopeLabel(scope: string | null | undefined): string {
  switch ((scope ?? "").toLowerCase()) {
    case "tbd":
      return "TBD";
    case "in_scope":
      return "In Scope";
    case "out_of_scope":
      return "Out of Scope";
    default:
      return scope || "-";
  }
}

function typeLabel(type: string | null | undefined): string {
  switch ((type ?? "").toLowerCase()) {
    case "owner_change":
    case "owner change":
      return "Owner Change";
    case "design_change":
    case "design change":
      return "Design Change";
    case "allowance":
      return "Allowance";
    case "contingency":
      return "Contingency";
    case "scope_gap":
    case "scope gap":
      return "Scope Gap";
    case "tbd":
      return "TBD";
    case "transfer":
      return "Transfer";
    case "unforeseen_condition":
    case "unforeseen condition":
      return "Unforeseen Condition";
    case "value_engineering":
    case "value engineering":
      return "Value Engineering";
    default:
      return type || "-";
  }
}

function formatDate(dateValue: string | null | undefined): string {
  if (!dateValue) return "-";
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString();
}

function formatMoney(value: number | string | null | undefined): string {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  if (!Number.isFinite(numeric)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(numeric);
}

export function buildChangeEventTableColumns(
  expandedIds?: Set<string>,
  onToggleExpand?: (id: string) => void,
): TableColumn<ChangeEvent>[] {
  return [
    {
      ...changeEventColumns[0],
      render: (item) => (
        <div className="flex items-center gap-1.5">
          {onToggleExpand && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(String(item.id));
              }}
              className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ChevronRight
                className={`h-3.5 w-3.5 transition-transform ${
                  expandedIds?.has(String(item.id)) ? "rotate-90" : ""
                }`}
              />
            </button>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-default">
                <span className="font-mono text-muted-foreground">{item.number || `CE-${item.id}`}</span>
                {" - "}
                <span className="font-medium">{item.title}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs space-y-1 text-xs">
              <p className="font-semibold text-sm">{item.number || `CE-${item.id}`} — {item.title}</p>
              <p><span className="text-muted-foreground">Status:</span> {statusLabel(item.status)}</p>
              <p><span className="text-muted-foreground">Scope:</span> {scopeLabel(item.scope)}</p>
              {item.reason && <p><span className="text-muted-foreground">Change Reason:</span> {item.reason}</p>}
              <p><span className="text-muted-foreground">Type:</span> {typeLabel(item.type)}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      ),
      sortValue: (item) => `${item.number ?? ""} ${item.title}`,
    },
    {
      ...changeEventColumns[1],
      render: (item) => <StatusBadge status={statusLabel(item.status)} />,
      sortValue: (item) => item.status ?? "",
    },
    {
      ...changeEventColumns[2],
      render: (item) => <span>{scopeLabel(item.scope)}</span>,
      sortValue: (item) => scopeLabel(item.scope),
    },
    {
      ...changeEventColumns[3],
      render: (item) => <span>{typeLabel(item.type)}</span>,
      sortValue: (item) => typeLabel(item.type),
    },
    {
      ...changeEventColumns[4],
      render: (item) => <span className="line-clamp-1">{item.reason || "--"}</span>,
      sortValue: (item) => item.reason ?? "",
    },
    {
      ...changeEventColumns[5],
      render: (item) => <span>{item.origin || "--"}</span>,
      sortValue: (item) => item.origin ?? "",
    },
    {
      // Revenue > Prime PCO (dollar amount)
      ...changeEventColumns[6],
      render: (item) => (
        <span className="tabular-nums">{formatMoney(item.rom)}</span>
      ),
      sortValue: (item) => Number(item.rom ?? 0),
    },
    {
      ...changeEventColumns[7],
      render: (item) => (
        <span className="line-clamp-1">
          {item.prime_pco_title
            ? item.prime_pco_title
            : item.prime_pco
              ? `${item.prime_pco}`
              : "--"}
        </span>
      ),
      sortValue: (item) => item.prime_pco_title ?? item.prime_pco ?? "",
    },
    {
      // Cost > Cost ROM
      ...changeEventColumns[8],
      render: (item) => (
        <span className="tabular-nums">{formatMoney(item.cost_rom)}</span>
      ),
      sortValue: (item) => Number(item.cost_rom ?? 0),
    },
    {
      ...changeEventColumns[9],
      render: (item) => <span className="line-clamp-1">{item.rfq_title || "--"}</span>,
      sortValue: (item) => item.rfq_title ?? "",
    },
    {
      // Cost > Commitment (dollar amount)
      ...changeEventColumns[10],
      render: (item) => (
        <span className="tabular-nums">{formatMoney(item.commitment)}</span>
      ),
      sortValue: (item) => Number(item.commitment ?? 0),
    },
    {
      ...changeEventColumns[11],
      render: (item) => (
        <span className="line-clamp-1">{item.commitment_title || "--"}</span>
      ),
      sortValue: (item) => item.commitment_title ?? "",
    },
    {
      ...changeEventColumns[12],
      render: (item) => <span>{formatDate(item.created_at)}</span>,
      sortValue: (item) => (item.created_at ? new Date(item.created_at).getTime() : 0),
    },
  ];
}

export function renderChangeEventRowActions(
  item: ChangeEvent,
  onView: (item: ChangeEvent) => void,
  onEdit: (item: ChangeEvent) => void,
  onDelete: (item: ChangeEvent) => void,
): ReactElement {
  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onView(item)}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(item); }}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => onDelete(item)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function renderChangeEventCard(
  item: ChangeEvent,
  onClick: (item: ChangeEvent) => void,
): ReactElement {
  return (
    <button
      type="button"
      className="w-full cursor-pointer rounded-lg border p-4 text-left transition-colors hover:bg-muted/50"
      onClick={() => onClick(item)}
    >
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground">{item.number || `CE-${item.id}`}</p>
          <h3 className="font-medium">{item.title || "Untitled Change Event"}</h3>
        </div>
        <StatusBadge status={statusLabel(item.status)} />
      </div>
      <p className="text-sm text-muted-foreground">{scopeLabel(item.scope)} · {typeLabel(item.type)}</p>
    </button>
  );
}

export function renderChangeEventList(
  item: ChangeEvent,
  onClick: (item: ChangeEvent) => void,
): ReactElement {
  return (
    <button
      type="button"
      className="flex w-full cursor-pointer items-center justify-between rounded-md px-4 py-2 text-left transition-colors hover:bg-muted/50"
      onClick={() => onClick(item)}
    >
      <div>
        <p className="text-sm font-medium">{item.number || `CE-${item.id}`}</p>
        <p className="text-xs text-muted-foreground">{item.title || "Untitled Change Event"}</p>
      </div>
      <StatusBadge status={statusLabel(item.status)} />
    </button>
  );
}

export { formatMoney };
