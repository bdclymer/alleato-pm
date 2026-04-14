import OpenAI from "openai";
import {
  Liveblocks,
  WebhookHandler,
  type NotificationEvent,
  isThreadNotificationEvent,
  isTextMentionNotificationEvent,
  isCustomNotificationEvent,
  getMentionsFromCommentBody,
  stringifyCommentBody,
  type CommentBodyInlineElement,
  type CommentBodyText,
} from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { AI_USER_ID } from "@/lib/liveblocks/ai-user";
import { sendTeamsNotification } from "@/lib/integrations/teams-notifications";
import {
  sendThreadNotificationEmail,
  sendTextMentionNotificationEmail,
  sendCustomNotificationEmail,
} from "@/lib/integrations/email-notifications";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";

// ── Clients ───────────────────────────────────────────────────────────────────

function getLiveblocks() {
  return new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY! });
}

function getWebhookHandler() {
  const secret = process.env.LIVEBLOCKS_WEBHOOK_SECRET_KEY;
  if (!secret) throw new Error("LIVEBLOCKS_WEBHOOK_SECRET_KEY not set");
  return new WebhookHandler(secret);
}

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

// ── Type guards ───────────────────────────────────────────────────────────────

function isEmailNotificationEvent(event: unknown): event is NotificationEvent {
  if (!event || typeof event !== "object") return false;
  const e = event as { type?: string; data?: { channel?: string } };
  return e.type === "notification" && e.data?.channel === "email";
}

function isTeamsNotificationEvent(event: unknown): event is NotificationEvent {
  if (!event || typeof event !== "object") return false;
  const e = event as { type?: string; data?: { channel?: string } };
  return e.type === "notification" && e.data?.channel === "teams";
}

function isCommentCreatedEvent(
  event: unknown
): event is { type: "commentCreated"; data: { roomId: string; threadId: string; commentId: string } } {
  if (!event || typeof event !== "object") return false;
  return (event as { type?: string }).type === "commentCreated";
}

// ── Main handler ─────────────────────────────────────────────────────────────

export const POST = withApiGuardrails(
  "/api/liveblocks/webhook#POST",
  async ({ request }) => {
  let webhookHandler: WebhookHandler;
  try {
    webhookHandler = getWebhookHandler();
  } catch (error) {
    throw new GuardrailError({
      code: "MISSING_ENV_VAR",
      where: "/api/liveblocks/webhook#POST",
      message: "Webhook endpoint is not configured.",
      details: { reason: error instanceof Error ? error.message : "Unknown error" },
      severity: "high",
      cause: error instanceof Error ? error : undefined,
    });
  }

  const rawBody = await request.text();

  let event: unknown;
  try {
    event = webhookHandler.verifyRequest({ headers: request.headers, rawBody });
  } catch (error) {
    throw new GuardrailError({
      code: "AUTH_FORBIDDEN",
      where: "/api/liveblocks/webhook#POST",
      message: "Invalid webhook signature.",
      status: 401,
      severity: "medium",
      details: { reason: error instanceof Error ? error.message : "Unknown error" },
      cause: error instanceof Error ? error : undefined,
    });
  }

  // ── AI comment reply ──────────────────────────────────────────────────────

  if (isCommentCreatedEvent(event)) {
    return handleCommentCreated(event.data);
  }

  // ── Email notifications ───────────────────────────────────────────────────

  if (isEmailNotificationEvent(event)) {
    const liveblocks = getLiveblocks();
    try {
      if (isThreadNotificationEvent(event)) {
        await sendThreadNotificationEmail(liveblocks, event);
      } else if (isTextMentionNotificationEvent(event)) {
        await sendTextMentionNotificationEmail(liveblocks, event);
      } else if (isCustomNotificationEvent(event)) {
        await sendCustomNotificationEmail(liveblocks, event);
      }
    } catch (error) {
      throw new GuardrailError({
        code: "UPSTREAM_FAILURE",
        where: "/api/liveblocks/webhook#POST",
        message: "Email delivery failed.",
        status: 502,
        severity: "high",
        details: { reason: error instanceof Error ? error.message : "Unknown error" },
        cause: error instanceof Error ? error : undefined,
      });
    }
    return NextResponse.json({ ok: true });
  }

  // ── Teams notifications ───────────────────────────────────────────────────

  if (isTeamsNotificationEvent(event)) {
    const adaptiveCardUrl = process.env.LIVEBLOCKS_TEAMS_ADAPTIVE_CARD_URL;
    const bodyUrl = process.env.LIVEBLOCKS_TEAMS_BODY_URL;

    if (!adaptiveCardUrl && !bodyUrl) {
      throw new GuardrailError({
        code: "MISSING_ENV_VAR",
        where: "/api/liveblocks/webhook#POST",
        message: "Missing Teams webhook URL.",
        severity: "high",
      });
    }

    let inboxNotification = null;
    try {
      const liveblocks = getLiveblocks();
      inboxNotification = await liveblocks.getInboxNotification({
        userId: event.data.userId,
        inboxNotificationId: event.data.inboxNotificationId,
      });
    } catch { /* enrichment is best-effort */ }

    try {
      await sendTeamsNotification({ adaptiveCardUrl, bodyUrl }, {
        event,
        inboxNotification,
        appBaseUrl: process.env.LIVEBLOCKS_NOTIFICATION_BASE_URL,
      });
    } catch (error) {
      throw new GuardrailError({
        code: "UPSTREAM_FAILURE",
        where: "/api/liveblocks/webhook#POST",
        message: "Teams delivery failed.",
        status: 502,
        severity: "high",
        details: { reason: error instanceof Error ? error.message : "Unknown error" },
        cause: error instanceof Error ? error : undefined,
      });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, ignored: true });
},
);

// ── AI comment handler ────────────────────────────────────────────────────────

async function handleCommentCreated({
  roomId,
  threadId,
  commentId,
}: {
  roomId: string;
  threadId: string;
  commentId: string;
}) {
  const liveblocks = getLiveblocks();

  const [thread, comment] = await Promise.all([
    liveblocks.getThread({ roomId, threadId }),
    liveblocks.getComment({ roomId, threadId, commentId }),
  ]);

  if (!comment.body) {
    return NextResponse.json({ ok: true });
  }

  // Only respond if the AI user is explicitly @mentioned
  const mentions = getMentionsFromCommentBody(
    comment.body,
    (mention) => mention.id === AI_USER_ID
  );
  if (mentions.length === 0) {
    return NextResponse.json({ ok: true });
  }

  // Build full thread context for the AI
  let threadContext = "";
  for (const c of thread.comments) {
    if (c.body) {
      const text = await stringifyCommentBody(c.body);
      // Skip if this is the triggering comment — we'll include it separately
      if (c.id !== commentId) {
        threadContext += `${c.userId}: ${text}\n`;
      }
    }
  }
  const triggerText = await stringifyCommentBody(comment.body);

  const openai = getOpenAI();

  let aiText: string;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        ...(threadContext.trim()
          ? [
              {
                role: "user" as const,
                content: `Previous messages in this thread:\n${threadContext.trim()}`,
              },
            ]
          : []),
        {
          role: "user",
          content: triggerText,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });
    aiText = response.choices[0]?.message?.content ?? "I'm not sure how to help with that.";
  } catch (error) {
    console.error("[liveblocks-webhook] OpenAI error", error);
    aiText = "Sorry, I ran into an error. Please try again.";
  }

  // Post the AI response back as a comment in the same thread
  await liveblocks.createComment({
    roomId,
    threadId,
    data: {
      userId: AI_USER_ID,
      body: {
        version: 1,
        content: [{ type: "paragraph", children: parseAiResponse(aiText) }],
      },
    },
  });

  return NextResponse.json({ ok: true });
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `\
You are Alleato AI, an expert assistant embedded in Alleato PM — a construction project management platform.

You help project managers, owners, contractors, and team members with:
- **RFIs** (Requests for Information): status, responses, ball-in-court tracking
- **Change Orders & Change Events**: cost impact, approvals, scope changes
- **Budgets**: budget codes, line items, revisions, forecasting, variance analysis
- **Prime Contracts & Commitments**: subcontracts, purchase orders, retention, executed amounts
- **Direct Costs**: cost tracking, categorisation, invoicing
- **Schedule**: tasks, milestones, delays, critical path
- **Directory**: companies, contacts, roles on the project
- **Drawings & Specifications**: revision tracking, document management
- **Punch Lists & Inspections**: open items, closeout tracking

Communication style:
- Be concise and direct — project teams are busy
- Use construction industry terminology naturally
- When someone asks about a problem, suggest a clear next action
- Format responses with *bold* for key terms, \`code\` for identifiers, and _italic_ for emphasis
- Keep replies to 2–4 sentences unless a longer explanation is explicitly needed
- Never make up specific numbers or dates — acknowledge when you need more context

You are replying to a comment thread in the Alleato PM application. Respond only to what was asked.\
`;

// ── Parse AI response into Liveblocks comment body elements ──────────────────

function parseAiResponse(input: string): CommentBodyInlineElement[] {
  const elements: CommentBodyInlineElement[] = [];
  const regex =
    /(\*\*.*?\*\*)|(\*.*?\*)|(_.*?_)|(~.*?~)|(`.*?(?:\\`.)*?`)|(https?:\/\/\S+[\w/])/g;
  let lastIndex = 0;

  input.replace(
    regex,
    (match, bold2, bold1, italic, strikethrough, code, link, index) => {
      if (index > lastIndex) {
        elements.push({ text: input.slice(lastIndex, index) });
      }

      if (link) {
        elements.push({ type: "link", url: link.replace(/[.,!;?]+$/, "") });
      } else {
        let text = match.slice(bold2 ? 2 : 1, bold2 ? -2 : -1);
        if (code) text = text.replace(/\\`/g, "`");
        const el: CommentBodyText = { text };
        if (bold2 || bold1) el.bold = true;
        if (italic) el.italic = true;
        if (strikethrough) el.strikethrough = true;
        if (code) el.code = true;
        elements.push(el);
      }

      lastIndex = index + match.length;
      return match;
    }
  );

  if (lastIndex < input.length) {
    elements.push({ text: input.slice(lastIndex) });
  }

  return elements.length > 0 ? elements : [{ text: input }];
}
