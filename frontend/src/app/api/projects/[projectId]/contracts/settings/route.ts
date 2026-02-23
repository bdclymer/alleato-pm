import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// Defaults used when no row exists yet (lazy-init pattern)
const DEFAULT_SETTINGS = {
  co_tier_count: 1 as const,
  allow_standard_users_create_pcco: false,
  allow_standard_users_create_pco: false,
  sov_always_editable: false,
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
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
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
      data ?? { ...DEFAULT_SETTINGS, project_id: parseInt(projectId, 10) },
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/projects/[projectId]/contracts/settings
 * Upserts the prime contract settings for a project.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
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
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.issues.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
