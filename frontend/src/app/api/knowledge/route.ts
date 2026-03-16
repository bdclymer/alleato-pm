import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Lazy OpenAI client for embeddings
// ---------------------------------------------------------------------------

let _openai: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text.substring(0, 8000),
  });
  return response.data[0].embedding;
}

// ---------------------------------------------------------------------------
// GET /api/knowledge — list knowledge articles
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const search = url.searchParams.get("search");
  const projectId = url.searchParams.get("projectId");
  const origin = url.searchParams.get("origin");
  const tag = url.searchParams.get("tag");

  let query = supabase
    .from("company_knowledge")
    .select("*")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,content.ilike.%${search}%`,
    );
  }

  if (projectId) {
    query = query.eq("project_id", parseInt(projectId));
  }

  if (origin && origin !== "all") {
    query = query.eq("origin", origin);
  }

  if (tag) {
    query = query.contains("tags", [tag]);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

// ---------------------------------------------------------------------------
// POST /api/knowledge — create a knowledge article + generate embedding
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Generate embedding from title + content
  let embedding: number[] | null = null;
  try {
    const embeddingText = `${body.title}\n\n${body.content}`;
    embedding = await generateEmbedding(embeddingText);
  } catch (err) {
    console.error("Failed to generate embedding for knowledge article:", err);
    // Continue without embedding — can be backfilled later
  }

  const { data, error } = await supabase
    .from("company_knowledge")
    .insert({
      title: body.title,
      content: body.content,
      category: body.category,
      tags: body.tags ?? [],
      source: body.source ?? null,
      author_id: user.id,
      is_active: true,
      project_id: body.project_id ?? null,
      meeting_id: body.meeting_id ?? null,
      origin: body.origin ?? "manual",
      ...(embedding ? { embedding: JSON.stringify(embedding) } : {}),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

// ---------------------------------------------------------------------------
// PATCH /api/knowledge — update a knowledge article + re-embed if content changed
// ---------------------------------------------------------------------------

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json(
      { error: "Missing article id" },
      { status: 400 },
    );
  }

  // Re-generate embedding if title or content changed
  if (updates.title || updates.content) {
    try {
      // Fetch current article to merge fields
      const { data: existing } = await supabase
        .from("company_knowledge")
        .select("title, content")
        .eq("id", id)
        .single();

      if (existing) {
        const title = updates.title ?? existing.title;
        const content = updates.content ?? existing.content;
        const embedding = await generateEmbedding(`${title}\n\n${content}`);
        updates.embedding = JSON.stringify(embedding);
      }
    } catch (err) {
      console.error("Failed to re-generate embedding:", err);
    }
  }

  const { data, error } = await supabase
    .from("company_knowledge")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// ---------------------------------------------------------------------------
// DELETE /api/knowledge — soft-delete a knowledge article
// ---------------------------------------------------------------------------

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing article id" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("company_knowledge")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
