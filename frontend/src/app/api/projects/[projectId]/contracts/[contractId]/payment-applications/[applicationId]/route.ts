import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{
    projectId: string;
    contractId: string;
    applicationId: string;
  }>;
}

/**
 * GET /api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]
 * Fetch a single payment application with billing period data
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, contractId, applicationId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("prime_contract_payment_applications")
      .select("*, billing_period:billing_periods(*)")
      .eq("id", applicationId)
      .eq("contract_id", contractId)
      .eq("project_id", parseInt(projectId, 10))
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Payment application not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const updatePaymentApplicationSchema = z.object({
  application_number: z.string().min(1).optional(),
  amount: z.number().min(0).optional(),
  retention_amount: z.number().min(0).optional(),
  status: z
    .enum(["draft", "under_review", "revise_and_resubmit", "approved"])
    .optional(),
  billing_period_id: z.string().uuid().nullable().optional(),
  billing_date: z.string().nullable().optional(),
  period_from: z.string().nullable().optional(),
  period_to: z.string().nullable().optional(),
  submitted_at: z.string().nullable().optional(),
  submitted_by: z.string().nullable().optional(),
  approved_at: z.string().nullable().optional(),
  approved_by: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

/**
 * PATCH /api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]
 * Updates a payment application
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, contractId, applicationId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const validatedData = updatePaymentApplicationSchema.parse(body);

    const { data: existing } = await supabase
      .from("prime_contract_payment_applications")
      .select("id")
      .eq("id", applicationId)
      .eq("contract_id", contractId)
      .eq("project_id", parseInt(projectId, 10))
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Payment application not found" },
        { status: 404 },
      );
    }

    const { data, error } = await supabase
      .from("prime_contract_payment_applications")
      .update(validatedData)
      .eq("id", applicationId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update payment application", details: error.message },
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
    return apiErrorResponse(error);
  }
}

/**
 * DELETE /api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]
 * Deletes a payment application
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, contractId, applicationId } = await params;
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("prime_contract_payment_applications")
      .select("id")
      .eq("id", applicationId)
      .eq("contract_id", contractId)
      .eq("project_id", parseInt(projectId, 10))
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Payment application not found" },
        { status: 404 },
      );
    }

    const { error } = await supabase
      .from("prime_contract_payment_applications")
      .delete()
      .eq("id", applicationId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete payment application", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: "Payment application deleted" });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
