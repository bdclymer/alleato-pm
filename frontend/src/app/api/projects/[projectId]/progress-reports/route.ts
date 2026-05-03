import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { getApiRouteUser } from "@/lib/supabase/server";
import {
  createProgressReportDraft,
  listProgressReports,
} from "@/lib/progress-reports/server";

const createSchema = z.object({
  weekStart: z.string().optional(),
  weekEnd: z.string().optional(),
});

export const GET = withApiGuardrails(
  "projects/[projectId]/progress-reports#GET",
  async ({ params }) => {
    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/progress-reports#GET",
        message: "Authentication required.",
      });
    }

    const { projectId } = await params;
    const numericProjectId = Number.parseInt(projectId, 10);
    if (!Number.isFinite(numericProjectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const reports = await listProgressReports(numericProjectId);
    return NextResponse.json({ reports });
  },
);

export const POST = withApiGuardrails(
  "projects/[projectId]/progress-reports#POST",
  async ({ request, params }) => {
    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/progress-reports#POST",
        message: "Authentication required.",
      });
    }

    const { projectId } = await params;
    const numericProjectId = Number.parseInt(projectId, 10);
    if (!Number.isFinite(numericProjectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const body = createSchema.parse(await request.json().catch(() => ({})));
    const result = await createProgressReportDraft({
      projectId: numericProjectId,
      userId: user.id,
      userEmail: user.email ?? null,
      weekStart: body.weekStart,
      weekEnd: body.weekEnd,
    });

    return NextResponse.json(result, { status: 201 });
  },
);
