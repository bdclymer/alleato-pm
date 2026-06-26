"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { appToast as toast } from "@/lib/toast/app-toast";
import {
  AlertTriangle,
  Check,
  ChevronsUpDown,
  Eye,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
} from "lucide-react";

import { PermissionTemplateForm } from "./permission-template-form";
import { SectionRuleHeading } from "@/components/layout";
import { ErrorState } from "@/components/ds";
import {
  UnifiedTablePage,
  useUnifiedTableState,
  type TableColumn,
} from "@/components/tables/unified";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MultiSelectField } from "@/components/forms/MultiSelectField";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { ALL_GRANULAR_FLAGS, GRANULAR_FLAG_LABELS } from "@/lib/permissions-shared";
import type {
  GranularFlag,
  PermissionLevel,
  PermissionModule,
  PermissionTemplate,
} from "@/lib/permissions-shared";
import { UserAvatar } from "./_components/user-access-panel";
import {
  fetchTemplates,
  fetchUsers,
  formatProjectCount,
  toAccessSummary,
  type PermissionUsersAccess,
  type TemplateScope,
  type UserAccessSummary,
  type UserLinkDiagnostic,
} from "./_lib/user-access-data";

type PermissionsTab = "app-users" | "project-access" | "project-templates" | "company-templates";
type AccessScope = "all_projects" | "selected_projects";

type ProjectOption = {
  id: number;
  name: string;
  jobNumber: string | null;
};

type EmployeeOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  jobTitle: string | null;
};

const TEMPLATE_MODULES: Array<{ key: PermissionModule; label: string }> = [
  { key: "directory", label: "Directory" },
  { key: "budget", label: "Budget" },
  { key: "contracts", label: "Contracts" },
  { key: "documents", label: "Documents" },
  { key: "schedule", label: "Schedule" },
  { key: "submittals", label: "Submittals" },
  { key: "rfis", label: "RFIs" },
  { key: "change_orders", label: "Change Orders" },
];

const TEMPLATE_LEVELS: Array<{ key: PermissionLevel; label: string }> = [
  { key: "none", label: "None" },
  { key: "read", label: "Read" },
  { key: "write", label: "Write" },
  { key: "admin", label: "Admin" },
];

async function fetchProjects(): Promise<ProjectOption[]> {
  const { data } = await apiFetch<{
    data: Array<{ id: number; name: string | null; "job number"?: string | null }>;
  }>("/api/projects?limit=500");

  return data.map((project) => ({
    id: project.id,
    name: project.name ?? `Project #${project.id}`,
    jobNumber: project["job number"] ?? null,
  }));
}

async function fetchEmployeeOptions(): Promise<EmployeeOption[]> {
  const { data } = await apiFetch<{
    data: Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      job_title: string | null;
    }>;
  }>("/api/people?type=user&status=active&per_page=500");

  return data.map((person) => ({
    id: person.id,
    firstName: person.first_name ?? "",
    lastName: person.last_name ?? "",
    email: person.email ?? null,
    jobTitle: person.job_title ?? null,
  }));
}

function getUserSortValue(user: UserAccessSummary, sortBy: string) {
  switch (sortBy) {
    case "role":
      return user.primaryTemplateName;
    case "email":
      return user.email;
    case "personType":
      return user.personType;
    case "teams":
      return user.teamsAccount?.displayName ?? user.teamsAccount?.platformUserId ?? "";
    case "projects":
      return user.projectCount;
    case "exceptions":
      return user.granularOverrides.length;
    case "name":
    default:
      return user.fullName;
  }
}

function getTemplateSortValue(template: PermissionTemplate, sortBy: string) {
  switch (sortBy) {
    case "description":
      return template.description ?? "";
    case "scope":
      return template.scope ?? "project";
    case "granular":
      return template.granular_flags?.length ?? 0;
    case "name":
    default:
      return template.name;
  }
}

export default function PermissionsAdminPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname()!;
  const searchParams = useSearchParams()!;
  const tabParam = searchParams.get("tab");
  const activeTab: PermissionsTab =
    tabParam === "company-templates"
      ? "company-templates"
      : tabParam === "project-templates"
        ? "project-templates"
        : tabParam === "project-access"
          ? "project-access"
          : "app-users";
  const tableState = useUnifiedTableState({
    entityKey: "permissions-users",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table", "list"],
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "name",
      sortDirection: "asc",
      visibleColumns: ["name", "email", "personType", "role", "teams", "projects", "exceptions"],
      filters: {},
    },
  });
  const [showInvite, setShowInvite] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createScope, setCreateScope] = useState<TemplateScope>("project");
  const [editTarget, setEditTarget] = useState<PermissionTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PermissionTemplate | null>(null);
  const [userDeleteTarget, setUserDeleteTarget] = useState<UserAccessSummary | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const appUsersQuery = useQuery({
    queryKey: ["permission-users", "app"],
    queryFn: () => fetchUsers("app"),
  });
  const projectAccessUsersQuery = useQuery({
    queryKey: ["permission-users", "project"],
    queryFn: () => fetchUsers("project"),
  });
  const lastReconcileKeyRef = useRef<string | null>(null);

  const companyTemplatesQuery = useQuery({
    queryKey: ["permission-templates", "company"],
    queryFn: () => fetchTemplates("company"),
  });

  const projectTemplatesQuery = useQuery({
    queryKey: ["permission-templates", "project"],
    queryFn: () => fetchTemplates("project"),
  });

  const projectsQuery = useQuery({
    queryKey: ["permissions-project-options"],
    queryFn: fetchProjects,
  });
  const employeeOptionsQuery = useQuery({
    queryKey: ["permissions-employee-options"],
    queryFn: fetchEmployeeOptions,
  });

  const userAccess: PermissionUsersAccess =
    activeTab === "project-access" ? "project" : "app";
  const activeUsersQuery =
    userAccess === "project" ? projectAccessUsersQuery : appUsersQuery;
  const linkDiagnostics = activeUsersQuery.data?.diagnostics?.missingAuthLinks ?? [];
  const users = useMemo(
    () => (activeUsersQuery.data?.data ?? []).map(toAccessSummary),
    [activeUsersQuery.data?.data],
  );
  const appUserCount = appUsersQuery.data?.data.length ?? 0;
  const projectAccessUserCount = projectAccessUsersQuery.data?.data.length ?? 0;
  const usersDescription =
    activeTab === "project-access"
      ? "Project-limited users who can access the site because they were added to one or more projects. This is where subcontractors, owner contacts, and other external project contacts belong."
      : "Internal app users who administer the system or have company-wide access across projects.";
  const usersSearchPlaceholder =
    activeTab === "project-access"
      ? "Search project access users..."
      : "Search app users...";
  const usersEmptyTitle =
    activeTab === "project-access" ? "No project access users" : "No app users";
  const usersEmptyDescription =
    activeTab === "project-access"
      ? "Project access is granted from the Project Directory inside each individual project."
      : "Invite an app user to assign company-wide access or admin responsibility.";

  const usersFilteredDescription =
    activeTab === "project-access"
      ? "No project access users match your search."
      : "No app users match your search.";

  const usersAddLabel =
    activeTab === "project-access" ? "Add Project Access" : "Grant App Access";
  const usersTotalCount =
    activeTab === "project-access" ? projectAccessUserCount : appUserCount;
  const canManageUserRows = activeTab === "app-users";
  const accessDialogMode: "app" | "project" =
    activeTab === "project-access" ? "project" : "app";

  const usersTopContent =
    activeTab === "project-access" ? (
      <p className="mt-0 max-w-3xl pb-4 text-sm leading-6 text-muted-foreground">
        Add Project Access assigns an employee to selected projects with a project permission template.
      </p>
    ) : null;

  const filteredUsers = useMemo(() => {
    const search = tableState.debouncedSearch.trim().toLowerCase();

    if (!search) return users;

    return users.filter((user) => {
      const projectNames = user.memberships
        .map((membership) => membership.projectName ?? "")
        .join(" ");
      return [
        user.fullName,
        user.email,
        user.personType,
        user.teamsAccount?.displayName,
        user.teamsAccount?.platformUserId,
        user.primaryTemplateName,
        projectNames,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [tableState.debouncedSearch, users]);

  const sortedUsers = useMemo(() => {
    const direction = tableState.sortDirection === "desc" ? -1 : 1;
    return [...filteredUsers].sort((left, right) => {
      const sortBy = tableState.sortBy ?? "name";
      const leftValue = getUserSortValue(left, sortBy);
      const rightValue = getUserSortValue(right, sortBy);
      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return (leftValue - rightValue) * direction;
      }
      return String(leftValue).localeCompare(String(rightValue)) * direction;
    });
  }, [filteredUsers, tableState.sortBy, tableState.sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / tableState.perPage));
  const pagedUsers = useMemo(() => {
    const start = (tableState.page - 1) * tableState.perPage;
    return sortedUsers.slice(start, start + tableState.perPage);
  }, [sortedUsers, tableState.page, tableState.perPage]);

  const userColumns = useMemo<TableColumn<UserAccessSummary>[]>(
    () => [
      {
        id: "name",
        label: "User",
        defaultVisible: true,
        alwaysVisible: true,
        sortable: true,
        sortValue: (user) => user.fullName,
        render: (user) => (
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar user={user} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{user.fullName}</p>
            </div>
          </div>
        ),
      },
      {
        id: "email",
        label: "Email",
        defaultVisible: true,
        alwaysVisible: true,
        sortable: true,
        sortValue: (user) => user.email,
        render: (user) => (
          <span className="block truncate text-sm text-muted-foreground">
            {user.email || "No email"}
          </span>
        ),
      },
      {
        id: "personType",
        label: "User Type",
        defaultVisible: true,
        sortable: true,
        sortValue: (user) => user.personType,
        render: (user) => (
          <span className="block truncate text-sm text-foreground">
            {user.personType || "Unknown"}
          </span>
        ),
      },
      {
        id: "role",
        label: "Permission Template",
        defaultVisible: true,
        sortable: true,
        sortValue: (user) => user.primaryTemplateName,
        render: (user) => (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-foreground">{user.primaryTemplateName}</span>
            {user.companyTemplateId && !user.isAdmin && (
              <Badge variant="outline" className="border-primary/30 text-primary">
                All projects
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: "teams",
        label: "Teams Account",
        defaultVisible: true,
        sortable: true,
        sortValue: (user) =>
          user.teamsAccount?.displayName ?? user.teamsAccount?.platformUserId ?? "",
        render: (user) => {
          if (!user.teamsAccount) {
            return <span className="text-sm text-muted-foreground">Not linked</span>;
          }

          return (
            <div className="min-w-0">
              <span className="block truncate text-sm text-foreground">
                {user.teamsAccount.displayName || "Linked"}
              </span>
            </div>
          );
        },
      },
      {
        id: "projects",
        label: "Projects",
        defaultVisible: true,
        sortable: true,
        sortValue: (user) => user.projectCount,
        render: (user) => (
          <div className="text-sm text-foreground">
            {formatProjectCount(user.projectCount)}
            {user.missingTemplateCount > 0 && (
              <span className="ml-2 text-destructive">
                {user.missingTemplateCount} missing template
              </span>
            )}
          </div>
        ),
      },
      {
        id: "exceptions",
        label: "Exceptions",
        defaultVisible: true,
        sortable: true,
        sortValue: (user) => user.granularOverrides.length,
        render: (user) => (
          <span className="text-sm text-muted-foreground">
            {user.granularOverrides.length === 0
              ? "None"
              : `${user.granularOverrides.length} active`}
          </span>
        ),
      },
    ],
    [],
  );

  const createMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      description: string;
      rules_json: Record<PermissionModule, PermissionLevel[]>;
      granular_flags?: GranularFlag[];
    }) => {
      await apiFetch("/api/permissions/templates", {
        method: "POST",
        body: JSON.stringify({ ...payload, scope: createScope }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permission-templates"] });
      setShowCreate(false);
      toast.success("Template created");
    },
    onError: (err) => {
      toast.error("Failed to create template");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      scope: TemplateScope;
      name: string;
      description: string;
      rules_json: Record<PermissionModule, PermissionLevel[]>;
      granular_flags?: GranularFlag[];
    }) => {
      await apiFetch(`/api/permissions/templates/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permission-templates"] });
      setEditTarget(null);
      toast.success("Template updated");
    },
    onError: (err) => {
      toast.error("Failed to update template");
    },
  });

  const templateMatrixMutation = useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      scope: TemplateScope;
      name: string;
      description: string;
      rules_json: Record<PermissionModule, PermissionLevel[]>;
      granular_flags?: GranularFlag[];
    }) => {
      await apiFetch(`/api/permissions/templates/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permission-templates"] });
      toast.success("Permission saved");
    },
    onError: (err) => {
      toast.error("Failed to update permission");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id }: { id: string; scope: TemplateScope }) => {
      await apiFetch(`/api/permissions/templates/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permission-templates"] });
      setDeleteTarget(null);
      toast.success("Template deleted");
    },
    onError: (err) => {
      toast.error("Failed to delete template");
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (payload: {
      first_name: string;
      last_name: string;
      email: string;
      job_title?: string;
      access_scope: AccessScope;
      template_id: string;
      project_ids: number[];
    }) => {
      await apiFetch("/api/permissions/users", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success("Access assigned");
      setShowInvite(false);
      qc.invalidateQueries({ queryKey: ["permission-users"] });
    },
    onError: (err) => {
      toast.error("Failed to invite user");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (personId: string) => {
      await apiFetch(`/api/permissions/users/${personId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permission-users"] });
      setUserDeleteTarget(null);
      toast.success("User removed from App Users");
    },
    onError: (err) => {
      toast.error("Failed to delete user");
    },
  });

  const reconcileLinksMutation = useMutation({
    mutationFn: async () => {
      return apiFetch<{
        success: boolean;
        data: {
          repaired: Array<{ email: string }>;
          unresolved: UserLinkDiagnostic[];
        };
      }>("/api/permissions/users/reconcile-links", { method: "POST" });
    },
    onSuccess: (result) => {
      const repairedCount = result.data.repaired.length;
      if (repairedCount > 0) {
        toast.success(`${repairedCount} user auth link${repairedCount === 1 ? "" : "s"} repaired`);
      }
      qc.invalidateQueries({ queryKey: ["permission-users"] });
    },
    onError: (err) => {
      toast.error("User auth links need manual review");
    },
  });

  useEffect(() => {
    if ((activeTab !== "app-users" && activeTab !== "project-access") || linkDiagnostics.length === 0) return;

    const reconcileKey = linkDiagnostics
      .map((diagnostic) => `${diagnostic.authUserId}:${diagnostic.issues.join(",")}`)
      .sort()
      .join("|");

    if (lastReconcileKeyRef.current === reconcileKey || reconcileLinksMutation.isPending) return;

    lastReconcileKeyRef.current = reconcileKey;
    reconcileLinksMutation.mutate();
  }, [activeTab, linkDiagnostics, reconcileLinksMutation]);

  const openCreateForScope = (scope: TemplateScope) => {
    setCreateScope(scope);
    setShowCreate(true);
  };

  const projectTemplates = projectTemplatesQuery.data ?? [];
  const companyTemplates = companyTemplatesQuery.data ?? [];
  const activeTemplates =
    activeTab === "company-templates" ? companyTemplates : projectTemplates;

  const filteredRoles = useMemo(() => {
    const search = tableState.debouncedSearch.trim().toLowerCase();
    if (!search) return activeTemplates;
    return activeTemplates.filter((role) =>
      [role.name, role.description ?? "", role.scope ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [activeTemplates, tableState.debouncedSearch]);
  const sortedRoles = useMemo(() => {
    const direction = tableState.sortDirection === "desc" ? -1 : 1;
    return [...filteredRoles].sort((left, right) => {
      const sortBy = tableState.sortBy ?? "name";
      const leftValue = getTemplateSortValue(left, sortBy);
      const rightValue = getTemplateSortValue(right, sortBy);
      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return (leftValue - rightValue) * direction;
      }
      return String(leftValue).localeCompare(String(rightValue)) * direction;
    });
  }, [filteredRoles, tableState.sortBy, tableState.sortDirection]);
  const templateTotalPages = Math.max(1, Math.ceil(sortedRoles.length / tableState.perPage));
  const selectedTemplate =
    sortedRoles.find((template) => template.id === selectedTemplateId) ??
    null;

  const tabs = [
    { label: "App Users", href: "/user-management", count: appUserCount, isActive: activeTab === "app-users" },
    {
      label: "Project Access",
      href: "/user-management?tab=project-access",
      count: projectAccessUserCount,
      isActive: activeTab === "project-access",
    },
    {
      label: "Project Permission Templates",
      href: "/user-management?tab=project-templates",
      count: projectTemplates.length,
      isActive: activeTab === "project-templates",
    },
    {
      label: "Company Permission Templates",
      href: "/user-management?tab=company-templates",
      count: companyTemplates.length,
      isActive: activeTab === "company-templates",
    },
  ];

  const roleColumns = useMemo<TableColumn<PermissionTemplate>[]>(
    () => [
      {
        id: "name",
        label: "Template",
        defaultVisible: true,
        alwaysVisible: true,
        sortable: true,
        sortValue: (role) => role.name,
        render: (role) => (
          <span className="block truncate text-sm font-medium text-foreground">{role.name}</span>
        ),
      },
      {
        id: "description",
        label: "Description",
        defaultVisible: true,
        sortable: true,
        sortValue: (role) => role.description ?? "",
        render: (role) => (
          <span className="block truncate text-sm text-muted-foreground">
            {role.description || "No description"}
          </span>
        ),
      },
      {
        id: "scope",
        label: "Scope",
        defaultVisible: true,
        sortable: true,
        sortValue: (role) => role.scope ?? "project",
        render: (role) => (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {role.scope === "company" ? "All projects" : "Project"}
            </Badge>
            {role.is_system && <Badge variant="outline">System</Badge>}
          </div>
        ),
      },
      {
        id: "granular",
        label: "Granular",
        defaultVisible: true,
        sortable: true,
        sortValue: (role) => role.granular_flags?.length ?? 0,
        render: (role) => (
          <span className="text-sm text-muted-foreground">
            {(role.granular_flags ?? []).length || "None"}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      {activeTab === "app-users" || activeTab === "project-access" ? (
        <UnifiedTablePage<UserAccessSummary>
          header={{
            title: "Manage Users",
            description: usersDescription,
            actions: (
                <Button size="sm" onClick={() => setShowInvite(true)}>
                  <UserPlus className="h-4 w-4" />
                  {usersAddLabel}
                </Button>
              ),
          }}
          tabs={tabs}
          toolbar={{
            totalItems: usersTotalCount,
            filteredItems: sortedUsers.length,
            selectedCount: tableState.selectedIds.length,
            searchValue: tableState.searchInput,
            onSearchChange: tableState.setSearchInput,
            searchPlaceholder: usersSearchPlaceholder,
            currentView: tableState.currentView,
            onViewChange: (view) => {
              tableState.setCurrentView(view);
              tableState.setSearchParams({ view });
            },
            enabledViews: ["table"],
            columns: userColumns,
            visibleColumns: tableState.visibleColumns,
            onColumnVisibilityChange: tableState.setVisibleColumns,
          }}
          data={{
            items: pagedUsers,
            isLoading: activeUsersQuery.isLoading,
            isFetching: activeUsersQuery.isFetching,
            error: activeUsersQuery.error instanceof Error ? activeUsersQuery.error : null,
          }}
          topContent={
            <div className="-mt-3 space-y-3">
              {usersTopContent}
              {linkDiagnostics.length > 0 ? (
                <UserLinkDiagnosticsAlert
                  diagnostics={linkDiagnostics}
                  isRepairing={reconcileLinksMutation.isPending}
                  onRepair={() => reconcileLinksMutation.mutate()}
                />
              ) : null}
            </div>
          }
          table={{
            columns: userColumns,
            getRowId: (user) => user.id,
            onRowClick: (user) => router.push(`/user-management/users/${user.personId}`),
            rowActions: canManageUserRows
              ? (user) => (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`Actions for ${user.fullName}`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => router.push(`/user-management/users/${user.personId}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          router.push(`/user-management/users/${user.personId}?mode=edit`)
                        }
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setUserDeleteTarget(user)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              : undefined,
            stickyHeader: true,
            density: "compact",
          }}
          sorting={{
            sortBy: tableState.sortBy,
            sortDirection: tableState.sortDirection,
            onSortChange: (sortBy, direction) => {
              tableState.setSortBy(sortBy);
              tableState.setSortDirection(direction);
              tableState.setSearchParams({ sort: sortBy, sort_dir: direction, page: "1" });
            },
          }}
          emptyState={{
            title: usersEmptyTitle,
            description: usersEmptyDescription,
            filteredDescription: usersFilteredDescription,
            isFiltered: Boolean(tableState.debouncedSearch),
            action: (
              <Button size="sm" onClick={() => setShowInvite(true)}>
                <UserPlus className="h-4 w-4" />
                {usersAddLabel}
              </Button>
            ),
          }}
          pagination={{
            page: tableState.page,
            totalPages,
            perPage: tableState.perPage,
            onPageChange: tableState.setPage,
            onPerPageChange: (perPage) => tableState.setPerPage(Number(perPage)),
            clientSide: true,
          }}
          features={{
            enableSearch: true,
            enableViews: false,
            enableColumnToggle: true,
            enableFilters: false,
            enableExport: false,
            enableBulkDelete: false,
            enableRowSelection: false,
            enableRowActions: canManageUserRows,
          }}
        />
      ) : (
        <UnifiedTablePage<PermissionTemplate>
          header={{
            title: "Manage Users",
            description:
              activeTab === "company-templates"
                ? "Manage company-wide permission templates for users who need access across every project."
                : "Manage permission templates assigned to users on individual projects.",
            actions: (
              <Button
                size="sm"
                onClick={() =>
                  openCreateForScope(activeTab === "company-templates" ? "company" : "project")
                }
              >
                <Plus className="h-4 w-4" />
                {activeTab === "company-templates"
                  ? "New Company Permission Template"
                  : "New Project Permission Template"}
              </Button>
            ),
          }}
          tabs={tabs}
          toolbar={{
            totalItems: activeTemplates.length,
            filteredItems: sortedRoles.length,
            selectedCount: 0,
            searchValue: tableState.searchInput,
            onSearchChange: tableState.setSearchInput,
            searchPlaceholder:
              activeTab === "company-templates"
                ? "Search company permission templates..."
                : "Search project permission templates...",
            currentView: "table",
            onViewChange: () => undefined,
            columns: roleColumns,
            visibleColumns: ["name", "description", "scope", "granular"],
            onColumnVisibilityChange: () => undefined,
          }}
          data={{
            items: sortedRoles,
            isLoading: companyTemplatesQuery.isLoading || projectTemplatesQuery.isLoading,
          }}
          table={{
            columns: roleColumns,
            getRowId: (role) => role.id,
            activeRowId: selectedTemplate?.id ?? null,
            onRowClick: (template) => setSelectedTemplateId(template.id),
            rowActions: (template) =>
              template.is_system ? null : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={`Actions for ${template.name}`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteTarget(template)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ),
            stickyHeader: true,
            density: "compact",
          }}
          sorting={{
            sortBy: tableState.sortBy,
            sortDirection: tableState.sortDirection,
            onSortChange: (sortBy, direction) => {
              tableState.setSortBy(sortBy);
              tableState.setSortDirection(direction);
              tableState.setSearchParams({ sort: sortBy, sort_dir: direction, page: "1" });
            },
          }}
          emptyState={{
            title: "No permission templates",
            description:
              activeTab === "company-templates"
                ? "Create a company permission template for all-project access."
                : "Create a project permission template for project-specific access.",
            filteredDescription: "No permission templates match your search.",
            isFiltered: Boolean(tableState.debouncedSearch),
            action: (
              <Button
                size="sm"
                onClick={() =>
                  openCreateForScope(activeTab === "company-templates" ? "company" : "project")
                }
              >
                <Plus className="h-4 w-4" />
                {activeTab === "company-templates"
                  ? "New Company Permission Template"
                  : "New Project Permission Template"}
              </Button>
            ),
          }}
          pagination={{
            page: tableState.page,
            totalPages: templateTotalPages,
            perPage: tableState.perPage,
            onPageChange: tableState.setPage,
            onPerPageChange: (perPage) => tableState.setPerPage(Number(perPage)),
            clientSide: true,
          }}
          features={{
            enableSearch: true,
            enableViews: false,
            enableColumnToggle: false,
            enableFilters: false,
            enableExport: false,
            enableBulkDelete: false,
            enableRowSelection: false,
            enableRowActions: true,
          }}
        />
      )}

      <InviteUserDialog
        open={showInvite}
        onOpenChange={setShowInvite}
        mode={accessDialogMode}
        projectTemplates={projectTemplatesQuery.data ?? []}
        companyTemplates={companyTemplatesQuery.data ?? []}
        employees={employeeOptionsQuery.data ?? []}
        projects={projectsQuery.data ?? []}
        isLoading={
          projectTemplatesQuery.isLoading ||
          companyTemplatesQuery.isLoading ||
          employeeOptionsQuery.isLoading ||
          projectsQuery.isLoading
        }
        isSaving={inviteMutation.isPending}
        onInvite={(payload) => inviteMutation.mutateAsync(payload)}
      />

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent size="form" className="max-h-[calc(100svh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              New {createScope === "company" ? "Company" : "Project"} Permission Template
            </DialogTitle>
            <DialogDescription>
              Define the module access and granular capabilities included in this permission template.
            </DialogDescription>
          </DialogHeader>
          <PermissionTemplateForm
            onSave={(data) => createMutation.mutateAsync(data)}
            onCancel={() => setShowCreate(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent size="form" className="max-h-[calc(100svh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Role: {editTarget?.name}
              {editTarget?.is_system && (
                <Badge variant="outline" className="ml-2 align-middle text-xs">
                  System
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Adjust this permission template so future assignments inherit the updated access profile.
            </DialogDescription>
          </DialogHeader>
          {editTarget && (
            <PermissionTemplateForm
              template={editTarget}
              onSave={(data) =>
                updateMutation.mutateAsync({
                  id: editTarget.id,
                  scope: (editTarget.scope === "company" ? "company" : "project") as TemplateScope,
                  ...data,
                })
              }
              onCancel={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedTemplateId(null)}>
        <DialogContent size="form" className="max-h-[calc(100svh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage permission template access</DialogTitle>
            <DialogDescription>
              Adjust the module access and granular capabilities included in this permission template.
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <TemplatePermissionMatrix
              template={selectedTemplate}
              isSaving={templateMatrixMutation.isPending}
              onEdit={() => {
                setEditTarget(selectedTemplate);
                setSelectedTemplateId(null);
              }}
              onChange={(nextTemplate) =>
                templateMatrixMutation.mutate({
                  id: nextTemplate.id,
                  scope: (nextTemplate.scope === "company" ? "company" : "project") as TemplateScope,
                  name: nextTemplate.name,
                  description: nextTemplate.description ?? "",
                  rules_json: nextTemplate.rules_json,
                  granular_flags: nextTemplate.granular_flags ?? [],
                })
              }
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes <strong>{deleteTarget?.name}</strong>. Members using
              this template must be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteTarget &&
                deleteMutation.mutate({
                  id: deleteTarget.id,
                  scope: (deleteTarget.scope === "company" ? "company" : "project") as TemplateScope,
                })
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!userDeleteTarget} onOpenChange={() => setUserDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {userDeleteTarget?.fullName ?? "this user"} from App Users by removing
              company-wide access and admin status. Project access is still controlled from each
              project directory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (userDeleteTarget) {
                  deleteUserMutation.mutate(userDeleteTarget.personId);
                }
              }}
              disabled={deleteUserMutation.isPending}
            >
              Delete user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function InviteUserDialog({
  open,
  onOpenChange,
  mode,
  projectTemplates,
  companyTemplates,
  employees,
  projects,
  isLoading,
  isSaving,
  onInvite,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "app" | "project";
  projectTemplates: PermissionTemplate[];
  companyTemplates: PermissionTemplate[];
  employees: EmployeeOption[];
  projects: ProjectOption[];
  isLoading: boolean;
  isSaving: boolean;
  onInvite: (payload: {
    first_name: string;
    last_name: string;
    email: string;
    job_title?: string;
    access_scope: AccessScope;
    template_id: string;
    project_ids: number[];
  }) => Promise<void>;
}) {
  const initialAccessScope: AccessScope =
    mode === "project" ? "selected_projects" : "all_projects";
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [accessScope, setAccessScope] = useState<AccessScope>(initialAccessScope);
  const [projectTemplateId, setProjectTemplateId] = useState("");
  const [companyTemplateId, setCompanyTemplateId] = useState("");
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedEmployeeId(null);
      setFirstName("");
      setLastName("");
      setEmail("");
      setJobTitle("");
      setAccessScope(initialAccessScope);
      setProjectTemplateId("");
      setCompanyTemplateId("");
      setSelectedProjectIds(new Set());
      setError(null);
      return;
    }

    setProjectTemplateId((current) => current || findTemplateId(projectTemplates, "Project Manager"));
    setCompanyTemplateId(
      (current) =>
        current ||
        findTemplateId(companyTemplates, "Project Manager") ||
        companyTemplates[0]?.id ||
        "",
    );
    setAccessScope(initialAccessScope);
  }, [open, projectTemplates, companyTemplates, initialAccessScope]);

  const selectedEmployee =
    employees.find((employee) => employee.id === selectedEmployeeId) ?? null;

  const selectEmployee = (employee: EmployeeOption | null) => {
    setSelectedEmployeeId(employee?.id ?? null);

    if (!employee) {
      setFirstName("");
      setLastName("");
      setEmail("");
      setJobTitle("");
      return;
    }

    setFirstName(employee.firstName);
    setLastName(employee.lastName);
    setEmail(employee.email ?? "");
    setJobTitle(employee.jobTitle ?? "");
  };

  const selectedTemplateId =
    accessScope === "all_projects"
      ? companyTemplateId || companyTemplates[0]?.id || ""
      : projectTemplateId || findTemplateId(projectTemplates, "Project Manager") || projectTemplates[0]?.id || "";

  const canSubmit =
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    selectedTemplateId &&
    (accessScope === "all_projects" || selectedProjectIds.size > 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!canSubmit) {
      setError("Add the user details, permission template, and project access before saving.");
      return;
    }

    try {
      await onInvite({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        job_title: jobTitle.trim() || undefined,
        access_scope: accessScope,
        template_id: selectedTemplateId,
        project_ids: accessScope === "all_projects" ? [] : Array.from(selectedProjectIds),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="form" className="max-h-[calc(100svh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "project" ? "Add project access" : "Grant app access"}</DialogTitle>
        </DialogHeader>

        <form className="space-y-6" onSubmit={submit}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Employee
            </label>
            <EmployeeCombobox
              employees={employees}
              selectedEmployeeId={selectedEmployeeId}
              disabled={isLoading}
              onSelect={selectEmployee}
            />
            {selectedEmployee ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto px-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
                onClick={() => selectEmployee(null)}
              >
                Clear selection and enter a new employee
              </Button>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="invite-first-name" className="text-sm font-medium text-foreground">
                First name
              </label>
              <Input
                id="invite-first-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="invite-last-name" className="text-sm font-medium text-foreground">
                Last name
              </label>
              <Input
                id="invite-last-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="invite-email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="invite-title" className="text-sm font-medium text-foreground">
                Title
              </label>
              <Input
                id="invite-title"
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
                placeholder="Project Manager"
              />
            </div>
          </div>

          {mode === "app" ? (
            <div className="space-y-3">
              <SectionRuleHeading label="Access" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAccessScope("all_projects");
                    setCompanyTemplateId((current) => current || companyTemplates[0]?.id || "");
                  }}
                  className={cn(
                    "h-auto justify-start rounded-md px-4 py-3 text-left transition-colors",
                    accessScope === "all_projects"
                      ? "border-primary bg-primary/5 hover:bg-primary/5"
                      : "hover:bg-muted/50",
                  )}
                >
                  <span className="block min-w-0">
                    <span className="block text-sm font-semibold text-foreground">All projects</span>
                    <span className="mt-1 block whitespace-normal text-sm font-normal text-muted-foreground">
                      Access across every current and future project.
                    </span>
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAccessScope("selected_projects");
                    setProjectTemplateId((current) => current || projectTemplates[0]?.id || "");
                  }}
                  className={cn(
                    "h-auto justify-start rounded-md px-4 py-3 text-left transition-colors",
                    accessScope === "selected_projects"
                      ? "border-primary bg-primary/5 hover:bg-primary/5"
                      : "hover:bg-muted/50",
                  )}
                >
                  <span className="block min-w-0">
                    <span className="block text-sm font-semibold text-foreground">Specific projects</span>
                    <span className="mt-1 block whitespace-normal text-sm font-normal text-muted-foreground">
                      Access only to selected projects.
                    </span>
                  </span>
                </Button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="space-y-1.5">
              <label htmlFor="invite-role" className="text-sm font-medium text-foreground">
                Permission template
              </label>
              <Select
                value={selectedTemplateId}
                disabled={isLoading}
                onValueChange={(value) => {
                  if (accessScope === "all_projects") {
                    setCompanyTemplateId(value);
                  } else {
                    setProjectTemplateId(value);
                  }
                }}
              >
                <SelectTrigger id="invite-role" className="h-9 text-sm">
                  <SelectValue placeholder="Select permission template" />
                </SelectTrigger>
                <SelectContent>
                  {(accessScope === "all_projects" ? companyTemplates : projectTemplates).map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Start with a permission template, then customize the user later if needed.
              </p>
            </div>

            <div className="space-y-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Projects
                  {accessScope === "selected_projects" && selectedProjectIds.size > 0 && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {selectedProjectIds.size} selected
                    </span>
                  )}
                </label>
              </div>
              {accessScope === "all_projects" ? (
                <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  This user will inherit access across every current and future project through the selected company permission template.
                </div>
              ) : (
                <MultiSelectField
                  label=""
                  options={projects.map((project) => ({
                    value: String(project.id),
                    label: project.jobNumber
                      ? `${project.name} ${project.jobNumber}`
                      : project.name,
                  }))}
                  value={Array.from(selectedProjectIds).map(String)}
                  onChange={(values) =>
                    setSelectedProjectIds(
                      new Set(values.map((value) => Number(value)).filter(Number.isFinite)),
                    )
                  }
                  placeholder={isLoading ? "Loading projects..." : "Select projects..."}
                  disabled={isLoading}
                />
              )}
            </div>
          </div>

          {error && (
            <ErrorState
              title="Invite blocked"
              error={error}
              className="items-start py-2 text-left"
            />
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !canSubmit}>
              {isSaving ? "Saving..." : mode === "project" ? "Add Project Access" : "Grant Access"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EmployeeCombobox({
  employees,
  selectedEmployeeId,
  disabled,
  onSelect,
}: {
  employees: EmployeeOption[];
  selectedEmployeeId: string | null;
  disabled: boolean;
  onSelect: (employee: EmployeeOption | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedEmployee =
    employees.find((employee) => employee.id === selectedEmployeeId) ?? null;
  const selectedLabel = selectedEmployee
    ? formatEmployeeLabel(selectedEmployee)
    : "Search People before inviting...";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-auto min-h-10 w-full justify-between px-3 py-2 text-left font-normal",
            !selectedEmployee && "text-muted-foreground",
          )}
        >
          <span className="min-w-0 truncate">{selectedLabel}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search employees..." />
          <CommandEmpty>No employee found.</CommandEmpty>
          <CommandGroup>
            {employees.map((employee) => (
              <CommandItem
                key={employee.id}
                value={[
                  employee.firstName,
                  employee.lastName,
                  employee.email ?? "",
                  employee.jobTitle ?? "",
                ].join(" ")}
                onSelect={() => {
                  onSelect(employee);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    employee.id === selectedEmployeeId ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {formatEmployeeName(employee)}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[employee.email, employee.jobTitle].filter(Boolean).join(" · ") || "No email on file"}
                  </span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function formatEmployeeName(employee: EmployeeOption) {
  return [employee.firstName, employee.lastName].filter(Boolean).join(" ") || "Unnamed employee";
}

function formatEmployeeLabel(employee: EmployeeOption) {
  const detail = [employee.email, employee.jobTitle].filter(Boolean).join(" · ");
  return detail ? `${formatEmployeeName(employee)} (${detail})` : formatEmployeeName(employee);
}

function findTemplateId(templates: PermissionTemplate[], name: string) {
  return templates.find((template) => template.name.toLowerCase() === name.toLowerCase())?.id ?? "";
}

function getHighestTemplateLevel(levels: PermissionLevel[] | undefined): PermissionLevel {
  if (levels?.includes("admin")) return "admin";
  if (levels?.includes("write")) return "write";
  if (levels?.includes("read")) return "read";
  return "none";
}

function expandTemplateLevel(level: PermissionLevel): PermissionLevel[] {
  if (level === "admin") return ["read", "write", "admin"];
  if (level === "write") return ["read", "write"];
  if (level === "read") return ["read"];
  return ["none"];
}

function TemplatePermissionMatrix({
  template,
  isSaving,
  onEdit,
  onChange,
}: {
  template: PermissionTemplate;
  isSaving: boolean;
  onEdit: () => void;
  onChange: (template: PermissionTemplate) => void;
}) {
  const updateModuleLevel = (module: PermissionModule, level: PermissionLevel) => {
    onChange({
      ...template,
      rules_json: {
        ...template.rules_json,
        [module]: expandTemplateLevel(level),
      },
    });
  };

  const updateGranularFlag = (flag: GranularFlag, checked: boolean) => {
    const currentFlags = new Set(template.granular_flags ?? []);
    if (checked) {
      currentFlags.add(flag);
    } else {
      currentFlags.delete(flag);
    }
    onChange({
      ...template,
      granular_flags: Array.from(currentFlags),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-semibold text-foreground">
              {template.name}
            </h2>
            {template.is_system && <Badge variant="outline">System</Badge>}
            <Badge variant="outline">
              {template.scope === "company" ? "Company template" : "Project template"}
            </Badge>
          </div>
          {template.description && (
            <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
          )}
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onEdit}>
          Edit Details
        </Button>
      </div>

      <div className="overflow-hidden border-y border-border">
        <div className="grid grid-cols-[minmax(150px,1fr)_repeat(4,minmax(72px,96px))] border-b border-border bg-muted/40 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <div className="px-4 py-2">Module</div>
          {TEMPLATE_LEVELS.map((level) => (
            <div key={level.key} className="border-l border-border px-3 py-2 text-center">
              {level.label}
            </div>
          ))}
        </div>
        <div className="divide-y divide-border">
          {TEMPLATE_MODULES.map((module) => {
            const selectedLevel = getHighestTemplateLevel(template.rules_json[module.key]);

            return (
              <div
                key={module.key}
                className="grid grid-cols-[minmax(150px,1fr)_repeat(4,minmax(72px,96px))] items-center"
              >
                <div className="px-4 py-3 text-sm font-medium text-foreground">
                  {module.label}
                </div>
                {TEMPLATE_LEVELS.map((level) => (
                  <label
                    key={`${module.key}-${level.key}`}
                    className="flex h-full items-center justify-center border-l border-border px-3 py-3"
                    aria-label={`${module.label} ${level.label}`}
                  >
                    <Checkbox
                      checked={selectedLevel === level.key}
                      disabled={isSaving}
                      onCheckedChange={(checked) => {
                        if (checked) updateModuleLevel(module.key, level.key);
                      }}
                    />
                  </label>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <SectionRuleHeading label="Granular Access" />
        <div className="overflow-hidden border-y border-border">
          <div className="divide-y divide-border">
            {ALL_GRANULAR_FLAGS.map((flag) => (
              <label
                key={flag}
                className="grid cursor-pointer grid-cols-[minmax(0,1fr)_96px] items-center px-4 py-3 hover:bg-muted/40"
              >
                <span className="text-sm text-foreground">
                  {GRANULAR_FLAG_LABELS[flag]}
                </span>
                <span className="flex justify-center">
                  <Checkbox
                    checked={(template.granular_flags ?? []).includes(flag)}
                    disabled={isSaving}
                    onCheckedChange={(checked) => updateGranularFlag(flag, checked === true)}
                  />
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function UserLinkDiagnosticsAlert({
  diagnostics,
  isRepairing,
  onRepair,
}: {
  diagnostics: UserLinkDiagnostic[];
  isRepairing: boolean;
  onRepair: () => void;
}) {
  const names = diagnostics
    .slice(0, 3)
    .map((diagnostic) => diagnostic.fullName || diagnostic.email)
    .join(", ");
  const extraCount = Math.max(0, diagnostics.length - 3);

  return (
    <Alert className="border-status-warning/30 bg-status-warning/10 text-foreground">
      <AlertTriangle className="h-4 w-4 text-status-warning" />
      <AlertDescription className="flex flex-col gap-3 text-sm md:flex-row md:items-center md:justify-between">
        <span>
          {diagnostics.length} user auth link{diagnostics.length === 1 ? "" : "s"} need repair
          {names ? `: ${names}${extraCount > 0 ? `, +${extraCount} more` : ""}.` : "."}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isRepairing}
          onClick={onRepair}
          className="w-fit shrink-0"
        >
          {isRepairing ? "Repairing..." : "Repair links"}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
