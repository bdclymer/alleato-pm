import { NextResponse } from "next/server";
import { z } from "zod";

import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { requirePermission } from "@/lib/permissions-guard";
import { createClient } from "@/lib/supabase/server";
import type { PermissionModule } from "@/lib/permissions-shared";

const HomeTabKindSchema = z.enum(["meetings", "documents", "daily-logs", "submittals"]);

type HomeTabKind = z.infer<typeof HomeTabKindSchema>;

const HOME_TAB_PERMISSIONS: Record<HomeTabKind, PermissionModule> = {
  meetings: "documents",
  documents: "documents",
  "daily-logs": "schedule",
  submittals: "submittals",
};

function parseProjectId(projectId: string): number | null {
  const projectIdNum = Number.parseInt(projectId, 10);
  return Number.isInteger(projectIdNum) ? projectIdNum : null;
}

export const GET = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/home/tab-data#GET",
  async ({ request, params }) => {
    const { projectId } = await params;
    const projectIdNum = parseProjectId(projectId);
    if (projectIdNum === null) {
      throw new GuardrailError({
        code: "VALIDATION_ERROR",
        where: "projects/[projectId]/home/tab-data#GET",
        message: "Project id must be a whole number.",
        details: { projectId },
        status: 400,
      });
    }

    const { searchParams } = new URL(request.url);
    const parsedKind = HomeTabKindSchema.safeParse(searchParams.get("kind"));
    if (!parsedKind.success) {
      throw new GuardrailError({
        code: "VALIDATION_ERROR",
        where: "projects/[projectId]/home/tab-data#GET",
        message: "Invalid Home tab data kind.",
        details: {
          expected: HomeTabKindSchema.options,
          received: searchParams.get("kind"),
        },
        status: 400,
      });
    }

    const kind = parsedKind.data;
    const guard = await requirePermission(projectIdNum, HOME_TAB_PERMISSIONS[kind], "read");
    if (guard.denied) return guard.response;

    const supabase = await createClient();

    if (kind === "meetings") {
      const { data, error } = await supabase
        .from("document_metadata")
        .select("id,title,file_name,date,created_at,duration_minutes,type")
        .eq("project_id", projectIdNum)
        .eq("type", "meeting")
        .is("deleted_at", null)
        .order("date", { ascending: false })
        .limit(10);

      if (error) {
        throw new GuardrailError({
          code: "DB_ERROR",
          where: "projects/[projectId]/home/tab-data#GET",
          message: "Failed to load project meetings.",
          cause: error,
          status: 500,
        });
      }

      return NextResponse.json({ kind, data: data ?? [] });
    }

    if (kind === "documents") {
      const { data, error } = await supabase
        .from("project_documents")
        .select("id,title,file_name,status,category,folder,source_system,created_at,updated_at,reviewed_at")
        .eq("project_id", projectIdNum)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(10);

      if (error) {
        throw new GuardrailError({
          code: "DB_ERROR",
          where: "projects/[projectId]/home/tab-data#GET",
          message: "Failed to load project documents.",
          cause: error,
          status: 500,
        });
      }

      return NextResponse.json({ kind, data: data ?? [] });
    }

    if (kind === "daily-logs") {
      const { data, error } = await supabase
        .from("daily_logs")
        .select("id,log_date")
        .eq("project_id", projectIdNum)
        .order("log_date", { ascending: false })
        .limit(5);

      if (error) {
        throw new GuardrailError({
          code: "DB_ERROR",
          where: "projects/[projectId]/home/tab-data#GET",
          message: "Failed to load daily logs.",
          cause: error,
          status: 500,
        });
      }

      return NextResponse.json({ kind, data: data ?? [] });
    }

    const { data, error } = await supabase
      .from("submittals")
      .select("id,title,submittal_number,ball_in_court,final_due_date,required_approval_date,created_at,status")
      .eq("project_id", projectIdNum)
      .is("deleted_at", null)
      .not("status", "eq", "Closed")
      .order("updated_at", { ascending: false })
      .limit(20);

    if (error) {
      throw new GuardrailError({
        code: "DB_ERROR",
        where: "projects/[projectId]/home/tab-data#GET",
        message: "Failed to load submittals.",
        cause: error,
        status: 500,
      });
    }

    return NextResponse.json({ kind, data: data ?? [] });
  },
);
