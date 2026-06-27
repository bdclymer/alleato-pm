import { type NextRequest, NextResponse } from "next/server";

import { DEFAULT_POLICY, fetchWithGuardrails } from "@/lib/fetch-with-guardrails";
import { getApiRouteUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Organization scope must match VeltAuthProvider (all users share the "alleato" org).
const VELT_ORGANIZATION_ID = "alleato";
const VELT_ENDPOINT = "https://api.velt.dev/v2/commentannotations/get";
const MAX_PAGES = 25; // 25 × 1000 = up to 25k annotations — a hard backstop, not a real limit.

interface VeltUser {
  userId?: string;
  name?: string;
  email?: string;
}

interface VeltComment {
  commentText?: string;
  commentHtml?: string;
  from?: VeltUser;
  createdAt?: number;
}

interface VeltAnnotation {
  annotationId: string;
  annotationNumber?: number;
  lastUpdated?: number | string;
  createdAt?: number | string;
  from?: VeltUser;
  status?: { id?: string; name?: string };
  comments?: VeltComment[];
}

/** Normalized shape the /comments page renders. */
export interface AllCommentItem {
  documentId: string;
  annotationId: string;
  annotationNumber: number | null;
  authorName: string;
  preview: string;
  statusName: string | null;
  replyCount: number;
  lastUpdated: number | null;
}

function toMillis(value: number | string | undefined): number | null {
  if (value == null) return null;
  const ms = typeof value === "number" ? value : new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function normalize(documentId: string, annotation: VeltAnnotation): AllCommentItem {
  const first = annotation.comments?.[0];
  const preview = (first?.commentText ?? first?.commentHtml ?? "")
    .replace(/<[^>]*>/g, "")
    .trim();
  return {
    documentId,
    annotationId: annotation.annotationId,
    annotationNumber: annotation.annotationNumber ?? null,
    authorName: annotation.from?.name ?? first?.from?.name ?? "Unknown",
    preview: preview || "(no text)",
    statusName: annotation.status?.name ?? null,
    replyCount: Math.max((annotation.comments?.length ?? 1) - 1, 0),
    lastUpdated: toMillis(annotation.lastUpdated ?? annotation.createdAt),
  };
}

export async function GET(_req: NextRequest) {
  const user = await getApiRouteUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const veltApiKey = process.env.NEXT_PUBLIC_VELT_API_KEY;
  const veltAuthToken = process.env.VELT_AUTH_TOKEN;
  if (!veltApiKey || !veltAuthToken) {
    return NextResponse.json(
      { error: "Server configuration error: missing Velt credentials" },
      { status: 500 },
    );
  }

  const items: AllCommentItem[] = [];
  let pageToken: string | undefined;

  try {
    for (let page = 0; page < MAX_PAGES; page += 1) {
      // Omitting documentId fetches annotations across ALL documents in the org;
      // groupByDocumentId returns them keyed by documentId (the route pathname).
      const response = await fetchWithGuardrails(VELT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-velt-api-key": veltApiKey,
          "x-velt-auth-token": veltAuthToken,
        },
        body: JSON.stringify({
          data: {
            organizationId: VELT_ORGANIZATION_ID,
            groupByDocumentId: true,
            pageSize: 1000,
            ...(pageToken ? { pageToken } : {}),
          },
        }),
        requestId: crypto.randomUUID(),
        where: "api/comments/all",
        dependency: "velt",
        ...DEFAULT_POLICY,
      });

      if (!response.ok) {
        const body = await response.text();
        return NextResponse.json(
          { error: "Velt request failed", status: response.status, detail: body.slice(0, 500) },
          { status: 502 },
        );
      }

      const json = (await response.json()) as {
        result?: {
          data?: Record<string, VeltAnnotation[]> | VeltAnnotation[] | null;
          nextPageToken?: string;
        };
      };

      const data = json.result?.data;
      if (Array.isArray(data)) {
        // Defensive: ungrouped fallback — bucket under an empty document id.
        data.forEach((a) => items.push(normalize("", a)));
      } else if (data && typeof data === "object") {
        for (const [documentId, annotations] of Object.entries(data)) {
          (annotations ?? []).forEach((a) => items.push(normalize(documentId, a)));
        }
      }

      pageToken = json.result?.nextPageToken || undefined;
      if (!pageToken) break;
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch comments",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ comments: items });
}
