import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ projectId: string; changeEventId: string }>;
}

const RELATED_ITEM_TYPES = [
  "change_event",
  "drawing",
  "rfi",
  "specification",
  "submittal",
] as const;

type RelatedItemType = (typeof RELATED_ITEM_TYPES)[number];

function isSupportedRelatedType(value: string): value is RelatedItemType {
  return (RELATED_ITEM_TYPES as readonly string[]).includes(value);
}

interface RelatedItemOption {
  id: string;
  relatedNumber: string | null;
  relatedTitle: string;
  relatedStatus: string | null;
}

function optionSort(a: RelatedItemOption, b: RelatedItemOption): number {
  return (a.relatedNumber || "").localeCompare(b.relatedNumber || "", undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, changeEventId } = await params;
    const parsedProjectId = Number.parseInt(projectId, 10);
    if (Number.isNaN(parsedProjectId)) {
      return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
    }

    const typeParam = request.nextUrl.searchParams.get("type")?.trim().toLowerCase();
    if (!typeParam || !isSupportedRelatedType(typeParam)) {
      return NextResponse.json({ error: "Invalid related item type" }, { status: 400 });
    }

    const search = request.nextUrl.searchParams.get("search")?.trim() || "";
    const limit = Number.parseInt(request.nextUrl.searchParams.get("limit") || "50", 10);
    const safeLimit = Number.isNaN(limit) ? 50 : Math.max(1, Math.min(limit, 100));

    const supabase = await createClient();

    let options: RelatedItemOption[] = [];

    switch (typeParam) {
      case "change_event": {
        let query = supabase
          .from("change_events")
          .select("id, number, title, status")
          .eq("project_id", parsedProjectId)
          .is("deleted_at", null)
          .neq("id", changeEventId)
          .order("number", { ascending: true })
          .limit(safeLimit);

        if (search) {
          query = query.or(`title.ilike.%${search}%,number.ilike.%${search}%`);
        }

        const { data, error } = await query;
        if (error) {
          return NextResponse.json(
            { error: "Failed to fetch change event options", details: error.message },
            { status: 400 },
          );
        }

        options = (data || []).map((item) => ({
          id: item.id,
          relatedNumber: item.number,
          relatedTitle: item.title,
          relatedStatus: item.status,
        }));
        break;
      }

      case "rfi": {
        let query = supabase
          .from("rfis")
          .select("id, number, subject, status")
          .eq("project_id", parsedProjectId)
          .order("number", { ascending: true })
          .limit(safeLimit);

        if (search) {
          query = query.or(`subject.ilike.%${search}%`);
        }

        const { data, error } = await query;
        if (error) {
          return NextResponse.json(
            { error: "Failed to fetch RFI options", details: error.message },
            { status: 400 },
          );
        }

        options = (data || []).map((item) => ({
          id: item.id,
          relatedNumber: String(item.number),
          relatedTitle: item.subject,
          relatedStatus: item.status,
        }));

        if (search) {
          const searchLower = search.toLowerCase();
          options = options.filter(
            (item) =>
              (item.relatedNumber || "").toLowerCase().includes(searchLower) ||
              item.relatedTitle.toLowerCase().includes(searchLower),
          );
        }
        break;
      }

      case "submittal": {
        let query = supabase
          .from("submittals")
          .select("id, submittal_number, title, status")
          .eq("project_id", parsedProjectId)
          .is("deleted_at", null)
          .order("submittal_number", { ascending: true })
          .limit(safeLimit);

        if (search) {
          query = query.or(`title.ilike.%${search}%,submittal_number.ilike.%${search}%`);
        }

        const { data, error } = await query;
        if (error) {
          return NextResponse.json(
            { error: "Failed to fetch submittal options", details: error.message },
            { status: 400 },
          );
        }

        options = (data || []).map((item) => ({
          id: item.id,
          relatedNumber: item.submittal_number,
          relatedTitle: item.title,
          relatedStatus: item.status,
        }));
        break;
      }

      case "drawing": {
        let query = supabase
          .from("drawings")
          .select("id, drawing_number, title")
          .eq("project_id", parsedProjectId)
          .order("drawing_number", { ascending: true })
          .limit(safeLimit);

        if (search) {
          query = query.or(`title.ilike.%${search}%,drawing_number.ilike.%${search}%`);
        }

        const { data, error } = await query;
        if (error) {
          return NextResponse.json(
            { error: "Failed to fetch drawing options", details: error.message },
            { status: 400 },
          );
        }

        options = (data || []).map((item) => ({
          id: item.id,
          relatedNumber: item.drawing_number,
          relatedTitle: item.title,
          relatedStatus: null,
        }));
        break;
      }

      case "specification": {
        let query = supabase
          .from("specifications")
          .select("id, section_number, section_title, status")
          .eq("project_id", parsedProjectId)
          .order("section_number", { ascending: true })
          .limit(safeLimit);

        if (search) {
          query = query.or(`section_title.ilike.%${search}%,section_number.ilike.%${search}%`);
        }

        const { data, error } = await query;
        if (error) {
          return NextResponse.json(
            { error: "Failed to fetch specification options", details: error.message },
            { status: 400 },
          );
        }

        options = (data || []).map((item) => ({
          id: item.id,
          relatedNumber: item.section_number,
          relatedTitle: item.section_title,
          relatedStatus: item.status,
        }));
        break;
      }
    }

    return NextResponse.json({ data: options.sort(optionSort) });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
