import { NextResponse } from "next/server";
import { getPermissionTemplates } from "@/lib/permissions";

/**
 * GET /api/permissions/templates
 * Get all available permission templates
 */
export async function GET() {
  try {
    const templates = await getPermissionTemplates();
    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error("Error loading permission templates:", error);
    return NextResponse.json(
      { error: "Failed to load permission templates" },
      { status: 500 }
    );
  }
}