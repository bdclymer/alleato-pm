import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ feature: string; filename: string }> },
) {
  const { feature, filename } = await params;

  // Sanitize — only allow alphanumeric, hyphens, underscores, dots
  if (!/^[\w.-]+$/.test(feature) || !/^[\w.-]+$/.test(filename)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const screenshotPath = path.join(
    process.cwd(),
    "..",
    ".claude",
    "procore-manifests",
    feature,
    "screenshots",
    filename,
  );

  try {
    const buffer = await readFile(screenshotPath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Screenshot not found" }, { status: 404 });
  }
}
