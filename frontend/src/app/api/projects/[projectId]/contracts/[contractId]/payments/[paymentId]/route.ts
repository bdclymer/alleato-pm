import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{
    projectId: string;
    contractId: string;
    paymentId: string;
  }>;
}

const updatePaymentSchema = z.object({
  amount: z.number().positive().optional(),
  payment_date: z.string().optional(),
  payment_application_id: z.string().uuid().nullable().optional(),
  payment_number: z.string().nullable().optional(),
  method: z
    .enum(["check", "wire", "ach", "credit_card", "cash", "other"])
    .nullable()
    .optional(),
  reference_number: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

/**
 * PATCH /api/projects/[projectId]/contracts/[contractId]/payments/[paymentId]
 * Updates a payment record
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, contractId, paymentId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const validatedData = updatePaymentSchema.parse(body);

    const { data: existing } = await supabase
      .from("prime_contract_payments")
      .select("id")
      .eq("id", paymentId)
      .eq("contract_id", contractId)
      .eq("project_id", parseInt(projectId, 10))
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("prime_contract_payments")
      .update(validatedData)
      .eq("id", paymentId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update payment", details: error.message },
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
 * DELETE /api/projects/[projectId]/contracts/[contractId]/payments/[paymentId]
 * Deletes a payment record
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, contractId, paymentId } = await params;
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("prime_contract_payments")
      .select("id")
      .eq("id", paymentId)
      .eq("contract_id", contractId)
      .eq("project_id", parseInt(projectId, 10))
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("prime_contract_payments")
      .delete()
      .eq("id", paymentId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete payment", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: "Payment deleted" });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
