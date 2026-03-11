/**
 * C-Suite Orchestrator
 *
 * Routes user messages to domain-specialist agents (CFO, COO, etc.),
 * lets each specialist call its own tools, and returns the specialist's
 * analysis for the Strategist to synthesize.
 *
 * The orchestrator is designed to be called FROM the existing chat route's
 * Strategist agent via "consult" tools. It is NOT a replacement for the
 * chat route — it is the engine behind `consultCFO`, `consultCOO`, etc.
 *
 * Architecture:
 *   Chat Route → streamText(Strategist prompt + consult tools)
 *                   └─ consultCFO tool → orchestrator.consultAgent("cfo", question)
 *                                          └─ generateText(CFO prompt + financial tools)
 *
 * See: docs/AI-CSUITE-ARCHITECTURE.md
 */

import { generateText, stepCountIs, tool, type ToolSet } from "ai";
import { z } from "zod";
import { getLanguageModel } from "@/lib/ai/providers";
import { createProjectTools } from "@/lib/ai/tools/project-tools";
import { strategistSystemPrompt } from "@/lib/ai/agents/strategist";
import { cfoSystemPrompt } from "@/lib/ai/agents/cfo";
import type {
  AgentName,
  AgentResponse,
  ConfidenceLevel,
  RoutingDecision,
} from "@/lib/ai/agents/types";

// ---------------------------------------------------------------------------
// Agent Registry
// ---------------------------------------------------------------------------

/** Configuration for a single domain-specialist agent. */
export interface AgentConfig {
  /** Human-readable name (e.g. "CFO"). */
  name: string;
  /** The agent's full system prompt defining personality and expertise. */
  systemPrompt: string;
  /** The AI Gateway model ID to use for this agent. */
  modelId: string;
  /** A short description of the agent's domain, used for routing hints. */
  description: string;
  /**
   * Keywords that suggest a user question falls in this agent's domain.
   * Used by the keyword-based router. Case-insensitive.
   */
  triggerKeywords: string[];
  /**
   * Factory that creates the agent's tool set.
   * Receives the userId so tools can scope data access.
   * Optionally receives onTrace so sub-agent tool calls are reported
   * back to the top-level trace collector.
   */
  createTools: (
    userId: string,
    options?: { onTrace?: (trace: Record<string, unknown>) => void },
  ) => ToolSet;
}

// ---------------------------------------------------------------------------
// The registry itself
// ---------------------------------------------------------------------------

/**
 * Registry of all domain-specialist agents.
 *
 * Adding a new agent is a 3-step process:
 *   1. Add its config to this object.
 *   2. Add a `consultXxx` tool in `createStrategistTools`.
 *   3. Add the agent name to `AGENT_NAMES` in `agents/types.ts`.
 */
export const agentRegistry: Record<string, AgentConfig> = {
  cfo: {
    name: "CFO",
    systemPrompt: cfoSystemPrompt,
    modelId: "anthropic/claude-sonnet-4.5",
    description:
      "Financial analysis, budgets, cash flow, margins, contracts, change orders, invoicing, retention",
    triggerKeywords: [
      "budget",
      "cost",
      "margin",
      "cash flow",
      "cashflow",
      "invoice",
      "invoicing",
      "payment",
      "contract",
      "change order",
      "change event",
      "risk",
      "risks",
      "risky",
      "at risk",
      "issue",
      "issues",
      "critical item",
      "critical items",
      "exposure",
      "retention",
      "billing",
      "revenue",
      "profit",
      "loss",
      "expense",
      "expenditure",
      "financial",
      "finance",
      "money",
      "dollar",
      "spend",
      "spending",
      "pay app",
      "pay application",
      "commitment",
      "committed",
      "uncommitted",
      "exposure",
      "receivable",
      "payable",
      "direct cost",
      "cost code",
      "line item",
      "original budget",
      "revised budget",
      "budget growth",
      "overrun",
      "under budget",
      "over budget",
      "collection",
      "owe",
      "owes",
      "owed",
      "how much",
      "total value",
      // Acumatica ERP / live accounting data
      "acumatica",
      "erp",
      "ap aging",
      "ar aging",
      "accounts payable",
      "accounts receivable",
      "cash position",
      "vendor spend",
      "purchase order",
      "gl journal",
      "general ledger",
      "journal entry",
      "check",
      "outstanding bill",
      "outstanding invoice",
      "overdue payable",
      "overdue receivable",
      "live accounting",
      "accounting system",
      "net cash",
      "inflow",
      "outflow",
      "project budget",
      "project list",
      "cost code",
      "cost to complete",
      "cost at completion",
      "percentage of completion",
      // Operational tools (schedule, people, vendors, RFIs, submittals)
      "schedule",
      "timeline",
      "milestone",
      "delay",
      "overdue",
      "critical path",
      "task",
      "dependency",
      "rfi",
      "request for information",
      "submittal",
      "shop drawing",
      "material submission",
      "approval",
      "ball in court",
      "vendor",
      "subcontractor",
      "trade partner",
      "personnel",
      "team member",
      "directory",
      "who works",
      "contact",
      "compare project",
      "cross project",
      "portfolio comparison",
      "trend",
      "velocity",
      "trajectory",
      "historical",
      "forecast",
      "variance",
      "over budget",
      "under budget",
      "budget vs actual",
      "semantic search",
      "search knowledge",
      // Company knowledge
      "company",
      "mission",
      "vision",
      "strategy",
      "differentiator",
      "competitive",
      "okr",
      "goal",
      "policy",
      "certification",
      "org structure",
      "best practice",
      "lesson learned",
    ],
    createTools: (userId: string, options?) => {
      // CFO gets the full project tools which include:
      // - Base tools: portfolio overview, risk analysis, financial analysis,
      //   budget summary, action items, document search, project details
      // - Financial tools: commitments overview, change order details,
      //   direct costs summary, budget line items, cost trends, margin analysis
      // - Acumatica ERP tools: AP/AR aging, cash position, vendor spend,
      //   recent bills, recent invoices, purchase order summary (LIVE data)
      // - Operational tools: schedule analysis, people & roles, vendor performance,
      //   RFI status, submittal status, cross-project comparison, historical trends,
      //   forecast comparison, semantic search, company knowledge
      return createProjectTools(userId, options as any);
    },
  },

  // Future agents are added here:
  //
  // coo: {
  //   name: "COO",
  //   systemPrompt: cooSystemPrompt,
  //   modelId: "anthropic/claude-sonnet-4.5",
  //   description: "Operations, scheduling, execution, submittals, RFIs",
  //   triggerKeywords: ["schedule", "delay", "submittal", "rfi", "critical path", ...],
  //   createTools: (userId) => createOperationalTools(userId),
  // },
};

// ---------------------------------------------------------------------------
// Route Detection
// ---------------------------------------------------------------------------

/**
 * Keyword-based intent detection.
 *
 * Analyzes the user's message and returns which agent(s) to consult.
 * This is a simple first pass — later we can upgrade to Claude-powered
 * routing for ambiguous or multi-domain questions.
 */
export function detectRoute(message: string): RoutingDecision {
  const text = message.toLowerCase();
  const matches: Array<{ agent: AgentName; score: number }> = [];

  for (const [agentId, config] of Object.entries(agentRegistry)) {
    let score = 0;
    for (const keyword of config.triggerKeywords) {
      // Use word-boundary-aware matching for short keywords
      if (keyword.length <= 4) {
        const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, "i");
        if (regex.test(text)) {
          score += 1;
        }
      } else {
        if (text.includes(keyword.toLowerCase())) {
          score += 1;
        }
      }
    }
    if (score > 0) {
      matches.push({ agent: agentId as AgentName, score });
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  if (matches.length === 0) {
    return {
      agents: [],
      rationale: "No specialist matched. Strategist will handle directly.",
      requiresSynthesis: false,
      query: message,
    };
  }

  // If top match has a significant lead, single-agent route.
  // If multiple agents are close, multi-agent route.
  const top = matches[0];
  const runnerUp = matches[1];
  const isMultiAgent =
    runnerUp !== undefined && runnerUp.score >= top.score * 0.6;

  if (isMultiAgent) {
    const agents = matches
      .filter((m) => m.score >= top.score * 0.4)
      .map((m) => m.agent);
    return {
      agents,
      rationale: `Cross-domain question. Consulting: ${agents.join(", ")}`,
      requiresSynthesis: true,
      query: message,
    };
  }

  return {
    agents: [top.agent],
    rationale: `Single-domain question routed to ${top.agent} (score: ${top.score})`,
    requiresSynthesis: false,
    query: message,
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Agent Execution
// ---------------------------------------------------------------------------

/**
 * Consults a single domain specialist agent.
 *
 * This creates a separate AI call with the agent's own system prompt and
 * tools, lets the agent reason and call tools, then returns its analysis.
 *
 * @param agentId - The agent to consult (e.g. "cfo")
 * @param question - The question or task for the agent
 * @param userId - The authenticated user's ID (for tool data scoping)
 * @param context - Optional additional context from the Strategist
 * @returns The agent's structured response
 */
export async function consultAgent(
  agentId: string,
  question: string,
  userId: string,
  context?: string,
  options?: { onTrace?: (trace: Record<string, unknown>) => void },
): Promise<AgentResponse> {
  const config = agentRegistry[agentId];
  if (!config) {
    return {
      agent: agentId as AgentName,
      content: `Agent "${agentId}" is not registered. Available agents: ${Object.keys(agentRegistry).join(", ")}`,
      confidence: "low",
      alerts: [],
      toolsCalled: [],
    };
  }

  const startTime = Date.now();
  const toolsCalled: string[] = [];

  // Build the agent's tools with tracing — thread onTrace so sub-agent
  // tool calls are reported back to the top-level trace collector
  const agentTools = config.createTools(userId, {
    onTrace: options?.onTrace,
  });

  const userMessage = context
    ? `Context from the Chief Strategist:\n${context}\n\nQuestion:\n${question}`
    : question;

  try {
    const result = await generateText({
      model: getLanguageModel(config.modelId),
      system: config.systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      tools: agentTools,
      stopWhen: stepCountIs(5),
      // LangFuse AI Observability — child span under the strategist trace
      experimental_telemetry: {
        isEnabled: true,
        functionId: `agent-${agentId}`,
        metadata: {
          userId,
          agent: agentId,
          agentName: config.name,
          architecture: "csuite",
        },
      },
    });

    // Extract which tools were called from the steps
    for (const step of result.steps) {
      for (const call of step.toolCalls) {
        if (!toolsCalled.includes(call.toolName)) {
          toolsCalled.push(call.toolName);
        }
      }
    }

    // Determine confidence based on whether tools returned data
    let confidence: ConfidenceLevel = "high";
    if (toolsCalled.length === 0) {
      confidence = "medium"; // Agent answered without data — less reliable
    }

    const durationMs = Date.now() - startTime;

    return {
      agent: agentId as AgentName,
      content: result.text,
      confidence,
      alerts: [], // Agents will populate alerts in future iterations
      toolsCalled,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return {
      agent: agentId as AgentName,
      content: `The ${config.name} encountered an error while analyzing: ${errorMessage}`,
      confidence: "low",
      alerts: [
        {
          severity: "warning",
          message: `${config.name} agent error: ${errorMessage}`,
        },
      ],
      toolsCalled,
      durationMs,
    };
  }
}

/**
 * Consults multiple agents in parallel and returns all responses.
 */
export async function consultAgents(
  agentIds: string[],
  question: string,
  userId: string,
  context?: string,
  options?: { onTrace?: (trace: Record<string, unknown>) => void },
): Promise<AgentResponse[]> {
  const promises = agentIds.map((id) =>
    consultAgent(id, question, userId, context, options),
  );
  return Promise.all(promises);
}

// ---------------------------------------------------------------------------
// Strategist Tools (consult* tools used by the Strategist agent)
// ---------------------------------------------------------------------------

/**
 * Creates the tools available to the Strategist agent.
 *
 * These are the "consult" tools — each one delegates to a domain specialist.
 * The Strategist's streamText call uses these tools the same way a regular
 * agent uses data-fetching tools.
 *
 * Also includes the user's regular project tools so the Strategist can
 * answer questions directly when no specialist is needed.
 */
export function createStrategistTools(
  userId: string,
  options: { onTrace?: (trace: Record<string, unknown>) => void } = {},
) {
  // Include the base project tools so the Strategist can answer
  // general questions without routing to a specialist
  const baseTools = createProjectTools(userId, options as any);
  // Do not expose risk-dedicated tools directly to the Strategist.
  // This forces portfolio/project risk questions through consultCFO,
  // where the specialist prompt requires risk-specific workflows.
  const {
    getPortfolioOverview: _portfolioOverviewTool,
    getProjectsWithRisks: _riskRadarTool,
    getProjectRiskAnalysis: _projectRiskTool,
    ...strategistBaseTools
  } = baseTools;

  return {
    // The Strategist's specialist consultation tools
    consultCFO: tool({
      description:
        "Consult the CFO (Chief Financial Officer) for financial analysis. " +
        "Use this for ANY question about money: budgets, costs, margins, " +
        "cash flow, contracts, change orders, invoicing, retention, pay " +
        "applications, financial health, or profitability. The CFO has " +
        "access to real financial data and will call its own tools to " +
        "analyze it. Pass the user's question (or your reformulated " +
        "version) as the question parameter.",
      inputSchema: z.object({
        question: z
          .string()
          .describe(
            "The financial question to analyze. Be specific — include " +
              "project names if the user mentioned them.",
          ),
        context: z
          .string()
          .optional()
          .describe(
            "Optional additional context to help the CFO understand " +
              "the broader question being answered.",
          ),
      }),
      execute: async ({ question, context }) => {
        const response = await consultAgent("cfo", question, userId, context, {
          onTrace: options.onTrace,
        });
        return {
          agent: response.agent,
          analysis: response.content,
          confidence: response.confidence,
          toolsUsed: response.toolsCalled,
          durationMs: response.durationMs,
          alerts: response.alerts,
        };
      },
    }),

    // Future consult tools are added here as agents are built:
    //
    // consultCOO: tool({
    //   description: "Consult the COO for operational analysis...",
    //   inputSchema: z.object({
    //     question: z.string(),
    //     context: z.string().optional(),
    //   }),
    //   execute: async ({ question, context }) => {
    //     const response = await consultAgent("coo", question, userId, context);
    //     return { ... };
    //   },
    // }),
    //
    // consultCHRO: tool({ ... }),
    // consultCRO: tool({ ... }),
    // consultVPBD: tool({ ... }),

    // Include base project tools so the Strategist can answer
    // questions directly when no specialist route is needed
    ...strategistBaseTools,
  };
}

// ---------------------------------------------------------------------------
// Strategist Configuration
// ---------------------------------------------------------------------------

/** Model used for the Strategist agent. */
export const STRATEGIST_MODEL = "anthropic/claude-sonnet-4.5";

/**
 * Returns the full Strategist system prompt.
 *
 * This is a function (not a constant) so we can later inject dynamic
 * context like current date, active project list, etc.
 */
export function getStrategistSystemPrompt(): string {
  const today = new Date().toISOString().split("T")[0];
  return `${strategistSystemPrompt}

## Runtime Date Context
Today is ${today} (YYYY-MM-DD).
Interpret relative date phrases (today, yesterday, this week) against this date and verify with tools before answering.`;
}

// ---------------------------------------------------------------------------
// Convenience: Check if C-Suite routing should be used
// ---------------------------------------------------------------------------

/**
 * Determines whether a message should be handled by the C-Suite orchestrator
 * (Strategist + specialist agents) or the legacy single-agent path.
 *
 * For now, this always returns true since the Strategist can fall back to
 * being a generalist. The chat route can use this to gradually roll out
 * the C-Suite architecture.
 *
 * @param _message - The user's message (unused for now)
 * @returns Whether to use C-Suite routing
 */
export function shouldUseCsuite(_message: string): boolean {
  // Always use the C-Suite path — the Strategist handles fallback
  return true;
}
