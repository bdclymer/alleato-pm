import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ projectId: string; changeEventId: string }>;
}

// Schema for conversion request (matching frontend expectations)
const convertSchema = z.object({
  type: z.enum(["commitment", "prime"]), // Type of change order
  target_contract_id: z.number().int().positive(), // Contract ID to link to
});

/**
 * POST /api/projects/[projectId]/change-events/[changeEventId]/convert
 * Converts a change event into a change order
 * - Creates a new change_orders record with change_event_id linkage
 * - Copies relevant fields (title, description, line items)
 * - Updates the change event status to "converted"
 * - Prevents double conversion
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, changeEventId } = await params;
    const numericProjectId = parseInt(projectId, 10);

    if (isNaN(numericProjectId)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = convertSchema.parse(body);

    // 1. Check if change event exists and belongs to this project
    const { data: changeEvent, error: fetchError } = await supabase
      .from("change_events")
      .select(
        `
        *,
        change_event_line_items(*)
      `,
      )
      .eq("project_id", numericProjectId)
      .eq("id", changeEventId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !changeEvent) {
      return NextResponse.json(
        { error: "Change event not found" },
        { status: 404 },
      );
    }

    // 2. Check if already converted (prevent double conversion)
    // Check both tables since the CO could be either type
    const [primeCheck, commitmentCheck] = await Promise.all([
      supabase
        .from("prime_contract_change_orders")
        .select("id")
        .eq("change_event_id", changeEventId)
        .maybeSingle(),
      supabase
        .from("contract_change_orders")
        .select("id")
        .eq("change_event_id", changeEventId)
        .maybeSingle(),
    ]);

    if (primeCheck.error || commitmentCheck.error) {
      return NextResponse.json(
        { error: "Failed to check conversion status", details: (primeCheck.error || commitmentCheck.error)?.message },
        { status: 500 },
      );
    }

    const existingCO = primeCheck.data || commitmentCheck.data;
    if (existingCO) {
      return NextResponse.json(
        {
          error: "Change event already converted",
          details: "A change order already exists for this change event",
          changeOrderId: existingCO.id,
        },
        { status: 409 },
      );
    }

    // 3. Verify the contract exists and belongs to this project
    // Check either prime_contracts or commitments table based on type
    let contract: { id: number; contract_number: string } | null = null;

    if (validatedData.type === "prime") {
      const { data, error: contractError } = await supabase
        .from("prime_contracts")
        .select("id, number")
        .eq("id", validatedData.target_contract_id)
        .eq("project_id", numericProjectId)
        .single();

      if (contractError || !data) {
        return NextResponse.json(
          { error: "Prime contract not found or does not belong to this project" },
          { status: 404 },
        );
      }
      contract = { id: data.id, contract_number: data.number };
    } else {
      const { data, error: contractError } = await supabase
        .from("commitments")
        .select("id, number")
        .eq("id", validatedData.target_contract_id)
        .eq("project_id", numericProjectId)
        .single();

      if (contractError || !data) {
        return NextResponse.json(
          { error: "Commitment not found or does not belong to this project" },
          { status: 404 },
        );
      }
      contract = { id: data.id, contract_number: data.number };
    }

    // 4. Calculate total amount from change event line items
    const lineItems = changeEvent.change_event_line_items || [];
    const totalAmount = lineItems.reduce((sum: number, item: any) => {
      // Use revenue_rom if available, otherwise cost_rom
      return sum + (item.revenue_rom || item.cost_rom || 0);
    }, 0);

    // 5-7. Create the change order in the appropriate table
    let newChangeOrderId: string | number;
    let coNumber: string;

    if (validatedData.type === "prime") {
      // Get next PCCO number
      const { data: existingCOs } = await supabase
        .from("prime_contract_change_orders")
        .select("pcco_number")
        .eq("project_id", numericProjectId)
        .eq("contract_id", validatedData.target_contract_id)
        .order("created_at", { ascending: false })
        .limit(1);

      let nextNumber = 1;
      const lastNumber = existingCOs?.[0]?.pcco_number;
      if (lastNumber) {
        const match = String(lastNumber).match(/(\d+)$/);
        if (match) nextNumber = parseInt(match[1], 10) + 1;
      }
      coNumber = `PCCO-${contract.contract_number}-${String(nextNumber).padStart(3, "0")}`;

      const { data: newCO, error: createError } = await supabase
        .from("prime_contract_change_orders")
        .insert({
          project_id: numericProjectId,
          contract_id: validatedData.target_contract_id,
          change_event_id: changeEventId,
          pcco_number: coNumber,
          title: changeEvent.title,
          description: changeEvent.description,
          total_amount: totalAmount,
          status: "draft",
          created_by: user.id,
        })
        .select()
        .single();

      if (createError || !newCO) {
        return NextResponse.json(
          { error: "Failed to create prime contract change order", details: createError?.message },
          { status: 500 },
        );
      }
      newChangeOrderId = newCO.id;
    } else {
      // Commitment change order
      const { data: existingCOs } = await supabase
        .from("contract_change_orders")
        .select("change_order_number")
        .eq("contract_id", validatedData.target_contract_id)
        .order("created_at", { ascending: false })
        .limit(1);

      let nextNumber = 1;
      const lastNumber = existingCOs?.[0]?.change_order_number;
      if (lastNumber) {
        const match = String(lastNumber).match(/(\d+)$/);
        if (match) nextNumber = parseInt(match[1], 10) + 1;
      }
      coNumber = `CCO-${contract.contract_number}-${String(nextNumber).padStart(3, "0")}`;

      const { data: newCO, error: createError } = await supabase
        .from("contract_change_orders")
        .insert({
          contract_id: validatedData.target_contract_id,
          change_event_id: changeEventId,
          change_order_number: coNumber,
          description: changeEvent.title,
          amount: totalAmount,
          status: "draft",
          created_by: user.id,
        })
        .select()
        .single();

      if (createError || !newCO) {
        return NextResponse.json(
          { error: "Failed to create contract change order", details: createError?.message },
          { status: 500 },
        );
      }
      newChangeOrderId = newCO.id;
    }

    // 8. Update the change event status to indicate conversion
    const { error: updateError } = await supabase
      .from("change_events")
      .update({
        status: "Converted",
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", changeEventId);

    if (updateError) {
      // Log the error but don't fail since CO was created successfully
      console.error("Failed to update change event status:", updateError);
    }

    // 9. Create audit log entry
    await supabase.from("change_event_history").insert({
      change_event_id: changeEventId,
      field_name: "status",
      old_value: changeEvent.status,
      new_value: "Converted",
      changed_by: user.id,
      change_type: "CONVERSION",
    });

    // 10. Return success response matching frontend expectations
    return NextResponse.json(
      {
        success: true,
        change_order_id: newChangeOrderId,
        co_number: coNumber,
        message: "Change event successfully converted to change order",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
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

    console.error("Change event conversion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
