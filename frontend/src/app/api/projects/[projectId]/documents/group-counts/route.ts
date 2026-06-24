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
    const counts: Record<string, number> = {};

    for (const group of SMART_GROUPS) {
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

      const { count, error } = await query;
      if (error) {
        throw new GuardrailError({
          code: "DB_ERROR",
          where: "projects/[projectId]/documents/group-counts#GET",
          message: error.message,
        });
      }
      counts[group.id] = count ?? 0;
    }

    return NextResponse.json({ counts });
  },
);
