import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Strict allowlist of tables accessible via the generic delete endpoint.
 * Any table not in this set will be rejected with 403.
 * OWASP A01:2021 - Broken Access Control
 */
const TABLE_ALLOWLIST = new Set([
  "projects", "budget_lines", "prime_contracts", "commitments",
  "contract_line_items", "contract_change_orders", "change_events",
  "direct_costs", "rfis", "submittals", "punch_list_items",
  "daily_logs", "meetings", "meeting_items", "specifications",
  "specification_sections", "drawings", "drawing_revisions",
  "photos", "documents", "transmittals", "emails",
  "companies", "vendors", "clients", "people", "contacts",
  "user_profiles", "project_memberships", "tasks", "schedule_tasks",
  "prime_contract_change_orders", "payment_applications",
  "payment_application_line_items", "direct_cost_line_items",
  "change_event_line_items", "project_cost_codes",
]);

export const POST = withApiGuardrails(
  "table-delete#POST",
  async ({ request }) => {
  
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "table-delete#POST", message: "Authentication required." });
    }

    const body = await request.json();
    const { table, id } = body as { table?: string; id?: string | number };

    if (!table || !id) {
      return NextResponse.json(
        { error: "Missing required fields: table or id" },
        { status: 400 },
      );
    }

    if (!TABLE_ALLOWLIST.has(table)) {
      return NextResponse.json(
        { error: `Table "${table}" is not accessible via this endpoint` },
        { status: 403 },
      );
    }

    const { error } = await supabase.from(table).delete().eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete record", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
    },
);

