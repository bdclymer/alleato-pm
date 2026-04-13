import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PermissionService } from "@/services/permissionService";
import { DirectoryService } from "@/services/directoryService";

export const GET = withApiGuardrails(
  "avatar/[personId]#GET",
  async ({ request, params }) => {
    const { personId } = params as { personId: string };
    const projectId = request.nextUrl.searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId query parameter is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const serviceSupabase = createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "avatar/[personId]#GET",
        message: "Authentication required.",
      });
    }

    const permissionService = new PermissionService(supabase);
    await permissionService.requirePermission(
      user.id,
      projectId,
      "directory",
      "read",
    );

    // Ensure the requested person is visible within the project context.
    const directoryService = new DirectoryService(supabase);
    try {
      await directoryService.getPerson(projectId, personId);
    } catch {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data, error } = await (serviceSupabase as any)
      .from("person_profile_photos")
      .select("*")
      .eq("person_id", personId)
      .maybeSingle();

    if (error) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "avatar/[personId]#GET",
        message: error.message,
      });
    }

    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const photoData = data as { data_base64: string; content_type: string };
    const buffer = Buffer.from(photoData.data_base64, "base64");
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": photoData.content_type || "image/png",
        "Cache-Control": "private, max-age=300",
      },
    });
  },
);
