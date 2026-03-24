/**
 * /api/dev/violations
 * Design violation tracker API.
 * POST  — flag a new violation (from right-click overlay)
 * GET   — list violations (for inbox page + Claude Code reading)
 * PATCH — update status (Claude Code marks fixed, Megan marks wont_fix)
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { route, elementDescription, elementSelector, violationType, notes, screenshotDataUrl, priority } = body;

  if (!route || !violationType) {
    return NextResponse.json({ error: "route and violationType required" }, { status: 400 });
  }

  let screenshotUrl: string | null = null;
  if (screenshotDataUrl) {
    try {
      const base64 = screenshotDataUrl.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64, "base64");
      const fileName = `violations/${Date.now()}.png`;
      const service = createServiceClient();
      const { error: uploadError } = await service.storage
        .from("dev-assets")
        .upload(fileName, buffer, { contentType: "image/png" });
      if (!uploadError) {
        const { data: urlData } = service.storage.from("dev-assets").getPublicUrl(fileName);
        screenshotUrl = urlData?.publicUrl ?? null;
      }
    } catch { /* non-fatal */ }
  }

  const { data, error } = await supabase
    .from("design_violations")
    .insert({
      route,
      element_description: elementDescription ?? null,
      element_selector: elementSelector ?? null,
      violation_type: violationType,
      notes: notes ?? null,
      screenshot_url: screenshotUrl,
      priority: priority ?? "normal",
      status: "open",
      submitted_by: user.id,
    })
    .select("id, violation_type, route, status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, violation: data });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "open";
  const service = createServiceClient();

  const query = service
    .from("design_violations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status !== "all") {
    query.in("status", status.split(","));
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ violations: data ?? [], total: data?.length ?? 0 });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { id, status, fixedInFile } = body;
  if (!id || !status) return NextResponse.json({ error: "id and status required" }, { status: 400 });

  const service = createServiceClient();
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "fixed") {
    updates.fixed_at = new Date().toISOString();
    updates.fixed_in_file = fixedInFile ?? null;
  }

  const { data, error } = await service
    .from("design_violations")
    .update(updates)
    .eq("id", id)
    .select("id, status, violation_type, route")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, violation: data });
}
