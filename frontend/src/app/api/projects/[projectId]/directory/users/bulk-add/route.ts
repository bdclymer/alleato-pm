import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  DirectoryService,
  type PersonCreateDTO,
} from "@/services/directoryService";
import { apiErrorResponse } from "@/lib/api-error";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { users, send_invites = false } = body;

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { error: "Users array is required and must not be empty" },
        { status: 400 },
      );
    }

    // Validate each user
    for (const userData of users) {
      if (!userData.first_name || !userData.last_name) {
        return NextResponse.json(
          { error: "Each user must have first_name and last_name" },
          { status: 400 },
        );
      }
      if (userData.person_type !== "user") {
        userData.person_type = "user"; // Force to user type
      }
    }

    // Create DirectoryService and bulk add users
    const directoryService = new DirectoryService(supabase);
    const result = await directoryService.bulkAddUsers(
      projectId,
      users as PersonCreateDTO[],
    );

    // TODO: If send_invites is true, send invitation emails for successful users
    if (send_invites) {
      // For each successful user, send invitation email
      // This would integrate with your email service
      }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
