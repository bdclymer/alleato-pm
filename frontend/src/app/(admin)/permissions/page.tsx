"use client";

import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ds";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UnifiedTablePage,
} from "@/components/tables/unified";
import type { ColumnConfig, TableColumn } from "@/components/tables/unified";
import { PermissionTemplateForm } from "./permission-template-form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Columns3, Minus, MoreVertical, Plus, Search, ShieldCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { ALL_MODULES, GRANULAR_FLAG_LABELS } from "@/lib/permissions-shared";
import type {
  PermissionTemplate,
  PermissionModule,
  PermissionLevel,
  GranularFlag,
} from "@/lib/permissions-shared";

type TemplateScope = "company" | "project";

type PermissionUser = {
  personId: string;
  authUserId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  profilePhotoUrl: string | null;
  isAdmin: boolean;
  memberships: Array<{
    projectId: number | string;
    projectName: string | null;
    templateId: string | null;
    templateName: string | null;
  }>;
};

// Flat row type for the table — one row per user
interface UserTableRow {
  id: string;
  personId: string;
  authUserId: string | null;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePhotoUrl: string | null;
  isAdmin: boolean;
  projectCount: number;
  templateName: string;
  memberships: PermissionUser["memberships"];
}

const MODULE_LABELS: Record<PermissionModule, string> = {
  directory:     "Directory",
  budget:        "Budget",
  contracts:     "Contracts",
  documents:     "Documents",
  schedule:      "Schedule",
  submittals:    "Submittals",
  rfis:          "RFIs",
  change_orders: "Change Orders",
};

const LEVEL_ORDER: PermissionLevel[] = ["read", "write", "admin"];

const LEVEL_LABELS: Record<PermissionLevel, string> = {
  none:  "None",
  read:  "Read",
  write: "Write",
  admin: "Admin",
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

async function fetchUsers(): Promise<PermissionUser[]> {
  const { data } = await apiFetch<{ data: PermissionUser[] }>(
    "/api/permissions/users",
  );
  return data;
}

// ---------------------------------------------------------------------------
// Column config for UnifiedTablePage
// ---------------------------------------------------------------------------

const userColumns: ColumnConfig[] = [
  { id: "fullName", label: "Name", alwaysVisible: true },
  { id: "email", label: "Email", defaultVisible: true },
  { id: "isAdmin", label: "Admin", defaultVisible: true },
  { id: "projectCount", label: "Projects", defaultVisible: true },
  { id: "templateName", label: "Primary Template", defaultVisible: true },
];

const userDefaultVisibleColumns = userColumns
  .filter((c) => c.defaultVisible !== false)
  .map((c) => c.id);

function getInitials(firstName: string, lastName: string): string {
  return [firstName, lastName]
    .map((n) => n.charAt(0))
    .filter(Boolean)
    .join("")
    .toUpperCase() || "?";
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PermissionsAdminPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"users" | "company" | "project">("users");

  const [showCreate, setShowCreate] = useState(false);
  const [createScope, setCreateScope] = useState<TemplateScope>("project");
  const [editTarget, setEditTarget] = useState<PermissionTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PermissionTemplate | null>(null);

  const companyTemplatesQuery = useQuery({
    queryKey: ["permission-templates", "company"],
    queryFn: () => fetchTemplates("company"),
  });
  const projectTemplatesQuery = useQuery({
    queryKey: ["permission-templates", "project"],
    queryFn: () => fetchTemplates("project"),
  });
  const allTemplatesQuery = useQuery({
    queryKey: ["permission-templates", "all"],
    queryFn: fetchAllTemplates,
  });
  const usersQuery = useQuery({
    queryKey: ["permission-users"],
    queryFn: fetchUsers,
  });

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
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      scope,
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
  });

  // Search state shared between toolbar slot and users table
  const [usersSearch, setUsersSearch] = useState("");
  const [usersVisibleColumns, setUsersVisibleColumns] = useState(userDefaultVisibleColumns);

  const openCreateForScope = (scope: TemplateScope) => {
    setCreateScope(scope);
    setShowCreate(true);
  };

  return (
    <PageShell
      variant="dashboard"
      title="Permissions"
    >
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <div className="flex items-center justify-between">
          <TabsList variant="line">
            <TabsTrigger value="users">User Permissions</TabsTrigger>
            <TabsTrigger value="company">Company Templates</TabsTrigger>
            <TabsTrigger value="project">Project Templates</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            {activeTab === "users" && (
              <UsersToolbarSlot
              searchValue={usersSearch}
              onSearchChange={setUsersSearch}
              visibleColumns={usersVisibleColumns}
              onVisibleColumnsChange={setUsersVisibleColumns}
            />
            )}
            {activeTab === "company" && (
              <Button size="sm" onClick={() => openCreateForScope("company")}>
                <Plus className="mr-1.5 h-4 w-4" />
                New Template
              </Button>
            )}
            {activeTab === "project" && (
              <Button size="sm" onClick={() => openCreateForScope("project")}>
                <Plus className="mr-1.5 h-4 w-4" />
                New Template
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="users" className="mt-0">
          <UsersTableTab
            users={usersQuery.data ?? []}
            isLoading={usersQuery.isLoading}
            templates={allTemplatesQuery.data ?? []}
            searchValue={usersSearch}
            visibleColumns={usersVisibleColumns}
            onRefresh={() => {
              qc.invalidateQueries({ queryKey: ["permission-users"] });
            }}
          />
        </TabsContent>

        <TabsContent value="company" className="mt-4">
          <TemplatesTab
            scope="company"
            templates={companyTemplatesQuery.data ?? []}
            isLoading={companyTemplatesQuery.isLoading}
            emptyTitle="No company templates"
            emptyDescription="Company templates are reusable across every project. Create one to define default access for roles that apply company-wide."
            onCreateEmpty={() => openCreateForScope("company")}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
          />
        </TabsContent>

        <TabsContent value="project" className="mt-4">
          <TemplatesTab
            scope="project"
            templates={projectTemplatesQuery.data ?? []}
            isLoading={projectTemplatesQuery.isLoading}
            emptyTitle="No project templates"
            emptyDescription="Project templates apply to a specific project's directory. Create one to define custom access for that project only."
            onCreateEmpty={() => openCreateForScope("project")}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
          />
        </TabsContent>
      </Tabs>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              New {createScope === "company" ? "Company" : "Project"} Template
            </DialogTitle>
          </DialogHeader>
          <PermissionTemplateForm
            onSave={(data) => createMutation.mutateAsync(data)}
            onCancel={() => setShowCreate(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Template — {editTarget?.name}
              {editTarget?.is_system && (
                <Badge variant="outline" className="ml-2 text-xs align-middle">System</Badge>
              )}
            </DialogTitle>
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

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong>. Members using
              this template will retain their existing access until reassigned.
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
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// UsersToolbarSlot — search + column toggle rendered inline with tabs
// ---------------------------------------------------------------------------

function UsersToolbarSlot({
  searchValue,
  onSearchChange,
  visibleColumns,
  onVisibleColumnsChange,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  visibleColumns: string[];
  onVisibleColumnsChange: (cols: string[]) => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex items-center gap-1.5">
      {searchOpen ? (
        <Input
          autoFocus
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search users..."
          className="h-8 w-48 text-sm"
          onBlur={() => {
            if (!searchValue) setSearchOpen(false);
          }}
        />
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-4 w-4" />
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Columns3 className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {userColumns.map((col) => (
            <DropdownMenuItem
              key={col.id}
              onClick={() => {
                onVisibleColumnsChange(
                  visibleColumns.includes(col.id)
                    ? visibleColumns.filter((c) => c !== col.id)
                    : [...visibleColumns, col.id]
                );
              }}
            >
              <span className={cn(
                "mr-2 h-4 w-4 flex items-center justify-center",
                visibleColumns.includes(col.id) ? "text-primary" : "text-transparent"
              )}>
                <Check className="h-3.5 w-3.5" />
              </span>
              {col.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ---------------------------------------------------------------------------
// UsersTableTab — UnifiedTablePage with avatar, admin toggle, template assign
// ---------------------------------------------------------------------------

function UsersTableTab({
  users,
  isLoading,
  templates,
  searchValue,
  visibleColumns,
  onRefresh,
}: {
  users: PermissionUser[];
  isLoading: boolean;
  templates: PermissionTemplate[];
  searchValue: string;
  visibleColumns: string[];
  onRefresh: () => void;
}) {
  const adminMutation = useMutation({
    mutationFn: async ({ authUserId, isAdmin }: { authUserId: string; isAdmin: boolean }) => {
      await apiFetch("/api/admin/set-admin-status", {
        method: "POST",
        body: JSON.stringify({ auth_user_id: authUserId, is_admin: isAdmin }),
      });
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.isAdmin ? "Admin access granted" : "Admin access removed");
      onRefresh();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update");
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
      toast.success("Template assigned");
      onRefresh();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to assign");
    },
  });

  // Local sorting and pagination state (search + columns from parent)
  const [sortBy, setSortBy] = useState<string | null>("fullName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);

  // Transform to flat rows
  const hasSearch = searchValue.trim().length > 0;
  const tableData = useMemo<UserTableRow[]>(() => {
    const search = searchValue.trim().toLowerCase();

    return users
      .map((user) => {
        const fullName =
          [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "(no name)";
        const primaryTemplate = user.memberships.length > 0
          ? user.memberships[0].templateName ?? "No template"
          : user.isAdmin ? "App Admin" : "No template";

        return {
          id: user.personId,
          personId: user.personId,
          authUserId: user.authUserId,
          fullName,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profilePhotoUrl: user.profilePhotoUrl,
          isAdmin: user.isAdmin,
          projectCount: user.memberships.length,
          templateName: primaryTemplate,
          memberships: user.memberships,
        };
      })
      .filter((row) => {
        if (!search) return true;
        return (
          row.fullName.toLowerCase().includes(search) ||
          row.email.toLowerCase().includes(search) ||
          row.templateName.toLowerCase().includes(search)
        );
      });
  }, [users, searchValue]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(tableData.length / perPage));

  // Build columns with avatar
  const tableColumns = useMemo<TableColumn<UserTableRow>[]>(
    () => [
      {
        ...userColumns[0],
        render: (item: UserTableRow) => (
          <div className="flex items-center gap-3">
            <Avatar size="sm">
              {item.profilePhotoUrl && (
                <AvatarImage src={item.profilePhotoUrl} alt={item.fullName} />
              )}
              <AvatarFallback>{getInitials(item.firstName, item.lastName)}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{item.fullName}</span>
          </div>
        ),
        sortValue: (item: UserTableRow) => item.fullName,
        csvValue: (item: UserTableRow) => item.fullName,
      },
      {
        ...userColumns[1],
        render: (item: UserTableRow) => (
          <span className="text-muted-foreground">{item.email || "—"}</span>
        ),
        sortValue: (item: UserTableRow) => item.email,
        csvValue: (item: UserTableRow) => item.email,
      },
      {
        ...userColumns[2],
        render: (item: UserTableRow) =>
          item.authUserId ? (
            <Switch
              checked={item.isAdmin}
              disabled={adminMutation.isPending}
              onCheckedChange={(checked) => {
                adminMutation.mutate({
                  authUserId: item.authUserId!,
                  isAdmin: checked,
                });
              }}
            />
          ) : (
            <span className="text-xs text-muted-foreground">No auth</span>
          ),
        sortValue: (item: UserTableRow) => (item.isAdmin ? 1 : 0),
        csvValue: (item: UserTableRow) => (item.isAdmin ? "Yes" : "No"),
      },
      {
        ...userColumns[3],
        render: (item: UserTableRow) => (
          <span>
            {item.projectCount}
            {item.projectCount === 1 ? " project" : " projects"}
          </span>
        ),
        sortValue: (item: UserTableRow) => item.projectCount,
        csvValue: (item: UserTableRow) => String(item.projectCount),
      },
      {
        ...userColumns[4],
        render: (item: UserTableRow) => {
          if (item.isAdmin) {
            return <Badge variant="default" className="text-xs">App Admin</Badge>;
          }
          if (item.memberships.length === 0) {
            return <span className="text-xs text-muted-foreground">No projects</span>;
          }
          return (
            <span className="text-sm">{item.templateName}</span>
          );
        },
        sortValue: (item: UserTableRow) => item.templateName,
        csvValue: (item: UserTableRow) => item.templateName,
      },
    ],
    [adminMutation],
  );

  // Expanded row with per-project template assignments
  const renderExpandedRow = useCallback(
    (item: UserTableRow, _colSpan: number) => (
      <div className="px-6 py-4 space-y-3">
        {item.isAdmin && (
          <p className="text-sm text-muted-foreground">
            App admin — has full access to every project regardless of template.
          </p>
        )}
        {item.memberships.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not a member of any project.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Project Assignments
            </p>
            {item.memberships.map((m) => (
              <div
                key={`${item.personId}-${m.projectId}`}
                className="flex items-center justify-between gap-4 py-1"
              >
                <span className="text-sm text-foreground min-w-0 truncate">
                  {m.projectName ?? `Project #${m.projectId}`}
                </span>
                <Select
                  value={m.templateId ?? "none"}
                  onValueChange={(value) => {
                    if (value === "none") return;
                    assignMutation.mutate({
                      projectId: m.projectId,
                      personId: item.personId,
                      templateId: value,
                    });
                  }}
                >
                  <SelectTrigger className="w-52 h-8 text-xs shrink-0">
                    <SelectValue placeholder="No template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>
                      No template
                    </SelectItem>
                    {templates.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>
                        {tpl.name}
                        {tpl.is_system ? " (System)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    [templates, assignMutation],
  );

  return (
    <div className="[&_thead]:!bg-primary/5 [&_thead_th]:!bg-primary/5">
    <UnifiedTablePage<UserTableRow>
      header={{ title: "" }}
      layout={{ toolbarInlineWithHeader: true, containerClassName: "pt-0" }}
      toolbar={{
        totalItems: users.length,
        filteredItems: tableData.length,
        selectedCount: 0,
        searchValue: searchValue,
        onSearchChange: () => {},
        currentView: "table" as const,
        onViewChange: () => {},
        enabledViews: ["table"],
        visibleColumns,
      }}
      features={{
        enableSearch: false,
        enableViews: false,
        enableColumnToggle: false,
        enableFilters: false,
        enableExport: false,
        enableRowSelection: false,
      }}
      data={{
        items: tableData,
        isLoading,
      }}
      table={{
        columns: tableColumns,
        getRowId: (item) => item.id,
        renderExpandedRow,
      }}
      sorting={{
        sortBy,
        sortDirection,
        onSortChange: (col, dir) => {
          setSortBy(col);
          setSortDirection(dir);
        },
      }}
      pagination={{
        page,
        totalPages,
        perPage,
        onPageChange: setPage,
        onPerPageChange: (val) => setPerPage(Number(val)),
        clientSide: true,
      }}
      emptyState={{
        title: "No users found",
        description: "No people in the directory have auth accounts yet.",
        filteredDescription: "No users match your search. Try a different query.",
        isFiltered: hasSearch,
      }}
    />
    </div>
  );
}

// ---------------------------------------------------------------------------
// TemplatesTab — renders System + Custom sections for a given scope
// ---------------------------------------------------------------------------

function TemplatesTab({
  scope,
  templates,
  isLoading,
  emptyTitle,
  emptyDescription,
  onCreateEmpty,
  onEdit,
  onDelete,
}: {
  scope: TemplateScope;
  templates: PermissionTemplate[];
  isLoading: boolean;
  emptyTitle: string;
  emptyDescription: string;
  onCreateEmpty: () => void;
  onEdit: (tpl: PermissionTemplate) => void;
  onDelete: (tpl: PermissionTemplate) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const systemTemplates = templates.filter((t) => t.is_system);
  const customTemplates = templates.filter((t) => !t.is_system);

  if (templates.length === 0) {
    return (
      <EmptyState
        icon={<ShieldCheck className="h-6 w-6" />}
        title={emptyTitle}
        description={emptyDescription}
        action={{
          label: `New ${scope === "company" ? "Company" : "Project"} Template`,
          onClick: onCreateEmpty,
        }}
      />
    );
  }

  return (
    <div className="space-y-8">
      {systemTemplates.length > 0 && (
        <section className="space-y-3">
          <div className="space-y-3">
            {systemTemplates.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                isSystem
                onEdit={() => onEdit(tpl)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Custom Templates
        </h2>
        {customTemplates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No custom templates yet. Use the button above to create one.
          </p>
        ) : (
          <div className="space-y-3">
            {customTemplates.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                onEdit={() => onEdit(tpl)}
                onDelete={() => onDelete(tpl)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TemplateCard
// ---------------------------------------------------------------------------

function TemplateCard({
  template,
  isSystem = false,
  onEdit,
  onDelete,
}: {
  template: PermissionTemplate;
  isSystem?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{template.name}</h3>
            {isSystem && (
              <Badge variant="outline" className="shrink-0 text-xs">System</Badge>
            )}
          </div>
          {template.description && (
            <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
          )}
        </div>
        {(onEdit || (!isSystem && onDelete)) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  Edit
                </DropdownMenuItem>
              )}
              {!isSystem && onDelete && (
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <PermissionMatrix rules={template.rules_json} />
      <GranularFlags flags={template.granular_flags ?? []} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// GranularFlags
// ---------------------------------------------------------------------------

function GranularFlags({ flags }: { flags: GranularFlag[] }) {
  if (flags.length === 0) {
    return (
      <div className="pt-2 border-t border-border">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Granular permissions
        </p>
        <p className="text-xs text-muted-foreground">None granted.</p>
      </div>
    );
  }

  return (
    <div className="pt-2 border-t border-border">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
        Granular permissions
      </p>
      <ul className="space-y-1">
        {flags.map((flag) => (
          <li key={flag} className="flex items-center gap-2 text-sm text-foreground">
            <Check className="h-3.5 w-3.5 text-primary shrink-0" strokeWidth={2.5} />
            {GRANULAR_FLAG_LABELS[flag] ?? flag}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PermissionMatrix — module × level grid
// ---------------------------------------------------------------------------

function PermissionMatrix({
  rules,
}: {
  rules: Record<PermissionModule, PermissionLevel[]>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left font-medium text-muted-foreground py-2 pr-4">
              Module
            </th>
            {LEVEL_ORDER.map((level) => (
              <th
                key={level}
                className="text-center font-medium text-muted-foreground py-2 px-3 w-20"
              >
                {LEVEL_LABELS[level]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ALL_MODULES.map((module) => {
            const granted = rules[module] ?? [];
            const hasAny = granted.length > 0;
            return (
              <tr key={module} className="border-b border-border/50 last:border-b-0">
                <td
                  className={cn(
                    "py-2 pr-4 font-medium",
                    hasAny ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {MODULE_LABELS[module]}
                  {!hasAny && (
                    <span className="ml-2 text-xs text-muted-foreground font-normal">
                      — no access
                    </span>
                  )}
                </td>
                {LEVEL_ORDER.map((level) => {
                  const isGranted = granted.includes(level);
                  return (
                    <td key={level} className="text-center py-2 px-3">
                      {isGranted ? (
                        <Check className="h-4 w-4 text-primary inline-block" strokeWidth={2.5} />
                      ) : (
                        <Minus className="h-4 w-4 text-muted-foreground/30 inline-block" />
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
