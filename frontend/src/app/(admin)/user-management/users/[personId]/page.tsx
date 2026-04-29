"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import {
  fetchAllTemplates,
  fetchTemplates,
  fetchUsers,
  toAccessSummary,
  type GranularOverrideEffect,
} from "../../_lib/user-access-data";
import { UserAccessPanel } from "../../_components/user-access-panel";
import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import type { GranularFlag } from "@/lib/permissions-shared";

export default function PermissionUserDetailPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { personId } = useParams<{ personId: string }>();

  const usersQuery = useQuery({
    queryKey: ["permission-users"],
    queryFn: () => fetchUsers(),
  });

  const allTemplatesQuery = useQuery({
    queryKey: ["permission-templates", "all"],
    queryFn: fetchAllTemplates,
  });

  const companyTemplatesQuery = useQuery({
    queryKey: ["permission-templates", "company"],
    queryFn: () => fetchTemplates("company"),
  });

  const users = useMemo(
    () => (usersQuery.data?.data ?? []).map(toAccessSummary),
    [usersQuery.data?.data],
  );
  const user = users.find((item) => item.personId === personId) ?? null;

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
        return;
      }

      await apiFetch(`/api/permissions/users/${personId}/company-template`, { method: "DELETE" });
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

  const isLoading =
    usersQuery.isLoading ||
    allTemplatesQuery.isLoading ||
    companyTemplatesQuery.isLoading;

  return (
    <PageShell
      variant="detail"
      title={user?.fullName ?? (isLoading ? "Loading user..." : "User not found")}
      description={user?.email ?? "Manage company access, project roles, and exceptions."}
      onBack={() => router.push("/user-management")}
      actions={
        <Button type="button" variant="outline" size="sm" onClick={() => router.push("/user-management")}>
          <ArrowLeft className="h-4 w-4" />
          Back to User Management
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          <div className="h-20 animate-pulse bg-muted" />
          <div className="h-40 animate-pulse bg-muted" />
          <div className="h-64 animate-pulse bg-muted" />
        </div>
      ) : user ? (
        <UserAccessPanel
          user={user}
          templates={(allTemplatesQuery.data ?? []).filter((template) => template.scope !== "company")}
          companyTemplates={companyTemplatesQuery.data ?? []}
          isTemplatesLoading={allTemplatesQuery.isLoading}
          isAssignmentSaving={assignMutation.isPending}
          isCompanyTemplateSaving={companyTemplateMutation.isPending}
          isGranularOverrideSaving={granularOverrideMutation.isPending}
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
      ) : (
        <div className="border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            This user was not found in User Management. Return to User Management and choose a current user.
          </p>
        </div>
      )}
    </PageShell>
  );
}
