import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Project Bootstrap API
 *
 * Creates a fully populated test project with:
 * - Project
 * - Prime Contract
 * - Budget Codes + Line Items
 * - Commitment (Subcontractor)
 * - Change Event
 * - Change Order
 * - Budget Modification
 *
 * Usage: POST /api/projects/bootstrap
 * Payload: { name?: string, template?: 'warehouse' | 'commercial' }
 */

interface BootstrapResponse {
  project: any;
  contract: any;
  budgetCodes: any[];
  budgetLineItems: any[];
  commitment: any;
  changeEvent: any;
  changeOrder: any;
  budgetModification: any;
}

const WAREHOUSE_TEMPLATE = {
  name: "Test Warehouse Project",
  projectNumber: "WH-2025-001",
  description: "Auto-generated warehouse construction project for testing",
  state: "California",
  city: "San Francisco",
  address: "123 Test St",
  zip: "94102",
  estimatedValue: 2500000,

  contract: {
    contractNumber: "PC-001",
    title: "Prime Contract - Warehouse Construction",
    originalAmount: 2500000,
    retentionPercentage: 10,
    scopeOfWork:
      "Complete construction of 50,000 sq ft warehouse facility including foundation, structure, MEP systems, and finishes.",
  },

  costCodes: [
    { id: "01-100", description: "General Requirements", amount: 125000 },
    { id: "02-200", description: "Site Work", amount: 200000 },
    { id: "03-300", description: "Concrete", amount: 450000 },
    { id: "04-400", description: "Masonry", amount: 150000 },
    { id: "05-500", description: "Metals", amount: 300000 },
    { id: "06-600", description: "Wood & Plastics", amount: 100000 },
    { id: "07-700", description: "Thermal & Moisture", amount: 175000 },
    { id: "08-800", description: "Doors & Windows", amount: 125000 },
    { id: "09-900", description: "Finishes", amount: 225000 },
    { id: "21-000", description: "Fire Suppression", amount: 150000 },
    { id: "22-000", description: "Plumbing", amount: 175000 },
    { id: "23-000", description: "HVAC", amount: 200000 },
    { id: "26-000", description: "Electrical", amount: 225000 },
  ],

  commitment: {
    commitmentNumber: "COM-001",
    title: "Concrete Subcontractor",
    originalAmount: 450000,
    scopeOfWork:
      "Supply and install all concrete work including slab-on-grade, walls, and elevated decks.",
  },

  changeEvent: {
    title: "Owner Requested Storage Expansion",
    description:
      "Owner requests additional 5,000 sq ft storage area in northwest corner",
    romCostImpact: 125000,
    romScheduleImpact: 14, // days
  },

  changeOrder: {
    title: "PCO-001 - Storage Expansion",
    description:
      "Additional structural steel, concrete, and roofing for 5,000 sq ft expansion",
    amount: 125000,
  },
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json().catch(() => ({}));

    const template = body.template || "warehouse";
    const customName = body.name;

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use warehouse template (only one for now)
    const projectTemplate = WAREHOUSE_TEMPLATE;

    const projectName = customName || projectTemplate.name;

    // ============================================
    // 1. CREATE PROJECT
    // ============================================
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        name: projectName,
        "project number": projectTemplate.projectNumber,
        description: projectTemplate.description,
        state: projectTemplate.state,
        city: projectTemplate.city,
        address: projectTemplate.address,
        zip: projectTemplate.zip,
        estimated_value: projectTemplate.estimatedValue,
        stage: "active",
      })
      .select()
      .single();

    if (projectError) {
      return NextResponse.json(
        { error: `Failed to create project: ${projectError.message}` },
        { status: 500 },
      );
    }

    // ============================================
    // 2. CREATE CLIENT (OWNER)
    // ============================================
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .insert({
        name: "Test Owner LLC",
        client_type: "owner",
        email: "owner@testproject.com",
        phone: "(555) 123-4567",
      })
      .select()
      .single();

    if (clientError) {
      return NextResponse.json(
        { error: `Failed to create client: ${clientError.message}` },
        { status: 500 },
      );
    }

    // ============================================
    // 3. CREATE PRIME CONTRACT
    // ============================================
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .insert({
        contract_number: projectTemplate.contract.contractNumber,
        title: projectTemplate.contract.title,
        client_id: client.id,
        project_id: project.id,
        status: "approved",
        original_contract_amount: projectTemplate.contract.originalAmount,
        revised_contract_amount: projectTemplate.contract.originalAmount,
        retention_percentage: projectTemplate.contract.retentionPercentage,
        executed: true,
        notes: projectTemplate.contract.scopeOfWork,
      })
      .select()
      .single();

    if (contractError) {
      return NextResponse.json(
        { error: `Failed to create contract: ${contractError.message}` },
        { status: 500 },
      );
    }

    // ============================================
    // 4. ENSURE COST CODES EXIST
    // ============================================
    const costCodeIds = projectTemplate.costCodes.map((cc) => cc.id);

    // Check which cost codes already exist
    const { data: existingCostCodes } = await supabase
      .from("cost_codes")
      .select("id")
      .in("id", costCodeIds);

    const existingIds = new Set((existingCostCodes || []).map((cc) => cc.id));
    const missingCostCodes = projectTemplate.costCodes.filter(
      (cc) => !existingIds.has(cc.id),
    );

    // Insert missing cost codes
    if (missingCostCodes.length > 0) {
      const { error: ccError } = await supabase.from("cost_codes").insert(
        missingCostCodes.map((cc) => ({
          id: cc.id,
          description: cc.description,
          division: cc.id.split("-")[0],
        })),
      );

      if (ccError && !ccError.message.includes("duplicate")) {
        return NextResponse.json(
          { error: `Failed to create cost codes: ${ccError.message}` },
          { status: 500 },
        );
      }
    }

    // ============================================
    // 5. CREATE BUDGET CODES + LINE ITEMS
    // ============================================
    const budgetCodes = [];
    const budgetLineItems = [];

    for (const costCode of projectTemplate.costCodes) {
      // Create budget_code
      const { data: budgetCode, error: bcError } = await supabase
        .from("project_budget_codes")
        .insert({
          project_id: project.id,
          cost_code_id: costCode.id,
          sub_job_id: null,
          cost_type_id: null,
          description: costCode.description,
          created_by: user.id,
        })
        .select()
        .single();

      if (bcError) {
        continue; // Skip if duplicate
      }

      budgetCodes.push(budgetCode);

      // Create budget_line_item
      const { data: lineItem, error: liError } = await supabase
        .from("budget_lines")
        .insert({
          project_budget_code_id: budgetCode.id,
          description: costCode.description,
          original_amount: costCode.amount,
          calculation_method: "lump_sum",
          created_by: user.id,
        })
        .select()
        .single();

      if (liError) {
        continue;
      }

      budgetLineItems.push(lineItem);
    }

    // Refresh materialized view
    await supabase.rpc("refresh_budget_rollup", { p_project_id: project.id });

    // ============================================
    // 6. CREATE SUBCONTRACTOR CLIENT
    // ============================================
    const { data: subcontractor, error: subError } = await supabase
      .from("clients")
      .insert({
        name: "ABC Concrete Inc.",
        client_type: "subcontractor",
        email: "estimating@abcconcrete.com",
        phone: "(555) 234-5678",
      })
      .select()
      .single();

    if (subError) {
      }

    // ============================================
    // 7. CREATE COMMITMENT
    // ============================================
    let commitment = null;
    if (subcontractor) {
      const { data: com, error: comError } = await supabase
        .from("commitments")
        .insert({
          project_id: project.id,
          number: projectTemplate.commitment.commitmentNumber,
          title: projectTemplate.commitment.title,
          contract_company_id: subcontractor.id,
          status: "approved",
          original_amount: projectTemplate.commitment.originalAmount,
          revised_contract_amount: projectTemplate.commitment.originalAmount,
          accounting_method: "amount",
          retention_percentage: 10,
          private: false,
          description: projectTemplate.commitment.scopeOfWork,
        })
        .select()
        .single();

      if (comError) {
        } else {
        commitment = com;
      }
    }

    // ============================================
    // 8. CREATE CHANGE EVENT
    // ============================================
    let changeEvent = null;
    if (commitment) {
      const { data: ce, error: ceError } = await supabase
        .from("change_events")
        .insert({
          project_id: project.id,
          number: "CE-001",
          title: projectTemplate.changeEvent.title,
          description: projectTemplate.changeEvent.description,
          status: "pending",
          rom_cost_impact: projectTemplate.changeEvent.romCostImpact,
          rom_schedule_impact: projectTemplate.changeEvent.romScheduleImpact,
          created_by_id: user.id,
        })
        .select()
        .single();

      if (ceError) {
        } else {
        changeEvent = ce;
      }
    }

    // ============================================
    // 9. CREATE CHANGE ORDER
    // ============================================
    let changeOrder = null;
    if (changeEvent && commitment) {
      const { data: co, error: coError } = await supabase
        .from("change_orders")
        .insert({
          change_event_id: changeEvent.id,
          commitment_id: commitment.id,
          number: "CO-001",
          title: projectTemplate.changeOrder.title,
          description: projectTemplate.changeOrder.description,
          status: "pending",
          amount: projectTemplate.changeOrder.amount,
          created_by: user.id,
        })
        .select()
        .single();

      if (coError) {
        } else {
        changeOrder = co;
      }
    }

    // ============================================
    // 10. CREATE BUDGET MODIFICATION (PLACEHOLDER)
    // ============================================
    // Budget modifications typically require more complex logic
    // For now, we'll return null
    const budgetModification = null;

    // ============================================
    // RESPONSE
    // ============================================
    const response: BootstrapResponse = {
      project,
      contract,
      budgetCodes,
      budgetLineItems,
      commitment,
      changeEvent,
      changeOrder,
      budgetModification,
    };

    return NextResponse.json(response, { status: 201 });
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
