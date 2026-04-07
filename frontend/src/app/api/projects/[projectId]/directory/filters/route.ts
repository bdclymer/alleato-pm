import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PermissionService } from "@/services/permissionService";
import { DirectoryPreferencesService } from "@/services/directoryPreferencesService";
import type { DirectoryFilters } from "@/components/directory/DirectoryFilters";
import { apiErrorResponse } from "@/lib/api-error";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const permissionService = new PermissionService(supabase);
    await permissionService.requirePermission(
      user.id,
      projectId,
      "directory",
      "read",
    );

    const prefService = new DirectoryPreferencesService(supabase);
    const filters = await prefService.listSavedFilters(user.id, projectId);

    return NextResponse.json({ data: filters });
  } catch (error) {
    console.error("[DirectoryFilters] Failed to list filters", error);
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const permissionService = new PermissionService(supabase);
    await permissionService.requirePermission(
      user.id,
      projectId,
      "directory",
      "write",
    );

    const body = (await request.json()) as {
      id?: string;
      name: string;
      description?: string;
      filters: DirectoryFilters;
      search?: string;
    };

    if (!body?.name || !body?.filters) {
      return NextResponse.json(
        { error: "Filter name and filters payload are required" },
        { status: 400 },
      );
    }

    const prefService = new DirectoryPreferencesService(supabase);
    const savedFilter = await prefService.saveFilter(
      user.id,
      projectId,
      body,
    );

    return NextResponse.json({ data: savedFilter });
  } catch (error) {
    console.error("[DirectoryFilters] Failed to save filter", error);
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const permissionService = new PermissionService(supabase);
    await permissionService.requirePermission(
      user.id,
      projectId,
      "directory",
      "write",
    );

    const filterId = request.nextUrl.searchParams.get("id");
    if (!filterId) {
      return NextResponse.json(
        { error: "Filter id is required" },
        { status: 400 },
      );
    }

    const prefService = new DirectoryPreferencesService(supabase);
    await prefService.deleteFilter(user.id, projectId, filterId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DirectoryFilters] Failed to delete filter", error);
    return apiErrorResponse(error);
  }
}
