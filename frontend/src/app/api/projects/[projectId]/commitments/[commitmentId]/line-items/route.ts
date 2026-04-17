import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyProjectAccess, isAuthError } from "@/lib/supabase/auth-guard";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePermission } from "@/lib/permissions-guard";

interface RouteParams {
  params: Promise<{ projectId: string; commitmentId: string }>;
}

interface LineItemInput {
  id?: string;
  line_number: number | null;
  budget_code: string | null;
  description: string | null;
  amount: number | null;
  billed_to_date: number | null;
  quantity?: number | null;
  unit_cost?: number | null;
  unit_of_measure?: string | null;
  retainage_percent?: number | null;
}

interface UpdatePayload {
  lineItems: LineItemInput[];
  commitmentType?: "subcontract" | "purchase_order" | string;
}

/**
 * GET /api/projects/[projectId]/commitments/[commitmentId]/line-items
 *
 * Fetches all Schedule of Values (SOV) line items for a commitment.
 * Determines the commitment type from the `commitments_unified` view,
 * then queries the appropriate SOV table (subcontract_sov_items or
 * purchase_order_sov_items).
 *
 * @route GET /api/projects/[projectId]/commitments/[commitmentId]/line-items
 * @param {string} projectId - Project ID (integer)
 * @param {string} commitmentId - Commitment UUID
 *
 * @returns {object} 200 - {
 *     success: true,
 *     data: Array<SOVLineItem>,
 *     commitmentType: "subcontract" | "purchase_order"
 *   }
 * @returns {object} 400 - Invalid project ID or database query error
 * @returns {object} 401/403 - Unauthorized or insufficient project access
 * @returns {object} 404 - Commitment not found
 * @returns {object} 500 - Internal server error
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/commitments/[commitmentId]/line-items#GET",
  async ({ request, params }) => {
  
    const { projectId, commitmentId } = await params;
    const numericProjectId = Number.parseInt(projectId, 10);

    if (Number.isNaN(numericProjectId)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 },
      );
    }

    const authResult = await verifyProjectAccess(numericProjectId);
    if (isAuthError(authResult)) return authResult;
    const supabase = authResult.serviceClient;

    // First determine the commitment type
    const { data: unifiedData, error: unifiedError } = await supabase
      .from("commitments_unified")
      .select("commitment_type")
      .eq("id", commitmentId)
      .single();

    if (unifiedError || !unifiedData) {
      return NextResponse.json(
        { error: "Commitment not found" },
        { status: 404 },
      );
    }

    const isSubcontract = unifiedData.commitment_type === "subcontract";
    const tableName = isSubcontract
      ? "subcontract_sov_items"
      : "purchase_order_sov_items";
    const fkColumn = isSubcontract ? "subcontract_id" : "purchase_order_id";

    const { data: lineItems, error: lineItemsError } = await (supabase as any)
      .from(tableName)
      .select("*")
      .eq(fkColumn, commitmentId)
      .order("line_number", { ascending: true });

    if (lineItemsError) {
      return NextResponse.json(
        { error: "Failed to fetch line items", details: lineItemsError.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: lineItems || [],
      commitmentType: unifiedData.commitment_type,
    });
    },
);

/**
 * PUT /api/projects/[projectId]/commitments/[commitmentId]/line-items
 *
 * Batch updates all SOV line items for a commitment using an upsert strategy:
 * 1. Fetches existing line item IDs
 * 2. Deletes items no longer present in the submitted list
 * 3. Updates existing items (matched by ID)
 * 4. Inserts new items (no ID or ID not in existing set)
 *
 * @route PUT /api/projects/[projectId]/commitments/[commitmentId]/line-items
 * @param {string} projectId - Project ID (integer)
 * @param {string} commitmentId - Commitment UUID
 *
 * @requestBody {object}
 *   - lineItems {Array<LineItemInput>} (required) - Full list of line items:
 *     - id {string} [optional] - Existing item ID (omit for new items)
 *     - line_number {number|null} - Line number (auto-assigned from index if null)
 *     - budget_code {string|null} - Budget/cost code
 *     - description {string|null} - Line item description
 *     - amount {number|null} - Dollar amount
 *     - billed_to_date {number|null} - Amount billed so far
 *   - commitmentType {string} [optional] - "subcontract" or "purchase_order"
 *     (auto-detected from commitments_unified if not provided)
 *
 * @returns {object} 200 - {
 *     success: true,
 *     savedCount: number,
 *     deletedCount: number,
 *     totalAmount: number,
 *     errors?: string[],
 *     message: string
 *   }
 * @returns {object} 400 - Invalid project ID, missing lineItems array, or DB errors
 * @returns {object} 401/403 - Unauthorized or insufficient project access
 * @returns {object} 500 - Internal server error
 */
export const PUT = withApiGuardrails(
  "projects/[projectId]/commitments/[commitmentId]/line-items#PUT",
  async ({ request, params }) => {
  
    const { projectId, commitmentId } = await params;
    const numericProjectId = Number.parseInt(projectId, 10);

    if (Number.isNaN(numericProjectId)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 },
      );
    }

    const authResult = await verifyProjectAccess(numericProjectId);
    if (isAuthError(authResult)) return authResult;
    const supabase = authResult.serviceClient;

    const guard = await requirePermission(numericProjectId, "contracts", "write");
    if (guard.denied) return guard.response;

    const body = (await request.json()) as UpdatePayload;
    const { lineItems, commitmentType: bodyCommitmentType } = body;

    if (!lineItems || !Array.isArray(lineItems)) {
      return NextResponse.json(
        { error: "Invalid payload: lineItems array required" },
        { status: 400 },
      );
    }

    // Determine the commitment type if not provided
    let commitmentType = bodyCommitmentType;
    if (!commitmentType) {
      const { data: unifiedData } = await supabase
        .from("commitments_unified")
        .select("commitment_type")
        .eq("id", commitmentId)
        .single();

      commitmentType = unifiedData?.commitment_type || "subcontract";
    }

    const isSubcontract = commitmentType === "subcontract";
    const tableName = isSubcontract
      ? "subcontract_sov_items"
      : "purchase_order_sov_items";
    const fkColumn = isSubcontract ? "subcontract_id" : "purchase_order_id";

    // Fetch existing line items (with billed_to_date + amount so we can lock invoiced lines)
    const { data: existingItems } = await (supabase as any)
      .from(tableName)
      .select("id, billed_to_date, amount")
      .eq(fkColumn, commitmentId);

    const existingById = new Map<
      string,
      { billed_to_date: number | null; amount: number | null }
    >(
      (existingItems || []).map(
        (item: { id: string; billed_to_date: number | null; amount: number | null }) => [
          item.id,
          { billed_to_date: item.billed_to_date, amount: item.amount },
        ],
      ),
    );
    const existingIds = new Set<string>(existingById.keys());
    const newItemIds = new Set<string>(
      lineItems.filter((item) => item.id).map((item) => item.id as string),
    );

    const isBilled = (id: string) =>
      (existingById.get(id)?.billed_to_date ?? 0) > 0;

    // Block deletion of invoiced lines
    const idsToDelete = [...existingIds].filter((id) => !newItemIds.has(id));
    const blockedDeletes = idsToDelete.filter(isBilled);
    if (blockedDeletes.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete invoiced SOV lines",
          details: `${blockedDeletes.length} line item(s) have billed_to_date > 0 and are locked. Remove the invoices first.`,
          blockedIds: blockedDeletes,
        },
        { status: 400 },
      );
    }

    // Block amount changes on invoiced lines
    const blockedAmountChanges: string[] = [];
    for (const item of lineItems) {
      if (!item.id || !existingById.has(item.id)) continue;
      if (!isBilled(item.id)) continue;
      const prevAmount = existingById.get(item.id)?.amount ?? 0;
      const nextAmount = item.amount ?? 0;
      if (Number(prevAmount) !== Number(nextAmount)) {
        blockedAmountChanges.push(item.id);
      }
    }
    if (blockedAmountChanges.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot change amount on invoiced SOV lines",
          details: `${blockedAmountChanges.length} line item(s) have billed_to_date > 0; their amount is locked.`,
          blockedIds: blockedAmountChanges,
        },
        { status: 400 },
      );
    }

    if (idsToDelete.length > 0) {
      const { error: deleteError } = await (supabase as any)
        .from(tableName)
        .delete()
        .in("id", idsToDelete);

      if (deleteError) {
        return NextResponse.json(
          { error: "Failed to delete removed line items", details: deleteError.message },
          { status: 400 },
        );
      }
    }

    // Upsert line items
    const upsertedItems: unknown[] = [];
    const errors: string[] = [];

    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      const lineNumber = item.line_number ?? i + 1;

      const itemData: Record<string, unknown> = {
        [fkColumn]: commitmentId,
        line_number: lineNumber,
        budget_code: item.budget_code || null,
        description: item.description || "",
        amount: item.amount ?? 0,
        billed_to_date: item.billed_to_date ?? 0,
        retainage_percent: item.retainage_percent ?? null,
        updated_at: new Date().toISOString(),
      };

      // Purchase order SOV carries quantity / unit pricing
      if (!isSubcontract) {
        itemData.quantity = item.quantity ?? null;
        itemData.unit_cost = item.unit_cost ?? null;
        itemData.unit_of_measure = item.unit_of_measure ?? null;
      }

      if (item.id && existingIds.has(item.id)) {
        // Update existing item
        const { data: updatedItem, error: updateError } = await (supabase as any)
          .from(tableName)
          .update(itemData)
          .eq("id", item.id)
          .select()
          .single();

        if (updateError) {
          errors.push(`Line ${lineNumber}: ${updateError.message}`);
          continue;
        }
        upsertedItems.push(updatedItem);
      } else {
        // Insert new item
        const { data: insertedItem, error: insertError } = await (supabase as any)
          .from(tableName)
          .insert({
            ...itemData,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          errors.push(`Line ${lineNumber}: ${insertError.message}`);
          continue;
        }
        upsertedItems.push(insertedItem);
      }
    }

    // Calculate total amount for budget impact tracking
    const totalAmount = lineItems.reduce(
      (sum, item) => sum + (item.amount ?? 0),
      0,
    );

    return NextResponse.json({
      success: true,
      savedCount: upsertedItems.length,
      deletedCount: idsToDelete.length,
      totalAmount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully saved ${upsertedItems.length} line items${
        idsToDelete.length > 0 ? `, deleted ${idsToDelete.length}` : ""
      }`,
    });
    },
);
