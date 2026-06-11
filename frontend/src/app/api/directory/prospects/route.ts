import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { createClient } from "@/lib/supabase/server";

const PROSPECT_SELECT_COLUMNS = [
  "id",
  "company_name",
  "contact_name",
  "contact_email",
  "contact_phone",
  "contact_title",
  "status",
  "lead_source",
  "industry",
  "estimated_project_value",
  "probability",
  "assigned_to",
  "next_follow_up",
  "last_contacted",
  "project_type",
  "estimated_start_date",
  "notes",
  "created_at",
  "updated_at",
].join(", ");

export const GET = withApiGuardrails(
  "directory/prospects#GET",
  async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("prospects")
      .select(PROSPECT_SELECT_COLUMNS)
      .order("created_at", { ascending: false });

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json({ data: data ?? [] });
  },
);
