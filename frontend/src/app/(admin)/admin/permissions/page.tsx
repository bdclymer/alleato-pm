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
import { PermissionTemplateForm } from "./permission-template-form";
import type { PermissionTemplate, PermissionModule, PermissionLevel } from "@/lib/permissions";

const MODULE_LABELS: Record<string, string> = {
  directory:     "Directory",
  budget:        "Budget",
  contracts:     "Contracts",
  documents:     "Documents",
  schedule:      "Schedule",
  submittals:    "Submittals",
  rfis:          "RFIs",
  change_orders: "Change Orders",
};

const LEVEL_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  admin: "default",
  write: "secondary",
  read:  "outline",
  none:  "destructive",
};

async function fetchTemplates(): Promise<PermissionTemplate[]> {
  const res = await fetch("/api/permissions/templates");
  if (!res.ok) throw new Error("Failed to load templates");
  const { data } = await res.json();
  return data;
}

export default function PermissionsAdminPage() {
  const qc = useQueryClient();
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["permission-templates"],
    queryFn: fetchTemplates,
  });

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<PermissionTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PermissionTemplate | null>(null);

  const createMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      description: string;
      rules_json: Record<PermissionModule, PermissionLevel[]>;
    }) => {
      const res = await fetch("/api/permissions/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to create template");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permission-templates"] });
      setShowCreate(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      name: string;
      description: string;
      rules_json: Record<PermissionModule, PermissionLevel[]>;
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permission-templates"] });
      setEditTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/permissions/templates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to delete template");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permission-templates"] });
      setDeleteTarget(null);
    },
  });

  const systemTemplates = templates.filter((t) => t.is_system);
  const customTemplates = templates.filter((t) => !t.is_system);

  return (
    <PageShell
      variant="content"
      title="Permission Templates"
      description="Define reusable permission sets that can be assigned to project members."
      actions={
        <Button onClick={() => setShowCreate(true)}>
          New Template
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              System Templates
            </h2>
            {systemTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No system templates found.</p>
            ) : (
              <div className="space-y-3">
                {systemTemplates.map((tpl) => (
                  <TemplateCard key={tpl.id} template={tpl} readOnly />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Custom Templates
            </h2>
            {customTemplates.length === 0 ? (
              <EmptyState
                title="No custom templates"
                description="Create a template to define custom permission sets for your team."
              />
            ) : (
              <div className="space-y-3">
                {customTemplates.map((tpl) => (
                  <TemplateCard
                    key={tpl.id}
                    template={tpl}
                    onEdit={() => setEditTarget(tpl)}
                    onDelete={() => setDeleteTarget(tpl)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Permission Template</DialogTitle>
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
              onSave={(data) => updateMutation.mutateAsync({ id: editTarget.id, ...data })}
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
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
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
  const modules = Object.entries(template.rules_json) as [string, string[]][];

  function highestLevel(levels: string[]): string {
    if (levels.includes("admin")) return "admin";
    if (levels.includes("write")) return "write";
    if (levels.includes("read")) return "read";
    return "none";
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{template.name}</p>
          {template.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
          )}
        </div>
        {readOnly ? (
          <Badge variant="outline" className="shrink-0 text-xs">System</Badge>
        ) : (
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
      <div className="flex flex-wrap gap-1.5">
        {modules.map(([module, levels]) => {
          const level = highestLevel(levels);
          return (
            <div key={module} className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">{MODULE_LABELS[module] ?? module}:</span>
              <Badge variant={LEVEL_VARIANT[level] ?? "outline"} className="text-xs py-0">
                {level}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
