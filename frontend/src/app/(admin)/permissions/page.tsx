"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  ChevronRight,
  Columns3,
  LockKeyhole,
  Minus,
  MoreVertical,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";

import { PermissionTemplateForm } from "./permission-template-form";
import { PageShell } from "@/components/layout";
import { EmptyState } from "@/components/ds";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { ALL_MODULES, GRANULAR_FLAG_LABELS } from "@/lib/permissions-shared";
import type {
  GranularFlag,
  PermissionLevel,
  PermissionModule,
  PermissionTemplate,
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

type UserAccessSummary = {
  id: string;
  personId: string;
  authUserId: string | null;
  fullName: string;
  initials: string;
  email: string;
  profilePhotoUrl: string | null;
  isAdmin: boolean;
  projectCount: number;
  assignedProjectCount: number;
  missingTemplateCount: number;
  primaryTemplateName: string;
  memberships: PermissionUser["memberships"];
};

const MODULE_LABELS: Record<PermissionModule, string> = {
  directory: "Directory",
  budget: "Budget",
  contracts: "Contracts",
  documents: "Documents",
  schedule: "Schedule",
  submittals: "Submittals",
  rfis: "RFIs",
  change_orders: "Change Orders",
};

const LEVEL_ORDER: PermissionLevel[] = ["read", "write", "admin"];

const LEVEL_LABELS: Record<PermissionLevel, string> = {
  none: "None",
  read: "Read",
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
    : user.memberships[0]?.templateName ?? "No template";

  return {
    id: user.personId,
    personId: user.personId,
    authUserId: user.authUserId,
    fullName,
    initials: getInitials(user.firstName, user.lastName, user.email),
    email: user.email,
    profilePhotoUrl: user.profilePhotoUrl,
    isAdmin: user.isAdmin,
    projectCount: user.memberships.length,
    assignedProjectCount,
    missingTemplateCount,
    primaryTemplateName,
    memberships: user.memberships,
  };
}

function formatProjectCount(count: number) {
  return `${count} ${count === 1 ? "project" : "projects"}`;
}

export default function PermissionsAdminPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"users" | "templates">("users");
  const [searchValue, setSearchValue] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createScope, setCreateScope] = useState<TemplateScope>("project");
  const [editTarget, setEditTarget] = useState<PermissionTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PermissionTemplate | null>(null);

  const usersQuery = useQuery({
    queryKey: ["permission-users"],
    queryFn: fetchUsers,
  });

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

  const users = useMemo(
    () => (usersQuery.data ?? []).map(toAccessSummary),
    [usersQuery.data],
  );

  const filteredUsers = useMemo(() => {
    const search = searchValue.trim().toLowerCase();

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
  }, [searchValue, users]);

  useEffect(() => {
    if (filteredUsers.length === 0) {
      setSelectedUserId(null);
      return;
    }

    setSelectedUserId((current) => {
      if (current && filteredUsers.some((user) => user.id === current)) {
        return current;
      }
      return filteredUsers[0].id;
    });
  }, [filteredUsers]);

  const selectedUser = filteredUsers.find((user) => user.id === selectedUserId) ?? null;
  const templates = allTemplatesQuery.data ?? [];

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

  const openCreateForScope = (scope: TemplateScope) => {
    setCreateScope(scope);
    setShowCreate(true);
  };

  const metrics = {
    totalUsers: users.length,
    appAdmins: users.filter((user) => user.isAdmin).length,
    missingTemplates: users.reduce(
      (sum, user) => sum + user.missingTemplateCount,
      0,
    ),
    templates: templates.length,
  };

  return (
    <PageShell
      variant="dashboard"
      title="Permissions"
      description="Control app admin access and project permission templates."
      contentClassName="space-y-8"
      actions={
        <Button size="sm" onClick={() => openCreateForScope("project")}>
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      }
    >
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AccessMetric label="Users" value={metrics.totalUsers} icon={Users} />
        <AccessMetric label="App admins" value={metrics.appAdmins} icon={ShieldCheck} />
        <AccessMetric
          label="Missing templates"
          value={metrics.missingTemplates}
          icon={LockKeyhole}
          tone={metrics.missingTemplates > 0 ? "warning" : "default"}
        />
        <AccessMetric label="Templates" value={metrics.templates} icon={Columns3} />
      </section>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <TabsList variant="line">
            <TabsTrigger value="users">User Access</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>
          {activeTab === "templates" && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => openCreateForScope("company")}>
                <Plus className="h-4 w-4" />
                Company
              </Button>
              <Button size="sm" onClick={() => openCreateForScope("project")}>
                <Plus className="h-4 w-4" />
                Project
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="users" className="mt-6">
          <AccessWorkspace
            users={filteredUsers}
            allUserCount={users.length}
            selectedUser={selectedUser}
            searchValue={searchValue}
            templates={templates}
            isLoading={usersQuery.isLoading}
            isTemplatesLoading={allTemplatesQuery.isLoading}
            isAdminSaving={adminMutation.isPending}
            isAssignmentSaving={assignMutation.isPending}
            onSearchChange={setSearchValue}
            onSelectUser={setSelectedUserId}
            onToggleAdmin={(authUserId, isAdmin) =>
              adminMutation.mutate({ authUserId, isAdmin })
            }
            onAssignTemplate={(projectId, personId, templateId) =>
              assignMutation.mutate({ projectId, personId, templateId })
            }
          />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <div className="grid gap-8 xl:grid-cols-2">
            <TemplatesTab
              scope="company"
              title="Company Templates"
              templates={companyTemplatesQuery.data ?? []}
              isLoading={companyTemplatesQuery.isLoading}
              emptyTitle="No company templates"
              emptyDescription="Create a company template for access patterns used across projects."
              onCreateEmpty={() => openCreateForScope("company")}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
            />
            <TemplatesTab
              scope="project"
              title="Project Templates"
              templates={projectTemplatesQuery.data ?? []}
              isLoading={projectTemplatesQuery.isLoading}
              emptyTitle="No project templates"
              emptyDescription="Create a project template for project-specific access roles."
              onCreateEmpty={() => openCreateForScope("project")}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
            />
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-screen max-w-2xl overflow-y-auto">
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

      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent className="max-h-screen max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Template: {editTarget?.name}
              {editTarget?.is_system && (
                <Badge variant="outline" className="ml-2 align-middle text-xs">
                  System
                </Badge>
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
    </PageShell>
  );
}

function AccessMetric({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
        </div>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md border",
            tone === "warning"
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : "border-border bg-muted text-muted-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function AccessWorkspace({
  users,
  allUserCount,
  selectedUser,
  searchValue,
  templates,
  isLoading,
  isTemplatesLoading,
  isAdminSaving,
  isAssignmentSaving,
  onSearchChange,
  onSelectUser,
  onToggleAdmin,
  onAssignTemplate,
}: {
  users: UserAccessSummary[];
  allUserCount: number;
  selectedUser: UserAccessSummary | null;
  searchValue: string;
  templates: PermissionTemplate[];
  isLoading: boolean;
  isTemplatesLoading: boolean;
  isAdminSaving: boolean;
  isAssignmentSaving: boolean;
  onSearchChange: (value: string) => void;
  onSelectUser: (userId: string) => void;
  onToggleAdmin: (authUserId: string, isAdmin: boolean) => void;
  onAssignTemplate: (
    projectId: number | string,
    personId: string,
    templateId: string,
  ) => void;
}) {
  if (isLoading) {
    return <AccessWorkspaceSkeleton />;
  }

  if (allUserCount === 0) {
    return (
      <EmptyState
        icon={<UserCog className="h-6 w-6" />}
        title="No users found"
        description="No people in the directory have auth accounts yet."
      />
    );
  }

  return (
    <div className="grid min-h-screen gap-6 xl:grid-cols-[minmax(320px,420px)_1fr]">
      <section className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search users, projects, or templates"
            className="h-10 pl-9"
          />
        </div>

        <div className="rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-medium text-foreground">Users</p>
            <p className="text-xs text-muted-foreground">
              {users.length} of {allUserCount}
            </p>
          </div>
          <ScrollArea className="max-h-screen">
            {users.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted-foreground">
                No users match your search.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {users.map((user) => (
                  <UserRosterRow
                    key={user.id}
                    user={user}
                    isSelected={selectedUser?.id === user.id}
                    onSelect={() => onSelectUser(user.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </section>

      <section className="min-w-0">
        {selectedUser ? (
          <UserAccessPanel
            user={selectedUser}
            templates={templates}
            isTemplatesLoading={isTemplatesLoading}
            isAdminSaving={isAdminSaving}
            isAssignmentSaving={isAssignmentSaving}
            onToggleAdmin={onToggleAdmin}
            onAssignTemplate={onAssignTemplate}
          />
        ) : (
          <div className="flex h-full min-h-96 items-center justify-center rounded-lg border border-dashed border-border">
            <p className="text-sm text-muted-foreground">Select a user to manage access.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function UserRosterRow({
  user,
  isSelected,
  onSelect,
}: {
  user: UserAccessSummary;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onSelect}
      className={cn(
        "h-auto w-full justify-start gap-3 rounded-none px-3 py-3 text-left transition-colors",
        isSelected ? "bg-muted" : "hover:bg-muted/60",
      )}
    >
      <UserAvatar user={user} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {user.fullName}
          </span>
          {user.isAdmin && (
            <Badge variant="default" className="shrink-0 text-[11px]">
              Admin
            </Badge>
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {user.email || "No email"}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>{formatProjectCount(user.projectCount)}</span>
          {user.missingTemplateCount > 0 && (
            <span className="text-destructive">
              {user.missingTemplateCount} missing template
            </span>
          )}
        </span>
      </span>
      <ChevronRight
        className={cn(
          "h-4 w-4 shrink-0",
          isSelected ? "text-foreground" : "text-muted-foreground",
        )}
      />
    </Button>
  );
}

function UserAccessPanel({
  user,
  templates,
  isTemplatesLoading,
  isAdminSaving,
  isAssignmentSaving,
  onToggleAdmin,
  onAssignTemplate,
}: {
  user: UserAccessSummary;
  templates: PermissionTemplate[];
  isTemplatesLoading: boolean;
  isAdminSaving: boolean;
  isAssignmentSaving: boolean;
  onToggleAdmin: (authUserId: string, isAdmin: boolean) => void;
  onAssignTemplate: (
    projectId: number | string,
    personId: string,
    templateId: string,
  ) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <UserAvatar user={user} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold text-foreground">
                {user.fullName}
              </h2>
              {user.isAdmin && <Badge>App Admin</Badge>}
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

        <div className="rounded-md border border-border px-3 py-2">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">App Admin</p>
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

      <Separator />

      <div className="space-y-4 p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Project Access</h3>
            <p className="text-sm text-muted-foreground">
              Assign one template per project membership.
            </p>
          </div>
          {user.isAdmin && (
            <Badge variant="outline" className="w-fit">
              Templates are bypassed by app admin access
            </Badge>
          )}
        </div>

        {user.memberships.length === 0 ? (
          <div className="rounded-md border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              This user is not a member of any project.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <div className="grid grid-cols-[minmax(0,1fr)_220px] gap-4 border-b border-border bg-muted/50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground max-sm:hidden">
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

function AccessWorkspaceSkeleton() {
  return (
    <div className="grid min-h-screen gap-6 xl:grid-cols-[minmax(320px,420px)_1fr]">
      <div className="space-y-4">
        <div className="h-10 rounded-md bg-muted animate-pulse" />
        <div className="rounded-lg border border-border">
          <div className="h-10 border-b border-border bg-muted/60" />
          <div className="divide-y divide-border">
            {[1, 2, 3, 4, 5, 6].map((index) => (
              <div key={index} className="h-20 bg-muted/30 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
      <div className="h-screen rounded-lg border border-border bg-muted/30 animate-pulse" />
    </div>
  );
}

function TemplatesTab({
  scope,
  title,
  templates,
  isLoading,
  emptyTitle,
  emptyDescription,
  onCreateEmpty,
  onEdit,
  onDelete,
}: {
  scope: TemplateScope;
  title: string;
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
      <section className="space-y-3">
        <div className="h-6 w-48 rounded bg-muted animate-pulse" />
        {[1, 2, 3].map((index) => (
          <div key={index} className="h-28 rounded-lg border border-border bg-muted/30 animate-pulse" />
        ))}
      </section>
    );
  }

  const systemTemplates = templates.filter((template) => template.is_system);
  const customTemplates = templates.filter((template) => !template.is_system);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {templates.length} {templates.length === 1 ? "template" : "templates"}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onCreateEmpty}>
          <Plus className="h-4 w-4" />
          New
        </Button>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="h-6 w-6" />}
          title={emptyTitle}
          description={emptyDescription}
          action={
            <Button size="sm" variant="outline" onClick={onCreateEmpty}>
              <Plus className="h-4 w-4" />
              New {scope === "company" ? "Company" : "Project"} Template
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {systemTemplates.length > 0 && (
            <TemplateSection
              title="System"
              templates={systemTemplates}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          )}
          <TemplateSection
            title="Custom"
            templates={customTemplates}
            emptyText="No custom templates yet."
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      )}
    </section>
  );
}

function TemplateSection({
  title,
  templates,
  emptyText,
  onEdit,
  onDelete,
}: {
  title: string;
  templates: PermissionTemplate[];
  emptyText?: string;
  onEdit: (tpl: PermissionTemplate) => void;
  onDelete: (tpl: PermissionTemplate) => void;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() => onEdit(template)}
              onDelete={template.is_system ? undefined : () => onDelete(template)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  template,
  onEdit,
  onDelete,
}: {
  template: PermissionTemplate;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{template.name}</h3>
            {template.is_system && (
              <Badge variant="outline" className="text-xs">
                System
              </Badge>
            )}
          </div>
          {template.description && (
            <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
          )}
        </div>
        {(onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>}
              {onDelete && (
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="mt-4 space-y-4">
        <PermissionMatrix rules={template.rules_json} />
        <GranularFlags flags={template.granular_flags ?? []} />
      </div>
    </div>
  );
}

function GranularFlags({ flags }: { flags: GranularFlag[] }) {
  return (
    <div className="border-t border-border pt-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Granular permissions
      </p>
      {flags.length === 0 ? (
        <p className="text-xs text-muted-foreground">None granted.</p>
      ) : (
        <ul className="grid gap-1 sm:grid-cols-2">
          {flags.map((flag) => (
            <li key={flag} className="flex items-center gap-2 text-sm text-foreground">
              <Check className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.5} />
              <span>{GRANULAR_FLAG_LABELS[flag] ?? flag}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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
            <th className="py-2 pr-4 text-left font-medium text-muted-foreground">
              Module
            </th>
            {LEVEL_ORDER.map((level) => (
              <th
                key={level}
                className="w-20 px-3 py-2 text-center font-medium text-muted-foreground"
              >
                {LEVEL_LABELS[level]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ALL_MODULES.map((module) => {
            const granted = rules[module] ?? [];
            const hasAny = granted.some((level) => level !== "none");

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
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      no access
                    </span>
                  )}
                </td>
                {LEVEL_ORDER.map((level) => {
                  const isGranted = granted.includes(level);
                  return (
                    <td key={level} className="px-3 py-2 text-center">
                      {isGranted ? (
                        <Check className="inline-block h-4 w-4 text-primary" strokeWidth={2.5} />
                      ) : (
                        <Minus className="inline-block h-4 w-4 text-muted-foreground/30" />
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
