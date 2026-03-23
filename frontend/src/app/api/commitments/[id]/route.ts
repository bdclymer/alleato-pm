import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { ZodError } from "@/app/api/types";
import { z } from "zod";

/**
 * Schema that matches what the commitment detail edit form actually sends.
 * Both subcontract and purchase order forms send contract_number (not number),
 * status as Title Case strings, contract_company_id as nullable string,
 * and do NOT send original_amount or accounting_method (required in the old
 * commitmentSchema).
 */
const commitmentEditSchema = z
  .object({
    contract_number: z.string().optional(),
    title: z.string().optional(),
    contract_company_id: z.string().nullable().optional(),
    status: z.string().optional(),
    description: z.string().nullable().optional(),
    start_date: z.string().nullable().optional(),
    estimated_completion_date: z.string().nullable().optional(),
    contract_date: z.string().nullable().optional(),
    delivery_date: z.string().nullable().optional(),
    is_private: z.boolean().optional(),
    allow_non_admin_view_sov_items: z.boolean().optional(),
    accounting_method: z.string().nullable().optional(),
  })
  .passthrough();

const commitmentInlinePatchSchema = z
  .object({
    number: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1).optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one editable field is required",
  );

/**
 * GET /api/commitments/[id]
 *
 * Retrieves complete details for a single commitment including:
 * - Base record data (from subcontracts or purchase_orders table)
 * - Contract company information (joined from companies table)
 * - Financial totals from the *_with_totals view
 * - SOV line items ordered by line_number
 * - Change order totals aggregated by status (approved, pending, draft, void)
 * - Calculated revised contract amount (original + approved change orders)
 *
 * The commitment type is first resolved from the `commitments_unified` view
 * to determine which underlying table to query.
 *
 * @route GET /api/commitments/[id]
 * @param {string} id - Commitment UUID
 *
 * @returns {object} 200 - Full commitment details with nested data:
 *   { data: { ...commitment, type, original_amount, approved_change_orders,
 *     revised_contract_amount, billed_to_date, balance_to_finish,
 *     line_items, change_order_totals } }
 * @returns {object} 404 - Commitment not found
 * @returns {object} 400 - Database query error
 * @returns {object} 500 - Internal server error
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Determine type from unified view
    const { data: unifiedData, error: unifiedError } = await supabase
      .from("commitments_unified")
      .select("commitment_type")
      .eq("id", id)
      .single();

    if (unifiedError || !unifiedData) {
      return NextResponse.json(
        { error: "Commitment not found" },
        { status: 404 },
      );
    }

    const isSubcontract = unifiedData.commitment_type === "subcontract";
    const subcontractBaseSelect = `
      id, project_id, contract_number, title, description, status, executed,
      contract_company_id, start_date, estimated_completion_date,
      actual_completion_date, contract_date, signed_contract_received_date,
      issued_on_date, default_retainage_percent,
      is_private, non_admin_user_ids, allow_non_admin_view_sov_items,
      invoice_contact_ids, created_by, created_at, updated_at, deleted_at,
      inclusions, exclusions
    `;
    const purchaseOrderBaseSelect = `
      id, project_id, contract_number, title, description, status, executed,
      contract_company_id, contract_date, signed_po_received_date,
      issued_on_date, default_retainage_percent, accounting_method,
      is_private, non_admin_user_ids, allow_non_admin_view_sov_items,
      invoice_contact_ids, created_by, created_at, updated_at, deleted_at
    `;

    // Performance optimization: Run all detail queries in parallel
    // instead of sequentially (Phase 9)
    const [baseResult, totalsResult, sovResult, coResult] = isSubcontract
      ? await Promise.all([
          // Fetch base record with company join (select needed columns only)
          supabase
            .from("subcontracts")
            .select(subcontractBaseSelect)
            .eq("id", id)
            .single(),

          // Fetch financial totals from _with_totals view
          supabase
            .from("subcontracts_with_totals")
            .select(
              "total_sov_amount, total_billed_to_date, total_amount_remaining, sov_line_count",
            )
            .eq("id", id)
            .single(),

          // Fetch SOV line items (select needed columns)
          supabase
            .from("subcontract_sov_items")
            .select(
              "id, line_number, budget_code, description, amount, billed_to_date, sort_order",
            )
            .eq("subcontract_id", id)
            .order("line_number", { ascending: true }),

          // Fetch change order totals by status (only need status + amount)
          supabase
            .from("contract_change_orders")
            .select("status, amount")
            .eq("contract_id", id),
        ])
      : await Promise.all([
          // Fetch base record with company join (select needed columns only)
          supabase
            .from("purchase_orders")
            .select(purchaseOrderBaseSelect)
            .eq("id", id)
            .single(),

          // Fetch financial totals from _with_totals view
          supabase
            .from("purchase_orders_with_totals")
            .select(
              "total_sov_amount, total_billed_to_date, total_amount_remaining, sov_line_count",
            )
            .eq("id", id)
            .single(),

          // Fetch SOV line items (select needed columns)
          supabase
            .from("purchase_order_sov_items")
            .select(
              "id, line_number, budget_code, description, amount, billed_to_date, sort_order",
            )
            .eq("purchase_order_id", id)
            .order("line_number", { ascending: true }),

          // Fetch change order totals by status (only need status + amount)
          supabase
            .from("contract_change_orders")
            .select("status, amount")
            .eq("contract_id", id),
        ]);

    const { data, error } = baseResult;
    const { data: totalsData } = totalsResult;
    const { data: sovItems } = sovResult;
    const { data: changeOrders } = coResult;

    if (error) {
      console.error("[commitments/[id] GET] base query error:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Commitment not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Calculate change order totals by status
    const changeOrderTotals = {
      approved: 0,
      pending: 0,
      draft: 0,
      executed: 0,
      void: 0,
      total: 0,
    };

    if (changeOrders && changeOrders.length > 0) {
      for (const co of changeOrders) {
        const amount = Number(co.amount) || 0;
        const status = (co.status || "draft").toLowerCase();
        changeOrderTotals.total += amount;

        if (status === "approved" || status === "executed") {
          changeOrderTotals.approved += amount;
        } else if (status === "pending") {
          changeOrderTotals.pending += amount;
        } else if (status === "draft") {
          changeOrderTotals.draft += amount;
        } else if (status === "void") {
          changeOrderTotals.void += amount;
        }
      }
    }

    // Fetch vendor separately — contract_company_id FK references vendors(id)
    const record = data as Record<string, unknown>;
    let contractCompany: { id: string; name: string; type: string | null } | null = null;
    if (record?.contract_company_id) {
      const { data: vendorData } = await supabase
        .from("vendors")
        .select("id, vendor_name")
        .eq("id", record.contract_company_id as string)
        .single();
      if (vendorData) {
        contractCompany = {
          id: vendorData.id,
          name: vendorData.vendor_name,
          type: "vendor",
        };
      }
    }

    const originalAmount = Number(totalsData?.total_sov_amount) || 0;
    const billedToDate = Number(totalsData?.total_billed_to_date) || 0;
    // Revised amount = original + approved change orders
    const revisedAmount = originalAmount + changeOrderTotals.approved;
    const balanceToFinish = revisedAmount - billedToDate;

    const responseData = {
      ...data,
      contract_company: contractCompany,
      type: unifiedData.commitment_type,
      // Normalize date field names across subcontracts and purchase orders.
      signed_received_date:
        (data as Record<string, unknown>).signed_contract_received_date ??
        (data as Record<string, unknown>).signed_po_received_date ??
        null,
      original_amount: originalAmount,
      approved_change_orders: changeOrderTotals.approved,
      pending_change_orders: changeOrderTotals.pending,
      draft_change_orders: changeOrderTotals.draft,
      revised_contract_amount: revisedAmount,
      billed_to_date: billedToDate,
      balance_to_finish: balanceToFinish,
      sov_line_count: Number(totalsData?.sov_line_count) || 0,
      line_items: sovItems || [],
      change_order_totals: changeOrderTotals,
    };

    // Add cache headers for detail data (5 seconds, revalidate in background)
    return NextResponse.json({ data: responseData }, {
      headers: {
        "Cache-Control": "private, max-age=5, stale-while-revalidate=30",
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
 * PUT /api/commitments/[id]
 *
 * Updates an existing commitment. Validates the request body against the
 * commitmentSchema (Zod). The commitment type is resolved from the
 * `commitments_unified` view and the appropriate table (subcontracts or
 * purchase_orders) is updated.
 *
 * @route PUT /api/commitments/[id]
 * @param {string} id - Commitment UUID
 *
 * @requestBody {object} - Partial commitment fields validated by commitmentSchema.
 *   Fields include: title, status, description, contract_company_id,
 *   start_date, estimated_completion_date, default_retainage_percent, etc.
 *
 * @returns {object} 200 - Updated commitment with company and assignee joins
 * @returns {object} 400 - Validation error (Zod) or database error
 * @returns {object} 401 - Unauthorized (no user session)
 * @returns {object} 404 - Commitment not found
 * @returns {object} 500 - Internal server error
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Validate request body against the form's actual payload shape
    const parsed = commitmentEditSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const validatedData = parsed.data;

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Determine the commitment type from the unified view
    const { data: unifiedData, error: unifiedError } = await supabase
      .from("commitments_unified")
      .select("commitment_type")
      .eq("id", id)
      .single();

    if (unifiedError || !unifiedData) {
      return NextResponse.json(
        { error: "Commitment not found" },
        { status: 404 },
      );
    }

    // Query the appropriate table based on type
    const tableName =
      unifiedData.commitment_type === "subcontract"
        ? "subcontracts"
        : "purchase_orders";

    // Build a safe update payload containing only columns that exist in both
    // subcontracts and purchase_orders. Undefined values are omitted so Supabase
    // does not overwrite existing data with NULL unintentionally.
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    const def = <T>(val: T | undefined | null, key: string) => {
      if (val !== undefined) updatePayload[key] = val;
    };

    def(validatedData.contract_number, "contract_number");
    def(validatedData.title, "title");
    def(validatedData.contract_company_id, "contract_company_id");
    def(validatedData.status, "status");
    def(validatedData.description, "description");
    def(validatedData.is_private, "is_private");
    def(validatedData.allow_non_admin_view_sov_items, "allow_non_admin_view_sov_items");
    def(validatedData.contract_date, "contract_date");

    // Subcontract-only columns
    if (unifiedData.commitment_type === "subcontract") {
      def(validatedData.start_date, "start_date");
      def(validatedData.estimated_completion_date, "estimated_completion_date");
    }

    // Purchase-order-only columns
    if (unifiedData.commitment_type === "purchase_order") {
      def(validatedData.delivery_date, "delivery_date");
      def(validatedData.accounting_method, "accounting_method");
    }

    // Update commitment
    // Note: avoid PostgREST join syntax (companies!contract_company_id) — schema cache
    // doesn't have that relationship configured. The client re-fetches full details
    // via GET after a successful PUT, so a simple select(*) is sufficient here.
    const { data, error } = await supabase
      .from(tableName)
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as ZodError;
      return NextResponse.json(
        { error: "Validation error", issues: zodError.errors },
        { status: 400 },
      );
    }

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
 * DELETE /api/commitments/[id]
 * Soft delete commitment (move to recycle bin by setting deleted_at timestamp)
 *
 * This performs a soft delete - the commitment is not permanently removed
 * and can be restored using POST /api/commitments/[id]/restore
 *
 * For permanent deletion, use DELETE /api/commitments/[id]/permanent-delete
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Determine the commitment type from the unified view
    const { data: unifiedData, error: unifiedError } = await supabase
      .from("commitments_unified")
      .select("commitment_type, deleted_at")
      .eq("id", id)
      .single();

    if (unifiedError || !unifiedData) {
      return NextResponse.json(
        { error: "COMMITMENT_NOT_FOUND", message: "Commitment does not exist" },
        { status: 404 },
      );
    }

    // Check if already soft-deleted
    if (unifiedData.deleted_at) {
      return NextResponse.json(
        {
          error: "ALREADY_DELETED",
          message: "Commitment is already deleted",
        },
        { status: 400 },
      );
    }

    // Query the appropriate table based on type
    const tableName =
      unifiedData.commitment_type === "subcontract"
        ? "subcontracts"
        : "purchase_orders";

    // Soft delete commitment (set deleted_at timestamp)
    const deletedAt = new Date().toISOString();
    const { error } = await supabase
      .from(tableName)
      .update({
        deleted_at: deletedAt,
        updated_at: deletedAt,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Return response matching API specification
    return NextResponse.json({
      success: true,
      message: "Commitment moved to recycle bin",
      data: {
        id,
        deletedAt,
        canRestore: true,
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
 * PATCH /api/commitments/[id]
 *
 * Lightweight partial update endpoint used by inline editing in list views.
 * Only supports safe, text-based fields that can be edited from a table cell.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();
    const parsed = commitmentInlinePatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? "Validation error",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: unifiedData, error: unifiedError } = await supabase
      .from("commitments_unified")
      .select("commitment_type")
      .eq("id", id)
      .single();

    if (unifiedError || !unifiedData) {
      return NextResponse.json({ error: "Commitment not found" }, { status: 404 });
    }

    const tableName =
      unifiedData.commitment_type === "subcontract"
        ? "subcontracts"
        : "purchase_orders";

    const updatePayload: Record<string, string> = {
      updated_at: new Date().toISOString(),
    };
    if (parsed.data.number !== undefined) {
      updatePayload.contract_number = parsed.data.number;
    }
    if (parsed.data.title !== undefined) {
      updatePayload.title = parsed.data.title;
    }

    const { data, error } = await supabase
      .from(tableName)
      .update(updatePayload)
      .eq("id", id)
      .select("id, contract_number, title, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      data: {
        id: data.id,
        number: data.contract_number,
        title: data.title,
        updated_at: data.updated_at,
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
