import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

/** Returns the list of available screenshot state IDs for a feature. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ feature: string }> },
) {
  const { feature } = await params;

  if (!/^[\w-]+$/.test(feature)) {
    return NextResponse.json({ error: "Invalid feature" }, { status: 400 });
  }

  const manifestPath = path.join(
    process.cwd(),
    "..",
    ".claude",
    "procore-manifests",
    feature,
    "manifest.json",
  );

  try {
    const raw = await readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(raw) as { states?: Record<string, { screenshot?: string }> };
    const stateIds = Object.keys(manifest.states ?? {});
    return NextResponse.json({ feature, stateIds });
  } catch {
    return NextResponse.json({ error: "Manifest not found" }, { status: 404 });
  }
}
