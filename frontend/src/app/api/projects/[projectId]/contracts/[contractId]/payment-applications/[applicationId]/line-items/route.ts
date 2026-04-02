import { createClient } from "@/lib/supabase/server";
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

const batchUpdateSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      work_completed_this_period: z.number().optional(),
      materials_stored: z.number().optional(),
      retainage_this_period_work: z.number().optional(),
      retainage_this_period_work_pct: z.number().optional(),
      retainage_this_period_materials: z.number().optional(),
      retainage_this_period_materials_pct: z.number().optional(),
      retainage_released_work: z.number().optional(),
      retainage_released_materials: z.number().optional(),
    }),
  ),
});

/**
 * GET /api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/line-items
 * Fetch all line items for a payment application, ordered by sort_order
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { applicationId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("payment_application_line_items")
      .select("*")
      .eq("payment_application_id", applicationId)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch line items", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]/line-items
 * Batch update line items, then recalculate parent payment application totals
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { applicationId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const { items } = batchUpdateSchema.parse(body);

    // Update each line item
    for (const item of items) {
      const { id, ...fields } = item;

      // Build the update payload — only include provided fields
      const updateData: Record<string, number> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
          updateData[key] = value;
        }
      }

      if (Object.keys(updateData).length === 0) continue;

      const { error } = await supabase
        .from("payment_application_line_items")
        .update(updateData)
        .eq("id", id)
        .eq("payment_application_id", applicationId);

      if (error) {
        return NextResponse.json(
          {
            error: `Failed to update line item ${id}`,
            details: error.message,
          },
          { status: 400 },
        );
      }
    }

    // Re-fetch all line items to recalculate parent totals
    const { data: allItems, error: fetchError } = await supabase
      .from("payment_application_line_items")
      .select("*")
      .eq("payment_application_id", applicationId);

    if (fetchError || !allItems) {
      return NextResponse.json(
        {
          error: "Failed to fetch line items for recalculation",
          details: fetchError?.message,
        },
        { status: 400 },
      );
    }

    // Aggregate totals for the parent payment application
    const totalScheduledValue = allItems.reduce(
      (sum, li) => sum + (li.scheduled_value ?? 0),
      0,
    );

    const totalCompleted = allItems.reduce(
      (sum, li) =>
        sum +
        (li.work_completed_previous ?? 0) +
        (li.work_completed_this_period ?? 0) +
        (li.materials_stored ?? 0),
      0,
    );

    const totalRetention = allItems.reduce(
      (sum, li) =>
        sum +
        (li.retainage_previous_work ?? 0) +
        (li.retainage_previous_materials ?? 0) +
        (li.retainage_this_period_work ?? 0) +
        (li.retainage_this_period_materials ?? 0) -
        (li.retainage_released_work ?? 0) -
        (li.retainage_released_materials ?? 0),
      0,
    );

    const netAmount = totalCompleted - totalRetention;
    const percentComplete =
      totalScheduledValue > 0 ? (totalCompleted / totalScheduledValue) * 100 : 0;

    // Update parent payment application
    // Note: net_amount is a generated column (amount - retention_amount), so we don't set it
    const { error: updateAppError } = await supabase
      .from("prime_contract_payment_applications")
      .update({
        amount: totalCompleted,
        retention_amount: totalRetention,
        percent_complete: Math.round(percentComplete * 100) / 100,
      })
      .eq("id", applicationId);

    if (updateAppError) {
      return NextResponse.json(
        {
          error: "Failed to update payment application totals",
          details: updateAppError.message,
        },
        { status: 400 },
      );
    }

    // Return updated line items
    const { data: updatedItems } = await supabase
      .from("payment_application_line_items")
      .select("*")
      .eq("payment_application_id", applicationId)
      .order("sort_order", { ascending: true });

    return NextResponse.json(updatedItems ?? []);
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
