"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Brain,
  CircleDot,
  Clock3,
  DollarSign,
  FileText,
  FolderKanban,
  Lightbulb,
  MessageSquareText,
  Network,
  Send,
  ShieldAlert,
  Sparkles,
  Workflow,
} from "lucide-react";
import { SectionRuleHeading } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  classifyExecutiveQuery,
  type AgentRoute,
} from "@/lib/executive/executive-intelligence-routing";

type ExecutiveAgent = {
  route: AgentRoute;
  name: string;
  shortName: string;
  role: string;
  analyzes: string[];
  questions: string[];
  icon: LucideIcon;
  accentClassName: string;
};

type RoutedResponse = {
  route: AgentRoute;
  query: string;
};

const EXECUTIVE_AGENTS: ExecutiveAgent[] = [
  {
    route: "strategic_advisor",
    name: "Strategic Advisor Agent",
    shortName: "Strategic Advisor",
    role: "Executive brain / AI Chief of Staff",
    analyzes: [
      "Meetings",
      "Projects",
      "Risks",
      "Decisions",
      "Tasks",
      "Opportunities",
      "Financial signals",
    ],
    questions: [
      "What needs leadership attention this week?",
      "Where are we losing time across projects?",
      "What are our biggest strategic opportunities?",
    ],
    icon: Brain,
    accentClassName: "text-foreground",
  },
  {
    route: "cfo",
    name: "CFO Agent",
    shortName: "CFO",
    role: "Financial intelligence layer",
    analyzes: [
      "Financial reports",
      "WIP reports",
      "Budgets",
      "Invoices",
      "Commitments",
      "Change orders",
      "Project profitability",
    ],
    questions: [
      "Which projects are at financial risk?",
      "Where are margins slipping?",
      "What does this WIP report tell us?",
    ],
    icon: DollarSign,
    accentClassName: "text-emerald-700",
  },
  {
    route: "project_intelligence",
    name: "Project Intelligence Agent",
    shortName: "Project Intelligence",
    role: "Project health and execution analyst",
    analyzes: [
      "Project status",
      "Blockers",
      "Decisions",
      "Schedules",
      "Meeting history",
    ],
    questions: [
      "What is the current status of this project?",
      "What changed since the last meeting?",
      "What blockers are unresolved?",
    ],
    icon: FolderKanban,
    accentClassName: "text-sky-700",
  },
  {
    route: "risk_accountability",
    name: "Risk & Accountability Agent",
    shortName: "Risk & Accountability",
    role: "Follow-through watchdog",
    analyzes: [
      "Stale tasks",
      "Overdue commitments",
      "Unresolved risks",
      "Missing owners",
    ],
    questions: [
      "What tasks are overdue?",
      "What risks have been mentioned repeatedly?",
      "Who owes what?",
    ],
    icon: ShieldAlert,
    accentClassName: "text-red-700",
  },
  {
    route: "operations_improvement",
    name: "Operations Improvement Agent",
    shortName: "Operations Improvement",
    role: "Process improvement strategist",
    analyzes: [
      "Bottlenecks",
      "Recurring issues",
      "Handoff problems",
      "SOP opportunities",
    ],
    questions: [
      "What process keeps breaking?",
      "What SOPs should we create?",
      "Where do we need better handoff?",
    ],
    icon: Workflow,
    accentClassName: "text-violet-700",
  },
  {
    route: "meeting_intelligence",
    name: "Meeting Intelligence Agent",
    shortName: "Meeting Intelligence",
    role: "Meeting memory and transcript analyst",
    analyzes: [
      "Fireflies transcripts",
      "Summaries",
      "Decisions",
      "Risks",
      "Tasks",
      "Opportunities",
    ],
    questions: [
      "What did we decide in the last meeting?",
      "What action items came out of this call?",
      "What risks were discussed?",
    ],
    icon: MessageSquareText,
    accentClassName: "text-amber-700",
  },
];

const EXECUTIVE_PROMPTS = [
  "What needs leadership attention this week?",
  "What are our biggest financial risks?",
  "Which projects are falling behind?",
  "What decisions were made recently?",
  "What repeated problems should become SOPs?",
];

const LEADERSHIP_ALERTS = [
  {
    category: "Overdue tasks",
    title: "Seven owner commitments are past due across active projects",
    detail: "Three were repeated in the last two weekly meetings without a new due date.",
    owner: "Risk & Accountability",
    severity: "Needs attention",
  },
  {
    category: "High-risk projects",
    title: "Two projects show schedule pressure and open procurement blockers",
    detail: "Submittal approvals and vendor handoffs are driving the latest variance.",
    owner: "Project Intelligence",
    severity: "Watch",
  },
  {
    category: "Financial concerns",
    title: "Margin drift detected in change-order-heavy work",
    detail: "Pending commitments are outpacing approved revenue on the current risk list.",
    owner: "CFO",
    severity: "Escalate",
  },
  {
    category: "Repeated bottlenecks",
    title: "Closeout documentation is repeatedly handed off without acceptance criteria",
    detail: "The same gap appears in three project updates and two transcript summaries.",
    owner: "Operations Improvement",
    severity: "System fix",
  },
  {
    category: "New opportunities",
    title: "Client demand signals support a standardized owner update package",
    detail: "Recent meetings surfaced repeated requests for decision-ready summaries.",
    owner: "Strategic Advisor",
    severity: "Opportunity",
  },
];

const COMPANY_BRAIN_ACTIVITY = [
  {
    icon: FileText,
    label: "New meetings processed",
    value: "18",
    detail: "Fireflies summaries and transcript segments indexed this week",
  },
  {
    icon: CircleDot,
    label: "Decisions extracted",
    value: "42",
    detail: "Tagged to project, owner, and source conversation where available",
  },
  {
    icon: AlertTriangle,
    label: "Risks found",
    value: "11",
    detail: "Grouped by project health, financial exposure, and follow-through",
  },
  {
    icon: Clock3,
    label: "Tasks created",
    value: "27",
    detail: "Prepared for owner assignment, due date review, and accountability checks",
  },
  {
    icon: Lightbulb,
    label: "Opportunities identified",
    value: "6",
    detail: "Process, revenue, and client-experience improvements ready for review",
  },
];

const FUTURE_DATA_SOURCES = [
  "document_metadata",
  "meeting_segments",
  "documents",
  "decisions",
  "risks",
  "tasks",
  "opportunities",
  "fireflies_ingestion_jobs",
];

const RESPONSE_PREVIEWS: Record<AgentRoute, string> = {
  strategic_advisor:
    "I would synthesize meetings, project health, financial signals, decisions, risks, and open tasks into a leadership-priority brief with recommended next actions.",
  cfo:
    "I would review WIP, budget movement, invoices, commitments, change orders, and profitability signals to isolate margin pressure and cash exposure.",
  project_intelligence:
    "I would compare current status, blockers, schedules, decisions, and meeting history to explain what changed and what needs a project-level decision.",
  risk_accountability:
    "I would scan stale tasks, overdue commitments, repeated risk language, and missing owners to produce an accountability list with clear follow-up paths.",
  operations_improvement:
    "I would group recurring issues, bottlenecks, handoff failures, and SOP candidates into process improvements that can be assigned and measured.",
  meeting_intelligence:
    "I would inspect Fireflies transcripts, summaries, decisions, risks, and action items to answer from meeting memory with source-ready context.",
};

const AGENT_BY_ROUTE = new Map(EXECUTIVE_AGENTS.map((agent) => [agent.route, agent]));

export function ExecutiveIntelligencePage() {
  const [query, setQuery] = useState(EXECUTIVE_PROMPTS[0]);
  const [selectedRoute, setSelectedRoute] = useState<AgentRoute | "auto">("auto");
  const [response, setResponse] = useState<RoutedResponse | null>({
    route: "strategic_advisor",
    query: EXECUTIVE_PROMPTS[0],
  });

  const previewRoute = useMemo(() => {
    if (selectedRoute !== "auto") return selectedRoute;
    return classifyExecutiveQuery(query);
  }, [query, selectedRoute]);

  const previewAgent = AGENT_BY_ROUTE.get(previewRoute) ?? EXECUTIVE_AGENTS[0];
  const responseAgent = response
    ? AGENT_BY_ROUTE.get(response.route) ?? EXECUTIVE_AGENTS[0]
    : previewAgent;

  const submitQuery = () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setResponse({
      route: selectedRoute === "auto" ? classifyExecutiveQuery(trimmed) : selectedRoute,
      query: trimmed,
    });
  };

  return (
    <>
      <HeroCommandCenter />
      <AgentTeamOverview />
      <AskExecutiveTeam
        query={query}
        selectedRoute={selectedRoute}
        previewAgent={previewAgent}
        response={response}
        responseAgent={responseAgent}
        onQueryChange={setQuery}
        onSelectedRouteChange={setSelectedRoute}
        onSubmit={submitQuery}
      />
      <LeadershipAlerts />
      <CompanyBrainActivity />
    </>
  );
}

function HeroCommandCenter() {
  return (
    <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Network className="h-4 w-4" />
          Executive command center
        </div>
        <div className="space-y-4">
          <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-foreground md:text-5xl">
            Alleato Executive Intelligence System
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            A strategic AI command center that turns meetings, financials,
            projects, and decisions into real-time executive insight.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <SignalMetric label="Signals watched" value="8" />
          <SignalMetric label="Specialist modes" value="6" />
          <SignalMetric label="Orchestrator" value="1" />
        </div>
      </div>

      <div className="bg-muted/25 p-4 md:p-6">
        <ExecutiveNetworkMap />
      </div>
    </section>
  );
}

function SignalMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-l border-border pl-4">
      <div className="text-2xl font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function ExecutiveNetworkMap() {
  const cfo = EXECUTIVE_AGENTS.find((agent) => agent.route === "cfo")!;
  const project = EXECUTIVE_AGENTS.find((agent) => agent.route === "project_intelligence")!;
  const strategic = EXECUTIVE_AGENTS.find((agent) => agent.route === "strategic_advisor")!;
  const risk = EXECUTIVE_AGENTS.find((agent) => agent.route === "risk_accountability")!;
  const operations = EXECUTIVE_AGENTS.find((agent) => agent.route === "operations_improvement")!;
  const meeting = EXECUTIVE_AGENTS.find((agent) => agent.route === "meeting_intelligence")!;

  return (
    <div aria-label="AI executive team network map" className="space-y-3">
      <div className="grid gap-3 lg:hidden">
        {[cfo, project, strategic, risk, operations, meeting].map((agent) => (
          <NetworkNode key={agent.route} agent={agent} isCentral={agent.route === "strategic_advisor"} />
        ))}
      </div>

      <div className="hidden lg:flex lg:flex-col lg:items-center">
        <NetworkNode agent={cfo} />
        <ConnectorVertical />
        <div className="grid w-full grid-cols-[minmax(0,1fr)_4rem_auto_4rem_minmax(0,1fr)] items-center">
          <NetworkNode agent={project} />
          <ConnectorHorizontal />
          <NetworkNode agent={strategic} isCentral />
          <ConnectorHorizontal />
          <NetworkNode agent={risk} />
        </div>
        <ConnectorVertical />
        <NetworkNode agent={operations} />
        <ConnectorVertical />
        <NetworkNode agent={meeting} />
      </div>
    </div>
  );
}

function ConnectorVertical() {
  return <div aria-hidden="true" className="h-7 w-px bg-border" />;
}

function ConnectorHorizontal() {
  return <div aria-hidden="true" className="h-px bg-border" />;
}

function NetworkNode({
  agent,
  isCentral = false,
}: {
  agent: ExecutiveAgent;
  isCentral?: boolean;
}) {
  const Icon = agent.icon;

  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border bg-background px-4 py-3 shadow-sm",
        isCentral && "border-foreground bg-foreground text-background shadow-none",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground",
            isCentral && "bg-background/15 text-background",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{agent.shortName}</div>
          <div
            className={cn(
              "mt-0.5 truncate text-xs text-muted-foreground",
              isCentral && "text-background/75",
            )}
          >
            {agent.role}
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentTeamOverview() {
  return (
    <section className="space-y-5">
      <SectionIntro
        eyebrow="Agent team overview"
        title="Specialist modes under one orchestrator"
        description="The interface presents a full executive team, while the implementation stays simple: one Strategic Advisor orchestrator routes questions into specialist modes."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {EXECUTIVE_AGENTS.map((agent) => (
          <AgentOverviewBlock key={agent.route} agent={agent} />
        ))}
      </div>
    </section>
  );
}

function AgentOverviewBlock({ agent }: { agent: ExecutiveAgent }) {
  const Icon = agent.icon;

  return (
    <article className="rounded-lg border bg-background p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className={cn("h-5 w-5", agent.accentClassName)} />
        </span>
        <div className="min-w-0 space-y-1">
          <div className="text-base font-semibold text-foreground">{agent.name}</div>
          <p className="text-sm leading-6 text-muted-foreground">{agent.role}</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Analyzes
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {agent.analyzes.map((source) => (
              <Badge key={source} variant="outline" className="font-normal">
                {source}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Example questions
          </div>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-foreground">
            {agent.questions.map((question) => (
              <li key={question} className="flex gap-2">
                <Sparkles className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span>{question}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

function AskExecutiveTeam({
  query,
  selectedRoute,
  previewAgent,
  response,
  responseAgent,
  onQueryChange,
  onSelectedRouteChange,
  onSubmit,
}: {
  query: string;
  selectedRoute: AgentRoute | "auto";
  previewAgent: ExecutiveAgent;
  response: RoutedResponse | null;
  responseAgent: ExecutiveAgent;
  onQueryChange: (value: string) => void;
  onSelectedRouteChange: (value: AgentRoute | "auto") => void;
  onSubmit: () => void;
}) {
  const ResponseIcon = responseAgent.icon;

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <div className="space-y-5">
        <SectionIntro
          eyebrow="Ask the executive team"
          title="Route a leadership question"
          description="Mocked for now. The selector and query classifier are ready to become the frontend contract for live assistant routing."
        />

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="executive-query" className="sr-only">
              Executive intelligence question
            </label>
            <Textarea
              id="executive-query"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Ask about leadership attention, risk, WIP, project blockers, recent decisions, or SOP opportunities."
              className="min-h-32 resize-none"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Select
              value={selectedRoute}
              onValueChange={(value) => onSelectedRouteChange(value as AgentRoute | "auto")}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Auto route" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto route by query</SelectItem>
                {EXECUTIVE_AGENTS.map((agent) => (
                  <SelectItem key={agent.route} value={agent.route}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button type="button" className="h-11 gap-2" onClick={onSubmit} disabled={!query.trim()}>
              <Send className="h-4 w-4" />
              Ask team
            </Button>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Suggested prompts
            </div>
            <div className="flex flex-wrap gap-2">
              {EXECUTIVE_PROMPTS.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto min-h-9 whitespace-normal text-left"
                  onClick={() => onQueryChange(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-background p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Response preview
            </div>
            <div className="mt-2 text-lg font-semibold text-foreground">
              {response ? responseAgent.name : "Ready to route"}
            </div>
          </div>
          <Badge variant="outline" className="shrink-0">
            {selectedRoute === "auto" ? `Auto: ${previewAgent.shortName}` : previewAgent.shortName}
          </Badge>
        </div>

        <div className="mt-6 space-y-5">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
              <ResponseIcon className={cn("h-5 w-5", responseAgent.accentClassName)} />
            </span>
            <div className="min-w-0 space-y-2">
              <p className="text-sm font-medium text-foreground">
                {response?.query ?? "Enter a question to preview the routed specialist mode."}
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                {RESPONSE_PREVIEWS[responseAgent.route]}
              </p>
            </div>
          </div>

          <div className="divide-y rounded-md bg-muted/30">
            <PreviewRow label="Current backend shape" value="Single orchestrator with specialist modes" />
            <PreviewRow label="Route key" value={responseAgent.route} />
            <PreviewRow label="Integration status" value="Mock UI, backend-ready contract" />
          </div>
        </div>
      </div>
    </section>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[11rem_minmax(0,1fr)]">
      <div className="font-medium text-muted-foreground">{label}</div>
      <div className="min-w-0 break-words text-foreground">{value}</div>
    </div>
  );
}

function LeadershipAlerts() {
  return (
    <section className="space-y-5">
      <SectionIntro
        eyebrow="Leadership alerts"
        title="Proactive signals before they become surprises"
        description="Placeholder alerts model the future executive brief feed across risk, finance, project health, operations, and opportunity detection."
      />

      <div className="divide-y border-y">
        {LEADERSHIP_ALERTS.map((alert) => (
          <div key={alert.title} className="grid gap-4 py-5 lg:grid-cols-[12rem_minmax(0,1fr)_10rem]">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              {alert.category}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">{alert.title}</div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{alert.detail}</p>
            </div>
            <div className="flex items-center justify-between gap-3 lg:block lg:text-right">
              <Badge variant="outline">{alert.severity}</Badge>
              <div className="mt-0 text-xs text-muted-foreground lg:mt-2">{alert.owner}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CompanyBrainActivity() {
  return (
    <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <div>
        <SectionIntro
          eyebrow="Company brain activity"
          title="Recent intelligence processing"
          description="Mock activity shows how meetings, decisions, risks, tasks, and opportunities will surface once connected to the live knowledge tables."
        />
      </div>

      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {COMPANY_BRAIN_ACTIVITY.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-lg bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </div>
                  <div className="text-xl font-semibold text-foreground">{item.value}</div>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.detail}</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border bg-background p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Activity className="h-4 w-4" />
            Prepared integration points
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {FUTURE_DATA_SOURCES.map((source) => (
              <Badge key={source} variant="outline" className="font-mono text-xs font-normal">
                {source}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl space-y-2">
      <SectionRuleHeading label={eyebrow} className="mb-0 pb-0" />
      <div className="text-2xl font-semibold tracking-normal text-foreground">{title}</div>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
