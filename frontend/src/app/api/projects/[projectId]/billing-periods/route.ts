import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ projectId: string }> };

// GET /api/projects/[projectId]/billing-periods
// Fetches project-level billing_periods (not contract_billing_periods)
export const GET = withApiGuardrails(
  "projects/[projectId]/billing-periods#GET",
  async ({ request }) => {
  
    const supabase = await createClient();
    const { projectId } = await context.params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/billing-periods#GET", message: "Authentication required." });
    }

    const projectIdNum = parseInt(projectId, 10);
    if (Number.isNaN(projectIdNum)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("billing_periods")
      .select("*")
      .eq("project_id", projectIdNum)
      .order("start_date", { ascending: false });

    if (error) {
      return apiErrorResponse(error);
    }

    const items = (data ?? []).map((bp) => ({
      id: bp.id,
      project_id: bp.project_id,
      name: bp.name ?? (bp.start_date && bp.end_date
        ? `${new Date(bp.start_date).toLocaleDateString()} - ${new Date(bp.end_date).toLocaleDateString()}`
        : `Period ${bp.id}`),
      start_date: bp.start_date,
      end_date: bp.end_date,
      is_closed: bp.is_closed ?? false,
      created_at: bp.created_at,
      updated_at: bp.updated_at,
    }));

    return NextResponse.json({ items, total: items.length });
    },
);

// POST /api/projects/[projectId]/billing-periods
export const POST = withApiGuardrails(
  "projects/[projectId]/billing-periods#POST",
  async ({ request }) => {
  
    const supabase = await createClient();
    const { projectId } = await context.params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/billing-periods#POST", message: "Authentication required." });
    }

    const projectIdNum = parseInt(projectId, 10);
    if (Number.isNaN(projectIdNum)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const body = await request.json();
    const { start_date, end_date, name } = body;

    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: "start_date and end_date are required" },
        { status: 400 },
      );
    }

    const derivedName = name ?? `${new Date(start_date).toLocaleDateString()} - ${new Date(end_date).toLocaleDateString()}`;

    const { data, error } = await supabase
      .from("billing_periods")
      .insert({
        project_id: projectIdNum,
        start_date,
        end_date,
        name: derivedName,
        is_closed: false,
      })
      .select()
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json({ item: data }, { status: 201 });
    },
);
