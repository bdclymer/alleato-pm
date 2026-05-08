import { tool } from "ai";
import { z } from "zod";
import type { ToolTracePayload } from "./tool-utils";
import {
  attachLinearIssueToFeatureRequest,
  attachLinearSubIssueToFeatureRequest,
  captureFeatureRequestPacket,
  draftLinearIssueFromFeatureRequest,
  draftLinearSubIssuesFromImplementationPlan,
  findRelatedFeatureRequests,
  generateClaudeCodeHandoff,
  generateImplementationPlan,
  getFeatureRequestDetail,
  recordLinearStatusUpdateForFeatureRequest,
  updateFeatureRequestPacket,
  buildFeatureRequestPacketWidget,
} from "@/lib/feature-requests/server";
import { scoreFeatureRequestReadiness } from "@/lib/feature-requests/readiness";
import type { FeatureRequestType } from "@/lib/feature-requests/types";

export type FeatureRequestToolsOptions = {
  onTrace?: (trace: ToolTracePayload) => void;
  pinnedProjectId?: number;
};

const requestTypeSchema = z.enum([
  "new_feature",
  "workflow_improvement",
  "bug",
  "report_dashboard",
  "automation",
  "ai_assistant_capability",
  "data_cleanup",
  "integration",
  "permission_admin",
]);

const stringArraySchema = z.array(z.string()).default([]);

function trace(
  options: FeatureRequestToolsOptions,
  toolName: string,
  input: Record<string, unknown>,
  output: unknown,
) {
  options.onTrace?.({
    tool: toolName,
    input,
    output,
    timestamp: new Date().toISOString(),
  });
}

export function createFeatureRequestTools(
  userId: string,
  options: FeatureRequestToolsOptions = {},
) {
  return {
    findRelatedFeatureRequests: tool({
      description:
        "Find existing AIS feature request packets before creating a duplicate. Use this before captureFeatureRequestPacket when a stakeholder asks for a feature, workflow improvement, dashboard, report, automation, AI capability, integration, data cleanup, or permission/admin change.",
      inputSchema: z.object({
        query: z.string().describe("Request title, raw wording, or keywords to match against existing packets."),
        projectId: z.number().optional().describe("Project ID when the request is project-scoped."),
      }),
      execute: async (input) => {
        const requests = await findRelatedFeatureRequests({
          query: input.query,
          projectId: input.projectId ?? options.pinnedProjectId ?? null,
        });
        const output = {
          requests: requests.map((request) => ({
            id: request.id,
            title: request.title,
            status: request.status,
            readyForBuild: request.ready_for_build,
            updatedAt: request.updated_at,
            detailHref: `/ai-assistant/feature-requests/${request.id}`,
          })),
        };
        trace(options, "findRelatedFeatureRequests", input, output);
        return output;
      },
    }),

    captureFeatureRequestPacket: tool({
      description:
        "Create a durable AIS feature request packet from stakeholder wording. Preserve raw wording exactly, summarize separately, add implementation-critical open questions, and return a feature_request_packet widget payload. Do not use this for lightweight bug board feedback unless the user wants implementation-ready packet work.",
      inputSchema: z.object({
        title: z.string().optional(),
        requesterName: z.string().default("Brandon"),
        requestType: requestTypeSchema.default("workflow_improvement"),
        rawRequest: z.string().describe("Exact stakeholder wording. Preserve it separately from the summary."),
        assistantSummary: z.string().describe("Plain-English AIS understanding of the request."),
        stakeholderProblem: z.string().optional(),
        desiredOutcome: z.string().optional(),
        affectedUsers: stringArraySchema,
        affectedPages: stringArraySchema,
        affectedWorkflows: stringArraySchema,
        acceptanceCriteria: stringArraySchema,
        verificationSteps: stringArraySchema,
        openQuestions: stringArraySchema,
        assumptions: stringArraySchema,
        priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        projectId: z.number().optional(),
        linearDraftBody: z.string().optional(),
      }),
      execute: async (input) => {
        const request = await captureFeatureRequestPacket({
          ...input,
          requestType: input.requestType as FeatureRequestType,
          requesterUserId: userId,
          projectId: input.projectId ?? options.pinnedProjectId ?? null,
          stakeholderProblem: input.stakeholderProblem ?? null,
          desiredOutcome: input.desiredOutcome ?? null,
          linearDraftBody: input.linearDraftBody ?? null,
          createdBy: userId,
        });
        const detail = await getFeatureRequestDetail(request.id);
        const widget = buildFeatureRequestPacketWidget({
          request,
          latestPlan: detail?.latestPlan ?? null,
        });
        const output = {
          success: true,
          requestId: request.id,
          status: request.status,
          readyForBuild: request.ready_for_build,
          readinessMissingRequirements: request.readiness_missing_requirements,
          detailHref: widget.detailHref,
          widget,
        };
        trace(options, "captureFeatureRequestPacket", input, output);
        return output;
      },
    }),

    updateFeatureRequestPacket: tool({
      description:
        "Update an existing AIS feature request packet with clarified scope, acceptance criteria, verification steps, assumptions, Linear draft data, or readiness-relevant details.",
      inputSchema: z.object({
        requestId: z.string(),
        title: z.string().optional(),
        assistantSummary: z.string().optional(),
        desiredOutcome: z.string().optional(),
        affectedUsers: z.array(z.string()).optional(),
        affectedPages: z.array(z.string()).optional(),
        affectedWorkflows: z.array(z.string()).optional(),
        acceptanceCriteria: z.array(z.string()).optional(),
        verificationSteps: z.array(z.string()).optional(),
        openQuestions: z.array(z.string()).optional(),
        assumptions: z.array(z.string()).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        linearIssueId: z.string().optional(),
        linearIssueUrl: z.string().optional(),
        linearDraftBody: z.string().optional(),
      }),
      execute: async (input) => {
        const request = await updateFeatureRequestPacket(input.requestId, {
          ...input,
          updatedBy: userId,
        });
        const detail = await getFeatureRequestDetail(request.id);
        const output = {
          success: true,
          requestId: request.id,
          status: request.status,
          readyForBuild: request.ready_for_build,
          readinessMissingRequirements: request.readiness_missing_requirements,
          widget: buildFeatureRequestPacketWidget({
            request,
            latestPlan: detail?.latestPlan ?? null,
          }),
        };
        trace(options, "updateFeatureRequestPacket", input, output);
        return output;
      },
    }),

    scoreFeatureRequestReadiness: tool({
      description:
        "Score whether a feature request packet is ready for build. Use this before marking anything ready for Claude Code/Codex implementation.",
      inputSchema: z.object({
        requestId: z.string(),
      }),
      execute: async (input) => {
        const detail = await getFeatureRequestDetail(input.requestId);
        if (!detail) {
          return { success: false, error: `Feature request ${input.requestId} was not found.` };
        }
        const readiness = scoreFeatureRequestReadiness({
          request: detail.request,
          latestPlan: detail.latestPlan,
        });
        const output = {
          success: true,
          requestId: input.requestId,
          ...readiness,
        };
        trace(options, "scoreFeatureRequestReadiness", input, output);
        return output;
      },
    }),

    generateImplementationPlan: tool({
      description:
        "Generate and persist an implementation plan for an AIS feature request packet. This does not make the request ready for build by itself.",
      inputSchema: z.object({
        requestId: z.string(),
        summary: z.string().optional(),
        affectedRoutes: z.array(z.string()).optional(),
        affectedComponents: z.array(z.string()).optional(),
        affectedTables: z.array(z.string()).optional(),
        dataRequirements: z.array(z.string()).optional(),
        implementationSteps: z.array(z.string()).optional(),
        acceptanceCriteria: z.array(z.string()).optional(),
        verificationSteps: z.array(z.string()).optional(),
        risks: z.array(z.string()).optional(),
        openQuestions: z.array(z.string()).optional(),
      }),
      execute: async (input) => {
        const plan = await generateImplementationPlan({
          requestId: input.requestId,
          input: {
            ...input,
            generatedBy: userId,
          },
        });
        const detail = await getFeatureRequestDetail(input.requestId);
        const output = {
          success: true,
          requestId: input.requestId,
          planId: plan.id,
          version: plan.version,
          widget: detail
            ? buildFeatureRequestPacketWidget({
                request: detail.request,
                latestPlan: plan,
              })
            : null,
        };
        trace(options, "generateImplementationPlan", input, output);
        return output;
      },
    }),

    generateClaudeCodeHandoff: tool({
      description:
        "Generate a Claude Code/Codex handoff markdown file from a feature request packet and latest implementation plan. If readiness is blocked, the handoff must include the missing requirements instead of pretending it is ready.",
      inputSchema: z.object({
        requestId: z.string(),
        sessionLabel: z.string().default("SAIS"),
      }),
      execute: async (input) => {
        const handoff = await generateClaudeCodeHandoff({
          requestId: input.requestId,
          generatedBy: userId,
          sessionLabel: input.sessionLabel,
        });
        const output = {
          success: true,
          requestId: input.requestId,
          handoffPath: handoff.handoffPath,
          readyForBuild: handoff.request.ready_for_build,
          blockedMessage: handoff.blockedMessage,
          widget: buildFeatureRequestPacketWidget({
            request: handoff.request,
            latestPlan: handoff.plan,
          }),
        };
        trace(options, "generateClaudeCodeHandoff", input, output);
        return output;
      },
    }),

    draftLinearIssueFromFeatureRequest: tool({
      description:
        "Generate and persist a Linear parent issue draft from an AIS feature request packet. This only drafts the Linear issue body in the packet; use attachLinearIssueToFeatureRequest after the Linear connector creates the real issue.",
      inputSchema: z.object({
        requestId: z.string(),
      }),
      execute: async (input) => {
        const result = await draftLinearIssueFromFeatureRequest({
          requestId: input.requestId,
          draftedBy: userId,
        });
        const detail = await getFeatureRequestDetail(input.requestId);
        const output = {
          success: true,
          requestId: input.requestId,
          title: result.draft.title,
          body: result.draft.body,
          linearSyncStatus: result.request.linear_sync_status,
          widget: detail
            ? buildFeatureRequestPacketWidget({
                request: detail.request,
                latestPlan: detail.latestPlan,
              })
            : null,
        };
        trace(options, "draftLinearIssueFromFeatureRequest", input, output);
        return output;
      },
    }),

    draftLinearSubIssuesFromImplementationPlan: tool({
      description:
        "Generate and persist Linear sub-issue drafts from a feature request's latest implementation plan. Use this when the plan has multiple implementation steps, owners, routes, data changes, or verification slices.",
      inputSchema: z.object({
        requestId: z.string(),
        drafts: z.array(z.object({
          title: z.string(),
          body: z.string(),
          sourceStep: z.string().optional(),
          sortOrder: z.number().optional(),
        })).optional(),
      }),
      execute: async (input) => {
        const drafts = await draftLinearSubIssuesFromImplementationPlan({
          requestId: input.requestId,
          drafts: input.drafts?.map((draft) => ({
            title: draft.title,
            body: draft.body,
            sourceStep: draft.sourceStep ?? null,
            sortOrder: draft.sortOrder,
          })),
          draftedBy: userId,
        });
        const output = {
          success: true,
          requestId: input.requestId,
          subIssues: drafts.map((draft) => ({
            id: draft.id,
            title: draft.title,
            status: draft.status,
            linearIssueUrl: draft.linear_issue_url,
          })),
        };
        trace(options, "draftLinearSubIssuesFromImplementationPlan", input, output);
        return output;
      },
    }),

    attachLinearIssueToFeatureRequest: tool({
      description:
        "Attach a real Linear issue ID and URL to an AIS feature request packet after the Linear connector creates the issue. Use this to close the loop back to the packet.",
      inputSchema: z.object({
        requestId: z.string(),
        linearIssueId: z.string(),
        linearIssueUrl: z.string().url(),
      }),
      execute: async (input) => {
        const request = await attachLinearIssueToFeatureRequest({
          ...input,
          attachedBy: userId,
        });
        const detail = await getFeatureRequestDetail(input.requestId);
        const output = {
          success: true,
          requestId: input.requestId,
          linearIssueId: request.linear_issue_id,
          linearIssueUrl: request.linear_issue_url,
          linearSyncStatus: request.linear_sync_status,
          widget: detail
            ? buildFeatureRequestPacketWidget({
                request: detail.request,
                latestPlan: detail.latestPlan,
              })
            : null,
        };
        trace(options, "attachLinearIssueToFeatureRequest", input, output);
        return output;
      },
    }),

    attachLinearSubIssueToFeatureRequest: tool({
      description:
        "Attach a real Linear sub-issue ID and URL to a packet sub-issue draft after the Linear connector creates the Linear child issue.",
      inputSchema: z.object({
        subIssueId: z.string(),
        linearIssueId: z.string(),
        linearIssueUrl: z.string().url(),
        linearState: z.string().optional(),
      }),
      execute: async (input) => {
        const subIssue = await attachLinearSubIssueToFeatureRequest({
          ...input,
          linearState: input.linearState ?? null,
          attachedBy: userId,
        });
        const output = {
          success: true,
          requestId: subIssue.feature_request_id,
          subIssueId: subIssue.id,
          status: subIssue.status,
          linearIssueId: subIssue.linear_issue_id,
          linearIssueUrl: subIssue.linear_issue_url,
        };
        trace(options, "attachLinearSubIssueToFeatureRequest", input, output);
        return output;
      },
    }),

    recordLinearStatusUpdateForFeatureRequest: tool({
      description:
        "Record a Linear status or comment sync event back onto the AIS feature request packet. Use this after checking Linear so packet history reflects execution state without losing stakeholder context.",
      inputSchema: z.object({
        requestId: z.string(),
        linearIssueId: z.string().optional(),
        linearState: z.string().optional(),
        commentBody: z.string().optional(),
        syncStatus: z.enum(["synced", "blocked"]).optional(),
        syncError: z.string().optional(),
      }),
      execute: async (input) => {
        const request = await recordLinearStatusUpdateForFeatureRequest({
          requestId: input.requestId,
          linearIssueId: input.linearIssueId ?? null,
          linearState: input.linearState ?? null,
          commentBody: input.commentBody ?? null,
          syncStatus: input.syncStatus,
          syncError: input.syncError ?? null,
          recordedBy: userId,
        });
        const detail = await getFeatureRequestDetail(input.requestId);
        const output = {
          success: true,
          requestId: input.requestId,
          linearSyncStatus: request.linear_sync_status,
          linearLastSyncedAt: request.linear_last_synced_at,
          widget: detail
            ? buildFeatureRequestPacketWidget({
                request: detail.request,
                latestPlan: detail.latestPlan,
              })
            : null,
        };
        trace(options, "recordLinearStatusUpdateForFeatureRequest", input, output);
        return output;
      },
    }),
  };
}
