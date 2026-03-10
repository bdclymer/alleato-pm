import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ projectId: string; contractId: string; attachmentId: string }>;
}

/**
 * GET /api/projects/[projectId]/contracts/[contractId]/attachments/[attachmentId]/download
 * Resolves attachment URL and redirects for download/open.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { projectId, contractId, attachmentId } = await params;
    const supabase = await createClient();

    const { data: contract } = await supabase
      .from("prime_contracts")
      .select("id, project_id")
      .eq("id", contractId)
      .eq("project_id", Number.parseInt(projectId, 10))
      .single();

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    const { data: attachment, error } = await supabase
      .from("attachments")
      .select("id, url")
      .eq("id", attachmentId)
      .eq("attached_to_id", contractId)
      .eq("attached_to_table", "prime_contracts")
      .single();

    if (error || !attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    if (!attachment.url) {
      return NextResponse.json(
        { error: "Attachment URL is missing for this record" },
        { status: 400 },
      );
    }

    let redirectTo: URL;
    try {
      redirectTo = new URL(attachment.url);
    } catch {
      redirectTo = new URL(attachment.url, process.env.NEXT_PUBLIC_SUPABASE_URL);
    }

    return NextResponse.redirect(redirectTo);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
