/**
 * ============================================================================
 * PROMOTE PCO → PCCO (Prime Contract Change Order)
 * ============================================================================
 *
 * POST /api/projects/[projectId]/prime-contract-pcos/[pcoId]/promote
 *
 * Promotes a Prime Contract PCO to an official Prime Contract Change Order.
 * - Creates a prime_contract_change_orders row from the PCO data
 * - Sets promoted_to_co_id and promoted_at on the PCO
 * - Changes PCO status to 'approved'
 * - Only allowed if PCO status is 'pending' or 'approved'
 */

import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { logger } from "@/lib/logger";

export const POST = withApiGuardrails<{ projectId: string; pcoId: string }>(
  "projects/[projectId]/prime-contract-pcos/[pcoId]/promote#POST",
  async ({ request, params }) => {
  
    const { projectId, pcoId } = await params;
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/prime-contract-pcos/[pcoId]/promote#POST", message: "Authentication required." });
    }

    const projectIdNum = parseInt(projectId, 10);
    const pcoIdNum = parseInt(pcoId, 10);

    // Get existing PCO with line items total
    const { data: pco, error: fetchError } = await supabase
      .from("prime_contract_pcos")
      .select("*")
      .eq("project_id", projectIdNum)
      .eq("id", pcoId)
      .single();

    if (fetchError || !pco) {
      return NextResponse.json(
        { error: "Prime contract PCO not found" },
        { status: 404 },
      );
    }

    // Validate status — only pending or approved can be promoted
    if (pco.status !== "pending" && pco.status !== "approved") {
      return NextResponse.json(
        {
          error: "Cannot promote PCO",
          details:
            "Only PCOs with status 'pending' or 'approved' can be promoted to a change order",
        },
        { status: 409 },
      );
    }

    // Check if already promoted
    if (pco.promoted_to_co_id) {
      return NextResponse.json(
        {
          error: "PCO already promoted",
          details: `This PCO has already been promoted to change order #${pco.promoted_to_co_id}`,
        },
        { status: 409 },
      );
    }

    // Calculate total from line items
    const { data: lineItems } = await supabase
      .from("pco_line_items")
      .select("amount")
      .eq("pco_id", pcoIdNum)
      .eq("pco_type", "prime");

    const totalAmount = (lineItems || []).reduce(
      (sum, item) => sum + (item.amount || 0),
      0,
    );

    // Generate PCCO number — count existing PCCOs for the contract + 1
    const { data: existingPccos } = await supabase
      .from("prime_contract_change_orders")
      .select("id")
      .eq("prime_contract_id", pco.prime_contract_id);

    const nextPccoNumber = ((existingPccos || []).length + 1)
      .toString()
      .padStart(3, "0");

    const now = new Date().toISOString();

    // Create the PCCO (Prime Contract Change Order)
    const { data: pcco, error: pccoError } = await supabase
      .from("prime_contract_change_orders")
      .insert({
        project_id: projectIdNum,
        prime_contract_id: pco.prime_contract_id,
        pcco_number: nextPccoNumber,
        title: pco.title,
        description: pco.description,
        status: "draft",
        schedule_impact: pco.schedule_impact,
        due_date: pco.due_date,
        designated_reviewer: pco.designated_reviewer_id,
        total_amount: totalAmount,
        approved_at: now,
        created_at: now,
        created_by: user.id,
      })
      .select("*")
      .single();

    if (pccoError) {
      logger.error({ msg: "[POST /promote] Failed to create PCCO:", data: pccoError });
      return apiErrorResponse(pccoError);
    }

    // Update the PCO with promotion reference
    const { error: updateError } = await supabase
      .from("prime_contract_pcos")
      .update({
        status: "approved",
        promoted_to_co_id: pcco.id,
        promoted_at: now,
        approved_at: now,
        approved_by: user.id,
        updated_at: now,
        updated_by: user.id,
      })
      .eq("id", pcoId);

    if (updateError) {
      logger.error({ msg: "[POST /promote] Failed to update PCO:", data: updateError });
      // Attempt to clean up the created PCCO
      await supabase
        .from("prime_contract_change_orders")
        .delete()
        .eq("id", pcco.id);
      return apiErrorResponse(updateError);
    }

    // Copy line items from PCO to PCCO
    if (lineItems && lineItems.length > 0) {
      const { data: fullLineItems } = await supabase
        .from("pco_line_items")
        .select("*")
        .eq("pco_id", pcoIdNum)
        .eq("pco_type", "prime");

      if (fullLineItems && fullLineItems.length > 0) {
        const pccoLineItems = fullLineItems.map((item) => ({
          pcco_id: pcco.id,
          description: item.description,
          cost_code: item.budget_code_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          uom: item.unit_of_measure,
          line_amount: item.amount,
        }));

        const { error: lineItemCopyError } = await supabase
          .from("pcco_line_items")
          .insert(pccoLineItems);

        if (lineItemCopyError) {
          logger.error({ msg: "[POST /promote] Failed to copy line items:", data: lineItemCopyError });
        }
      }
    }

    return NextResponse.json(
      {
        pco_id: pcoId,
        pcco_id: pcco.id,
        pcco_number: pcco.pcco_number,
        message: `PCO successfully promoted to Change Order #${pcco.pcco_number}`,
      },
      { status: 201 },
    );
    },
);
