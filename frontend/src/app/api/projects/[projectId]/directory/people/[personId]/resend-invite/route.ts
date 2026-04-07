import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DirectoryService } from "@/services/directoryService";
import { apiErrorResponse } from "@/lib/api-error";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; personId: string }> },
) {
  try {
    const { projectId, personId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  } catch (error) {
    return apiErrorResponse(error);
  }
}
