import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAppErrorEvent } from "@/lib/app-error-telemetry";
import { getApiRouteUser } from "@/lib/supabase/server";

const jsonRecordSchema: z.ZodType<Record<string, unknown>> = z.record(z.string(), z.unknown());

const appErrorEventSchema = z.object({
  source: z.enum(["client", "api", "server", "background", "sync", "ai_tool"]).default("client"),
  severity: z.enum(["critical", "high", "medium", "low"]).default("medium"),
  projectId: z.number().int().positive().nullable().optional(),
  pageUrl: z.string().trim().max(1000).nullable().optional(),
  pagePath: z.string().trim().max(500).nullable().optional(),
  route: z.string().trim().max(500).nullable().optional(),
  action: z.string().trim().max(300).nullable().optional(),
  errorCode: z.string().trim().max(120).nullable().optional(),
  errorMessage: z.string().trim().min(1).max(2000),
  stack: z.string().trim().max(8000).nullable().optional(),
  componentStack: z.string().trim().max(8000).nullable().optional(),
  requestId: z.string().trim().max(200).nullable().optional(),
  statusCode: z.number().int().min(100).max(599).nullable().optional(),
  userAgent: z.string().trim().max(1000).nullable().optional(),
  appVersion: z.string().trim().max(120).nullable().optional(),
  releaseSha: z.string().trim().max(120).nullable().optional(),
  fingerprint: z.string().trim().max(500).nullable().optional(),
  browserMetadata: jsonRecordSchema.optional(),
  context: jsonRecordSchema.optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Malformed JSON payload." },
      { status: 400 },
    );
  }

  const parsed = appErrorEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid telemetry payload.",
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const user = await getApiRouteUser();
  const result = await recordAppErrorEvent({
    ...parsed.data,
    userId: user?.id ?? null,
  });

  if (result.error) {
    return NextResponse.json(
      { success: false, error: "Telemetry write failed." },
      { status: 202 },
    );
  }

  return NextResponse.json({ success: true, eventId: result.eventId });
}
