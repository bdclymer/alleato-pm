import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { updateChangeEventSchema } from "../validation";
import { ZodError } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePermission } from "@/lib/permissions-guard";
import { logger } from "@/lib/logger";
import {
  formatHistoryFieldName,
  formatHistoryFieldValue,
  generateHistoryDescription,
  resolveUserEmails,
  mapChangedBy,
} from "@/lib/change-events/history-formatters";

interface RouteParams {
  params: Promise<{ projectId: string; changeEventId: string }>;
}

interface VerticalMarkupRow {
  percentage: number | null;
  calculation_order: number | null;
  compound: boolean | null;
}

function computeMarkupAdditions(
  _baseCost: number,
  baseRevenue: number,
  markups: VerticalMarkupRow[],
): { cost: number; revenue: number } {
  if (markups.length === 0) {
    return { cost: 0, revenue: 0 };
  }

  const sortedMarkups = [...markups].sort(
    (a, b) => (a.calculation_order ?? 0) - (b.calculation_order ?? 0),
  );

  let runningRevenueBase = baseRevenue;
  let totalRevenueMarkup = 0;

  for (const markup of sortedMarkups) {
    const percentage = Number(markup.percentage || 0);
    if (!Number.isFinite(percentage) || percentage <= 0) {
      continue;
    }

    const rate = percentage / 100;
    // Markups (contractor fee, insurance) apply to Revenue ROM only
    const revenueMarkup = runningRevenueBase * rate;
    totalRevenueMarkup += revenueMarkup;

    if (markup.compound) {
      runningRevenueBase += revenueMarkup;
    }
  }

  return {
    cost: 0,
    revenue: totalRevenueMarkup,
  };
}


async function enrichHistoryEntries(
  historyRows: any[],
  serviceSupabase: ReturnType<typeof createServiceClient>,
) {
  const uniqueUserIds = [
    ...new Set(
      historyRows
        .map((e: any) => e.changed_by)
        .filter((id: any): id is string => Boolean(id)),
    ),
  ];
  const userEmailById = await resolveUserEmails(
    uniqueUserIds,
    (id) => serviceSupabase.auth.admin.getUserById(id),
    "change-events#GET",
  );
  return historyRows.map((entry: any) => ({
    id: entry.id,
    fieldName: formatHistoryFieldName(entry.field_name),
    oldValue: formatHistoryFieldValue(entry.field_name, entry.old_value),
    newValue: formatHistoryFieldValue(entry.field_name, entry.new_value),
    changeType: entry.change_type,
    changedAt: entry.changed_at,
    changedBy: mapChangedBy(entry.changed_by, userEmailById),
    description: generateHistoryDescription(entry),
  }));
}

/**
 * GET /api/projects/[id]/change-events/[changeEventId]
 * Returns a single change event with full details including line items, attachments, and history
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/change-events/[changeEventId]#GET",
  async ({ request, params }) => {
  
    const { projectId, changeEventId } = await params;
    const supabase = await createClient();
    const serviceSupabase = createServiceClient();

    // Get change event with related data including budget_line and vendor joins
    const { data: changeEvent, error } = await supabase
      .from("change_events")
      .select(
        `
        *,
        prime_contract:prime_contracts!prime_contract_id(
          id,
          contract_number,
          title,
          contract_company_id
        ),
        change_event_line_items(
          id,
          description,
          budget_code_id,
          quantity,
          unit_of_measure,
          unit_cost,
          revenue_rom,
          cost_rom,
          non_committed_cost,
          vendor_id,
          contract_id,
          commitment_id,
          commitment_type,
          commitment_line_item_id,
          sort_order,
          created_at,
          updated_at,
          budget_line:budget_lines!budget_code_id(
            id,
            project_budget_code_id,
            description,
            cost_code:cost_codes!cost_code_id(
              id,
              title,
              division_id,
              division_title
            )
          ),
          vendor:companies!vendor_id(
            id,
            name
          ),
          contract:prime_contracts!contract_id(
            id,
            contract_number,
            title,
            contract_company_id
          )
        ),
        change_event_history(
          id,
          field_name,
          old_value,
          new_value,
          change_type,
          changed_at,
          changed_by
        )
      `,
      )
      .eq("project_id", parseInt(projectId, 10))
      .eq("id", changeEventId)
      .is("deleted_at", null)
      .single();

    if (error || !changeEvent) {
      return NextResponse.json(
        { error: "Change event not found" },
        { status: 404 },
      );
    }

    // Fallback prime contract lookup if join didn't resolve
    let primeContractData = (changeEvent.prime_contract as {
      id: string;
      contract_number: string | null;
      title: string | null;
      contract_company_id?: string | null;
    } | null) || null;
    if (!primeContractData && changeEvent.prime_contract_id) {
      const { data: pc } = await serviceSupabase
        .from("prime_contracts")
        .select("id, contract_number, title, contract_company_id")
        .eq("id", changeEvent.prime_contract_id)
        .maybeSingle();
      primeContractData = pc || null;
    }

    // Resolve commitment names for line items
    const lineItems = changeEvent.change_event_line_items || [];
    const commitmentIds = [...new Set(lineItems.filter((li: any) => li.commitment_id).map((li: any) => li.commitment_id))] as string[];
    const commitmentMap: Record<
      string,
      {
        contract_number: string | null;
        title: string | null;
        contract_company_id: string | null;
        company_name: string | null;
        display_name: string;
      }
    > = {};
    const companyIds = new Set<string>();

    if (commitmentIds.length > 0) {
      // Check subcontracts
      const { data: subs } = await supabase
        .from("subcontracts")
        .select("id, contract_number, title, contract_company_id")
        .in("id", commitmentIds);
      (subs || []).forEach((s: any) => {
        if (s.contract_company_id) companyIds.add(s.contract_company_id);
        commitmentMap[s.id] = {
          contract_number: s.contract_number ?? null,
          title: s.title ?? null,
          contract_company_id: s.contract_company_id ?? null,
          company_name: null,
          display_name: s.title || s.contract_number || s.id,
        };
      });

      // Check purchase orders for any not found in subcontracts
      const remainingIds = commitmentIds.filter((id: string) => !commitmentMap[id]);
      if (remainingIds.length > 0) {
        const { data: pos } = await supabase
          .from("purchase_orders")
          .select("id, contract_number, title, contract_company_id")
          .in("id", remainingIds);
        (pos || []).forEach((p: any) => {
          if (p.contract_company_id) companyIds.add(p.contract_company_id);
          commitmentMap[p.id] = {
            contract_number: p.contract_number ?? null,
            title: p.title ?? null,
            contract_company_id: p.contract_company_id ?? null,
            company_name: null,
            display_name: p.title || p.contract_number || p.id,
          };
        });
      }
    }

    // Gather contract company IDs from event-level and line-item prime contracts
    if (primeContractData?.contract_company_id) {
      companyIds.add(primeContractData.contract_company_id);
    }
    for (const item of lineItems) {
      if (item.contract?.contract_company_id) {
        const companyId = item.contract.contract_company_id as string;
        companyIds.add(companyId);
      }
    }

    const companyNameById: Record<string, string> = {};
    if (companyIds.size > 0) {
      const { data: companies } = await serviceSupabase
        .from("companies")
        .select("id, name")
        .in("id", Array.from(companyIds));
      for (const company of companies || []) {
        companyNameById[company.id] = company.name || "";
      }
    }

    // Hydrate commitment labels with company names when title is missing
    for (const commitmentId of Object.keys(commitmentMap)) {
      const existing = commitmentMap[commitmentId];
      if (!existing) continue;
      const resolvedCompanyName =
        (existing.contract_company_id &&
          companyNameById[existing.contract_company_id]) ||
        existing.company_name ||
        null;
      commitmentMap[commitmentId] = {
        ...existing,
        company_name: resolvedCompanyName,
        display_name:
          existing.title ||
          resolvedCompanyName ||
          existing.contract_number ||
          commitmentId,
      };
    }

    const primeContractCompanyName =
      (primeContractData?.contract_company_id &&
        companyNameById[primeContractData.contract_company_id]) ||
      null;
    const primeContractDisplayName =
      primeContractData?.title ||
      primeContractCompanyName ||
      primeContractData?.contract_number ||
      null;

    // Map budget_lines IDs to project_budget_codes IDs for edit form compatibility.
    // budget_lines.project_budget_code_id is the direct reference — no secondary lookup needed.
    const budgetLineIds = [...new Set(lineItems.filter((li: any) => li.budget_code_id).map((li: any) => li.budget_code_id))];
    const budgetLineToProjectCodeMap: Record<string, string> = {};
    if (budgetLineIds.length > 0) {
      const { data: budgetLines } = await supabase
        .from("budget_lines")
        .select("id, project_budget_code_id")
        .in("id", budgetLineIds);

      for (const bl of budgetLines ?? []) {
        if (bl.project_budget_code_id) {
          budgetLineToProjectCodeMap[bl.id] = bl.project_budget_code_id;
        }
      }
    }

    const baseRevenueRom = lineItems.reduce(
      (sum: number, item: any) => sum + (item.revenue_rom || 0),
      0,
    );
    const baseCostRom = lineItems.reduce(
      (sum: number, item: any) => sum + (item.cost_rom || 0),
      0,
    );
    const baseNonCommittedCost = lineItems.reduce(
      (sum: number, item: any) => sum + (item.non_committed_cost || 0),
      0,
    );

    const { data: projectMarkups } = await supabase
      .from("vertical_markup")
      .select("percentage, calculation_order, compound")
      .eq("project_id", parseInt(projectId, 10));

    const applyMarkup = changeEvent.expecting_revenue !== false;
    const markupAdditions = computeMarkupAdditions(
      baseCostRom,
      baseRevenueRom,
      applyMarkup ? ((projectMarkups || []) as VerticalMarkupRow[]) : [],
    );

    // Calculate totals from line items + project financial markup
    const totals = {
      revenueRom: (baseRevenueRom + markupAdditions.revenue).toFixed(2),
      costRom: (baseCostRom + markupAdditions.cost).toFixed(2),
      nonCommittedCost: baseNonCommittedCost.toFixed(2),
      lineItemsCount: lineItems.length,
    };

    // Get creator info via users_auth bridge table
    let creator = null;
    if (changeEvent.created_by) {
      const { data: userAuth } = await supabase
        .from("users_auth")
        .select("person_id")
        .eq("auth_user_id", changeEvent.created_by)
        .single();

      if (userAuth?.person_id) {
        const { data: person } = await supabase
          .from("people")
          .select("id, email, first_name, last_name")
          .eq("id", userAuth.person_id)
          .single();
        creator = person;
      }

      // Fallback: try auth user email if people lookup fails
      if (!creator) {
        try {
          const { data: { user: authUser } } = await serviceSupabase.auth.admin.getUserById(changeEvent.created_by);
          if (authUser) {
            creator = { id: authUser.id, email: authUser.email, first_name: null, last_name: null };
          }
        } catch (err) {
          logger.error({ msg: "[change-events#GET] Failed to resolve creator email:", error: err instanceof Error ? err.message : String(err) });
        }
      }
    }

    // Format response
    const response = {
      id: changeEvent.id,
      number: changeEvent.number,
      title: changeEvent.title,
      type: changeEvent.type,
      reason: changeEvent.reason,
      scope: changeEvent.scope,
      status: changeEvent.status,
      workflowStage: (changeEvent as any).workflow_stage ?? null,
      origin: changeEvent.origin,
      originId: changeEvent.origin_id,
      description: changeEvent.description,
      expectingRevenue: changeEvent.expecting_revenue,
      lineItemRevenueSource: changeEvent.line_item_revenue_source,
      primeContractId: changeEvent.prime_contract_id,
      primeContract: primeContractData
        ? {
            ...primeContractData,
            company_name: primeContractCompanyName,
            display_name: primeContractDisplayName,
          }
        : null,
      totals,
      lineItems: lineItems.map((item: any) => {
        const quantity = item.quantity || 0;
        const unitCost = item.unit_cost || 0;
        return {
          id: item.id,
          description: item.description,
          budgetCodeId: item.budget_code_id,
          // projectBudgetCodeId maps budget_lines → project_budget_codes for form selectors
          projectBudgetCodeId: budgetLineToProjectCodeMap[item.budget_code_id] || item.budget_line?.project_budget_code_id || null,
          budgetLine: item.budget_line || null,
          quantity: item.quantity,
          unitOfMeasure: item.unit_of_measure,
          unitCost: item.unit_cost,
          extendedAmount: quantity * unitCost,
          revenueRom: item.revenue_rom,
          costRom: item.cost_rom,
          nonCommittedCost: item.non_committed_cost,
          vendorId: item.vendor_id,
          vendor: item.vendor || null,
          contractId: item.contract_id,
          contract: item.contract
            ? {
                ...item.contract,
                company_name:
                  (item.contract.contract_company_id &&
                    companyNameById[item.contract.contract_company_id]) ||
                  null,
                display_name:
                  item.contract.title ||
                  (item.contract.contract_company_id &&
                    companyNameById[item.contract.contract_company_id]) ||
                  item.contract.contract_number ||
                  null,
              }
            : null,
          commitmentId: item.commitment_id,
          commitmentType: item.commitment_type,
          commitmentLineItemId: item.commitment_line_item_id,
          commitment: item.commitment_id ? commitmentMap[item.commitment_id] || null : null,
          sortOrder: item.sort_order,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        };
      }),
      history: await enrichHistoryEntries(
        changeEvent.change_event_history || [],
        serviceSupabase,
      ),
      createdAt: changeEvent.created_at,
      createdBy: creator,
      updatedAt: changeEvent.updated_at,
      _links: {
        self: `/api/projects/${projectId}/change-events/${changeEventId}`,
        edit: `/api/projects/${projectId}/change-events/${changeEventId}`,
        delete: `/api/projects/${projectId}/change-events/${changeEventId}`,
        lineItems: `/api/projects/${projectId}/change-events/${changeEventId}/line-items`,
        attachments: `/api/projects/${projectId}/change-events/${changeEventId}/attachments`,
        history: `/api/projects/${projectId}/change-events/${changeEventId}/history`,
      },
    };

    return NextResponse.json(response);
    },
);

/**
 * PATCH /api/projects/[id]/change-events/[changeEventId]
 * Updates a change event (partial update)
 */
export const PATCH = withApiGuardrails(
  "projects/[projectId]/change-events/[changeEventId]#PATCH",
  async ({ request, params }) => {
  
    const { projectId, changeEventId } = await params;
    const projectIdNum = parseInt(projectId, 10);
    const guard = await requirePermission(projectIdNum, "change_orders", "write");
    if (guard.denied) return guard.response;

    const supabase = await createClient();
    const body = await request.json();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/change-events/[changeEventId]#PATCH", message: "Authentication required." });
    }

    // Validate request body
    const validatedData = updateChangeEventSchema.parse(body);

    // Get existing change event
    const { data: existingEvent, error: fetchError } = await supabase
      .from("change_events")
      .select("*")
      .eq("project_id", parseInt(projectId, 10))
      .eq("id", changeEventId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !existingEvent) {
      return NextResponse.json(
        { error: "Change event not found" },
        { status: 404 },
      );
    }

    // Map validated data to database schema
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };

    if (validatedData.title !== undefined) updates.title = validatedData.title;
    if (validatedData.type !== undefined) updates.type = validatedData.type;
    if (validatedData.reason !== undefined)
      updates.reason = validatedData.reason;
    if (validatedData.scope !== undefined) updates.scope = validatedData.scope;
    if (validatedData.origin !== undefined)
      updates.origin = validatedData.origin;
    if ("originId" in body)
      updates.origin_id = typeof body.originId === "string" ? body.originId : null;
    if (validatedData.description !== undefined)
      updates.description = validatedData.description;
    if (validatedData.status !== undefined)
      updates.status = validatedData.status;
    if (validatedData.expectingRevenue !== undefined)
      updates.expecting_revenue = validatedData.expectingRevenue;
    if (validatedData.lineItemRevenueSource !== undefined)
      updates.line_item_revenue_source = validatedData.lineItemRevenueSource;
    if (validatedData.primeContractId !== undefined)
      updates.prime_contract_id = validatedData.primeContractId;

    // Update the change event
    const { data, error } = await supabase
      .from("change_events")
      .update(updates)
      .eq("id", changeEventId)
      .select(
        `
        *,
        change_event_line_items(
          id,
          description,
          budget_code_id,
          quantity,
          unit_of_measure,
          unit_cost,
          revenue_rom,
          cost_rom,
          non_committed_cost,
          vendor_id,
          contract_id,
          sort_order,
          created_at,
          updated_at,
          budget_line:budget_lines!budget_code_id(
            id,
            project_budget_code_id,
            description,
            cost_code:cost_codes!cost_code_id(
              id,
              title,
              division_id,
              division_title
            )
          ),
          vendor:companies!vendor_id(
            id,
            name
          )
        )
      `,
      )
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    // Create audit log entries for changed fields
    const auditEntries = [];
    const existingRow = existingEvent as Record<string, unknown>;
    for (const [field, newValue] of Object.entries(updates)) {
      if (
        field !== "updated_at" &&
        field !== "updated_by" &&
        existingRow[field] !== newValue
      ) {
        const oldVal = existingRow[field];
        auditEntries.push({
          change_event_id: changeEventId,
          field_name: field,
          old_value:
            oldVal === null || oldVal === undefined
              ? null
              : typeof oldVal === "string"
                ? oldVal
                : JSON.stringify(oldVal),
          new_value: newValue?.toString() || null,
          changed_by: user.id,
          change_type: "UPDATE",
        });
      }
    }

    if (auditEntries.length > 0) {
      await supabase.from("change_event_history").insert(auditEntries);
    }

    // Format response
    const response = {
      id: data.id,
      number: data.number,
      title: data.title,
      type: data.type,
      reason: data.reason,
      scope: data.scope,
      status: data.status,
      origin: data.origin,
      description: data.description,
      expectingRevenue: data.expecting_revenue,
      lineItemRevenueSource: data.line_item_revenue_source,
      primeContractId: data.prime_contract_id,
      updatedAt: data.updated_at,
      updatedBy: {
        id: user.id,
        email: user.email,
      },
      lineItems: (data.change_event_line_items || []).map((item: any) => {
        const quantity = item.quantity || 0;
        const unitCost = item.unit_cost || 0;
        return {
          id: item.id,
          description: item.description,
          budgetCodeId: item.budget_code_id,
          budgetLine: item.budget_line || null,
          quantity: item.quantity,
          unitOfMeasure: item.unit_of_measure,
          unitCost: item.unit_cost,
          extendedAmount: quantity * unitCost,
          revenueRom: item.revenue_rom,
          costRom: item.cost_rom,
          nonCommittedCost: item.non_committed_cost,
          vendorId: item.vendor_id,
          vendor: item.vendor || null,
          contractId: item.contract_id,
          sortOrder: item.sort_order,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        };
      }),
      _links: {
        self: `/api/projects/${projectId}/change-events/${changeEventId}`,
      },
    };

    return NextResponse.json(response);
    },
);

/**
 * DELETE /api/projects/[id]/change-events/[changeEventId]
 * Soft deletes a change event by setting deleted_at timestamp
 */
export const DELETE = withApiGuardrails(
  "projects/[projectId]/change-events/[changeEventId]#DELETE",
  async ({ request, params }) => {
  
    const { projectId, changeEventId } = await params;
    const projectIdNum = parseInt(projectId, 10);
    const guard = await requirePermission(projectIdNum, "change_orders", "admin");
    if (guard.denied) return guard.response;

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/change-events/[changeEventId]#DELETE", message: "Authentication required." });
    }

    // Check if change event exists
    const { data: existingEvent, error: fetchError } = await supabase
      .from("change_events")
      .select("id, status, deleted_at")
      .eq("project_id", parseInt(projectId, 10))
      .eq("id", changeEventId)
      .single();

    if (fetchError || !existingEvent) {
      return NextResponse.json(
        { error: "Change event not found" },
        { status: 404 },
      );
    }

    // Check if already deleted
    if (existingEvent.deleted_at) {
      return NextResponse.json(
        { error: "Change event already deleted" },
        { status: 400 },
      );
    }

    // Check if event can be deleted (only Open or Void status)
    if (existingEvent.status !== "Open" && existingEvent.status !== "Void") {
      return NextResponse.json(
        {
          error: "Cannot delete change event",
          details:
            "Only change events with status Open or Void can be deleted",
        },
        { status: 409 },
      );
    }

    // Soft delete the change event
    const { error } = await supabase
      .from("change_events")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", changeEventId);

    if (error) {
      return apiErrorResponse(error);
    }

    // Create audit log entry
    await supabase.from("change_event_history").insert({
      change_event_id: changeEventId,
      field_name: "deleted_at",
      old_value: null,
      new_value: new Date().toISOString(),
      changed_by: user.id,
      change_type: "DELETE",
    });

    return new NextResponse(null, { status: 204 });
    },
);
