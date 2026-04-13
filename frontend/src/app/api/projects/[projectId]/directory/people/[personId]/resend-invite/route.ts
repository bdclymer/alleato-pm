import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DirectoryService } from "@/services/directoryService";
import { apiErrorResponse } from "@/lib/api-error";

export const POST = withApiGuardrails<{ projectId: string; personId: string }>(
  "projects/[projectId]/directory/people/[personId]/resend-invite#POST",
  async ({ request, params }) => {
  
    const { projectId, personId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/directory/people/[personId]/resend-invite#POST", message: "Authentication required." });
    }

    // Create DirectoryService and resend invite
    const directoryService = new DirectoryService(supabase);
    const membership = await directoryService.resendInvite(projectId, personId);

    // TODO: Send actual invitation email
    // This would integrate with your email service
    return NextResponse.json(
      {
        user_id: personId,
        email: membership.person_id, // Would need to fetch person email
        status: membership.invite_status,
        invitation_sent_at: membership.last_invited_at,
        message: "Invitation resent successfully",
      },
      { status: 200 },
    );
    },
);
