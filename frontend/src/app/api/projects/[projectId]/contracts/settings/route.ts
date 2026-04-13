import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ZodError } from "zod";
import { requirePermission } from "@/lib/permissions-guard";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// Defaults used when no row exists yet (lazy-init pattern)
const DEFAULT_SETTINGS = {
  co_tier_count: 1 as const,
  allow_standard_users_create_pcco: false,
  allow_standard_users_create_pco: false,
  sov_always_editable: false,
  enable_completed_work_retainage: false,
  enable_stored_materials_retainage: false,
  default_retainage_percent: 0,
  show_markup_on_co_pdf: true,
  show_markup_on_invoice_pdf: true,
  default_distribution_prime_contract: null as string | null,
  default_distribution_pcco: null as string | null,
  default_distribution_pco: null as string | null,
};

const updateSettingsSchema = z.object({
  co_tier_count: z.union([z.literal(1), z.literal(2)]).optional(),
  allow_standard_users_create_pcco: z.boolean().optional(),
  allow_standard_users_create_pco: z.boolean().optional(),
  sov_always_editable: z.boolean().optional(),
  enable_completed_work_retainage: z.boolean().optional(),
  enable_stored_materials_retainage: z.boolean().optional(),
  default_retainage_percent: z.number().min(0).max(100).optional(),
  show_markup_on_co_pdf: z.boolean().optional(),
  show_markup_on_invoice_pdf: z.boolean().optional(),
  default_distribution_prime_contract: z.string().nullable().optional(),
  default_distribution_pcco: z.string().nullable().optional(),
  default_distribution_pco: z.string().nullable().optional(),
});

/**
 * GET /api/projects/[projectId]/contracts/settings
 * Returns the prime contract project-level settings.
 * If no row exists, returns defaults (lazy init — no row written until first save).
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/contracts/settings#GET",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("prime_contract_project_settings")
      .select("*")
      .eq("project_id", parseInt(projectId, 10))
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json(
        { error: "Failed to fetch settings", details: error.message },
        { status: 400 },
      );
    }

    // Return existing row or defaults (without persisting)
    return NextResponse.json(
      {
        ...DEFAULT_SETTINGS,
        ...data,
        project_id: parseInt(projectId, 10),
      },
    );
    },
);

/**
 * PUT /api/projects/[projectId]/contracts/settings
 * Upserts the prime contract settings for a project.
 */
export const PUT = withApiGuardrails(
  "projects/[projectId]/contracts/settings#PUT",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);
    const guard = await requirePermission(projectIdNum, "contracts", "admin");
    if (guard.denied) return guard.response;

    const supabase = await createClient();
    const body = await request.json();

    const validatedData = updateSettingsSchema.parse(body);

    // Upsert (insert if not exists, update if exists)
    const { data, error } = await supabase
      .from("prime_contract_project_settings")
      .upsert(
        {
          project_id: parseInt(projectId, 10),
          ...validatedData,
        },
        { onConflict: "project_id" },
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to save settings", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(data);
    },
);
