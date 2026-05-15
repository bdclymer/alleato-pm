import { withApiGuardrails } from "@/lib/guardrails/api";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const GET = withApiGuardrails(
  "projects/[projectId]/change-events/next-number#GET",
  async ({ params }) => {
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("change_events")
      .select("number")
      .eq("project_id", projectIdNum);

    let maxNumber = 0;
    for (const row of existing ?? []) {
      if (!row?.number) continue;
      const match = String(row.number).match(/(\d+)\s*$/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (Number.isFinite(n) && n > maxNumber) maxNumber = n;
      }
    }

    const nextNumber = (maxNumber + 1).toString().padStart(3, "0");
    return NextResponse.json({ number: nextNumber });
  },
);
