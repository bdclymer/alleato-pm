import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { createClient } from "@/lib/supabase/server";

export const DELETE = withApiGuardrails<{ prospectId: string }>(
  "directory/prospects/[prospectId]#DELETE",
  async ({ params }) => {
    const { prospectId } = await params;
    const id = Number(prospectId);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: "Invalid prospect ID" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("prospects")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      return apiErrorResponse(error);
    }

    if (!data) {
      return NextResponse.json(
        { error: "Prospect not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  },
);
