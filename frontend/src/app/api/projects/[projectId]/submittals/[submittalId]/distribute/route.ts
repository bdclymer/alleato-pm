import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ projectId: string; submittalId: string }>;
}

const distributeSchema = z.object({
  recipient_ids: z.array(z.string().uuid()).min(1, "At least one recipient required"),
  message: z.string().nullable().optional(),
});

/**
 * POST /api/projects/[projectId]/submittals/[submittalId]/distribute
 * Distributes the submittal to a list of recipients.
 */
export const POST = withApiGuardrails(
  "projects/[projectId]/submittals/[submittalId]/distribute#POST",
  async ({ request, params }) => {
  
    const { submittalId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/submittals/[submittalId]/distribute#POST", message: "Authentication required." });
    }

    const body = await req.json();
    const { recipient_ids, message } = distributeSchema.parse(body);

    // Create the distribution record
    const { data: distribution, error: distError } = await supabase
      .from("submittal_distributions")
      .insert({
        submittal_id: submittalId,
        from_id: user.id,
        message: message ?? null,
        distributed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (distError) {
      return apiErrorResponse(distError);
    }

    // Create recipient records
    const recipientRows = recipient_ids.map((rid) => ({
      distribution_id: distribution.id,
      recipient_id: rid,
    }));

    const { error: recipError } = await supabase
      .from("submittal_distribution_recipients")
      .insert(recipientRows);

    if (recipError) {
      return apiErrorResponse(recipError);
    }

    // Update submittal status to Distributed
    await supabase
      .from("submittals")
      .update({
        status: "Distributed",
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", submittalId);

    return NextResponse.json(distribution, { status: 201 });
    },
);
