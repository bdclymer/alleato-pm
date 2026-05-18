import { NextResponse } from "next/server";
import { z } from "zod";

import {
  fetchDeepAgentExecutiveBriefing,
  fetchDeepAgentProjectStatus,
  type DeepExecutiveIntelligenceResponse,
  type DeepProjectIntelligenceResponse,
} from "@/lib/ai/deep-agent-project-status";
import { parseJsonBody, withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createServiceClient } from "@/lib/supabase/service";
import { getApiRouteUser } from "@/lib/supabase/server";

const requestSchema = z.object({
  question: z.string().trim().min(1).max(8000),
  projectId: z.number().int().positive().optional(),
  sessionId: z.string().trim().min(1).max(200).optional(),
});

const V2_DEEP_AGENT_TIMEOUT_MS = 180_000;

async function resolveProjectIdFromQuestion(
  question: string,
): Promise<number | undefined> {
  const supabase = createServiceClient();
  const words = question.match(/[A-Za-z0-9][A-Za-z0-9'-]*/g) ?? [];
  const phrases = new Set<string>();
  for (let size = Math.min(4, words.length); size >= 2; size -= 1) {
    for (let index = 0; index <= words.length - size; index += 1) {
      phrases.add(words.slice(index, index + size).join(" "));
    }
  }

  for (const phrase of phrases) {
    const { data, error } = await supabase
      .from("projects")
      .select("id,name")
      .ilike("name", `%${phrase}%`)
      .limit(2);
    if (error) {
      throw new Error(`Project-name resolution failed: ${error.message}`);
    }
    if (data?.length === 1 && typeof data[0].id === "number") {
      return data[0].id;
    }
  }

  return undefined;
}

const WHERE = "ai-assistant-v2/deep-agent#POST";

export const POST = withApiGuardrails(WHERE, async ({ request }) => {
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: WHERE,
      message: "Authentication required.",
      status: 401,
    });
  }

  const body = await parseJsonBody(request, requestSchema, WHERE);
  const { question, sessionId } = body;
  const projectId =
    body.projectId ?? (await resolveProjectIdFromQuestion(question));

  let packet: DeepProjectIntelligenceResponse | DeepExecutiveIntelligenceResponse;
  try {
    packet =
      typeof projectId === "number"
        ? await fetchDeepAgentProjectStatus({
            userId: user.id,
            projectId,
            sessionId,
            question,
            timeoutMs: V2_DEEP_AGENT_TIMEOUT_MS,
          })
        : await fetchDeepAgentExecutiveBriefing({
            userId: user.id,
            sessionId,
            question,
            timeoutMs: V2_DEEP_AGENT_TIMEOUT_MS,
          });
  } catch (error) {
    throw new GuardrailError({
      code: "UPSTREAM_FAILURE",
      where: WHERE,
      message: "Deep Agents backend request failed.",
      details: error instanceof Error ? error.message : String(error),
      status: 502,
    });
  }

  return NextResponse.json({
    answer: packet.answer,
    mode: packet.mode,
    confidence: packet.confidence,
    orchestrator: packet.orchestrator,
    sourcesChecked: packet.sourcesChecked,
    evidence: packet.evidence,
    recommendedActions: packet.recommendedActions,
    toolTrace: packet.toolTrace,
  });
});
