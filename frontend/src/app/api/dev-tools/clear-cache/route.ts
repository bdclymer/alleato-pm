import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

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
    // Clear .next directory
    await execAsync("rm -rf .next")

    return NextResponse.json({
      success: true,
      message: "Cache cleared. Please refresh the page and wait for rebuild.",
    })
  } catch (error) {
    console.error("Error clearing cache:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to clear cache",
      },
      { status: 500 }
    )
  }
}
