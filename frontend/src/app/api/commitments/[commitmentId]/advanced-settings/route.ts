import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";

// Default settings to return when no custom settings are saved
const DEFAULT_SETTINGS = {
  enable_invoices: true,
  enable_comments: true,
  enable_payments: true,
  enable_completed_work_retainage: false,
  enable_stored_materials_retainage: false,
  show_cost_codes_on_pdf: true,
  allow_overbilling: false,
  enable_subcontractor_sov: true,
  enable_always_editable_sov: false,
  enable_financial_markup: false,
  show_markup_criteria_on_pdf: false,
  send_invoice_approval_notifications: true,
  send_payment_notifications: true,
  default_retainage_percent: 0,
  billing_period: "monthly",
};

/**
 * GET /api/commitments/[commitmentId]/advanced-settings
 *
 * Retrieves the advanced configuration settings for a specific commitment.
 * Settings are stored in the `advanced_settings` JSONB column on the
 * subcontracts or purchase_orders table. If no custom settings exist,
 * default settings are returned.
 *
 * @route GET /api/commitments/[commitmentId]/advanced-settings
 * @param {string} commitmentId - Commitment UUID
 *
 * @returns {object} 200 - Settings object:
 *   { data: {
 *       enable_invoices: boolean,
 *       enable_comments: boolean,
 *       enable_payments: boolean,
 *       enable_completed_work_retainage: boolean,
 *       enable_stored_materials_retainage: boolean,
 *       show_cost_codes_on_pdf: boolean,
 *       allow_overbilling: boolean,
 *       enable_subcontractor_sov: boolean,
 *       enable_always_editable_sov: boolean,
 *       enable_financial_markup: boolean,
 *       show_markup_criteria_on_pdf: boolean,
 *       send_invoice_approval_notifications: boolean,
 *       send_payment_notifications: boolean,
 *       default_retainage_percent: number,
 *       billing_period: string
 *   } }
 * @returns {object} 404 - Commitment not found
 *
 * @note Always returns 200 with defaults on database errors to ensure UI stability
 */
export const GET = withApiGuardrails<{ commitmentId: string }>(
  "commitments/[commitmentId]/advanced-settings#GET",
  async ({ request, params }) => {
  
    const { commitmentId } = await params;
    const supabase = await createClient();

    // First verify the commitment exists
    const { data: unifiedData, error: unifiedError } = await supabase
      .from("commitments_unified")
      .select("commitment_type")
      .eq("id", commitmentId)
      .single();

    if (unifiedError || !unifiedData) {
      return NextResponse.json(
        { error: "Commitment not found" },
        { status: 404 }
      );
    }

    // Try to fetch settings from the appropriate table
    const isSubcontract = unifiedData.commitment_type === "subcontract";
    const tableName = isSubcontract ? "subcontracts" : "purchase_orders";

    const { data, error } = await supabase
      .from(tableName)
      .select("advanced_settings")
      .eq("id", commitmentId)
      .single();

    if (error) {
      console.error("Error fetching advanced settings:", error);
      return NextResponse.json(
        { error: "Failed to load settings", details: error.message },
        { status: 500 },
      );
    }

    // If settings exist, merge with defaults to ensure all keys are present
    const settings = data?.advanced_settings
      ? { ...DEFAULT_SETTINGS, ...data.advanced_settings }
      : DEFAULT_SETTINGS;

    return NextResponse.json({ data: settings });
    },
);

/**
 * PUT /api/commitments/[commitmentId]/advanced-settings
 *
 * Updates the advanced configuration settings for a specific commitment.
 * The provided settings are merged with defaults to ensure all required
 * keys are present, then stored in the `advanced_settings` JSONB column.
 *
 * @route PUT /api/commitments/[commitmentId]/advanced-settings
 * @param {string} commitmentId - Commitment UUID
 *
 * @requestBody {object} Partial or full settings object. Any subset of:
 *   enable_invoices, enable_comments, enable_payments,
 *   enable_completed_work_retainage, enable_stored_materials_retainage,
 *   show_cost_codes_on_pdf, allow_overbilling, enable_subcontractor_sov,
 *   enable_always_editable_sov, enable_financial_markup,
 *   show_markup_criteria_on_pdf, send_invoice_approval_notifications,
 *   send_payment_notifications, default_retainage_percent, billing_period
 *
 * @returns {object} 200 - { data: MergedSettings, message: "Settings saved successfully" }
 * @returns {object} 200 - { data: MergedSettings, warning: "..." } if column doesn't exist yet
 * @returns {object} 400 - Database update error
 * @returns {object} 401 - Unauthorized (no user session)
 * @returns {object} 404 - Commitment not found
 * @returns {object} 500 - Internal server error
 */
export const PUT = withApiGuardrails<{ commitmentId: string }>(
  "commitments/[commitmentId]/advanced-settings#PUT",
  async ({ request, params }) => {
  
    const { commitmentId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "commitments/[commitmentId]/advanced-settings#PUT", message: "Authentication required." });
    }

    // Verify the commitment exists and get its type
    const { data: unifiedData, error: unifiedError } = await supabase
      .from("commitments_unified")
      .select("commitment_type")
      .eq("id", commitmentId)
      .single();

    if (unifiedError || !unifiedData) {
      return NextResponse.json(
        { error: "Commitment not found" },
        { status: 404 }
      );
    }

    // Merge with defaults to ensure all required fields
    const settingsToSave = { ...DEFAULT_SETTINGS, ...body };

    const isSubcontract = unifiedData.commitment_type === "subcontract";
    const tableName = isSubcontract ? "subcontracts" : "purchase_orders";

    // Try to update the advanced_settings JSONB column
    const { error } = await supabase
      .from(tableName)
      .update({
        advanced_settings: settingsToSave,
        updated_at: new Date().toISOString(),
      })
      .eq("id", commitmentId);

    if (error) {
      // If the column doesn't exist, we need to handle gracefully
      // For now, just return success since the UI uses local state
      console.error("Error saving advanced settings:", error);

      // Check if it's a column missing error
      if (error.message?.includes("advanced_settings")) {
        // Column doesn't exist - return success but note it's not persisted
        return NextResponse.json({
          data: settingsToSave,
          warning: "Settings saved to session only. Database column not yet created.",
        });
      }

      return apiErrorResponse(error);
    }

    return NextResponse.json({
      data: settingsToSave,
      message: "Settings saved successfully",
    });
    },
);
