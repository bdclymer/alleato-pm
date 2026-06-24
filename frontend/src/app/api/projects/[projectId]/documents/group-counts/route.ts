import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { SMART_GROUPS } from "@/features/documents/smart-groups";

export const dynamic = "force-dynamic";

export const GET = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/documents/group-counts#GET",
  async ({ params }) => {
    const { projectId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/documents/group-counts#GET",
        message: "Authentication required.",
      });
    }

    const numericProjectId = Number(projectId);
    if (Number.isNaN(numericProjectId)) {
      throw new GuardrailError({
        code: "BAD_REQUEST",
        where: "projects/[projectId]/documents/group-counts#GET",
        message: "Invalid project id.",
        status: 400,
      });
    }

    const counts: Record<string, number> = {};

    const queries = SMART_GROUPS.map((group) => {
      let query = supabase
        .from("document_metadata")
        .select("id", { count: "exact", head: true })
        .eq("project_id", numericProjectId)
        .is("deleted_at", null);

      if (group.filter.document_type) {
        query = query.eq("document_type", String(group.filter.document_type));
      }
      if (group.filter.type) {
        query = query.eq("type", String(group.filter.type));
      }

      return query.then(({ count, error }) => {
        if (error) {
          throw new GuardrailError({
            code: "DB_ERROR",
            where: "projects/[projectId]/documents/group-counts#GET",
            message: error.message,
          });
        }
        return { groupId: group.id, count: count ?? 0 };
      });
    });

    const results = await Promise.all(queries);
    for (const { groupId, count } of results) {
      counts[groupId] = count;
    }

    return NextResponse.json({ counts });
  },
);
