import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { matchFeedbackToTool, getToolById, listTools } from "@/lib/admin-feedback/tool-matcher";
import { resolveToolContext, contextToAgentPayload } from "@/lib/admin-feedback/context-resolver";

// ---------------------------------------------------------------------------
// GET — List all tools (for assignment dropdown) or match a feedback item
// ---------------------------------------------------------------------------

const querySchema = z.object({
  action: z.enum(["list", "match", "resolve"]),
  feedbackId: z.string().uuid().optional(),
  toolId: z.coerce.number().int().positive().optional(),
});

async function requireAdmin() {
  const user = await getApiRouteUser();
  if (!user) return null;

  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.is_admin ? user : null;
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { action, feedbackId, toolId } = parsed.data;

  if (action === "list") {
    const tools = await listTools();
    return NextResponse.json({ tools });
  }

  if (action === "match" && feedbackId) {
    const supabase = createServiceClient();
    const { data: item } = await supabase
      .from("admin_feedback_items")
      .select("title, comment")
      .eq("id", feedbackId)
      .maybeSingle();

    if (!item) {
      return NextResponse.json({ error: "Feedback item not found" }, { status: 404 });
    }

    const match = await matchFeedbackToTool(item.title, item.comment);
    if (!match) {
      return NextResponse.json({ match: null, message: "No tool matched above threshold" });
    }

    const context = resolveToolContext(match);
    return NextResponse.json({ match, context });
  }

  if (action === "resolve" && toolId) {
    const tool = await getToolById(toolId);
    if (!tool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }
    const context = resolveToolContext(tool);
    return NextResponse.json({ tool, context });
  }

  return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
}

// ---------------------------------------------------------------------------
// POST — Assign a tool to a feedback item (manual or auto)
// ---------------------------------------------------------------------------

const assignSchema = z.object({
  feedbackId: z.string().uuid(),
  toolId: z.number().int().positive().nullable(),
  auto: z.boolean().optional(),
});

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { feedbackId, auto } = parsed.data;
  let { toolId } = parsed.data;
  const supabase = createServiceClient();

  // Auto-match if requested
  if (auto) {
    const { data: item } = await supabase
      .from("admin_feedback_items")
      .select("title, comment")
      .eq("id", feedbackId)
      .maybeSingle();

    if (!item) {
      return NextResponse.json({ error: "Feedback item not found" }, { status: 404 });
    }

    const match = await matchFeedbackToTool(item.title, item.comment);
    toolId = match?.id ?? null;
  }

  // Resolve context for the tool
  let agentContext: Record<string, unknown> | null = null;
  if (toolId) {
    const tool = await getToolById(toolId);
    if (tool) {
      const context = resolveToolContext(tool);
      agentContext = contextToAgentPayload(context);
    }
  }

  const { data: updated, error } = await supabase
    .from("admin_feedback_items")
    .update({
      tool_id: toolId,
      agent_context: agentContext as import("@/types/database.types").Json | null,
    })
    .eq("id", feedbackId)
    .select("id, tool_id, agent_context")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Failed to assign tool", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ item: updated });
}
