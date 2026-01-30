import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

// Zod schema for commitment change order creation
// OWASP: Input validation on financial mutation endpoints (A03:2021 - Injection)
const createCommitmentChangeOrderSchema = z.object({
  change_order_number: z
    .string()
    .trim()
    .min(1, "Change order number is required")
    .max(100, "Change order number must be at most 100 characters"),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(2000, "Description must be at most 2000 characters"),
  amount: z.coerce
    .number({ message: "Amount must be a number" }),
  status: z
    .enum(["draft", "pending", "approved", "executed", "void"])
    .default("draft"),
  requested_date: z
    .string()
    .refine(
      (val) => !val || !Number.isNaN(Date.parse(val)),
      "Must be a valid date string",
    )
    .optional()
    .nullable(),
  requested_by: z.string().uuid().optional().nullable(),
});

/**
 * GET /api/commitments/[id]/change-orders
 * List all change orders for a specific commitment
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Query contract_change_orders table where contract_id matches the commitment id
    const { data: changeOrders, error } = await supabase
      .from("contract_change_orders")
      .select(
        `
        id,
        change_order_number,
        description,
        status,
        amount,
        requested_date,
        requested_by,
        approved_date,
        approved_by,
        rejection_reason,
        created_at,
        updated_at
      `,
      )
      .eq("contract_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Return empty array if no change orders (200 status, not 404)
    if (!changeOrders || changeOrders.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Map to expected frontend format
    const formattedChangeOrders = changeOrders.map((co) => ({
      id: co.id,
      number: co.change_order_number,
      title: co.description,
      status: co.status?.toLowerCase() || "draft",
      amount: Number(co.amount) || 0,
      requested_date: co.requested_date,
      requested_by: co.requested_by,
      approved_date: co.approved_date,
      approved_by: co.approved_by,
      rejection_reason: co.rejection_reason,
      created_at: co.created_at,
      updated_at: co.updated_at,
    }));

    // Calculate totals
    const totalAmount = formattedChangeOrders.reduce(
      (sum, co) => sum + co.amount,
      0,
    );
    const approvedAmount = formattedChangeOrders
      .filter((co) => co.status === "approved")
      .reduce((sum, co) => sum + co.amount, 0);

    return NextResponse.json({
      data: formattedChangeOrders,
      meta: {
        total_count: formattedChangeOrders.length,
        total_amount: totalAmount,
        approved_amount: approvedAmount,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Internal server error", message: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/commitments/[id]/change-orders
 * Create a new change order for a specific commitment
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify commitment exists
    const { data: commitment, error: fetchError } = await supabase
      .from("commitments")
      .select("id, project_id")
      .eq("id", id)
      .single();

    if (fetchError || !commitment) {
      return NextResponse.json(
        { error: "Commitment not found" },
        { status: 404 },
      );
    }

    // Validate request body with Zod schema
    const validation = createCommitmentChangeOrderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const validated = validation.data;

    // Create change order
    const { data: newChangeOrder, error: createError } = await supabase
      .from("contract_change_orders")
      .insert({
        contract_id: id,
        change_order_number: validated.change_order_number,
        description: validated.description,
        amount: validated.amount,
        status: validated.status,
        requested_date: validated.requested_date || new Date().toISOString(),
        requested_by: validated.requested_by || user.id,
      })
      .select()
      .single();

    if (createError) {
      // Handle duplicate change order number
      if (createError.code === "23505") {
        return NextResponse.json(
          { error: "Change order number already exists for this commitment" },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: createError.message },
        { status: 400 },
      );
    }

    // Format response
    const formattedChangeOrder = {
      id: newChangeOrder.id,
      number: newChangeOrder.change_order_number,
      title: newChangeOrder.description,
      status: newChangeOrder.status?.toLowerCase() || "draft",
      amount: Number(newChangeOrder.amount) || 0,
      requested_date: newChangeOrder.requested_date,
      requested_by: newChangeOrder.requested_by,
      created_at: newChangeOrder.created_at,
      updated_at: newChangeOrder.updated_at,
    };

    return NextResponse.json(formattedChangeOrder, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Internal server error", message: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
