import { after, NextResponse } from "next/server";
import { requireCurrentUserAppCapability } from "@/lib/app-capabilities";
import {
  DEFAULT_EXECUTIVE_WINDOW_DAYS,
  clampDailyBriefWindowDays,
} from "@/lib/executive/daily-brief";
import { getExecutiveBriefingDashboard } from "@/lib/executive/executive-briefing-workflow";
import { regenerateDailyBriefDraftWithLedger } from "@/lib/ai-ops/executive-daily-brief-ledger";
import { flushLangfuse } from "@/instrumentation";
import {
  currentExecutiveDailyBriefTraceId,
  updateExecutiveDailyBriefObservation,
  withExecutiveDailyBriefObservation,
  withExecutiveDailyBriefTrace,
} from "@/lib/ai/executive-daily-brief-langfuse";

function scheduleLangfuseFlush() {
  try {
    after(() => flushLangfuse());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("outside a request scope")) {
      throw error;
    }
    void flushLangfuse();
  }
}

export async function getDailyBriefPacketResponse(
  request: Request,
  guardrailKey: string,
) {
  scheduleLangfuseFlush();

  return withExecutiveDailyBriefTrace(
    {
      name: "executive-daily-brief.packet",
      sessionId: `executive-daily-brief:${new Date().toISOString().slice(0, 10)}`,
      triggerType: "packet_endpoint",
      metadata: {
        route: guardrailKey,
      },
      input: {
        method: request.method,
        url: request.url,
      },
    },
    async () => {
      await requireCurrentUserAppCapability(
        "view_executive_briefing",
        guardrailKey,
        "Daily Brief access required.",
      );

      const { searchParams } = new URL(request.url);
      const windowDays = clampDailyBriefWindowDays(
        Number(
          searchParams.get("days") ?? String(DEFAULT_EXECUTIVE_WINDOW_DAYS),
        ),
      );
      const fresh = searchParams.get("fresh") === "true";
      const sourceBackedOnly = searchParams.get("mode") === "source-backed";

      const result = fresh
        ? await withExecutiveDailyBriefObservation(
            "daily-brief.generate-packet",
            {
              type: "chain",
              metadata: {
                route: guardrailKey,
                windowDays,
                sourceBackedOnly,
              },
              input: { windowDays, sourceBackedOnly },
            },
            async () => {
              const refreshed = await regenerateDailyBriefDraftWithLedger({
                windowDays,
                sourceBackedOnly,
                triggerType: "manual_packet_refresh",
                surface: guardrailKey,
                title: "Executive Daily Brief packet refresh",
                userGoal: "Regenerate the Executive Daily Brief API packet.",
                normalizedGoal:
                  "Generate the Executive Daily Brief packet and record the canonical AI Ops run.",
                metadata: {
                  langfuseTraceId: currentExecutiveDailyBriefTraceId(),
                },
              });
              updateExecutiveDailyBriefObservation({
                output: {
                  ok: true,
                  runId: refreshed.runId,
                  dailyRecapId: refreshed.draft.id,
                },
              });
              return refreshed;
            },
          )
        : await withExecutiveDailyBriefObservation(
            "daily-brief.read-current-packet",
            {
              type: "retriever",
              metadata: {
                route: guardrailKey,
                windowDays,
              },
              input: { windowDays },
            },
            async () => {
              const current = await getExecutiveBriefingDashboard({
                windowDays,
              });
              updateExecutiveDailyBriefObservation({
                output: {
                  ok: true,
                  dailyRecapId: current.draft.id,
                },
              });
              return current;
            },
          );

      const draft = result.draft;
      const itemCount =
        draft.packet.sections.needsBrandon.length +
        draft.packet.sections.waitingOnOthers.length +
        draft.packet.sections.importantUpdates.length;

      updateExecutiveDailyBriefObservation({
        metadata: {
          route: guardrailKey,
          windowDays,
          fresh,
          sourceBackedOnly,
          itemCount,
          dailyRecapId: draft.id,
          runId: "runId" in result ? result.runId : undefined,
          traceId: currentExecutiveDailyBriefTraceId(),
        },
        output: {
          ok: true,
          itemCount,
        },
      });

      return NextResponse.json(draft.packet);
    },
  );
}
