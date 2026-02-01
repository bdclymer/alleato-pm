import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const MAX_RESULTS = 6;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { query } = await request.json().catch(() => ({}));
    const search = typeof query === "string" ? query.trim() : "";

    if (!search) {
      return NextResponse.json({ hits: [] });
    }
    const { data, error } = await supabase
      .from("document_metadata")
      .select(
        "id,title,summary,participants,project,date,fireflies_link,type,source,url",
      )
      .ilike("content", `%${search}%`)
      .order("date", { ascending: false })
      .limit(MAX_RESULTS);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const hits = (data ?? []).map((record) => ({
      id: record.id,
      title: record.title ?? "Untitled document",
      summary: record.summary ?? "",
      project: record.project,
      date: record.date,
      source: record.source ?? record.url ?? "",
      fireflies_link: record.fireflies_link ?? null,
      type: record.type ?? null,
    }));

    return NextResponse.json({ hits });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
