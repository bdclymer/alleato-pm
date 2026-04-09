import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

const createHighlightedNoteSchema = z.object({
  meetingId: z.string().min(1, "Meeting ID is required"),
  selectedText: z.string().trim().min(1, "Selected text is required").max(4000),
  title: z.string().trim().max(200).optional(),
  noteBody: z.string().trim().max(8000).optional(),
});

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

function toBlockQuote(text: string): string {
  return text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parseResult = createHighlightedNoteSchema.safeParse(await request.json());
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const { meetingId, selectedText, title, noteBody } = parseResult.data;

    const { data: meeting, error: meetingError } = await supabase
      .from("document_metadata")
      .select("id, title, project_id, date")
      .eq("id", meetingId)
      .single();

    if (meetingError || !meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    if (typeof meeting.project_id !== "number") {
      return NextResponse.json(
        { error: "Meeting is not associated with a project" },
        { status: 400 }
      );
    }

    const defaultTitle = truncate(
      `Highlight: ${selectedText.replace(/\s+/g, " ").trim()}`,
      120
    );

    const sourceMeta = [
      `Source meeting: ${meeting.title || meeting.id}`,
      `Meeting ID: ${meeting.id}`,
      meeting.date ? `Meeting date: ${meeting.date}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    const bodyParts = [
      toBlockQuote(selectedText),
      noteBody || null,
      `---\n${sourceMeta}`,
    ].filter(Boolean);

    const { data: insertedNote, error: insertError } = await supabase
      .from("notes")
      .insert({
        project_id: meeting.project_id,
        title: title || defaultTitle,
        body: bodyParts.join("\n\n"),
        created_by: user.email || user.id,
      })
      .select("id, title")
      .single();

    if (insertError) {
      return apiErrorResponse(insertError);
    }

    const { error: highlightError } = await supabase
      .from("note_highlights")
      .insert({
        note_id: insertedNote.id,
        project_id: meeting.project_id,
        source_type: "meeting_transcript",
        source_metadata_id: meeting.id,
        exact_text: selectedText,
        created_by: user.email || user.id,
      });

    if (highlightError) {
      await supabase.from("notes").delete().eq("id", insertedNote.id);
      return apiErrorResponse(highlightError);
    }

    return NextResponse.json(
      {
        id: insertedNote.id,
        title: insertedNote.title,
      },
      { status: 201 }
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
