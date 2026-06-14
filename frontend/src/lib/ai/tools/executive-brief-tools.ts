import { tool } from "ai";
import { z } from "zod";
import { regenerateExecutiveBriefingDraft } from "@/lib/executive/executive-briefing-workflow";
import { type ToolTracePayload, withTrace as _withTrace } from "./tool-utils";

type CreateExecutiveBriefToolsOptions = {
  onTrace?: (trace: ToolTracePayload) => void;
};

function withTrace<TInput extends Record<string, unknown>, TResult>(
  name: string,
  options: CreateExecutiveBriefToolsOptions,
  execute: (input: TInput) => Promise<TResult>,
) {
  return _withTrace(
    name,
    options,
    execute,
    "Brief generation failed. This may be due to incomplete source data (emails, meetings, Teams messages). Ask the user to check recent communications.",
  );
}

export function createExecutiveBriefTools(
  options: CreateExecutiveBriefToolsOptions = {},
) {
  return {
    generateExecutiveDailyBrief: tool({
      description:
        "Generate the executive daily brief — a curated intelligence digest for Brandon covering the top risks, financial exposures, schedule impacts, and recommended actions across all active projects. The brief synthesizes emails, Teams messages, meetings, and documents from the past 3 days to surface what needs Brandon's immediate attention.",
      inputSchema: z.object({
        windowDays: z
          .number()
          .int()
          .min(1)
          .max(7)
          .default(3)
          .describe("Number of days to look back (default 3)"),
      }),
      execute: withTrace(
        "generateExecutiveDailyBrief",
        options,
        async (input: { windowDays?: number }) => {
          const result = await regenerateExecutiveBriefingDraft({
            windowDays: input.windowDays ?? 3,
          });

          const { packet } = result.draft;
          const { sections, operatingBrief } = packet;

          return {
            success: true,
            briefId: result.draft.id,
            generatedAt: result.draft.recapDate,
            summary: {
              needsBrandon: sections.needsBrandon.length,
              waitingOnOthers: sections.waitingOnOthers.length,
              importantUpdates: sections.importantUpdates.length,
              topProjects: operatingBrief?.topExecutiveFocus?.length ?? 0,
            },
            financialPulse: packet.financialPulse
              ? {
                  totalOutstandingAR: packet.financialPulse.totalOutstandingAR,
                  totalOverdueAR: packet.financialPulse.totalOverdueAR,
                  topOverdueProjects:
                    packet.financialPulse.arByProject
                      ?.filter((a) => a.overdueBalance > 0)
                      ?.slice(0, 3)
                      ?.map((a) => ({
                        project: a.projectName,
                        overdue: a.overdueBalance,
                      })) ?? [],
                  pendingCORevenue:
                    packet.financialPulse.totalPendingCORevenue,
                }
              : null,
            topItems:
              operatingBrief?.topExecutiveFocus?.slice(0, 5).map((f) => ({
                lane: f.lane,
                project: f.item.project,
                title: f.item.title,
                nextMove: f.recommendedNextMove,
              })) ?? [],
            sourceHealth: {
              email: packet.sourceCoverage?.find((s) => s.label === "Email"),
              teams: packet.sourceCoverage?.find((s) => s.label === "Teams"),
              meetings: packet.sourceCoverage?.find((s) => s.label === "Meeting"),
            },
            notes: packet.retrievalNotes ?? [],
          };
        },
      ),
    }),
  };
}
