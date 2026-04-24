"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  ChevronRight,
  Minus,
  MoreVertical,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  X,
} from "lucide-react";

import { PermissionTemplateForm } from "./permission-template-form";
import { PageShell, SectionRuleHeading } from "@/components/layout";
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
  companyTemplateId: string | null;
  companyTemplateName: string | null;
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
  companyTemplateId: string | null;
  companyTemplateName: string | null;
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
    companyTemplateId: user.companyTemplateId,
    companyTemplateName: user.companyTemplateName,
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
  const [activeTab, setActiveTab] = useState<"users" | "company" | "project">("users");
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

  const openCreateForScope = (scope: TemplateScope) => {
    setCreateScope(scope);
    setShowCreate(true);
  };

  return (
    <PageShell
      variant="dashboard"
      title="Permissions"
      description="Control app admin access and project permission templates."
      contentClassName="space-y-6"
    >
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList variant="line">
            <TabsTrigger value="users">User Access</TabsTrigger>
            <TabsTrigger value="company">Company Templates</TabsTrigger>
            <TabsTrigger value="project">Project Templates</TabsTrigger>
          </TabsList>
          <div className="flex min-w-0 items-center justify-end gap-2">
            {activeTab === "users" && (
              <ExpandableSearch
                value={searchValue}
                onChange={setSearchValue}
                placeholder="Search users..."
              />
            )}
            {activeTab === "company" && (
              <Button size="sm" variant="outline" onClick={() => openCreateForScope("company")}>
                <Plus className="h-4 w-4" />
                New Template
              </Button>
            )}
            {activeTab === "project" && (
              <Button size="sm" onClick={() => openCreateForScope("project")}>
                <Plus className="h-4 w-4" />
                New Template
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="users" className="mt-6">
          <AccessWorkspace
            users={filteredUsers}
            allUserCount={users.length}
            selectedUser={selectedUser}
            templates={templates}
            companyTemplates={companyTemplatesQuery.data ?? []}
            isLoading={usersQuery.isLoading}
            isTemplatesLoading={allTemplatesQuery.isLoading}
            isAdminSaving={adminMutation.isPending}
            isAssignmentSaving={assignMutation.isPending}
            isCompanyTemplateSaving={companyTemplateMutation.isPending}
            onSelectUser={setSelectedUserId}
            onToggleAdmin={(authUserId, isAdmin) =>
              adminMutation.mutate({ authUserId, isAdmin })
            }
            onAssignTemplate={(projectId, personId, templateId) =>
              assignMutation.mutate({ projectId, personId, templateId })
            }
            onAssignCompanyTemplate={(personId, templateId) =>
              companyTemplateMutation.mutate({ personId, templateId })
            }
          />
        </TabsContent>

        <TabsContent value="company" className="mt-6">
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
        </TabsContent>

        <TabsContent value="project" className="mt-6">
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

function ExpandableSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  useEffect(() => {
    if (value) setExpanded(true);
  }, [value]);

  if (!expanded) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Search users"
        onClick={() => setExpanded(true)}
        className="h-8 w-8 text-muted-foreground"
      >
        <Search className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="relative flex min-w-0 items-center">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => {
          if (!value) setExpanded(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onChange("");
            setExpanded(false);
          }
        }}
        placeholder={placeholder}
        className="h-8 w-36 pl-8 pr-8 text-sm sm:w-44"
        aria-label="Search users"
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Clear search"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="absolute right-0 top-0 h-8 w-8 text-muted-foreground"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

function AccessWorkspace({
  users,
  allUserCount,
  selectedUser,
  templates,
  companyTemplates,
  isLoading,
  isTemplatesLoading,
  isAdminSaving,
  isAssignmentSaving,
  isCompanyTemplateSaving,
  onSelectUser,
  onToggleAdmin,
  onAssignTemplate,
  onAssignCompanyTemplate,
}: {
  users: UserAccessSummary[];
  allUserCount: number;
  selectedUser: UserAccessSummary | null;
  templates: PermissionTemplate[];
  companyTemplates: PermissionTemplate[];
  isLoading: boolean;
  isTemplatesLoading: boolean;
  isAdminSaving: boolean;
  isAssignmentSaving: boolean;
  isCompanyTemplateSaving: boolean;
  onSelectUser: (userId: string) => void;
  onToggleAdmin: (authUserId: string, isAdmin: boolean) => void;
  onAssignTemplate: (
    projectId: number | string,
    personId: string,
    templateId: string,
  ) => void;
  onAssignCompanyTemplate: (personId: string, templateId: string | null) => void;
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
    <div className="grid min-h-screen gap-x-12 gap-y-6 xl:grid-cols-[minmax(320px,420px)_1fr]">
      <section className="space-y-4">
        <div>
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
            companyTemplates={companyTemplates}
            isTemplatesLoading={isTemplatesLoading}
            isAdminSaving={isAdminSaving}
            isAssignmentSaving={isAssignmentSaving}
            isCompanyTemplateSaving={isCompanyTemplateSaving}
            onToggleAdmin={onToggleAdmin}
            onAssignTemplate={onAssignTemplate}
            onAssignCompanyTemplate={onAssignCompanyTemplate}
          />
        ) : (
          <div className="flex h-full min-h-96 items-center justify-center border border-dashed border-border">
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
        "h-auto w-full justify-start gap-3 rounded-none px-2 py-3 text-left transition-colors sm:px-0",
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
  companyTemplates,
  isTemplatesLoading,
  isAdminSaving,
  isAssignmentSaving,
  isCompanyTemplateSaving,
  onToggleAdmin,
  onAssignTemplate,
  onAssignCompanyTemplate,
}: {
  user: UserAccessSummary;
  templates: PermissionTemplate[];
  companyTemplates: PermissionTemplate[];
  isTemplatesLoading: boolean;
  isAdminSaving: boolean;
  isAssignmentSaving: boolean;
  isCompanyTemplateSaving: boolean;
  onToggleAdmin: (authUserId: string, isAdmin: boolean) => void;
  onAssignTemplate: (projectId: number | string, personId: string, templateId: string) => void;
  onAssignCompanyTemplate: (personId: string, templateId: string | null) => void;
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
