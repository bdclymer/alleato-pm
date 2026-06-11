"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Layers,
  MoreHorizontal,
  PanelRightOpen,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { StatusBadge, type StatusVariant } from "@/components/ds";
import {
  UnifiedTablePage,
  useUnifiedTableState,
  type ColumnConfig,
  type FilterConfig,
  type FilterValue,
  type TableColumn,
} from "@/components/tables/unified";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-client";
import {
  PAGE_ACCESS_LEVEL_LABELS,
  PAGE_ACCESS_LEVELS,
  PAGE_ACCESS_MODULE_LABELS,
  PAGE_ACCESS_MODULES,
  accessLevelRequiresModule,
  inferPageAccessDefaults,
  normalizePageAccessInput,
  type PageAccessLevel,
  type PageAccessPolicy,
  type PageAccessPolicyInput,
} from "@/lib/page-access";
import type { PermissionModule } from "@/lib/permissions-shared";
import { appToast as toast } from "@/lib/toast/app-toast";
import { cn } from "@/lib/utils";
import { reportNonCriticalFailure } from "@/lib/report-non-critical-failure";

export type InventoryCategory =
  | "Project Management"
  | "Financials"
  | "Documents"
  | "Team / Directory"
  | "Admin"
  | "AI Intelligence"
  | "Testing / QA"
  | "System";

export type InventoryType =
  | "Project Page"
  | "Admin Page"
  | "Report"
  | "AI / Intelligence"
  | "Workflow"
  | "Settings"
  | "Database / Table"
  | "Utility";

export type InventoryStatus =
  | "Active"
  | "Needs Review"
  | "Missing Nav"
  | "Internal Only"
  | "Deprecated"
  | "Broken"
  | "Planned";

export type InventoryRoute = {
  route: string;
  page: string;
  category: InventoryCategory;
  type: InventoryType;
  status: InventoryStatus;
  notes: string;
  lastReviewed: string;
  dynamic: boolean;
  kind: string;
  refCount: number;
  file: string;
  refSample: string;
  accessLevel: PageAccessLevel;
  permissionModule: PermissionModule | null;
  accessUpdatedAt: string | null;
  accessIsExplicit: boolean;
  _group?: string;
  _groupCount?: number;
};

type InventoryOverlay = Partial<Pick<InventoryRoute, "category" | "type" | "status" | "notes" | "lastReviewed">> & {
  updatedAt?: string;
};

type GroupBy = "none" | "category" | "type" | "status";
type SitemapTab = "all" | "project-pages" | "admin-pages" | "table-pages" | "needs-review";

const OVERLAY_STORAGE_KEY = "sitemap-inventory-overrides";

const CATEGORIES: InventoryCategory[] = [
  "Project Management",
  "Financials",
  "Documents",
  "Team / Directory",
  "Admin",
  "AI Intelligence",
  "Testing / QA",
  "System",
];

const TYPES: InventoryType[] = [
  "Project Page",
  "Admin Page",
  "Report",
  "AI / Intelligence",
  "Workflow",
  "Settings",
  "Database / Table",
  "Utility",
];

const STATUSES: InventoryStatus[] = [
  "Active",
  "Needs Review",
  "Missing Nav",
  "Internal Only",
  "Deprecated",
  "Broken",
  "Planned",
];

const STATUS_VARIANT: Record<InventoryStatus, StatusVariant> = {
  Active: "success",
  "Needs Review": "warning",
  "Missing Nav": "warning",
  "Internal Only": "info",
  Deprecated: "neutral",
  Broken: "error",
  Planned: "info",
};

const TYPE_VARIANT: Record<InventoryType, StatusVariant> = {
  "Project Page": "success",
  "Admin Page": "error",
  Report: "info",
  "AI / Intelligence": "info",
  Workflow: "warning",
  Settings: "neutral",
  "Database / Table": "neutral",
  Utility: "neutral",
};

const GROUP_BY_LABELS: Record<GroupBy, string> = {
  none: "None",
  category: "Category",
  type: "Type",
  status: "Status",
};

const TAB_LABELS: Record<SitemapTab, string> = {
  all: "All",
  "project-pages": "Project Pages",
  "admin-pages": "Admin Pages",
  "table-pages": "Table Pages",
  "needs-review": "Needs Review",
};

const columns: ColumnConfig[] = [
  { id: "page", label: "Page", alwaysVisible: true },
  { id: "route", label: "Route", defaultVisible: true },
  { id: "category", label: "Category", defaultVisible: true },
  { id: "type", label: "Type", defaultVisible: true },
  { id: "accessLevel", label: "Access", defaultVisible: true },
  { id: "permissionModule", label: "Module", defaultVisible: true },
  { id: "dynamic", label: "Dynamic", defaultVisible: false },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "notes", label: "Notes", defaultVisible: true },
  { id: "lastReviewed", label: "Last Reviewed", defaultVisible: true },
  { id: "refCount", label: "Refs", defaultVisible: false },
  { id: "actions", label: "Actions", alwaysVisible: true },
];

const defaultVisibleColumns = columns
  .filter((column) => column.defaultVisible !== false)
  .map((column) => column.id);

function parseTab(value: string | null): SitemapTab {
  if (
    value === "project-pages" ||
    value === "admin-pages" ||
    value === "table-pages" ||
    value === "needs-review"
  ) {
    return value;
  }
  return "all";
}

function deriveParent(route: string): string {
  const parts = route.split("/").filter(Boolean);
  if (parts.length <= 1) return "/";
  return `/${parts.slice(0, -1).join("/")}`;
}

function isDynamicRoute(route: string): boolean {
  return route.includes("[");
}

function formatDateTime(value: string | undefined): string {
  if (!value) return "Not reviewed";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not reviewed";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function nowIso(): string {
  return new Date().toISOString();
}

function loadOverlay(): Record<string, InventoryOverlay> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(OVERLAY_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, InventoryOverlay>) : {};
  } catch (error) {
    reportNonCriticalFailure({
      area: "site-map",
      operation: "load-inventory-overrides",
      error,
      userVisibleFallback: "Sitemap inventory edits could not be restored.",
    });
    return {};
  }
}

function saveOverlay(overlay: Record<string, InventoryOverlay>) {
  try {
    localStorage.setItem(OVERLAY_STORAGE_KEY, JSON.stringify(overlay));
  } catch (error) {
    reportNonCriticalFailure({
      area: "site-map",
      operation: "save-inventory-overrides",
      error,
      userVisibleFallback: "Sitemap inventory edit was not saved locally.",
    });
  }
}

function applyOverlay(routes: InventoryRoute[], overlay: Record<string, InventoryOverlay>): InventoryRoute[] {
  return routes.map((route) => ({ ...route, ...overlay[route.route] }));
}

function applyPageAccessPolicies(
  routes: InventoryRoute[],
  policies: PageAccessPolicy[],
): InventoryRoute[] {
  const policyByRoute = new Map(policies.map((policy) => [policy.route, policy]));

  return routes.map((route) => {
    const policy = policyByRoute.get(route.route);
    const inferred = inferPageAccessDefaults({
      route: route.route,
      file: route.file,
      category: route.category,
    });

    return {
      ...route,
      accessLevel: policy?.accessLevel ?? inferred.accessLevel,
      permissionModule: policy?.permissionModule ?? inferred.permissionModule,
      accessUpdatedAt: policy?.updatedAt ?? null,
      accessIsExplicit: Boolean(policy),
    };
  });
}

async function fetchPageAccessPolicies(): Promise<PageAccessPolicy[]> {
  const { data } = await apiFetch<{ data: PageAccessPolicy[] }>("/api/permissions/page-access");
  return data;
}

function defaultModuleForRoute(route: InventoryRoute): PermissionModule {
  return route.permissionModule ?? inferPageAccessDefaults(route).permissionModule ?? "directory";
}

function buildTabHref(pathname: string, searchParams: URLSearchParams, tab: SitemapTab): string {
  const nextParams = new URLSearchParams(searchParams.toString());
  if (tab === "all") nextParams.delete("tab");
  else nextParams.set("tab", tab);
  nextParams.set("page", "1");
  const query = nextParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function matchesTab(route: InventoryRoute, tab: SitemapTab): boolean {
  if (tab === "project-pages") return route.type === "Project Page" || route.route.includes("[projectId]");
  if (tab === "admin-pages") return route.type === "Admin Page" || route.category === "Admin";
  if (tab === "table-pages") return route.type === "Database / Table" || route.file.includes("/(tables)/");
  if (tab === "needs-review") return route.status === "Needs Review" || route.status === "Broken" || route.status === "Missing Nav";
  return true;
}

function getGroupKey(route: InventoryRoute, groupBy: GroupBy): string {
  if (groupBy === "category") return route.category;
  if (groupBy === "type") return route.type;
  if (groupBy === "status") return route.status;
  return "";
}

function buildGroupedItems(routes: InventoryRoute[], groupBy: GroupBy, collapsedGroups: Set<string>): InventoryRoute[] {
  if (groupBy === "none") return routes;

  const grouped = new Map<string, InventoryRoute[]>();
  for (const route of routes) {
    const groupKey = getGroupKey(route, groupBy);
    grouped.set(groupKey, [...(grouped.get(groupKey) ?? []), route]);
  }

  const items: InventoryRoute[] = [];
  for (const [group, groupRoutes] of grouped) {
    items.push({
      route: `__group__${group}`,
      page: group,
      category: "System",
      type: "Utility",
      status: "Needs Review",
      notes: "",
      lastReviewed: "",
      dynamic: false,
      kind: "group",
      refCount: groupRoutes.length,
      file: "",
      refSample: "",
      accessLevel: "signed_in",
      permissionModule: null,
      accessUpdatedAt: null,
      accessIsExplicit: false,
      _group: group,
      _groupCount: groupRoutes.length,
    });

    if (!collapsedGroups.has(group)) items.push(...groupRoutes);
  }

  return items;
}

function applyFilters(
  routes: InventoryRoute[],
  search: string,
  filters: Record<string, FilterValue>,
): InventoryRoute[] {
  let filtered = routes;

  if (search) {
    const query = search.toLowerCase();
    filtered = filtered.filter(
      (route) =>
        route.page.toLowerCase().includes(query) ||
        route.route.toLowerCase().includes(query) ||
        route.category.toLowerCase().includes(query) ||
        route.type.toLowerCase().includes(query) ||
        route.status.toLowerCase().includes(query) ||
        route.notes.toLowerCase().includes(query) ||
        route.file.toLowerCase().includes(query),
    );
  }

  if (filters.category) filtered = filtered.filter((route) => route.category === filters.category);
  if (filters.type) filtered = filtered.filter((route) => route.type === filters.type);
  if (filters.status) filtered = filtered.filter((route) => route.status === filters.status);
  if (filters.dynamic) filtered = filtered.filter((route) => route.dynamic === (filters.dynamic === "true"));

  return filtered;
}

function sortRoutes(routes: InventoryRoute[], sortBy: string, direction: "asc" | "desc"): InventoryRoute[] {
  const sorted = [...routes].sort((left, right) => {
    if (sortBy === "parent") return deriveParent(left.route).localeCompare(deriveParent(right.route));
    const leftValue = left[sortBy as keyof InventoryRoute];
    const rightValue = right[sortBy as keyof InventoryRoute];
    if (typeof leftValue === "number" && typeof rightValue === "number") return leftValue - rightValue;
    return String(leftValue ?? "").localeCompare(String(rightValue ?? ""));
  });
  return direction === "desc" ? sorted.reverse() : sorted;
}

function fieldSelect<TValue extends string>({
  value,
  options,
  onChange,
  variant,
}: {
  value: TValue;
  options: TValue[];
  onChange: (value: TValue) => void;
  variant?: Record<TValue, StatusVariant>;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as TValue)}>
      <SelectTrigger
        className="h-8 min-w-36 border-0 bg-transparent px-0 shadow-none focus:ring-0 focus:ring-offset-0"
        onClick={(event) => event.stopPropagation()}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {variant ? <StatusBadge status={option} variant={variant[option]} /> : option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function pageAccessSelect({
  value,
  onChange,
}: {
  value: PageAccessLevel;
  onChange: (value: PageAccessLevel) => void;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as PageAccessLevel)}>
      <SelectTrigger
        className="h-8 min-w-36 border-0 bg-transparent px-0 shadow-none focus:ring-0 focus:ring-offset-0"
        onClick={(event) => event.stopPropagation()}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PAGE_ACCESS_LEVELS.map((option) => (
          <SelectItem key={option} value={option}>
            {PAGE_ACCESS_LEVEL_LABELS[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function pageModuleSelect({
  value,
  disabled,
  onChange,
}: {
  value: PermissionModule | null;
  disabled: boolean;
  onChange: (value: PermissionModule) => void;
}) {
  if (disabled) {
    return <span className="text-xs text-muted-foreground">Not required</span>;
  }

  return (
    <Select value={value ?? "directory"} onValueChange={(next) => onChange(next as PermissionModule)}>
      <SelectTrigger
        className="h-8 min-w-36 border-0 bg-transparent px-0 shadow-none focus:ring-0 focus:ring-offset-0"
        onClick={(event) => event.stopPropagation()}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PAGE_ACCESS_MODULES.map((option) => (
          <SelectItem key={option} value={option}>
            {PAGE_ACCESS_MODULE_LABELS[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function buildColumns({
  overlay,
  selectedRouteId,
  collapsedGroups,
  onFieldChange,
  onAccessChange,
  onModuleChange,
  onToggleGroup,
  onOpenDetails,
  onMarkReviewed,
}: {
  overlay: Record<string, InventoryOverlay>;
  selectedRouteId: string | null;
  collapsedGroups: Set<string>;
  onFieldChange: <TKey extends keyof InventoryOverlay>(route: string, key: TKey, value: InventoryOverlay[TKey]) => void;
  onAccessChange: (route: InventoryRoute, accessLevel: PageAccessLevel) => void;
  onModuleChange: (route: InventoryRoute, permissionModule: PermissionModule) => void;
  onToggleGroup: (group: string) => void;
  onOpenDetails: (route: string) => void;
  onMarkReviewed: (route: string) => void;
}): TableColumn<InventoryRoute>[] {
  return [
    {
      ...columns[0],
      width: 220,
      render: (item) => {
        if (item._group) {
          const collapsed = collapsedGroups.has(item._group);
          return (
            <Button
              variant="ghost"
              className="h-auto w-full justify-start gap-2 p-0 text-left"
              onClick={(event) => {
                event.stopPropagation();
                onToggleGroup(item._group!);
              }}
            >
              {collapsed ? (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="text-sm font-semibold">{item._group}</span>
              <Badge variant="secondary" className="font-normal">
                {item._groupCount}
              </Badge>
            </Button>
          );
        }

        return (
          <span className="block min-w-0 truncate pl-5 text-sm font-medium text-foreground">
            {item.page}
          </span>
        );
      },
      csvValue: (item) => item.page,
      sortValue: (item) => item.page,
      sortable: true,
    },
    {
      ...columns[1],
      width: 300,
      render: (item) =>
        item._group ? null : (
          <code className="block max-w-80 truncate text-xs text-muted-foreground">
            {item.route}
          </code>
        ),
      csvValue: (item) => item.route,
      sortValue: (item) => item.route,
      sortable: true,
    },
    {
      ...columns[2],
      render: (item) =>
        item._group
          ? null
          : fieldSelect({
              value: item.category,
              options: CATEGORIES,
              onChange: (value) => onFieldChange(item.route, "category", value),
            }),
      csvValue: (item) => item.category,
      sortValue: (item) => item.category,
      sortable: true,
    },
    {
      ...columns[3],
      render: (item) =>
        item._group
          ? null
          : fieldSelect({
              value: item.type,
              options: TYPES,
              onChange: (value) => onFieldChange(item.route, "type", value),
              variant: TYPE_VARIANT,
            }),
      csvValue: (item) => item.type,
      sortValue: (item) => item.type,
      sortable: true,
    },
    {
      ...columns[4],
      render: (item) =>
        item._group
          ? null
          : pageAccessSelect({
              value: item.accessLevel,
              onChange: (value) => onAccessChange(item, value),
            }),
      csvValue: (item) => PAGE_ACCESS_LEVEL_LABELS[item.accessLevel],
      sortValue: (item) => item.accessLevel,
      sortable: true,
    },
    {
      ...columns[5],
      render: (item) =>
        item._group
          ? null
          : pageModuleSelect({
              value: item.permissionModule,
              disabled: !accessLevelRequiresModule(item.accessLevel),
              onChange: (value) => onModuleChange(item, value),
            }),
      csvValue: (item) => item.permissionModule ? PAGE_ACCESS_MODULE_LABELS[item.permissionModule] : "",
      sortValue: (item) => item.permissionModule ?? "",
      sortable: true,
    },
    {
      ...columns[6],
      render: (item) =>
        item._group ? null : (
          <span className="text-xs text-muted-foreground">
            {isDynamicRoute(item.route) ? "Yes" : "No"}
          </span>
        ),
      csvValue: (item) => (isDynamicRoute(item.route) ? "Yes" : "No"),
      sortValue: (item) => (isDynamicRoute(item.route) ? "Yes" : "No"),
      sortable: true,
    },
    {
      ...columns[7],
      render: (item) =>
        item._group
          ? null
          : fieldSelect({
              value: item.status,
              options: STATUSES,
              onChange: (value) => onFieldChange(item.route, "status", value),
              variant: STATUS_VARIANT,
            }),
      csvValue: (item) => item.status,
      sortValue: (item) => item.status,
      sortable: true,
    },
    {
      ...columns[8],
      width: 280,
      render: (item) => {
        if (item._group) return null;
        const note = overlay[item.route]?.notes ?? item.notes;
        return (
          <Button
            type="button"
            variant="ghost"
            data-row-interactive="true"
            className={cn(
              "h-auto max-w-72 justify-start truncate p-0 text-left text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground",
              selectedRouteId === item.route && "text-foreground",
            )}
            onClick={(event) => {
              event.stopPropagation();
              onOpenDetails(item.route);
            }}
          >
            {note || "Open details to add notes"}
          </Button>
        );
      },
      csvValue: (item) => overlay[item.route]?.notes ?? item.notes,
      sortable: false,
    },
    {
      ...columns[9],
      render: (item) =>
        item._group ? null : (
          <span className="text-xs text-muted-foreground">
            {formatDateTime(item.lastReviewed)}
          </span>
        ),
      csvValue: (item) => item.lastReviewed,
      sortValue: (item) => item.lastReviewed,
      sortable: true,
    },
    {
      ...columns[10],
      align: "right",
      render: (item) => (item._group ? null : <span className="text-xs text-muted-foreground">{item.refCount}</span>),
      csvValue: (item) => String(item.refCount),
      sortValue: (item) => item.refCount,
      sortable: true,
    },
    {
      ...columns[11],
      render: (item) => {
        if (item._group) return null;
        const canOpen = !isDynamicRoute(item.route);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onOpenDetails(item.route)}>
                <PanelRightOpen className="mr-2 h-4 w-4" />
                Review details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMarkReviewed(item.route)}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Mark reviewed
              </DropdownMenuItem>
              {canOpen ? (
                <DropdownMenuItem asChild>
                  <Link href={item.route}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open route
                  </Link>
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      csvValue: (item) => item.route,
      sortable: false,
    },
  ];
}

export default function SiteMapClient({ routes }: { routes: InventoryRoute[] }) {
  const queryClient = useQueryClient();
  const rawSearchParams = useSearchParams()!;
  const searchParams = rawSearchParams ?? new URLSearchParams();
  const pathname = usePathname()! ?? "";
  const router = useRouter();
  const currentTab = parseTab(searchParams.get("tab"));

  const [overlay, setOverlay] = useState<Record<string, InventoryOverlay>>({});
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setOverlay(loadOverlay());
  }, []);

  useEffect(() => {
    if (!savedAt) return;
    const timeout = window.setTimeout(() => setSavedAt(null), 1200);
    return () => window.clearTimeout(timeout);
  }, [savedAt]);

  const pageAccessQuery = useQuery({
    queryKey: ["page-access-policies"],
    queryFn: fetchPageAccessPolicies,
  });

  const pageAccessMutation = useMutation({
    mutationFn: async (policies: PageAccessPolicyInput[]) => {
      const normalizedPolicies = policies.map(normalizePageAccessInput);
      const { data } = await apiFetch<{ data: PageAccessPolicy[] }>("/api/permissions/page-access", {
        method: "PUT",
        body: JSON.stringify({ policies: normalizedPolicies }),
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-access-policies"] });
      toast.success("Page access saved");
    },
    onError: (error) => {
      reportNonCriticalFailure({
        area: "site-map",
        operation: "save-page-access-policy",
        error,
        userVisibleFallback: "Page access was not saved.",
      });
      toast.error("Page access was not saved. Try refreshing the page.");
    },
  });

  const routesWithAccess = useMemo(
    () => applyPageAccessPolicies(routes, pageAccessQuery.data ?? []),
    [pageAccessQuery.data, routes],
  );

  const mergedRoutes = useMemo(() => applyOverlay(routesWithAccess, overlay), [routesWithAccess, overlay]);

  const tableState = useUnifiedTableState({
    entityKey: "sitemap-inventory",
    searchParams: rawSearchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table"],
      page: 1,
      perPage: 50,
      search: "",
      sortBy: "category",
      sortDirection: "asc",
      visibleColumns: defaultVisibleColumns,
      filters: {},
    },
  });

  const persistOverlay = useCallback((updater: (previous: Record<string, InventoryOverlay>) => Record<string, InventoryOverlay>) => {
    setOverlay((previous) => {
      const next = updater(previous);
      saveOverlay(next);
      setSavedAt(nowIso());
      return next;
    });
  }, []);

  const handleFieldChange = useCallback(
    <TKey extends keyof InventoryOverlay>(route: string, key: TKey, value: InventoryOverlay[TKey]) => {
      persistOverlay((previous) => ({
        ...previous,
        [route]: {
          ...previous[route],
          [key]: value,
          updatedAt: nowIso(),
        },
      }));
    },
    [persistOverlay],
  );

  const handleMarkReviewed = useCallback(
    (route: string) => {
      persistOverlay((previous) => ({
        ...previous,
        [route]: {
          ...previous[route],
          status: "Active",
          lastReviewed: nowIso(),
          updatedAt: nowIso(),
        },
      }));
    },
    [persistOverlay],
  );

  const handleBulkFieldChange = useCallback(
    <TKey extends keyof InventoryOverlay>(key: TKey, value: InventoryOverlay[TKey]) => {
      if (selectedIds.length === 0) return;
      persistOverlay((previous) => {
        const next = { ...previous };
        for (const route of selectedIds) {
          next[route] = {
            ...next[route],
            [key]: value,
            updatedAt: nowIso(),
          };
        }
        return next;
      });
    },
    [persistOverlay, selectedIds],
  );

  const handleBulkReviewed = useCallback(() => {
    if (selectedIds.length === 0) return;
    const reviewedAt = nowIso();
    persistOverlay((previous) => {
      const next = { ...previous };
      for (const route of selectedIds) {
        next[route] = {
          ...next[route],
          status: "Active",
          lastReviewed: reviewedAt,
          updatedAt: reviewedAt,
        };
      }
      return next;
    });
  }, [persistOverlay, selectedIds]);

  const handleAccessChange = useCallback(
    (route: InventoryRoute, accessLevel: PageAccessLevel) => {
      pageAccessMutation.mutate([
        {
          route: route.route,
          accessLevel,
          permissionModule: accessLevelRequiresModule(accessLevel)
            ? defaultModuleForRoute(route)
            : null,
        },
      ]);
    },
    [pageAccessMutation],
  );

  const handleModuleChange = useCallback(
    (route: InventoryRoute, permissionModule: PermissionModule) => {
      pageAccessMutation.mutate([
        {
          route: route.route,
          accessLevel: route.accessLevel,
          permissionModule,
        },
      ]);
    },
    [pageAccessMutation],
  );

  const handleBulkAccessChange = useCallback(
    (accessLevel: PageAccessLevel) => {
      const selectedRoutes = mergedRoutes.filter((route) => selectedIds.includes(route.route));
      if (selectedRoutes.length === 0) return;

      pageAccessMutation.mutate(
        selectedRoutes.map((route) => ({
          route: route.route,
          accessLevel,
          permissionModule: accessLevelRequiresModule(accessLevel)
            ? defaultModuleForRoute(route)
            : null,
        })),
      );
    },
    [mergedRoutes, pageAccessMutation, selectedIds],
  );

  const handleBulkModuleChange = useCallback(
    (permissionModule: PermissionModule) => {
      const selectedRoutes = mergedRoutes.filter((route) => selectedIds.includes(route.route));
      const moduleRoutes = selectedRoutes.filter((route) => accessLevelRequiresModule(route.accessLevel));
      if (moduleRoutes.length === 0) return;

      pageAccessMutation.mutate(
        moduleRoutes.map((route) => ({
          route: route.route,
          accessLevel: route.accessLevel,
          permissionModule,
        })),
      );
    },
    [mergedRoutes, pageAccessMutation, selectedIds],
  );

  const handleToggleGroup = useCallback((group: string) => {
    setCollapsedGroups((previous) => {
      const next = new Set(previous);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }, []);

  const tabbedRoutes = useMemo(
    () => mergedRoutes.filter((route) => matchesTab(route, currentTab)),
    [currentTab, mergedRoutes],
  );

  const filters = useMemo<FilterConfig[]>(() => [
    {
      id: "category",
      label: "Category",
      type: "select",
      options: CATEGORIES.map((category) => ({ value: category, label: category })),
    },
    {
      id: "type",
      label: "Type",
      type: "select",
      options: TYPES.map((type) => ({ value: type, label: type })),
    },
    {
      id: "status",
      label: "Status",
      type: "select",
      options: STATUSES.map((status) => ({ value: status, label: status })),
    },
    {
      id: "dynamic",
      label: "Dynamic",
      type: "select",
      options: [
        { value: "true", label: "Dynamic" },
        { value: "false", label: "Static" },
      ],
    },
  ], []);

  const activeFilters = useMemo(() => {
    const next: Record<string, FilterValue> = {};
    if (tableState.activeFilters?.category) next.category = tableState.activeFilters.category;
    if (tableState.activeFilters?.type) next.type = tableState.activeFilters.type;
    if (tableState.activeFilters?.status) next.status = tableState.activeFilters.status;
    if (tableState.activeFilters?.dynamic) next.dynamic = tableState.activeFilters.dynamic;
    return next;
  }, [tableState.activeFilters]);

  useEffect(() => {
    setCollapsedGroups(new Set());
    setSelectedIds([]);
    tableState.setActiveFilters({});
    tableState.setPage(1);
  }, [currentTab, tableState.setActiveFilters, tableState.setPage]);

  const filteredRoutes = useMemo(
    () => applyFilters(tabbedRoutes, tableState.debouncedSearch ?? "", activeFilters),
    [activeFilters, tabbedRoutes, tableState.debouncedSearch],
  );

  const sortedRoutes = useMemo(
    () =>
      groupBy === "none"
        ? sortRoutes(filteredRoutes, tableState.sortBy ?? "category", tableState.sortDirection)
        : sortRoutes(filteredRoutes, groupBy, "asc"),
    [filteredRoutes, groupBy, tableState.sortBy, tableState.sortDirection],
  );

  const groupedItems = useMemo(
    () => buildGroupedItems(sortedRoutes, groupBy, collapsedGroups),
    [collapsedGroups, groupBy, sortedRoutes],
  );

  const itemsForTable = useMemo(() => {
    if (groupBy !== "none") return groupedItems;
    const start = (tableState.page - 1) * tableState.perPage;
    return sortedRoutes.slice(start, start + tableState.perPage);
  }, [groupBy, groupedItems, sortedRoutes, tableState.page, tableState.perPage]);

  const activeRoute = useMemo(
    () => mergedRoutes.find((route) => route.route === activeRouteId) ?? null,
    [activeRouteId, mergedRoutes],
  );

  const tableColumns = useMemo(
    () =>
      buildColumns({
        overlay,
        selectedRouteId: activeRouteId,
        collapsedGroups,
        onFieldChange: handleFieldChange,
        onAccessChange: handleAccessChange,
        onModuleChange: handleModuleChange,
        onToggleGroup: handleToggleGroup,
        onOpenDetails: setActiveRouteId,
        onMarkReviewed: handleMarkReviewed,
      }),
    [
      activeRouteId,
      collapsedGroups,
      handleAccessChange,
      handleFieldChange,
      handleMarkReviewed,
      handleModuleChange,
      handleToggleGroup,
      overlay,
    ],
  );

  const totalPages = Math.max(1, Math.ceil(sortedRoutes.length / tableState.perPage));
  const isFiltered = Boolean(tableState.debouncedSearch) || Object.keys(activeFilters).length > 0;

  const tabs = useMemo(
    () =>
      (Object.keys(TAB_LABELS) as SitemapTab[]).map((tab) => ({
        label: TAB_LABELS[tab],
        href: buildTabHref(pathname, new URLSearchParams(searchParams.toString()), tab),
        count: mergedRoutes.filter((route) => matchesTab(route, tab)).length,
        isActive: currentTab === tab,
      })),
    [currentTab, mergedRoutes, pathname, searchParams],
  );

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const groupByControl = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={groupBy !== "none" ? "secondary" : "ghost"} size="sm" className="h-8 gap-1.5 text-xs">
          <Layers className="h-3.5 w-3.5" />
          {groupBy !== "none" ? `Grouped by ${GROUP_BY_LABELS[groupBy]}` : "Group by"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Group rows by</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={groupBy}
          onValueChange={(value) => {
            setGroupBy(value as GroupBy);
            setCollapsedGroups(new Set());
            setSelectedIds([]);
          }}
        >
          {Object.entries(GROUP_BY_LABELS).map(([value, label]) => (
            <DropdownMenuRadioItem key={value} value={value} className="text-sm">
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const bulkToolbar =
    selectedIds.length > 0 ? (
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <span className="text-xs font-medium text-foreground">{selectedIds.length} selected</span>
        <Select key={`access-${selectedIds.length}`} onValueChange={(value) => handleBulkAccessChange(value as PageAccessLevel)}>
          <SelectTrigger className="h-8 w-40 bg-background text-xs">
            <SelectValue placeholder="Set access" />
          </SelectTrigger>
          <SelectContent>
            {PAGE_ACCESS_LEVELS.map((level) => (
              <SelectItem key={level} value={level}>{PAGE_ACCESS_LEVEL_LABELS[level]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select key={`module-${selectedIds.length}`} onValueChange={(value) => handleBulkModuleChange(value as PermissionModule)}>
          <SelectTrigger className="h-8 w-40 bg-background text-xs">
            <SelectValue placeholder="Set module" />
          </SelectTrigger>
          <SelectContent>
            {PAGE_ACCESS_MODULES.map((module) => (
              <SelectItem key={module} value={module}>{PAGE_ACCESS_MODULE_LABELS[module]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select key={`category-${selectedIds.length}`} onValueChange={(value) => handleBulkFieldChange("category", value as InventoryCategory)}>
          <SelectTrigger className="h-8 w-40 bg-background text-xs">
            <SelectValue placeholder="Set category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select key={`type-${selectedIds.length}`} onValueChange={(value) => handleBulkFieldChange("type", value as InventoryType)}>
          <SelectTrigger className="h-8 w-40 bg-background text-xs">
            <SelectValue placeholder="Set type" />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select key={`status-${selectedIds.length}`} onValueChange={(value) => handleBulkFieldChange("status", value as InventoryStatus)}>
          <SelectTrigger className="h-8 w-40 bg-background text-xs">
            <SelectValue placeholder="Set status" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                <StatusBadge status={status} variant={STATUS_VARIANT[status]} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleBulkReviewed}>
          <CheckCircle2 className="h-3.5 w-3.5" />
          Mark reviewed
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSelectedIds([])}>
          Clear
        </Button>
      </div>
    ) : null;

  return (
    <UnifiedTablePage<InventoryRoute>
      header={{
        title: "Page Access",
        description: `${filteredRoutes.length} of ${tabbedRoutes.length} generated pages shown`,
        actions: (
          <div className="flex items-center gap-2">
            {savedAt ? <span className="text-xs text-muted-foreground">Saved</span> : null}
            {pageAccessMutation.isPending ? <span className="text-xs text-muted-foreground">Saving access</span> : null}
            <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 text-xs">
              <Link href="/sitemap.xml" target="_blank" rel="noreferrer">
                XML Sitemap
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
            {groupByControl}
          </div>
        ),
      }}
      tabs={tabs}
      topContent={bulkToolbar}
      layout={{ fullBleedTable: false }}
      toolbar={{
        totalItems: tabbedRoutes.length,
        filteredItems: filteredRoutes.length,
        selectedCount: selectedIds.length,
        searchValue: tableState.searchInput,
        onSearchChange: tableState.setSearchInput,
        searchPlaceholder: "Search route, page, file, notes...",
        currentView: tableState.currentView,
        onViewChange: tableState.setCurrentView,
        filters,
        activeFilters,
        onFilterChange: (nextFilters) => {
          tableState.setActiveFilters(nextFilters);
          tableState.setPage(1);
        },
        onClearFilters: () => tableState.setActiveFilters({}),
        columns,
        visibleColumns: tableState.visibleColumns,
        onColumnVisibilityChange: tableState.setVisibleColumns,
      }}
      data={{
        items: itemsForTable,
        isLoading: pageAccessQuery.isLoading,
        isFetching: pageAccessQuery.isFetching,
        error: pageAccessQuery.error instanceof Error ? pageAccessQuery.error : null,
      }}
      table={{
        columns: tableColumns,
        getRowId: (item) => item.route,
        activeRowId: activeRouteId,
        density: "compact",
        onRowClick: (item) => {
          if (item._group) {
            handleToggleGroup(item._group);
            return;
          }
          setActiveRouteId(item.route);
        },
      }}
      sorting={
        groupBy === "none"
          ? {
              sortBy: tableState.sortBy,
              sortDirection: tableState.sortDirection,
              onSortChange: (sortBy, direction) => {
                tableState.setSortBy(sortBy);
                tableState.setSortDirection(direction);
                tableState.setPage(1);
              },
            }
          : undefined
      }
      selection={{
        selectedIds,
        onSelectAll: (checked) => {
          setSelectedIds(checked ? itemsForTable.filter((item) => !item._group).map((item) => item.route) : []);
        },
        onSelectRow: (id, checked) => {
          if (checked) {
            if (selectedSet.has(id)) return;
            setSelectedIds((previous) => [...previous, id]);
            return;
          }
          setSelectedIds((previous) => previous.filter((route) => route !== id));
        },
      }}
      sidePanel={
        activeRoute
          ? {
              storageKey: "sitemap-inventory-details",
              content: (
                <div className="space-y-6 p-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-foreground">{activeRoute.page}</h2>
                      <StatusBadge status={activeRoute.status} variant={STATUS_VARIANT[activeRoute.status]} />
                    </div>
                    <code className="block break-all text-xs text-muted-foreground">{activeRoute.route}</code>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Access</p>
                      <p className="font-medium">{PAGE_ACCESS_LEVEL_LABELS[activeRoute.accessLevel]}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Access source</p>
                      <p className="font-medium">{activeRoute.accessIsExplicit ? "Explicit" : "Inferred"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Category</p>
                      <p className="font-medium">{activeRoute.category}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="font-medium">{activeRoute.type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Last reviewed</p>
                      <p className="font-medium">{formatDateTime(activeRoute.lastReviewed)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">References</p>
                      <p className="font-medium">{activeRoute.refCount}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">Page Access</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        value={activeRoute.accessLevel}
                        onValueChange={(value) => handleAccessChange(activeRoute, value as PageAccessLevel)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAGE_ACCESS_LEVELS.map((level) => (
                            <SelectItem key={level} value={level}>
                              {PAGE_ACCESS_LEVEL_LABELS[level]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={activeRoute.permissionModule ?? "directory"}
                        disabled={!accessLevelRequiresModule(activeRoute.accessLevel)}
                        onValueChange={(value) => handleModuleChange(activeRoute, value as PermissionModule)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAGE_ACCESS_MODULES.map((module) => (
                            <SelectItem key={module} value={module}>
                              {PAGE_ACCESS_MODULE_LABELS[module]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="sitemap-notes">
                      Notes
                    </label>
                    <Textarea
                      id="sitemap-notes"
                      value={activeRoute.notes}
                      placeholder="Add review notes, cleanup decisions, or nav gaps."
                      className="min-h-40 resize-y"
                      onChange={(event) => handleFieldChange(activeRoute.route, "notes", event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Source</p>
                    <div className="space-y-1 rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                      <p className="break-all">{activeRoute.file}</p>
                      {activeRoute.refSample ? <p className="break-all">Refs: {activeRoute.refSample}</p> : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" className="gap-1.5" onClick={() => handleMarkReviewed(activeRoute.route)}>
                      <CheckCircle2 className="h-4 w-4" />
                      Mark reviewed
                    </Button>
                    {!isDynamicRoute(activeRoute.route) ? (
                      <Button variant="outline" size="sm" asChild className="gap-1.5">
                        <Link href={activeRoute.route}>
                          Open route
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ),
              onClose: () => setActiveRouteId(null),
            }
          : undefined
      }
      emptyState={{
        title: "No routes found",
        description: "The generated route inventory did not return any routes.",
        filteredDescription: "Try clearing search or filters.",
        isFiltered,
      }}
      pagination={
        groupBy === "none"
          ? {
              page: tableState.page,
              totalPages,
              perPage: tableState.perPage,
              onPageChange: (page) => {
                tableState.setPage(page);
                tableState.setSearchParams({ page: String(page) });
              },
              onPerPageChange: (perPage) => {
                tableState.setPerPage(Number(perPage));
                tableState.setPage(1);
              },
            }
          : undefined
      }
    />
  );
}
