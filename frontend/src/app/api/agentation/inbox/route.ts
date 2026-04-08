import { NextResponse } from "next/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

function jsonError(status: number, payload: { error: string; details?: string }) {
  return NextResponse.json(payload, { status });
}

export async function GET(request: Request) {
  try {
    const user = await getApiRouteUser();
    if (!user) {
      return jsonError(401, { error: "Authentication required" });
    }

    const url = new URL(request.url);
    const limitParam = Number.parseInt(url.searchParams.get("limit") || "500", 10);
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(limitParam, 1000)) : 500;

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("admin_feedback_items")
      .select("id, created_at, updated_at, title, comment, page_url, page_path, severity, status, target_selector, metadata")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return jsonError(500, { error: "Failed to load annotations", details: error.message });
    }

    const items = (data ?? []).filter((item) => {
      if (!item.metadata || typeof item.metadata !== "object" || Array.isArray(item.metadata)) {
        return false;
      }

      const metadata = item.metadata as Record<string, unknown>;
      return (
        typeof metadata.agentationId === "string" ||
        typeof metadata.annotationId === "string" ||
        (typeof metadata.ingestEvent === "string" && metadata.ingestEvent.startsWith("annotation"))
      );
    });

    return NextResponse.json({
      items,
      total: items.length,
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    return jsonError(500, { error: "Failed to load annotations", details });
  }
}
