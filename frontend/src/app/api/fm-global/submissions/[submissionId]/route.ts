/**
 * FM Global form submissions — single-row endpoint.
 * DELETE /api/fm-global/submissions/[submissionId] — remove a submission.
 */

import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ submissionId: string }>;
}

export const DELETE = withApiGuardrails<RouteContext["params"]>(
  "fm-global/submissions/[submissionId]#DELETE",
  async ({ params }) => {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "fm-global/submissions/[submissionId]#DELETE",
        message: "Authentication required.",
      });
    }

    const { submissionId } = await params;
    if (!submissionId) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "fm-global/submissions/[submissionId]#DELETE",
        message: "submissionId is required.",
      });
    }

    const { error } = await supabase
      .from("fm_form_submissions")
      .delete()
      .eq("id", submissionId);

    if (error) {
      throw new GuardrailError({
        code: "DB_ERROR",
        where: "fm-global/submissions/[submissionId]#DELETE",
        message: error.message,
      });
    }

    return NextResponse.json({ ok: true });
  },
);
