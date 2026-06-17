import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { getActiveManpowerPayload } from "@/features/manpower/server";

export const GET = withApiGuardrails(
  "manpower#GET",
  async () => {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "manpower#GET",
        message: "Authentication required.",
      });
    }

    const payload = await getActiveManpowerPayload(supabase);
    return NextResponse.json(payload);
  },
);
