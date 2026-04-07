import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CreatePurchaseOrderSchema } from "@/lib/schemas/create-purchase-order-schema";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * GET /api/projects/[id]/purchase-orders
 * Fetch all purchase orders for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("purchase_orders_with_totals")
      .select("*")
      .eq("project_id", parseInt(projectId, 10))
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch purchase orders" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * POST /api/projects/[id]/purchase-orders
 * Create a new purchase order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return NextResponse.json(
        { error: "Authentication failed", details: userError.message },
        { status: 401 },
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - no user session" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const validationResult = CreatePurchaseOrderSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    const data = validationResult.data;

    // Map form data to database columns
    const purchaseOrderData = {
      project_id: parseInt(projectId),
      contract_number: data.contractNumber?.trim() || "",
      contract_company_id: data.contractCompanyId || null,
      title: data.title || null,
      status: data.status || "Draft",
      executed: data.executed ?? false,
      default_retainage_percent: data.defaultRetainagePercent ?? null,
      assigned_to: data.assignedTo || null,
      bill_to: data.billTo || null,
      payment_terms: data.paymentTerms || null,
      ship_to: data.shipTo || null,
      ship_via: data.shipVia || null,
      description: data.description || null,
      accounting_method: data.accountingMethod || "unit-quantity",
      contract_date: data.dates?.contractDate || null,
      delivery_date: data.dates?.deliveryDate || null,
      signed_po_received_date: data.dates?.signedPoReceivedDate || null,
      issued_on_date: data.dates?.issuedOnDate || null,
      is_private: data.privacy?.isPrivate ?? true,
      non_admin_user_ids: data.privacy?.nonAdminUserIds || [],
      allow_non_admin_view_sov_items:
        data.privacy?.allowNonAdminViewSovItems ?? false,
      invoice_contact_ids: data.invoiceContactIds || [],
      created_by: user.id,
    };

    const { data: purchaseOrder, error: poError } = await supabase
      .from("purchase_orders")
      .insert(purchaseOrderData)
      .select()
      .single();

    if (poError) {
      return NextResponse.json(
        {
          error: "Failed to create purchase order",
          details: poError,
        },
        { status: 500 },
      );
    }

    // Create SOV line items if provided
    if (data.sov && data.sov.length > 0) {
      const sovItems = data.sov.map((item, index) => ({
        purchase_order_id: purchaseOrder.id,
        line_number: item.lineNumber || index + 1,
        change_event_line_item: item.changeEventLineItem || null,
        budget_code: item.budgetCode || null,
        description: item.description || null,
        quantity: item.quantity ?? null,
        uom: item.uom || null,
        unit_cost: item.unitCost ?? null,
        amount: item.amount || 0,
        billed_to_date: item.billedToDate || 0,
        sort_order: index,
      }));

      const { error: sovError } = await supabase
        .from("purchase_order_sov_items")
        .insert(sovItems);

      if (sovError) {
        await supabase
          .from("purchase_orders")
          .delete()
          .eq("id", purchaseOrder.id);
        return NextResponse.json(
          { error: "Failed to create SOV items", details: sovError },
          { status: 500 },
        );
      }
    }

    // Fetch complete purchase order with totals
    const { data: completePO } = await supabase
      .from("purchase_orders_with_totals")
      .select("*")
      .eq("id", purchaseOrder.id)
      .single();

    return NextResponse.json({
      data: completePO || purchaseOrder,
      message: "Purchase order created successfully",
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
