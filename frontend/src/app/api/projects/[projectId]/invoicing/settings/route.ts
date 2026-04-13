import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

// Default values used when no settings row exists yet for a project.
const DEFAULT_SETTINGS = {
  default_billing_start_day: 1,
  default_billing_end_day: 30,
  default_billing_due_day: 10,
  default_retainage_percent: 10,
  allow_over_billing: false,
  notify_subs_on_approval: true,
  send_under_review_digest: true,
  invite_reminder_frequency_days: 7,
  invoice_pdf_footer_text: "",
  invitation_custom_message: "",
};

const UPDATABLE_FIELDS = [
  "default_billing_start_day",
  "default_billing_end_day",
  "default_billing_due_day",
  "default_retainage_percent",
  "allow_over_billing",
  "notify_subs_on_approval",
  "send_under_review_digest",
  "invite_reminder_frequency_days",
  "invoice_pdf_footer_text",
  "invitation_custom_message",
] as const;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) {
    return {
      supabase,
      user: null,
      errorResponse: NextResponse.json(
        { error: "Authentication failed", details: authError.message },
        { status: 401 },
      ),
    };
  }
  if (!user) {
    return {
      supabase,
      user: null,
      errorResponse: NextResponse.json({ error: "User not found" }, { status: 401 }),
    };
  }
  return { supabase, user, errorResponse: null as NextResponse | null };
}

// GET /api/projects/[projectId]/invoicing/settings
export const GET = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/invoicing/settings#GET",
  async ({ request }) => {
  
    const { supabase, user, errorResponse } = await requireUser();
    if (!user) return errorResponse!;

    const { projectId } = await context.params;
    const projectIdNum = parseInt(projectId, 10);

    const { data, error } = await supabase
      .from("invoicing_settings")
      .select("*")
      .eq("project_id", projectIdNum)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch invoicing settings", details: error.message },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json({
        data: {
          id: null,
          project_id: projectIdNum,
          ...DEFAULT_SETTINGS,
          created_at: null,
          updated_at: null,
        },
      });
    }

    // Merge defaults for any nullable fields so consumers always get a full shape.
    return NextResponse.json({
      data: {
        ...DEFAULT_SETTINGS,
        ...Object.fromEntries(
          Object.entries(data).filter(([, v]) => v !== null && v !== undefined),
        ),
        id: data.id,
        project_id: data.project_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
    });
    },
);

// PATCH /api/projects/[projectId]/invoicing/settings
export const PATCH = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/invoicing/settings#PATCH",
  async ({ request }) => {
  
    const { supabase, user, errorResponse } = await requireUser();
    if (!user) return errorResponse!;

    const { projectId } = await context.params;
    const projectIdNum = parseInt(projectId, 10);
    const body = await request.json();

    // Pick only allowed, defined fields from body.
    const updates: Record<string, unknown> = {};
    for (const field of UPDATABLE_FIELDS) {
      if (field in body && body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Validate day fields are in 1..31 when present.
    for (const dayField of [
      "default_billing_start_day",
      "default_billing_end_day",
      "default_billing_due_day",
    ] as const) {
      const v = updates[dayField];
      if (v !== undefined && v !== null) {
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1 || n > 31) {
          return NextResponse.json(
            { error: `${dayField} must be an integer between 1 and 31` },
            { status: 400 },
          );
        }
        updates[dayField] = n;
      }
    }

    if (updates.default_retainage_percent !== undefined && updates.default_retainage_percent !== null) {
      const n = Number(updates.default_retainage_percent);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        return NextResponse.json(
          { error: "default_retainage_percent must be between 0 and 100" },
          { status: 400 },
        );
      }
      updates.default_retainage_percent = n;
    }

    if (
      updates.invite_reminder_frequency_days !== undefined &&
      updates.invite_reminder_frequency_days !== null
    ) {
      const n = Number(updates.invite_reminder_frequency_days);
      if (!Number.isInteger(n) || n < 0) {
        return NextResponse.json(
          { error: "invite_reminder_frequency_days must be a non-negative integer" },
          { status: 400 },
        );
      }
      updates.invite_reminder_frequency_days = n;
    }

    const { data, error } = await supabase
      .from("invoicing_settings")
      .upsert(
        { project_id: projectIdNum, ...updates },
        { onConflict: "project_id" },
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update invoicing settings", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ data });
    },
);
