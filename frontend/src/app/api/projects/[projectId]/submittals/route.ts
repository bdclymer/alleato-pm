import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

const createSubmittalSchema = z.object({
  title: z.string().min(1),
  submittal_number: z.string().min(1),
  revision: z.number().int().min(0).default(0),
  status: z.enum(["Draft", "Open", "Distributed", "Closed"]).default("Draft"),
  specification_section: z.string().nullable().optional(),
  submittal_type: z.string().nullable().optional(),
  submittal_type_id: z.string().uuid().nullable().optional(),
  division: z.string().nullable().optional(),
  submittal_package_id: z.string().uuid().nullable().optional(),
  responsible_contractor_id: z.string().nullable().optional(),
  received_from_id: z.string().uuid().nullable().optional(),
  submittal_manager_id: z.string().uuid().nullable().optional(),
  final_due_date: z.string().nullable().optional(),
  lead_time: z.number().int().nullable().optional(),
  required_on_site_date: z.string().nullable().optional(),
  cost_code_id: z.number().int().nullable().optional(),
  location_id: z.number().int().nullable().optional(),
  is_private: z.boolean().default(false),
  description: z.string().nullable().optional(),
  priority: z.string().nullable().optional(),
  ball_in_court: z.string().nullable().optional(),
  required_approval_date: z.string().nullable().optional(),
  submission_date: z.string().nullable().optional(),
});

/**
 * GET /api/projects/[projectId]/submittals
 * Returns all submittals for the project with type join.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const tab = searchParams.get("tab"); // "recycle-bin" => deleted_at IS NOT NULL

    let query = supabase
      .from("submittals")
      .select(
        `*,
         submittal_type:submittal_types(id, name),
         submittal_package:submittal_packages(id, name),
         submittal_workflow_steps(
           id, step_order, step_type,
           submittal_responses(id, responder_id, response_status)
         )`,
      )
      .eq("project_id", parseInt(projectId, 10))
      .order("created_at", { ascending: false });

    if (tab === "recycle-bin") {
      query = query.not("deleted_at", "is", null);
    } else {
      query = query.is("deleted_at", null);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,submittal_number.ilike.%${search}%,specification_section.ilike.%${search}%`,
      );
    }

    const { data, error } = await query;

    if (error) {
      return apiErrorResponse(error);
    }

    // Batch-resolve responsible_contractor names (no FK exists in DB)
    const contractorIds = [
      ...new Set(
        (data ?? [])
          .map((s: Record<string, unknown>) => s.responsible_contractor_id)
          .filter(Boolean)
          .map(String),
      ),
    ];
    let companyMap: Record<string, string> = {};
    if (contractorIds.length > 0) {
      const { data: companies } = await supabase
        .from("companies")
        .select("id, name")
        .in("id", contractorIds);
      if (companies) {
        companyMap = Object.fromEntries(companies.map((c) => [String(c.id), c.name]));
      }
    }

    const enriched = (data ?? []).map((s: Record<string, unknown>) => ({
      ...s,
      responsible_contractor: s.responsible_contractor_id
        ? { id: String(s.responsible_contractor_id), name: companyMap[String(s.responsible_contractor_id)] ?? null }
        : null,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * POST /api/projects/[projectId]/submittals
 * Creates a new submittal.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const validatedData = createSubmittalSchema.parse(body);

    // Check unique submittal_number within project
    const { data: existing } = await supabase
      .from("submittals")
      .select("id")
      .eq("project_id", parseInt(projectId, 10))
      .eq("submittal_number", validatedData.submittal_number)
      .eq("revision", validatedData.revision)
      .is("deleted_at", null)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Submittal number + revision already exists for this project" },
        { status: 409 },
      );
    }

    const { data, error } = await supabase
      .from("submittals")
      .insert({
        ...validatedData,
        project_id: parseInt(projectId, 10),
        submitted_by: user.id,
        created_by: user.id,
        submittal_type_id: validatedData.submittal_type_id ?? null,
      })
      .select(
        `*,
         submittal_type:submittal_types(id, name),
         submittal_package:submittal_packages(id, name)`,
      )
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json(data, { status: 201 });
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
    return apiErrorResponse(error);
  }
}
