import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import path from "path"
import { apiErrorResponse } from "@/lib/api-error";

const execAsync = promisify(exec)

export async function POST() {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { success: false, message: "Only available in development" },
      { status: 403 }
    )
  }

  try {
    // Get project ID from env
    const projectId = process.env.NEXT_PUBLIC_SUPABASE_URL?.split(".")[0].replace("https://", "")

    if (!projectId) {
      return NextResponse.json(
        { success: false, message: "Supabase project ID not found in env" },
        { status: 400 }
      )
    }

    // Run the types generation command
    const typesPath = path.join(process.cwd(), "src/types/database.types.ts")
    const command = `npx supabase gen types typescript --project-id "${projectId}" --schema public > "${typesPath}"`

    await execAsync(command)

    return NextResponse.json({
      success: true,
      message: "Types regenerated successfully",
    })
  } catch (error) {
    return apiErrorResponse(error)
  }
}
