import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  UIMessage,
} from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getLanguageModel } from "@/lib/ai/providers";
import { parseJsonBody, withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";

export const maxDuration = 30;

const ToolCallingRequestSchema = z.object({
  messages: z.array(z.custom<UIMessage>()),
});

export const POST = withApiGuardrails("/api/primitives/tool-calling#POST", async ({ request }) => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/primitives/tool-calling#POST",
      message: "Unauthorized primitives tool-calling request.",
      status: 401,
      severity: "medium",
      details: authError ? { reason: authError.message } : undefined,
      cause: authError ?? undefined,
    });
  }

  const { messages } = await parseJsonBody(
    request,
    ToolCallingRequestSchema,
    "/api/primitives/tool-calling#POST",
  );

  const result = streamText({
    model: getLanguageModel("openai/gpt-4.1-nano"),
    system:
      "You are a helpful assistant with access to tools. Use the getCurrentDate tool when users ask about dates, time, or current information. You are also able to use the getTime tool to get the current time in a specific timezone.",
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      getTime: tool({
        description: "Get the current time in a specific timezone",
        inputSchema: z.object({
          timezone: z
            .string()
            .describe("A valid IANA timezone, e.g. 'Europe/Paris'"),
        }),
        execute: async ({ timezone }) => {
          try {
            const now = new Date();
            const time = now.toLocaleString("en-US", {
              timeZone: timezone,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            });

            return { time, timezone };
          } catch {
            return { error: "Invalid timezone format." };
          }
        },
      }),
      getCurrentDate: tool({
        description: "Get the current date and time with timezone information",
        inputSchema: z.object({}),
        execute: async () => {
          const now = new Date();
          return {
            timestamp: now.getTime(),
            iso: now.toISOString(),
            local: now.toLocaleString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              timeZoneName: "short",
            }),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            utc: now.toUTCString(),
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
});
