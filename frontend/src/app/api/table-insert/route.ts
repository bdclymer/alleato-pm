import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Strict allowlist of tables accessible via the generic insert endpoint.
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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { table, data } = body as { table?: string; data?: Record<string, unknown> };

    if (!table || !data) {
      return NextResponse.json(
        { error: "Missing required fields: table or data" },
        { status: 400 },
      );
    }

    if (!TABLE_ALLOWLIST.has(table)) {
      return NextResponse.json(
        { error: `Table "${table}" is not accessible via this endpoint` },
        { status: 403 },
      );
    }

    const { data: inserted, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Failed to insert record", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: inserted });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
