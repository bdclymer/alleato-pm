export const dynamic = "force-dynamic";

import { z } from "zod";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { withApiGuardrails, parseJsonBody } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";
import { getLanguageModel } from "@/lib/ai/providers";

const BodySchema = z.object({
  // Optionally pass context; if absent we fetch the email ourselves
  subject: z.string().optional(),
  fromName: z.string().nullable().optional(),
  fromEmail: z.string().nullable().optional(),
  bodyText: z.string().nullable().optional(),
  projectName: z.string().nullable().optional(),
  tone: z.enum(["professional", "concise", "detailed"]).default("professional"),
});

export const POST = withApiGuardrails<{ emailId: string }>(
  "email-inbox/[emailId]/draft-reply#POST",
  async ({ request, params }) => {
    const supabase = await createClient();
    const user = await getApiRouteUser();

    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "email-inbox/[emailId]/draft-reply#POST",
        message: "Authentication required.",
      });
    }

    const { emailId: rawId } = await params;
    const emailId = parseInt(rawId, 10);

    if (!Number.isFinite(emailId) || emailId <= 0) {
      throw new GuardrailError({
        code: "VALIDATION_ERROR",
        where: "email-inbox/[emailId]/draft-reply#POST",
        message: "Invalid email ID.",
        status: 400,
      });
    }

    const parsed = await parseJsonBody(
      request,
      BodySchema,
      "email-inbox/[emailId]/draft-reply#POST",
    );

    // Fetch email if context wasn't passed inline
    let subject = parsed.subject;
    let fromName = parsed.fromName;
    let fromEmail = parsed.fromEmail;
    let bodyText = parsed.bodyText;
    let projectName = parsed.projectName;

    if (!subject) {
      const { data: email } = await supabase
        .from("outlook_email_intake")
        .select(
          `
          subject, from_name, from_email, body_text, body,
          projects!outlook_email_intake_project_id_fkey (name)
        `,
        )
        .eq("id", emailId)
        .is("deleted_at", null)
        .maybeSingle();

      if (!email) {
        throw new GuardrailError({
          code: "NOT_FOUND",
          where: "email-inbox/[emailId]/draft-reply#POST",
          message: "Email not found.",
          status: 404,
        });
      }

      subject = email.subject;
      fromName = email.from_name;
      fromEmail = email.from_email;
      bodyText = email.body_text ?? email.body;
      const proj = email.projects as { name: string | null } | null;
      projectName = proj?.name ?? null;
    }

    const truncatedBody = (bodyText ?? "").slice(0, 3000);
    const projectContext = projectName ? `\nThis email is related to project: ${projectName}.` : "";
    const toneInstructions =
      parsed.tone === "concise"
        ? "Be brief and to the point — 2-4 sentences max."
        : parsed.tone === "detailed"
          ? "Provide a thorough, detailed response addressing all points raised."
          : "Be professional, warm, and clear.";

    const { text } = await generateText({
      model: getLanguageModel("gpt-4.1-mini"),
      system: `You are a professional construction project manager assistant drafting email replies on behalf of a PM at Alleato Group, a construction management firm based in Indianapolis.${projectContext}

${toneInstructions}

Write only the body of the reply — no subject line, no headers. Do not include any opening like "Subject:" or "From:". Start directly with the greeting or first sentence.`,
      prompt: `Draft a professional reply to this email:

From: ${fromName ?? fromEmail ?? "Unknown sender"}
Subject: ${subject ?? "(no subject)"}

---
${truncatedBody || "(no body)"}
---

Write a reply that:
- Opens with a natural greeting
- Addresses the key points in the email
- Is actionable and clear
- Maintains a professional construction industry tone
- Does not promise specific timelines or commitments without context`,
      maxOutputTokens: 600,
    });

    return NextResponse.json({ draft: text });
  },
);
