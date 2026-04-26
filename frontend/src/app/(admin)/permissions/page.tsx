"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  Plus,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MultiSelectField } from "@/components/forms/MultiSelectField";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { ALL_GRANULAR_FLAGS, GRANULAR_FLAG_LABELS } from "@/lib/permissions-shared";
import type {
  GranularFlag,
  PermissionLevel,
  PermissionModule,
  PermissionTemplate,
} from "@/lib/permissions-shared";

type TemplateScope = "company" | "project";
type PermissionsTab = "users" | "project-templates" | "company-templates";
type AccessScope = "all_projects" | "selected_projects";
type GranularOverrideEffect = "allow" | "deny";

type PermissionUser = {
  personId: string;
  authUserId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  profilePhotoUrl: string | null;
  isAdmin: boolean;
  companyTemplateId: string | null;
  companyTemplateName: string | null;
  memberships: Array<{
    projectId: number | string;
    projectName: string | null;
    templateId: string | null;
    templateName: string | null;
  }>;
  granularOverrides: Array<{
    projectId: number | string | null;
    flag: GranularFlag;
    effect: GranularOverrideEffect;
  }>;
};

type UserLinkDiagnostic = {
  authUserId: string;
  email: string;
  fullName: string | null;
  isAdmin: boolean;
  issues: Array<
    | "missing_person_auth_link"
    | "missing_users_auth_link"
    | "mismatched_users_auth_link"
    | "duplicate_people_email"
  >;
};

type PermissionUsersResponse = {
  data: PermissionUser[];
  diagnostics?: {
    missingAuthLinks?: UserLinkDiagnostic[];
  };
};

type ProjectOption = {
  id: number;
  name: string;
  jobNumber: string | null;
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

type UserAccessSummary = {
  id: string;
  personId: string;
  authUserId: string | null;
  fullName: string;
  initials: string;
  email: string;
  profilePhotoUrl: string | null;
  isAdmin: boolean;
  companyTemplateId: string | null;
  companyTemplateName: string | null;
  projectCount: number;
  assignedProjectCount: number;
  missingTemplateCount: number;
  primaryTemplateName: string;
  memberships: PermissionUser["memberships"];
  granularOverrides: PermissionUser["granularOverrides"];
};

async function fetchTemplates(scope: TemplateScope): Promise<PermissionTemplate[]> {
  const { data } = await apiFetch<{ data: PermissionTemplate[] }>(
    `/api/permissions/templates?scope=${scope}`,
  );
  return data;
}

async function fetchAllTemplates(): Promise<PermissionTemplate[]> {
  const { data } = await apiFetch<{ data: PermissionTemplate[] }>(
    "/api/permissions/templates",
  );
  return data;
}

async function fetchUsers(): Promise<PermissionUsersResponse> {
  return apiFetch<PermissionUsersResponse>(
    "/api/permissions/users",
  );
}

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

function getInitials(firstName: string, lastName: string, fallback: string): string {
  const initials = [firstName, lastName]
    .map((name) => name.charAt(0))
    .filter(Boolean)
    .join("")
    .toUpperCase();

  return initials || fallback.charAt(0).toUpperCase() || "?";
}

function toAccessSummary(user: PermissionUser): UserAccessSummary {
  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email ||
    "Unnamed user";
  const assignedProjectCount = user.memberships.filter((m) => !!m.templateId).length;
  const missingTemplateCount = user.memberships.length - assignedProjectCount;
  const primaryTemplateName = user.isAdmin
    ? "App Admin"
    : user.companyTemplateName ?? user.memberships[0]?.templateName ?? "No template";

  return {
    id: user.personId,
    personId: user.personId,
    authUserId: user.authUserId,
    fullName,
    initials: getInitials(user.firstName, user.lastName, user.email),
    email: user.email,
    profilePhotoUrl: user.profilePhotoUrl,
    isAdmin: user.isAdmin,
    companyTemplateId: user.companyTemplateId,
    companyTemplateName: user.companyTemplateName,
    projectCount: user.memberships.length,
    assignedProjectCount,
    missingTemplateCount,
    primaryTemplateName,
    memberships: user.memberships,
    granularOverrides: user.granularOverrides ?? [],
  };
}

function formatProjectCount(count: number) {
  return `${count} ${count === 1 ? "project" : "projects"}`;
}

function getUserSortValue(user: UserAccessSummary, sortBy: string) {
  switch (sortBy) {
    case "role":
      return user.primaryTemplateName;
    case "projects":
      return user.projectCount;
    case "exceptions":
      return user.granularOverrides.length;
    case "status":
      return user.isAdmin ? "admin" : "member";
    case "name":
    default:
      return user.fullName;
  }
}

export default function PermissionsAdminPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: PermissionsTab =
    tabParam === "company-templates"
      ? "company-templates"
      : tabParam === "project-templates"
        ? "project-templates"
        : "users";
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
      visibleColumns: ["name", "role", "projects", "exceptions", "status"],
      filters: {},
    },
  });
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createScope, setCreateScope] = useState<TemplateScope>("project");
  const [editTarget, setEditTarget] = useState<PermissionTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PermissionTemplate | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ["permission-users"],
    queryFn: fetchUsers,
  });
  const lastReconcileKeyRef = useRef<string | null>(null);

  const allTemplatesQuery = useQuery({
    queryKey: ["permission-templates", "all"],
    queryFn: fetchAllTemplates,
  });

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

  const linkDiagnostics = usersQuery.data?.diagnostics?.missingAuthLinks ?? [];
  const users = useMemo(
    () => (usersQuery.data?.data ?? []).map(toAccessSummary),
    [usersQuery.data?.data],
  );

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

  const selectedUser = sortedUsers.find((user) => user.id === selectedUserId) ?? null;
  const templates = allTemplatesQuery.data ?? [];
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
              <p className="truncate text-xs text-muted-foreground">{user.email || "No email"}</p>
            </div>
          </div>
        ),
      },
      {
        id: "role",
        label: "Role",
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
      {
        id: "status",
        label: "Status",
        defaultVisible: true,
        sortable: true,
        sortValue: (user) => (user.isAdmin ? "admin" : "member"),
        render: (user) => (
          <Badge variant={user.isAdmin ? "default" : "outline"}>
            {user.isAdmin ? "Admin" : "Member"}
          </Badge>
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
      toast.error(err instanceof Error ? err.message : "Failed to create template");
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
      toast.error(err instanceof Error ? err.message : "Failed to update template");
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
      toast.error(err instanceof Error ? err.message : "Failed to update permission");
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
      toast.error(err instanceof Error ? err.message : "Failed to delete template");
    },
  });

  const adminMutation = useMutation({
    mutationFn: async ({ authUserId, isAdmin }: { authUserId: string; isAdmin: boolean }) => {
      await apiFetch("/api/admin/set-admin-status", {
        method: "POST",
        body: JSON.stringify({ auth_user_id: authUserId, is_admin: isAdmin }),
      });
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.isAdmin ? "App admin granted" : "App admin removed");
      qc.invalidateQueries({ queryKey: ["permission-users"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update admin access");
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({
      projectId,
      personId,
      templateId,
    }: {
      projectId: number | string;
      personId: string;
      templateId: string;
    }) => {
      await apiFetch(`/api/projects/${projectId}/permissions/assign`, {
        method: "POST",
        body: JSON.stringify({ person_id: personId, template_id: templateId }),
      });
    },
    onSuccess: () => {
      toast.success("Project access updated");
      qc.invalidateQueries({ queryKey: ["permission-users"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update project access");
    },
  });

  const companyTemplateMutation = useMutation({
    mutationFn: async ({ personId, templateId }: { personId: string; templateId: string | null }) => {
      if (templateId) {
        await apiFetch(`/api/permissions/users/${personId}/company-template`, {
          method: "PUT",
          body: JSON.stringify({ template_id: templateId }),
        });
      } else {
        await apiFetch(`/api/permissions/users/${personId}/company-template`, { method: "DELETE" });
      }
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.templateId ? "Company access assigned" : "Company access removed");
      qc.invalidateQueries({ queryKey: ["permission-users"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update company access");
    },
  });

  const granularOverrideMutation = useMutation({
    mutationFn: async ({
      personId,
      flag,
      effect,
    }: {
      personId: string;
      flag: GranularFlag;
      effect: GranularOverrideEffect | null;
    }) => {
      const url = `/api/permissions/users/${personId}/granular-overrides`;
      if (effect) {
        await apiFetch(url, {
          method: "PUT",
          body: JSON.stringify({ flag, effect }),
        });
        return;
      }

      await apiFetch(url, {
        method: "DELETE",
        body: JSON.stringify({ flag }),
      });
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.effect ? "Permission exception saved" : "Permission exception removed");
      qc.invalidateQueries({ queryKey: ["permission-users"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update permission exception");
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
      toast.success("User invited and access assigned");
      setShowInvite(false);
      qc.invalidateQueries({ queryKey: ["permission-users"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to invite user");
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
      toast.error(err instanceof Error ? err.message : "User auth links need manual review");
    },
  });

  useEffect(() => {
    if (activeTab !== "users" || linkDiagnostics.length === 0) return;

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
  const selectedTemplate =
    filteredRoles.find((template) => template.id === selectedTemplateId) ??
    filteredRoles[0] ??
    null;

  const tabs = [
    { label: "Users", href: "/permissions", count: users.length, isActive: activeTab === "users" },
    {
      label: "Project Templates",
      href: "/permissions?tab=project-templates",
      count: projectTemplates.length,
      isActive: activeTab === "project-templates",
    },
    {
      label: "Company Templates",
      href: "/permissions?tab=company-templates",
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
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-medium text-foreground">{role.name}</span>
              {role.is_system && <Badge variant="outline">System</Badge>}
            </div>
            {role.description && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{role.description}</p>
            )}
          </div>
        ),
      },
      {
        id: "scope",
        label: "Scope",
        defaultVisible: true,
        sortable: true,
        sortValue: (role) => role.scope ?? "project",
        render: (role) => (
          <Badge variant="outline">
            {role.scope === "company" ? "All projects" : "Project"}
          </Badge>
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
      {activeTab === "users" ? (
        <UnifiedTablePage<UserAccessSummary>
          header={{
            title: "User Management",
            description: "Invite users, assign roles, choose project access, and manage exceptions.",
            actions: (
              <Button size="sm" onClick={() => setShowInvite(true)}>
                <UserPlus className="h-4 w-4" />
                Add User
              </Button>
            ),
          }}
          tabs={tabs}
          toolbar={{
            totalItems: users.length,
            filteredItems: sortedUsers.length,
            selectedCount: tableState.selectedIds.length,
            searchValue: tableState.searchInput,
            onSearchChange: tableState.setSearchInput,
            searchPlaceholder: "Search users...",
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
            isLoading: usersQuery.isLoading,
            isFetching: usersQuery.isFetching,
            error: usersQuery.error instanceof Error ? usersQuery.error : null,
          }}
          topContent={
            linkDiagnostics.length > 0 ? (
              <UserLinkDiagnosticsAlert
                diagnostics={linkDiagnostics}
                isRepairing={reconcileLinksMutation.isPending}
                onRepair={() => reconcileLinksMutation.mutate()}
              />
            ) : null
          }
          table={{
            columns: userColumns,
            getRowId: (user) => user.id,
            activeRowId: selectedUserId,
            onRowClick: (user) => setSelectedUserId(user.id),
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
            title: "No users",
            description: "Invite a user to assign roles and project access.",
            filteredDescription: "No users match your search.",
            isFiltered: Boolean(tableState.debouncedSearch),
            action: (
              <Button size="sm" onClick={() => setShowInvite(true)}>
                <UserPlus className="h-4 w-4" />
                Add User
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
          layout={{ maxWidth: "full", fullBleedTable: true }}
          features={{
            enableSearch: true,
            enableViews: false,
            enableColumnToggle: true,
            enableFilters: false,
            enableExport: false,
            enableBulkDelete: false,
            enableRowSelection: false,
            enableRowActions: false,
          }}
        />
      ) : (
        <UnifiedTablePage<PermissionTemplate>
          header={{
            title: activeTab === "company-templates" ? "Company Templates" : "Project Templates",
            description:
              activeTab === "company-templates"
                ? "Manage company-wide templates for users who need access across every project."
                : "Manage project templates assigned to users on individual projects.",
            actions: (
              <Button
                size="sm"
                onClick={() =>
                  openCreateForScope(activeTab === "company-templates" ? "company" : "project")
                }
              >
                <Plus className="h-4 w-4" />
                {activeTab === "company-templates" ? "New Company Template" : "New Project Template"}
              </Button>
            ),
          }}
          tabs={tabs}
          toolbar={{
            totalItems: activeTemplates.length,
            filteredItems: filteredRoles.length,
            selectedCount: 0,
            searchValue: tableState.searchInput,
            onSearchChange: tableState.setSearchInput,
            searchPlaceholder:
              activeTab === "company-templates"
                ? "Search company templates..."
                : "Search project templates...",
            currentView: "table",
            onViewChange: () => undefined,
            columns: roleColumns,
            visibleColumns: ["name", "scope", "granular"],
            onColumnVisibilityChange: () => undefined,
          }}
          data={{
            items: filteredRoles,
            isLoading: companyTemplatesQuery.isLoading || projectTemplatesQuery.isLoading,
          }}
          table={{
            columns: roleColumns,
            getRowId: (role) => role.id,
            activeRowId: selectedTemplate?.id ?? null,
            onRowClick: (template) => setSelectedTemplateId(template.id),
            stickyHeader: true,
            density: "compact",
          }}
          sidePanel={{
            content: selectedTemplate ? (
              <TemplatePermissionMatrix
                template={selectedTemplate}
                isSaving={templateMatrixMutation.isPending}
                onEdit={() => setEditTarget(selectedTemplate)}
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
            ) : (
              <p className="p-6 text-sm text-muted-foreground">
                Select a template to manage permissions.
              </p>
            ),
            defaultWidth: 640,
            minWidth: 520,
            maxWidth: 900,
            storageKey: "permissions-template-matrix",
          }}
          emptyState={{
            title: "No templates",
            description:
              activeTab === "company-templates"
                ? "Create a company template for all-project access."
                : "Create a project template for project-specific access.",
            filteredDescription: "No templates match your search.",
            isFiltered: Boolean(tableState.debouncedSearch),
            action: (
              <Button
                size="sm"
                onClick={() =>
                  openCreateForScope(activeTab === "company-templates" ? "company" : "project")
                }
              >
                <Plus className="h-4 w-4" />
                {activeTab === "company-templates" ? "New Company Template" : "New Project Template"}
              </Button>
            ),
          }}
          layout={{ maxWidth: "full", fullBleedTable: true }}
          features={{
            enableSearch: true,
            enableViews: false,
            enableColumnToggle: false,
            enableFilters: false,
            enableExport: false,
            enableBulkDelete: false,
            enableRowSelection: false,
            enableRowActions: false,
          }}
        />
      )}

      <InviteUserDialog
        open={showInvite}
        onOpenChange={setShowInvite}
        projectTemplates={projectTemplatesQuery.data ?? []}
        companyTemplates={companyTemplatesQuery.data ?? []}
        projects={projectsQuery.data ?? []}
        isLoading={projectTemplatesQuery.isLoading || companyTemplatesQuery.isLoading || projectsQuery.isLoading}
        isSaving={inviteMutation.isPending}
        onInvite={(payload) => inviteMutation.mutateAsync(payload)}
      />

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUserId(null)}>
        <DialogContent size="form" className="max-h-[calc(100svh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage user access</DialogTitle>
            <DialogDescription>
              Update company access, project templates, and granular exceptions for this user.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <UserAccessPanel
              user={selectedUser}
              templates={templates}
              companyTemplates={companyTemplatesQuery.data ?? []}
              isTemplatesLoading={allTemplatesQuery.isLoading}
              isAdminSaving={adminMutation.isPending}
              isAssignmentSaving={assignMutation.isPending}
              isCompanyTemplateSaving={companyTemplateMutation.isPending}
              isGranularOverrideSaving={granularOverrideMutation.isPending}
              onToggleAdmin={(authUserId, isAdmin) =>
                adminMutation.mutate({ authUserId, isAdmin })
              }
              onAssignTemplate={(projectId, personId, templateId) =>
                assignMutation.mutate({ projectId, personId, templateId })
              }
              onAssignCompanyTemplate={(personId, templateId) =>
                companyTemplateMutation.mutate({ personId, templateId })
              }
              onSetGranularOverride={(personId, flag, effect) =>
                granularOverrideMutation.mutate({ personId, flag, effect })
              }
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent size="form" className="max-h-[calc(100svh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              New {createScope === "company" ? "Company" : "Project"} Template
            </DialogTitle>
            <DialogDescription>
              Define the module access and granular capabilities included in this role.
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
              Edit Template: {editTarget?.name}
              {editTarget?.is_system && (
                <Badge variant="outline" className="ml-2 align-middle text-xs">
                  System
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Adjust this role so future assignments inherit the updated access profile.
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
    </>
  );
}

function InviteUserDialog({
  open,
  onOpenChange,
  projectTemplates,
  companyTemplates,
  projects,
  isLoading,
  isSaving,
  onInvite,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectTemplates: PermissionTemplate[];
  companyTemplates: PermissionTemplate[];
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [accessScope, setAccessScope] = useState<AccessScope>("selected_projects");
  const [projectTemplateId, setProjectTemplateId] = useState("");
  const [companyTemplateId, setCompanyTemplateId] = useState("");
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFirstName("");
      setLastName("");
      setEmail("");
      setJobTitle("");
      setAccessScope("selected_projects");
      setProjectTemplateId("");
      setCompanyTemplateId("");
      setSelectedProjectIds(new Set());
      setError(null);
      return;
    }

    setProjectTemplateId((current) => current || findTemplateId(projectTemplates, "Project Manager"));
    setCompanyTemplateId((current) => current || companyTemplates[0]?.id || "");
  }, [open, projectTemplates, companyTemplates]);

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
      setError("Add the user details, role, and project access before sending the invite.");
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
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>
            Invite a user, choose their role, and assign either specific projects or all-project access.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-6" onSubmit={submit}>
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

          <div className="space-y-3">
            <SectionRuleHeading label="Access" />
            <div className="grid gap-3 sm:grid-cols-2">
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
                    Best for a new PM, field staff, or limited rollout.
                  </span>
                </span>
              </Button>
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
                    Best for a senior PM or project management admin.
                  </span>
                </span>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="space-y-1.5">
              <label htmlFor="invite-role" className="text-sm font-medium text-foreground">
                Role
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
                  <SelectValue placeholder="Select role" />
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
                Start with a role, then customize the user later if needed.
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
                  This user will inherit access across every current and future project through the selected company role.
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
              {isSaving ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
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
        <SectionRuleHeading label="Granular Permissions" />
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

function UserAccessPanel({
  user,
  templates,
  companyTemplates,
  isTemplatesLoading,
  isAdminSaving,
  isAssignmentSaving,
  isCompanyTemplateSaving,
  isGranularOverrideSaving,
  onToggleAdmin,
  onAssignTemplate,
  onAssignCompanyTemplate,
  onSetGranularOverride,
}: {
  user: UserAccessSummary;
  templates: PermissionTemplate[];
  companyTemplates: PermissionTemplate[];
  isTemplatesLoading: boolean;
  isAdminSaving: boolean;
  isAssignmentSaving: boolean;
  isCompanyTemplateSaving: boolean;
  isGranularOverrideSaving: boolean;
  onToggleAdmin: (authUserId: string, isAdmin: boolean) => void;
  onAssignTemplate: (projectId: number | string, personId: string, templateId: string) => void;
  onAssignCompanyTemplate: (personId: string, templateId: string | null) => void;
  onSetGranularOverride: (
    personId: string,
    flag: GranularFlag,
    effect: GranularOverrideEffect | null,
  ) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <UserAvatar user={user} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold text-foreground">
                {user.fullName}
              </h2>
              {user.isAdmin && <Badge>App Admin</Badge>}
              {user.companyTemplateId && !user.isAdmin && (
                <Badge variant="outline" className="border-primary/30 text-primary">
                  All projects
                </Badge>
              )}
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {user.email || "No email"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline">{formatProjectCount(user.projectCount)}</Badge>
              <Badge variant={user.missingTemplateCount > 0 ? "secondary" : "outline"}>
                {user.assignedProjectCount} assigned
              </Badge>
              {user.missingTemplateCount > 0 && (
                <Badge variant="outline" className="border-destructive/30 text-destructive">
                  {user.missingTemplateCount} missing
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="px-0 py-1">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">Super Admin</p>
              <p className="text-xs text-muted-foreground">Full access to every project</p>
            </div>
            {user.authUserId ? (
              <Switch
                checked={user.isAdmin}
                disabled={isAdminSaving}
                onCheckedChange={(checked) => onToggleAdmin(user.authUserId!, checked)}
              />
            ) : (
              <Badge variant="outline">No auth</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Company Access */}
      <div className="space-y-3">
        <SectionRuleHeading label="Company Access" />
        <p className="text-sm text-muted-foreground">
          Assign a company-wide template to grant access to every project automatically. Project-specific assignments override this.
        </p>
        <div className="flex items-center gap-3">
          <Select
            value={user.companyTemplateId ?? "none"}
            disabled={user.isAdmin || isTemplatesLoading || isCompanyTemplateSaving || companyTemplates.length === 0}
            onValueChange={(val) => onAssignCompanyTemplate(user.personId, val === "none" ? null : val)}
          >
            <SelectTrigger className="h-9 w-64 text-sm">
              <SelectValue placeholder="No company access" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No company access</SelectItem>
              {companyTemplates.map((tpl) => (
                <SelectItem key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {user.isAdmin && (
            <p className="text-xs text-muted-foreground">Bypassed — user is Super Admin.</p>
          )}
        </div>
      </div>

      <GranularExceptionPanel
        user={user}
        templates={templates}
        companyTemplates={companyTemplates}
        isSaving={isGranularOverrideSaving}
        onSetGranularOverride={onSetGranularOverride}
      />

      {/* Project Access */}
      <div className="space-y-4">
        <div>
          <SectionRuleHeading label="Project Access" />
          <p className="text-sm text-muted-foreground">
            Assign one template per project membership.
            {user.isAdmin && " Templates are bypassed by Super Admin access."}
            {user.companyTemplateId && !user.isAdmin && " Project assignments override the company template."}
          </p>
        </div>

        {user.memberships.length === 0 ? (
          <div className="border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              This user is not a member of any project.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden border-y border-border">
            <div className="grid grid-cols-[minmax(0,1fr)_220px] gap-4 border-b border-border bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground max-sm:hidden">
              <span>Project</span>
              <span>Template</span>
            </div>
            <div className="divide-y divide-border">
              {user.memberships.map((membership) => (
                <ProjectAccessRow
                  key={`${user.personId}-${membership.projectId}`}
                  user={user}
                  membership={membership}
                  templates={templates}
                  isTemplatesLoading={isTemplatesLoading}
                  isAssignmentSaving={isAssignmentSaving}
                  onAssignTemplate={onAssignTemplate}
                />
              ))}
            </div>
          </div>
        )}
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

function getTemplateFlagsById(templates: PermissionTemplate[]) {
  return new Map(templates.map((template) => [template.id, template.granular_flags ?? []]));
}

function getInheritedGranularFlags(
  user: UserAccessSummary,
  templates: PermissionTemplate[],
  companyTemplates: PermissionTemplate[],
) {
  const flags = new Set<GranularFlag>();
  const flagsById = getTemplateFlagsById([...templates, ...companyTemplates]);
  const assignedTemplateIds = [
    user.companyTemplateId,
    ...user.memberships.map((membership) => membership.templateId),
  ].filter((id): id is string => !!id);

  for (const templateId of assignedTemplateIds) {
    for (const flag of flagsById.get(templateId) ?? []) {
      flags.add(flag);
    }
  }

  return flags;
}

function getCompanyGranularOverride(
  user: UserAccessSummary,
  flag: GranularFlag,
): GranularOverrideEffect | null {
  return (
    user.granularOverrides.find(
      (override) => override.projectId == null && override.flag === flag,
    )?.effect ?? null
  );
}

function GranularExceptionPanel({
  user,
  templates,
  companyTemplates,
  isSaving,
  onSetGranularOverride,
}: {
  user: UserAccessSummary;
  templates: PermissionTemplate[];
  companyTemplates: PermissionTemplate[];
  isSaving: boolean;
  onSetGranularOverride: (
    personId: string,
    flag: GranularFlag,
    effect: GranularOverrideEffect | null,
  ) => void;
}) {
  const inheritedFlags = getInheritedGranularFlags(user, templates, companyTemplates);
  const activeOverrideCount = user.granularOverrides.filter(
    (override) => override.projectId == null,
  ).length;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <SectionRuleHeading label="Granular Exceptions" />
          {activeOverrideCount > 0 && (
            <Badge variant="outline">{activeOverrideCount} active</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Override individual capabilities without cloning the user role. Deny takes precedence over role grants.
        </p>
      </div>

      <div className="overflow-hidden border-y border-border">
        <div className="grid grid-cols-[minmax(0,1fr)_160px] gap-4 border-b border-border bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground max-sm:hidden">
          <span>Capability</span>
          <span>Exception</span>
        </div>
        <div className="divide-y divide-border">
          {ALL_GRANULAR_FLAGS.map((flag) => {
            const override = getCompanyGranularOverride(user, flag);
            const inherited = inheritedFlags.has(flag);
            const effective = override ?? (inherited ? "allow" : "deny");

            return (
              <div
                key={flag}
                className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_160px] sm:items-center sm:gap-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {GRANULAR_FLAG_LABELS[flag] ?? flag}
                    </p>
                    {flag === "approve_change_orders" && (
                      <Badge variant="outline" className="text-xs">
                        Change orders
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {override
                      ? `${override === "allow" ? "Allowed" : "Denied"} by exception`
                      : `${inherited ? "Allowed" : "Denied"} by assigned role`}
                  </p>
                </div>

                <Select
                  value={override ?? "inherit"}
                  disabled={user.isAdmin || isSaving}
                  onValueChange={(value) => {
                    onSetGranularOverride(
                      user.personId,
                      flag,
                      value === "inherit" ? null : (value as GranularOverrideEffect),
                    );
                  }}
                >
                  <SelectTrigger className="h-9 w-full text-sm">
                    <SelectValue placeholder="Inherit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inherit">
                      Inherit ({effective === "allow" ? "Allowed" : "Denied"})
                    </SelectItem>
                    <SelectItem value="allow">Always allow</SelectItem>
                    <SelectItem value="deny">Deny</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      </div>

      {user.isAdmin && (
        <p className="text-xs text-muted-foreground">
          Exceptions are bypassed because this user is a Super Admin.
        </p>
      )}
    </div>
  );
}

function ProjectAccessRow({
  user,
  membership,
  templates,
  isTemplatesLoading,
  isAssignmentSaving,
  onAssignTemplate,
}: {
  user: UserAccessSummary;
  membership: UserAccessSummary["memberships"][number];
  templates: PermissionTemplate[];
  isTemplatesLoading: boolean;
  isAssignmentSaving: boolean;
  onAssignTemplate: (
    projectId: number | string,
    personId: string,
    templateId: string,
  ) => void;
}) {
  return (
    <div className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center sm:gap-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {membership.projectName ?? `Project #${membership.projectId}`}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Current: {membership.templateName ?? "No template"}
        </p>
      </div>
      <Select
        value={membership.templateId ?? "none"}
        disabled={isTemplatesLoading || isAssignmentSaving || templates.length === 0}
        onValueChange={(templateId) => {
          if (templateId === "none") return;
          onAssignTemplate(membership.projectId, user.personId, templateId);
        }}
      >
        <SelectTrigger className="h-9 w-full text-sm">
          <SelectValue placeholder="Select template" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none" disabled>
            No template
          </SelectItem>
          {templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              {template.name}
              {template.is_system ? " (System)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function UserAvatar({
  user,
  size = "md",
}: {
  user: Pick<UserAccessSummary, "fullName" | "initials" | "profilePhotoUrl">;
  size?: "md" | "lg";
}) {
  return (
    <Avatar className={cn(size === "lg" ? "h-12 w-12" : "h-9 w-9")}>
      {user.profilePhotoUrl && (
        <AvatarImage src={user.profilePhotoUrl} alt={user.fullName} />
      )}
      <AvatarFallback>{user.initials}</AvatarFallback>
    </Avatar>
  );
}
