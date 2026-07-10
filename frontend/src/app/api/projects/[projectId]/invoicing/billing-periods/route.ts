import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";
import {
  findOpenBillingPeriod,
  validateBillingPeriodDraft,
} from "@/lib/invoicing/billing-period-validation";

// GET /api/projects/[projectId]/invoicing/billing-periods
// List billing periods for a project, ordered by start_date DESC
// Optional query param: is_closed=true|false
export const GET = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/invoicing/billing-periods#GET",
  async ({ request, params }) => {
  
    const supabase = await createClient();
    const { projectId } = params;

    const user = await getApiRouteUser();
    const authError = null as Error | null;

    if (authError) {
      return NextResponse.json(
        { error: "Authentication failed", details: authError.message },
        { status: 401 },
      );
    }

    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/invoicing/billing-periods#GET", message: "Authentication required." });
    }

    const projectIdNum = parseInt(projectId, 10);
    const { searchParams } = new URL(request.url);
    const isClosedParam = searchParams.get("is_closed");

    let query = supabase
      .from("billing_periods")
      .select("*")
      .eq("project_id", projectIdNum)
      .order("start_date", { ascending: false });

    if (isClosedParam === "true") {
      query = query.eq("is_closed", true);
    } else if (isClosedParam === "false") {
      query = query.eq("is_closed", false);
    }

    const { data: periods, error: periodsError } = await query;

    if (periodsError) {
      return NextResponse.json(
        { error: "Failed to fetch billing periods", details: periodsError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: periods ?? [] });
    },
);

// POST /api/projects/[projectId]/invoicing/billing-periods
// Create a new billing period for a project
// Required: start_date, end_date, due_date
// Auto-assigns period_number as max(existing) + 1
export const POST = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/invoicing/billing-periods#POST",
  async ({ request, params }) => {
  
    const supabase = await createClient();
    const { projectId } = params;

    const user = await getApiRouteUser();
    const authError = null as Error | null;

    if (authError) {
      return NextResponse.json(
        { error: "Authentication failed", details: authError.message },
        { status: 401 },
      );
    }

    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/invoicing/billing-periods#POST", message: "Authentication required." });
    }

    const projectIdNum = parseInt(projectId, 10);
    const body = await request.json();
    const { start_date, end_date, name, due_date } = body;

    const validationError = validateBillingPeriodDraft({
      start_date,
      end_date,
      due_date,
    });

    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 },
      );
    }

    // Verify the project exists
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectIdNum)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      );
    }

    const { data: existingPeriods, error: existingPeriodsError } = await supabase
      .from("billing_periods")
      .select("id, is_closed, period_number")
      .eq("project_id", projectIdNum)
      .order("period_number", { ascending: false });

    if (existingPeriodsError) {
      return NextResponse.json(
        {
          error: "Failed to inspect existing billing periods",
          details: existingPeriodsError.message,
        },
        { status: 500 },
      );
    }

    const openPeriod = findOpenBillingPeriod(existingPeriods ?? []);
    if (openPeriod) {
      return NextResponse.json(
        {
          error: `Close open billing period BP-${String(openPeriod.period_number).padStart(3, "0")} before creating another one.`,
        },
        { status: 409 },
      );
    }

    const maxRow = (existingPeriods ?? [])[0];
    const nextPeriodNumber = (maxRow?.period_number ?? 0) + 1;

    const { data: period, error: insertError } = await supabase
      .from("billing_periods")
      .insert({
        project_id: projectIdNum,
        start_date,
        end_date,
        name: name ?? null,
        due_date: due_date ?? null,
        period_number: nextPeriodNumber,
        is_closed: false,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to create billing period", details: insertError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: period }, { status: 201 });
    },
);
