import { createServiceClient } from "@/lib/supabase/service";

export type ToolScope = {
  userId: string;
  personId: string | null;
  isAdmin: boolean;
  allowedProjectIds: number[];
  allowedCompanyIds: string[];
  pinnedProjectId: number | null;
};

export type ToolGuardrails = {
  getScope: () => Promise<ToolScope>;
  getScopedProjectIds: (requestedProjectId?: number | null) => Promise<number[]>;
  enforceProjectAccess: (projectId: number) => Promise<{ ok: true } | { ok: false; error: string }>;
  applyPinnedProject: (requestedProjectId?: number | null) => Promise<number | null>;
};

type CreateToolGuardrailsOptions = {
  pinnedProjectId?: number;
};

export function createToolGuardrails(
  userId: string,
  options: CreateToolGuardrailsOptions = {},
): ToolGuardrails {
  const supabase = createServiceClient();
  let scopePromise: Promise<ToolScope> | null = null;

  async function loadScope(): Promise<ToolScope> {
    const [{ data: authLink }, { data: profile }] = await Promise.all([
      supabase
        .from("users_auth")
        .select("person_id")
        .eq("auth_user_id", userId)
        .maybeSingle(),
      supabase
        .from("user_profiles")
        .select("is_admin")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    const personId = authLink?.person_id ?? null;
    const isAdmin = profile?.is_admin === true;

    const allowedProjectIds: number[] = [];
    const allowedCompanyIdsSet = new Set<string>();

    if (isAdmin) {
      const { data: projects } = await supabase
        .from("projects")
        .select("id, company_id")
        .eq("archived", false)
        .limit(2000);

      for (const row of projects ?? []) {
        if (typeof row.id === "number") {
          allowedProjectIds.push(row.id);
        }
        if (typeof row.company_id === "string" && row.company_id.trim()) {
          allowedCompanyIdsSet.add(row.company_id);
        }
      }
    } else if (personId) {
      const { data: memberships } = await supabase
        .from("project_directory_memberships")
        .select("project_id")
        .eq("person_id", personId)
        .eq("status", "active")
        .limit(2000);

      for (const row of memberships ?? []) {
        if (typeof row.project_id === "number") {
          allowedProjectIds.push(row.project_id);
        }
      }

      if (allowedProjectIds.length > 0) {
        const { data: projects } = await supabase
          .from("projects")
          .select("id, company_id")
          .in("id", allowedProjectIds)
          .limit(2000);

        for (const row of projects ?? []) {
          if (typeof row.company_id === "string" && row.company_id.trim()) {
            allowedCompanyIdsSet.add(row.company_id);
          }
        }
      }
    }

    let pinnedProjectId: number | null = null;
    if (typeof options.pinnedProjectId === "number" && Number.isFinite(options.pinnedProjectId)) {
      if (isAdmin || allowedProjectIds.includes(options.pinnedProjectId)) {
        pinnedProjectId = options.pinnedProjectId;
      }
    }

    return {
      userId,
      personId,
      isAdmin,
      allowedProjectIds,
      allowedCompanyIds: [...allowedCompanyIdsSet],
      pinnedProjectId,
    };
  }

  function getScope(): Promise<ToolScope> {
    if (!scopePromise) {
      scopePromise = loadScope();
    }
    return scopePromise;
  }

  async function getScopedProjectIds(requestedProjectId?: number | null): Promise<number[]> {
    const scope = await getScope();

    if (scope.allowedProjectIds.length === 0 && !scope.isAdmin) {
      return [];
    }

    if (typeof scope.pinnedProjectId === "number") {
      return [scope.pinnedProjectId];
    }

    const effectiveProjectId =
      typeof requestedProjectId === "number" && Number.isFinite(requestedProjectId)
        ? requestedProjectId
        : null;

    if (typeof effectiveProjectId === "number") {
      if (!scope.isAdmin && !scope.allowedProjectIds.includes(effectiveProjectId)) {
        return [];
      }
      return [effectiveProjectId];
    }

    return scope.allowedProjectIds;
  }

  async function enforceProjectAccess(
    projectId: number,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const scope = await getScope();

    if (!Number.isFinite(projectId)) {
      return { ok: false, error: "Invalid project ID." };
    }

    if (typeof scope.pinnedProjectId === "number" && projectId !== scope.pinnedProjectId) {
      return {
        ok: false,
        error:
          "That tool call targeted a different project than the selected project context. Keep the selected project context or clear it before querying another project.",
      };
    }

    if (scope.isAdmin || scope.allowedProjectIds.includes(projectId)) {
      return { ok: true };
    }

    return {
      ok: false,
      error:
        "You do not have access to that project. Pick a project you are assigned to or change the project context.",
    };
  }

  async function applyPinnedProject(
    requestedProjectId?: number | null,
  ): Promise<number | null> {
    const scope = await getScope();
    if (typeof scope.pinnedProjectId === "number") {
      return scope.pinnedProjectId;
    }
    if (typeof requestedProjectId === "number" && Number.isFinite(requestedProjectId)) {
      return requestedProjectId;
    }
    return scope.pinnedProjectId;
  }

  return {
    getScope,
    getScopedProjectIds,
    enforceProjectAccess,
    applyPinnedProject,
  };
}
