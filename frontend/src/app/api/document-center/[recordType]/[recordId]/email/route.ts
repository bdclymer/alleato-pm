import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { sendDocumentEmail } from "@/lib/documents/email";
import { renderPdfFromHtml } from "@/lib/documents/pdf";
import {
  getDocumentBundle,
  renderDocumentEmailHtml,
  renderDocumentEmailText,
  renderDocumentHtml,
  type DocumentRecordType,
} from "@/lib/documents/record-documents";

interface RouteParams {
  params: Promise<{
    recordType: string;
    recordId: string;
  }>;
}

interface EmailRecipient {
  email: string;
  name: string;
}

function isDocumentRecordType(value: string): value is DocumentRecordType {
  return value === "prime-contract" || value === "commitment" || value === "change-order";
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { recordType, recordId } = await params;
    if (!isDocumentRecordType(recordType)) {
      return NextResponse.json({ error: "Unsupported record type" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const recipients = Array.isArray(body.recipients) ? (body.recipients as EmailRecipient[]) : [];
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (recipients.length === 0) {
      return NextResponse.json({ error: "At least one recipient is required" }, { status: 400 });
    }

    if (!subject) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }

    const invalidRecipient = recipients.find((recipient) => {
      const email = recipient.email?.trim();
      return !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    });

    if (invalidRecipient) {
      return NextResponse.json(
        { error: `Invalid email address: ${invalidRecipient.email}` },
        { status: 400 },
      );
    }

    const bundle = await getDocumentBundle(supabase, recordType, recordId);
    const {
      data: senderProfile,
      error: senderError,
    } = await supabase
      .from("people")
      .select("first_name, last_name, email")
      .eq("auth_user_id", user.id)
      .single();

    if (senderError && senderError.code !== "PGRST116") {
      return NextResponse.json({ error: senderError.message }, { status: 500 });
    }

    const senderName = senderProfile
      ? [senderProfile.first_name, senderProfile.last_name].filter(Boolean).join(" ").trim()
      : user.email?.split("@")[0] || "Alleato User";

    const emailHtml = renderDocumentEmailHtml(bundle, message, senderName || "Alleato User");
    const emailText = renderDocumentEmailText(bundle, message, senderName || "Alleato User");
    const documentHtml = renderDocumentHtml(bundle);
    const pdfBuffer = await renderPdfFromHtml(documentHtml);

    const result = await sendDocumentEmail({
      to: recipients.map((recipient) => recipient.email.trim()),
      subject,
      html: emailHtml,
      text: emailText,
      attachments: [
        {
          filename: bundle.filename,
          content: pdfBuffer.toString("base64"),
        },
      ],
    });

    return NextResponse.json({
      success: true,
      id: result.id,
      recipients: recipients.map((recipient) => recipient.email.trim()),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to send email",
      },
      { status: 500 },
    );
  }
}
