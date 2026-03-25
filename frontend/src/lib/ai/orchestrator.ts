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
import { createWebSearchTools } from "@/lib/ai/tools/web-search";
import { createActionTools } from "@/lib/ai/tools/action-tools";
import { strategistSystemPrompt } from "@/lib/ai/agents/strategist";
import { soul } from "@/lib/ai/soul";
import { identity } from "@/lib/ai/identity";
import { cfoSystemPrompt } from "@/lib/ai/agents/cfo";
import { cooSystemPrompt } from "@/lib/ai/agents/coo";
import { croSystemPrompt } from "@/lib/ai/agents/cro";
import { chroSystemPrompt } from "@/lib/ai/agents/chro";
import { vpbdSystemPrompt } from "@/lib/ai/agents/vpbd";
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
  /** Emoji icon used in Council Mode responses (e.g. "💰"). */
  icon: string;
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
    icon: "💰",
    systemPrompt: cfoSystemPrompt,
    modelId: "openai/gpt-5.4-mini",
    description:
      "Financial analysis, budgets, cash flow, margins, contracts, change orders, invoicing, retention",
    triggerKeywords: [
      // Core financial terms
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
      "forecast",
      "variance",
      "budget vs actual",
      "cost to complete",
      "cost at completion",
      "percentage of completion",
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

  coo: {
    name: "COO",
    icon: "🏗️",
    systemPrompt: cooSystemPrompt,
    modelId: "openai/gpt-5.4-mini",
    description:
      "Operations, scheduling, procurement velocity, RFIs, submittals, subcontractor performance, action item accountability, field execution",
    triggerKeywords: [
      "schedule",
      "timeline",
      "milestone",
      "delay",
      "delayed",
      "overdue",
      "critical path",
      "task",
      "tasks",
      "dependency",
      "dependencies",
      "behind",
      "on track",
      "completion",
      "percent complete",
      "rfi",
      "rfis",
      "request for information",
      "submittal",
      "submittals",
      "shop drawing",
      "material submission",
      "approval",
      "ball in court",
      "vendor",
      "subcontractor",
      "sub",
      "subs",
      "trade",
      "trades",
      "trade partner",
      "procurement",
      "action item",
      "action items",
      "follow up",
      "accountable",
      "accountability",
      "who owns",
      "who is responsible",
      "responsible party",
      "open items",
      "outstanding items",
      "field",
      "site",
      "on site",
      "construction progress",
      "work in place",
      "execution",
      "operational",
      "operations",
      "oac meeting",
      "owner meeting",
      "meeting prep",
      "what needs attention",
      "what is overdue",
      "what is blocking",
      "blocking",
      "blocker",
      "bottleneck",
    ],
    createTools: (userId: string, options?) => {
      // COO gets the full project tools which include all operational tools:
      // schedule analysis, people & roles, vendor performance, RFI status,
      // submittal status, cross-project comparison, historical trends,
      // action items, meeting search, and semantic search.
      return createProjectTools(userId, options as any);
    },
  },

  cro: {
    name: "CRO",
    icon: "🛡️",
    systemPrompt: croSystemPrompt,
    modelId: "openai/gpt-5.4-mini",
    description:
      "Risk identification, financial exposure, contract risk, claim signals, procurement risk, and portfolio-level risk patterns",
    triggerKeywords: [
      "risk",
      "risks",
      "risky",
      "at risk",
      "exposure",
      "claim",
      "claims",
      "dispute",
      "disputed",
      "contested",
      "unresolved",
      "warning",
      "critical",
      "red flag",
      "flags",
      "flagged",
      "concern",
      "concerns",
      "issue",
      "issues",
      "problem",
      "problems",
      "liability",
      "notice",
      "reservation of rights",
      "contract risk",
      "compliance",
      "scope creep",
      "unpriced",
      "unquantified",
      "change event",
      "change events",
      "orphaned",
      "missing commitment",
      "budget overrun",
      "overrun",
      "blow",
      "blown",
      "contingency",
      "liquidated damages",
      "ld",
      "substantial completion",
      "delay damages",
      "what could go wrong",
      "worst case",
      "downside",
      "portfolio risk",
      "risk dashboard",
      "risk scan",
      "risk assessment",
      "risk profile",
      "risk signal",
      "risk signals",
    ],
    createTools: (userId: string, options?) => {
      // CRO gets the full project tools which include all risk-related tools:
      // getProjectsWithRisks, getProjectRiskAnalysis, getPortfolioOverview,
      // getRFIStatus, getSubmittalStatus, getChangeOrderDetails, budget summary,
      // meeting search, action items, and semantic search.
      return createProjectTools(userId, options as any);
    },
  },

  chro: {
    name: "CHRO",
    icon: "👥",
    systemPrompt: chroSystemPrompt,
    modelId: "openai/gpt-5.4-mini",
    description:
      "People and capacity: team composition, staffing gaps, action item accountability, subcontractor relationships, institutional knowledge, and lessons learned",
    triggerKeywords: [
      // Team / people
      "who is on",
      "who's on",
      "team",
      "staff",
      "staffing",
      "roster",
      "directory",
      "personnel",
      "person",
      "people",
      "who handles",
      "who owns",
      "who is responsible",
      "responsible party",
      "contact",
      "contacts",
      "reach out",
      "pm",
      "project manager",
      "superintendent",
      "super",
      "owner rep",
      "architect",
      // Capacity
      "capacity",
      "overloaded",
      "stretched",
      "bandwidth",
      "availability",
      "workload",
      "too many projects",
      "spread thin",
      // Accountability
      "accountable",
      "accountability",
      "follow through",
      "follow-through",
      "action item owner",
      "who is accountable",
      // Knowledge
      "lesson learned",
      "lessons learned",
      "best practice",
      "best practices",
      "institutional knowledge",
      "what have we learned",
      "knowledge base",
      "company knowledge",
      "certification",
      "capability",
      "capabilities",
      // Subcontractor / vendor relationships
      "sub relationship",
      "trade relationship",
      "vendor relationship",
      // Org / roles
      "org",
      "org structure",
      "role",
      "roles",
      "hire",
      "hiring",
      "onboard",
      "offboard",
      "departure",
      "new hire",
      "transition",
      // Person-specific sentiment / concerns
      "stress",
      "stresses",
      "stressed",
      "worried",
      "worries",
      "concern",
      "concerns",
      "frustrated",
      "frustration",
      "thinks about",
      "feels about",
      "what does",
      "how does",
      "opinion",
    ],
    createTools: (userId: string, options?) => {
      // CHRO gets the full project tools which include:
      // getPeopleAndRoles, getActionItemsAndInsights, getCrossProjectComparison,
      // getVendorPerformance, getPortfolioOverview, searchMeetingsByTopic,
      // getMeetingDetails, getCompanyKnowledge, and semanticSearch.
      return createProjectTools(userId, options as any);
    },
  },

  vpbd: {
    name: "VP of Business Development",
    icon: "🤝",
    systemPrompt: vpbdSystemPrompt,
    modelId: "openai/gpt-5.4-mini",
    description:
      "Pipeline, client relationships, revenue trajectory, competitive positioning, company differentiators, past project references, and proposal preparation",
    triggerKeywords: [
      // Pipeline
      "pipeline",
      "pursuit",
      "pursuits",
      "bid",
      "bids",
      "bidding",
      "proposal",
      "proposals",
      "estimating",
      "estimate",
      "new work",
      "new project",
      "win",
      "winning",
      "won",
      "lost",
      "award",
      "awarded",
      "rfp",
      "rfq",
      "request for proposal",
      "go no go",
      "go/no-go",
      "pursue",
      // Client relationships
      "client",
      "clients",
      "owner relationship",
      "client relationship",
      "repeat work",
      "repeat client",
      "relationship",
      "business development",
      "bd",
      "business dev",
      "account",
      // Revenue / growth
      "revenue",
      "growth",
      "backlog",
      "future work",
      "revenue gap",
      "revenue horizon",
      "pipeline value",
      // Competitive / positioning
      "differentiator",
      "differentiators",
      "competitive",
      "competition",
      "competitors",
      "what makes us different",
      "our strengths",
      "positioning",
      "brand",
      // References / past performance
      "past project",
      "past performance",
      "reference",
      "references",
      "case study",
      "case studies",
      "portfolio",
      "track record",
      "similar project",
      "comparable project",
      // BD meeting prep
      "bd meeting",
      "client meeting",
      "interview",
      "pitch",
      "presentation",
    ],
    createTools: (userId: string, options?) => {
      // VP BD gets the full project tools which include:
      // getPortfolioOverview (with all phase filters), getFinancialAnalysis,
      // getCompanyKnowledge, semanticSearch, searchMeetingsByTopic,
      // getMeetingDetails, getProjectDetails, getProjectRiskAnalysis,
      // getHistoricalTrends, and getCrossProjectComparison.
      // Plus web search for competitive/market intelligence.
      return {
        ...createProjectTools(userId, options as any),
        ...createWebSearchTools(options as any),
      };
    },
  },
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
  // Web search tools — available to Strategist for external research
  // (competitive questions, market intel, industry trends)
  const webSearchTools = createWebSearchTools(options as any);
  // Action tools — write layer. Gives the Strategist the ability to create
  // and update records (change orders, RFIs, tasks, risks, etc.) in addition
  // to reading and analyzing data.
  const actionTools = createActionTools(userId, options as any);
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
    // Web search — available directly to the Strategist for external research
    ...webSearchTools,
    // Action tools — write layer (create/update records)
    ...actionTools,
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

    consultCOO: tool({
      description:
        "Consult the COO (Chief Operating Officer) for operational analysis. " +
        "Use this for ANY question about project execution: schedule health, " +
        "milestones, overdue tasks, critical path, RFI status, submittal " +
        "pipeline, subcontractor performance, procurement velocity, action " +
        "item accountability, field progress, or meeting prep. The COO has " +
        "access to real operational data and will call its own tools to " +
        "analyze it.",
      inputSchema: z.object({
        question: z
          .string()
          .describe(
            "The operational question to analyze. Be specific — include " +
              "project names and the type of operational data needed.",
          ),
        context: z
          .string()
          .optional()
          .describe(
            "Optional additional context to help the COO understand " +
              "the broader question being answered.",
          ),
      }),
      execute: async ({ question, context }) => {
        const response = await consultAgent("coo", question, userId, context, {
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

    consultCRO: tool({
      description:
        "Consult the CRO (Chief Risk Officer) for risk analysis. " +
        "Use this for ANY question about project or portfolio risk: financial " +
        "exposure, unpriced change events, contract risk, claim signals, " +
        "procurement risk (aging RFIs/submittals), schedule risk, budget " +
        "overrun risk, dispute patterns, or portfolio-level risk ranking. " +
        "Also use for 'what could go wrong?' or 'what should I be worried about?' " +
        "questions. The CRO has access to real risk data and will call its " +
        "own tools to analyze it.",
      inputSchema: z.object({
        question: z
          .string()
          .describe(
            "The risk question to analyze. Be specific — include " +
              "project names and the type of risk being assessed.",
          ),
        context: z
          .string()
          .optional()
          .describe(
            "Optional additional context to help the CRO understand " +
              "the broader question being answered.",
          ),
      }),
      execute: async ({ question, context }) => {
        const response = await consultAgent("cro", question, userId, context, {
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

    consultCHRO: tool({
      description:
        "Consult the CHRO (Chief Human Resources Officer) for people and capacity analysis. " +
        "Use this for ANY question about team composition, staffing gaps, capacity constraints, " +
        "action item accountability patterns, subcontractor relationships, institutional knowledge, " +
        "or lessons learned. Examples: 'Who is on this project?', 'Is anyone stretched too thin?', " +
        "'Who owns this action item?', 'What have we learned about [topic]?'.",
      inputSchema: z.object({
        question: z
          .string()
          .describe(
            "The people or capacity question to analyze. Be specific — include " +
              "project names and the type of information needed.",
          ),
        context: z
          .string()
          .optional()
          .describe(
            "Optional additional context to help the CHRO understand " +
              "the broader question being answered.",
          ),
      }),
      execute: async ({ question, context }) => {
        const response = await consultAgent(
          "chro",
          question,
          userId,
          context,
          { onTrace: options.onTrace },
        );
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

    consultVPBD: tool({
      description:
        "Consult the VP of Business Development for pipeline, client relationship, " +
        "and growth analysis. Use this for ANY question about the pursuit pipeline, " +
        "projects in estimating or planning, revenue trajectory, client relationship health, " +
        "competitive positioning, company differentiators, proposal preparation, " +
        "or past project references. Examples: 'What's in our pipeline?', " +
        "'How is the client relationship on X?', 'What are our differentiators?', " +
        "'Help me prep for a BD meeting'.",
      inputSchema: z.object({
        question: z
          .string()
          .describe(
            "The business development question to analyze. Be specific — include " +
              "client names, project types, or sectors where relevant.",
          ),
        context: z
          .string()
          .optional()
          .describe(
            "Optional additional context to help the VP BD understand " +
              "the broader question being answered.",
          ),
      }),
      execute: async ({ question, context }) => {
        const response = await consultAgent(
          "vpbd",
          question,
          userId,
          context,
          { onTrace: options.onTrace },
        );
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

    // Include base project tools so the Strategist can answer
    // questions directly when no specialist route is needed
    ...strategistBaseTools,
  };
}

// ---------------------------------------------------------------------------
// Strategist Configuration
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Council Mode
// ---------------------------------------------------------------------------

/**
 * Builds the system prompt injection for Council Mode.
 *
 * Council Mode is the Alleato equivalent of BMAD's party-mode. Instead of the
 * Strategist synthesizing specialist input into a single voice, each specialist
 * speaks directly — labeled with their icon and role — and the Strategist adds
 * only a brief closing synthesis.
 *
 * The user hears the raw expert perspectives, not a pre-digested summary.
 * Each specialist still calls their own tools, so responses are grounded in
 * real data. The difference is presentation: multi-voice, not single-voice.
 *
 * Formatting contract:
 *   [icon] **[Role]**
 *   [specialist's full analysis]
 *
 *   ---
 *
 *   ⚡ **Chief Strategist**
 *   [1–2 sentence synthesis of the key tension or decision]
 */
export function buildCouncilModePromptInjection(): string {
  // Build a formatted roster of all available specialists for the prompt
  const specialistRoster = Object.entries(agentRegistry)
    .map(([, cfg]) => `- ${cfg.icon} **${cfg.name}** — ${cfg.description}`)
    .join("\n");

  return `

## ⚡ COUNCIL MODE ACTIVE

You are now facilitating a C-Suite council session. Your role fundamentally changes.

**Normal mode:** You consult specialists and synthesize their findings into one voice.
**Council mode:** You present EACH specialist's analysis in their own voice, then add a brief closing statement.

### How to respond in Council Mode

1. **Select 2–3 specialists** most relevant to the question. If the question is clearly multi-domain (e.g. "how's the business?"), use 3–4. Never use all five for a single question — focus.

2. **Call each specialist** using their consult tool. Let them do their full analysis with tool calls.

3. **Present each specialist's response verbatim**, prefixed with their icon and role header:

\`\`\`
[icon] **[Role]**
[specialist's analysis — do NOT summarize, paraphrase, or cut]
\`\`\`

4. **Add a thin horizontal rule** between each specialist section:
\`---\`

5. **Close with the Chief Strategist's synthesis** — 1–2 sentences maximum. This is YOUR voice. State the single most important decision, tension, or action that emerges from the council's perspectives.

\`\`\`
---

⚡ **Chief Strategist**
[1–2 sentences: the key insight that connects the specialist views]
\`\`\`

### Specialist Roster
${specialistRoster}

### Council Mode Rules (NON-NEGOTIABLE)

- **Never strip specialist responses.** Present them in full. Do not paraphrase or condense.
- **Never put the Chief Strategist synthesis first.** Lead with the specialists, close with synthesis.
- **Never consult more than 4 specialists** for one message. Pick the most relevant.
- **Let specialists disagree.** If the CFO says the budget is tight and the VP BD sees a pipeline opportunity, show both. The tension is the value.
- **Your synthesis is 2 sentences, max.** The specialists did the analysis. You name the decision.
- **Cite the specialists when cross-referencing.** If the COO's operational issue connects to the CFO's cash concern, note it: "As both the COO and CFO flagged..."

### Example Council Mode Response Structure

\`\`\`
💰 **CFO**
[Full CFO analysis with data and source citations]

---

🏗️ **COO**
[Full COO analysis with data and source citations]

---

🛡️ **CRO**
[Full CRO analysis with data and source citations]

---

⚡ **Chief Strategist**
The financial exposure and schedule slippage on Cedar Park are compounding — the owner meeting on Thursday needs a recovery plan, not just a status update. Recommend calling an internal alignment session before Thursday.
\`\`\`
`;
}

/** Model used for the Strategist agent. */
export const STRATEGIST_MODEL = "openai/gpt-5.4";

/**
 * Returns the full Strategist system prompt.
 *
 * Injects soul (personality/tone) and identity (role/self-concept) BEFORE
 * the operational strategist instructions. This ensures the agent speaks
 * like a real person — warm, direct, conversational — rather than a
 * committee of labeled C-suite agents.
 *
 * The soul and identity layers are the HIGHEST PRIORITY personality
 * instructions. The strategist routing logic is operational plumbing
 * that happens behind the scenes.
 */
export function getStrategistSystemPrompt(): string {
  const today = new Date().toISOString().split("T")[0];
  return `${soul}

${identity}

${strategistSystemPrompt}

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
