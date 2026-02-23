import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ projectId: string; contractId: string }>;
}

const createPaymentSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  payment_date: z.string().min(1, "Payment date is required"),
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
 * GET /api/projects/[projectId]/contracts/[contractId]/payments
 * Returns all payments received for a prime contract
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, contractId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("prime_contract_payments")
      .select(
        `
        *,
        payment_application:prime_contract_payment_applications(
          id,
          application_number,
          amount,
          status
        )
      `,
      )
      .eq("contract_id", contractId)
      .eq("project_id", parseInt(projectId, 10))
      .order("payment_date", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch payments", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/projects/[projectId]/contracts/[contractId]/payments
 * Records a new payment received for a prime contract
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, contractId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const validatedData = createPaymentSchema.parse(body);

    // Verify contract exists for this project
    const { data: contract } = await supabase
      .from("prime_contracts")
      .select("id")
      .eq("id", contractId)
      .eq("project_id", parseInt(projectId, 10))
      .single();

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // If linking to a payment application, verify it belongs to this contract
    if (validatedData.payment_application_id) {
      const { data: appExists } = await supabase
        .from("prime_contract_payment_applications")
        .select("id")
        .eq("id", validatedData.payment_application_id)
        .eq("contract_id", contractId)
        .single();

      if (!appExists) {
        return NextResponse.json(
          { error: "Payment application not found for this contract" },
          { status: 400 },
        );
      }
    }

    const { data, error } = await supabase
      .from("prime_contract_payments")
      .insert({
        contract_id: contractId,
        project_id: parseInt(projectId, 10),
        payment_application_id: validatedData.payment_application_id ?? null,
        payment_number: validatedData.payment_number ?? null,
        amount: validatedData.amount,
        payment_date: validatedData.payment_date,
        method: validatedData.method ?? null,
        reference_number: validatedData.reference_number ?? null,
        notes: validatedData.notes ?? null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to record payment", details: error.message },
        { status: 400 },
      );
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
