import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export type RagSnapshotRow = {
  id: number;
  captured_at: string;

  onedrive_synced: number;
  onedrive_chunked: number;
  onedrive_embedded: number;

  outlook_synced: number;
  outlook_chunked: number;
  outlook_embedded: number;

  meetings_synced: number;
  meetings_chunked: number;
  meetings_embedded: number;

  teams_synced: number;
  teams_chunked: number;
  teams_embedded: number;

  teams_compiler_total: number;
  task_extraction_total: number;
  insight_extraction_total: number;
  project_intelligence_packets: number;

  notes: Record<string, unknown> | null;
};

const SNAPSHOT_COLUMNS = `
  id,
  captured_at,
  onedrive_synced, onedrive_chunked, onedrive_embedded,
  outlook_synced, outlook_chunked, outlook_embedded,
  meetings_synced, meetings_chunked, meetings_embedded,
  teams_synced, teams_chunked, teams_embedded,
  teams_compiler_total, task_extraction_total, insight_extraction_total,
  project_intelligence_packets,
  notes
`;

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") || "60", 10) || 60, 1),
    500,
  );

  const { data, error } = await supabase
    .from("rag_pipeline_snapshots")
    .select(SNAPSHOT_COLUMNS)
    .order("captured_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as unknown as RagSnapshotRow[];
  const latest = rows[0] ?? null;

  return NextResponse.json({
    snapshots: rows,
    latest,
    count: rows.length,
  });
}
