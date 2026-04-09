"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { EmptyState } from "@/components/ds";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionTemplateForm } from "./permission-template-form";
import { Check, Minus, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
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
  isAdmin: boolean;
  memberships: Array<{
    projectId: number | string;
    projectName: string | null;
    templateId: string | null;
    templateName: string | null;
  }>;
};

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
  const res = await fetch(`/api/permissions/templates?scope=${scope}`);
  if (!res.ok) throw new Error("Failed to load templates");
  const { data } = await res.json();
  return data;
}

async function fetchUsers(): Promise<PermissionUser[]> {
  const res = await fetch("/api/permissions/users");
  if (!res.ok) throw new Error("Failed to load users");
  const { data } = await res.json();
  return data;
}

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
      const res = await fetch("/api/permissions/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, scope: createScope }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to create template");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permission-templates", createScope] });
      setShowCreate(false);
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
      const res = await fetch(`/api/permissions/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to update template");
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["permission-templates", variables.scope] });
      setEditTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id }: { id: string; scope: TemplateScope }) => {
      const res = await fetch(`/api/permissions/templates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to delete template");
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["permission-templates", variables.scope] });
      setDeleteTarget(null);
    },
  });

  const openCreateForScope = (scope: TemplateScope) => {
    setCreateScope(scope);
    setShowCreate(true);
  };

  return (
    <PageShell
      variant="content"
      title="Permissions"
      description="Manage users, company permission templates, and project permission templates."
      actions={
        activeTab === "company" ? (
          <Button onClick={() => openCreateForScope("company")}>
            New Company Template
          </Button>
        ) : activeTab === "project" ? (
          <Button onClick={() => openCreateForScope("project")}>
            New Project Template
          </Button>
        ) : null
      }
    >
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="mb-6">
          <TabsTrigger value="users">User Permissions</TabsTrigger>
          <TabsTrigger value="company">Company Templates</TabsTrigger>
          <TabsTrigger value="project">Project Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersTab users={usersQuery.data ?? []} isLoading={usersQuery.isLoading} />
        </TabsContent>

        <TabsContent value="company">
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

        <TabsContent value="project">
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
        <DialogContent className="max-w-lg">
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
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
        action={
          <Button onClick={onCreateEmpty}>
            New {scope === "company" ? "Company" : "Project"} Template
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      {systemTemplates.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            System Templates
          </h2>
          <div className="space-y-3">
            {systemTemplates.map((tpl) => (
              <TemplateCard key={tpl.id} template={tpl} readOnly />
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
// UsersTab — list users with their role + per-project template assignments
// ---------------------------------------------------------------------------

function UsersTab({
  users,
  isLoading,
}: {
  users: PermissionUser[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <EmptyState
        icon={<ShieldCheck className="h-6 w-6" />}
        title="No users found"
        description="No people in the directory have auth accounts yet."
      />
    );
  }

  return (
    <div className="space-y-3">
      {users.map((user) => {
        const displayName =
          [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "(no name)";
        return (
          <div
            key={user.personId}
            className="rounded-lg border border-border bg-card p-5 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold text-foreground">{displayName}</h3>
                  {user.isAdmin && (
                    <Badge variant="default" className="shrink-0 text-xs">
                      App Admin
                    </Badge>
                  )}
                </div>
                {user.email && (
                  <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
                )}
              </div>
            </div>

            {user.memberships.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {user.isAdmin
                  ? "App admin — full access to every project by default."
                  : "Not a member of any project."}
              </p>
            ) : (
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Project memberships
                </p>
                <ul className="space-y-1.5">
                  {user.memberships.map((m) => (
                    <li
                      key={`${user.personId}-${m.projectId}`}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="text-foreground">
                        {m.projectName ?? `Project #${m.projectId}`}
                      </span>
                      <span className="text-muted-foreground">
                        {m.templateName ?? "— no template"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TemplateCard
// ---------------------------------------------------------------------------

function TemplateCard({
  template,
  readOnly = false,
  onEdit,
  onDelete,
}: {
  template: PermissionTemplate;
  readOnly?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{template.name}</h3>
            {readOnly && (
              <Badge variant="outline" className="shrink-0 text-xs">System</Badge>
            )}
          </div>
          {template.description && (
            <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
          )}
        </div>
        {!readOnly && (
          <div className="flex gap-1.5 shrink-0">
            <Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      <PermissionMatrix rules={template.rules_json} />
      <GranularFlags flags={template.granular_flags ?? []} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// GranularFlags — Procore-style named capabilities layered on top of modules
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
