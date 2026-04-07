import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const user = await getApiRouteUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const supabase = createServiceClient();
    const body = await request.json();

    // Ensure team_members is properly formatted as an array of objects
    if (body.team_members && Array.isArray(body.team_members)) {
      body.team_members = body.team_members.map((member: unknown) => {
        // If member is a string, try to parse it
        if (typeof member === 'string') {
          try {
            return JSON.parse(member);
          } catch {
            return member;
          }
        }
        return member;
      });
    }

    // Update the project with the provided fields
    const { data, error } = await supabase
      .from("projects")
      .update(body)
      .eq("id", Number(projectId))
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update project" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const user = await getApiRouteUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", Number(projectId))
      .single();

    if (error) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const user = await getApiRouteUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const archiveTimestamp = new Date().toISOString();

    const { data, error } = await supabase
      .from("projects")
      .update({
        archived: true,
        archived_at: archiveTimestamp,
        archived_by: user.id,
        phase: "Archive",
      })
      .eq("id", Number(projectId))
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to archive project" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
