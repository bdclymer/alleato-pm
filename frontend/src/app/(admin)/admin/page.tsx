"use client";

import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Brain,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileSearch,
  FileText,
  FlaskConical,
  Inbox,
  LayoutDashboard,
  LineChart,
  ListChecks,
  MapIcon,
  PanelTop,
  Shield,
  Sparkles,
  Table2,
  Terminal,
  UserCog,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { PageShell } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AdminKanbanView } from "./admin-kanban-view";
import { AdminDirectoryView } from "./admin-directory-view";

type AdminMenuItem = {
  label: string;

  href?: string;

  route: string;

  description: string;

  icon: LucideIcon;

  badge?: string;
};

type AdminMenuGroup = {
  title: string;

  description?: string;

  items: AdminMenuItem[];
};

type AdminMenuSection = {
  title: string;

  description: string;

  groups: AdminMenuGroup[];
};

const sections: AdminMenuSection[] = [
  {
    title: "AI Feedback and Learning",
    description:
      "Review queues and training surfaces that improve the assistant over time.",
    groups: [
      {
        title: "AI Feedback and Learning",
        items: [
          {
            label: "Feedback Inbox",
            href: "/feedback-inbox",
            route: "/feedback-inbox",
            description:
              "Client feedback, issues, comments, and triage assignments.",
            icon: Inbox,
          },
          {
            label: "Learning & Feedback",
            href: "/learning-feedback",
            route: "/learning-feedback",
            description:
              "AI learning review queue, feedback coverage, and the triage pipeline in one place.",
            icon: Brain,
          },
          {
            label: "Task Training",
            href: "/task-training",
            route: "/task-training",
            description:
              "Review task feedback examples that train extraction behavior.",
            icon: ClipboardCheck,
          },
          {
            label: "Outlook Draft Feedback",
            href: "/outlook-draft-feedback",
            route: "/outlook-draft-feedback",
            description:
              "Review feedback on AI-generated Outlook email drafts.",
            icon: Inbox,
          },
          {
            label: "AI Learning Promotions",
            href: "/ai/learning-promotions",
            route: "/ai/learning-promotions",
            description:
              "Approve retrieval-learning candidates and monitor promotion history.",
            icon: Sparkles,
          },
        ],
      },
    ],
  },
  {
    title: "Planning",
    description:
      "Command center, feedback triage, product planning, and agent annotation queue.",
    groups: [
      {
        title: "Planning",
        items: [
          {
            label: "Command Center",
            href: "/command-center",
            route: "/command-center",
            description:
              "Admin-level project overview and quick action workspace.",
            icon: LayoutDashboard,
          },
          {
            label: "Feedback Inbox",
            href: "/feedback-inbox",
            route: "/feedback-inbox",
            description:
              "Client feedback, issues, comments, and triage assignments.",
            icon: Inbox,
          },
          {
            label: "Product Board",
            href: "/product-board",
            route: "/product-board",
            description: "Product ideas, status, and planning board.",
            icon: PanelTop,
          },
          {
            label: "Annotation Inbox",
            href: "/annotation-inbox",
            route: "/annotation-inbox",
            description: "Agent annotation queue and response workflow.",
            icon: Inbox,
          },
          {
            label: "Actions",
            href: "/actions",
            route: "/actions",
            description:
              "Manual triggers for administrative jobs, sends, and repair actions.",
            icon: Wrench,
          },
          {
            label: "Operations Readiness",
            href: "/operations-readiness",
            route: "/operations-readiness",
            description: "Operational readiness checks and go-live status.",
            icon: ClipboardCheck,
          },
          {
            label: "Platform Analytics",
            href: "/analytics",
            route: "/analytics",
            description: "Platform-wide usage and engagement analytics.",
            icon: BarChart3,
          },
          {
            label: "Updates",
            href: "/updates",
            route: "/updates",
            description:
              "Release notes, product updates, and changelog entries.",
            icon: FileText,
          },
        ],
      },
    ],
  },
  {
    title: "AI Stats",
    description:
      "Monitor what the assistant is doing — conversations, runs, evaluations, and outputs.",
    groups: [
      {
        title: "AI Stats",
        items: [
          {
            label: "AI System Health",
            href: "/ai-system-health",
            route: "/ai-system-health",
            description:
              "Conversations, tokens, spend, satisfaction, model mix, and self-learning loop on one screen.",
            icon: LineChart,
          },
          {
            label: "AI Work Runs",
            href: "/ai-work-runs",
            route: "/ai-work-runs",
            description: "Background AI job runs, status, and output.",
            icon: Activity,
          },
          {
            label: "AI Prompt Diagnostics",
            href: "/ai-prompt-diagnostics",
            route: "/ai-prompt-diagnostics",
            description:
              "Inspect assembled assistant system prompts, context blocks, and prompt size before model calls.",
            icon: Terminal,
          },
          {
            label: "Intelligence Packets",
            href: "/intelligence-packets",
            route: "/intelligence-packets",
            description: "Compiled project intelligence packets and versions.",
            icon: BrainCircuit,
          },
          {
            label: "Deep Research Archive",
            href: "/deep-research",
            route: "/deep-research",
            description: "Archived deep-research reports and runs.",
            icon: FileSearch,
          },
          {
            label: "Assistant Eval Runs",
            href: "/eval-runs",
            route: "/eval-runs",
            description: "Assistant evaluation runs and scored results.",
            icon: FlaskConical,
          },
        ],
      },
    ],
  },
  {
    title: "Access and Settings",
    description:
      "People, permissions, company configuration, route access, and admin verification.",
    groups: [
      {
        title: "Access and Settings",
        items: [
          {
            label: "User Management",
            href: "/user-management",
            route: "/user-management",
            description:
              "Invite users, grant access, and review company-wide permissions.",
            icon: Users,
          },
          {
            label: "Permissions",
            href: "/permissions",
            route: "/permissions",
            description: "Permission templates and access configuration.",
            icon: UserCog,
          },
          {
            label: "Page Access",
            href: "/site-map",
            route: "/site-map",
            description: "View every page and set route access levels.",
            icon: MapIcon,
          },
          {
            label: "Company Info",
            href: "/admin/company-info",
            route: "/admin/company-info",
            description: "Company profile and administrative settings.",
            icon: Building2,
          },
          {
            label: "Admin Check",
            href: "/admin-check",
            route: "/admin-check",
            description: "Verify current user admin access and profile state.",
            icon: CheckCircle2,
          },
        ],
      },
    ],
  },
  {
    title: "AI Features",
    description:
      "The surfaces where people use the assistant, plus agent and skill configuration.",
    groups: [
      {
        title: "AI Features",
        items: [
          {
            label: "AI",
            href: "/ai",
            route: "/ai",
            description: "AI Strategist chat and native action interface.",
            icon: Brain,
          },
          {
            label: "Executive",
            href: "/executive",
            route: "/executive",
            description: "Executive-facing operating view.",
            icon: LineChart,
          },
          {
            label: "Project Intelligence",
            route: "/[projectId]/intelligence",
            description:
              "Project-scoped intelligence page; open it from a specific project.",
            icon: BrainCircuit,
            badge: "Project scoped",
          },
          {
            label: "AI Agents",
            href: "/ai/admin/agents",
            route: "/ai/admin/agents",
            description:
              "Registered AI agents, their tools, and configuration.",
            icon: BrainCircuit,
          },
          {
            label: "AI Skills Admin",
            href: "/ai/admin/skills",
            route: "/ai/admin/skills",
            description:
              "Review approved, candidate, and retired Skill Library records.",
            icon: Shield,
          },
          {
            label: "AI Vision & Roadmap",
            href: "/ai-vision",
            route: "/ai-vision",
            description: "AI product vision, roadmap, and agent roster.",
            icon: Eye,
          },
          {
            label: "How the AI Works",
            href: "/docs/ai-overview",
            route: "/docs/ai-overview",
            description:
              "Architecture overview of data sources, models, tools, and learning.",
            icon: BookOpen,
          },
          {
            label: "Training Docs",
            href: "/training-docs",
            route: "/training-docs",
            description: "Draft and publish reviewed workflow manuals.",
            icon: BookOpen,
          },
        ],
      },
    ],
  },
  {
    title: "RAG Pipeline",
    description:
      "The RAG ingestion pipeline that feeds the assistant — health, sync, evaluation, metadata, and attribution.",
    groups: [
      {
        title: "RAG Pipeline",
        items: [
          {
            label: "RAG Health",
            href: "/rag",
            route: "/rag",
            description:
              "Pipeline stage funnel, document status, and source-sync alerts on one screen.",
            icon: Activity,
          },
          {
            label: "Pipeline Health",
            href: "/pipeline-health",
            route: "/pipeline-health",
            description: "Ingestion and embedding pipeline health map.",
            icon: Activity,
          },
          {
            label: "Source Sync",
            href: "/source-sync",
            route: "/source-sync",
            description:
              "Source ingestion freshness, sync runs, and recompute controls.",
            icon: ArrowLeftRight,
          },
          {
            label: "Document Metadata",
            href: "/document-metadata",
            route: "/document-metadata",
            description: "Document metadata review and source inspection.",
            icon: FileText,
          },
          {
            label: "Project Attribution",
            href: "/project-attribution",
            route: "/project-attribution",
            description:
              "Review unmatched source documents and approve project attribution.",
            icon: FileSearch,
          },
          {
            label: "RAG Eval",
            href: "/rag-eval",
            route: "/rag-eval",
            description: "Evaluate retrieval quality and answer grounding.",
            icon: BarChart3,
          },
        ],
      },
    ],
  },
  {
    title: "Accounting",
    description:
      "Accounting dashboards, financial workflows, and external accounting sync.",
    groups: [
      {
        title: "Accounting",
        items: [
          {
            label: "Accounting",
            href: "/accounting",
            route: "/accounting",
            description:
              "Accounting dashboard and financial operations entry point.",
            icon: BarChart3,
          },
          {
            label: "WIP",
            href: "/accounting/wip",
            route: "/accounting/wip",
            description: "Work-in-progress accounting report.",
            icon: LineChart,
          },
          {
            label: "Accounting Projects",
            href: "/accounting/projects",
            route: "/accounting/projects",
            description: "Project accounting table.",
            icon: Table2,
          },
          {
            label: "Finance Spend",
            href: "/accounting/finance-spend",
            route: "/accounting/finance-spend",
            description: "Spend analysis across projects and cost categories.",
            icon: LineChart,
          },
          {
            label: "Invoices",
            href: "/accounting/invoices",
            route: "/accounting/invoices",
            description: "Accounting invoice list.",
            icon: FileText,
          },
          {
            label: "Bills",
            href: "/accounting/bills",
            route: "/accounting/bills",
            description: "Bill records and accounting review.",
            icon: FileText,
          },
          {
            label: "AP Invoices",
            href: "/accounting/ap-invoices",
            route: "/accounting/ap-invoices",
            description: "Accounts payable invoices.",
            icon: FileText,
          },
          {
            label: "AP Payments",
            href: "/accounting/ap-payments",
            route: "/accounting/ap-payments",
            description: "Accounts payable payment records.",
            icon: FileText,
          },
          {
            label: "Payments",
            href: "/accounting/payments",
            route: "/accounting/payments",
            description: "Payment records and accounting reconciliation.",
            icon: FileText,
          },
          {
            label: "Checks",
            href: "/accounting/checks",
            route: "/accounting/checks",
            description: "Check register and payment review.",
            icon: FileText,
          },
          {
            label: "Reconciliation",
            href: "/accounting/reconciliation",
            route: "/accounting/reconciliation",
            description: "Reconcile accounting records against synced sources.",
            icon: ArrowLeftRight,
          },
          {
            label: "SOP Backlog",
            href: "/accounting/sop-backlog",
            route: "/accounting/sop-backlog",
            description:
              "Standard-operating-procedure backlog and processing queue.",
            icon: ListChecks,
          },
          {
            label: "Acumatica Sync Logs",
            href: "/acumatica-sync-logs",
            route: "/acumatica-sync-logs",
            description:
              "Created, updated, skipped, and failed export audit trail.",
            icon: ArrowLeftRight,
          },
        ],
      },
    ],
  },
];

const totalPages = sections.reduce(
  (total, section) =>
    total +
    section.groups.reduce(
      (sectionTotal, group) => sectionTotal + group.items.length,
      0,
    ),

  0,
);

export default function AdminDashboardPage() {
  return (
    <PageShell
      variant="dashboard"
      title="Admin Dashboard"
      description={`Directory of ${totalPages} internal pages across planning, AI, access, accounting, and the RAG pipeline.`}
    >
      <Tabs defaultValue="directory" className="gap-6">
        <TabsList variant="line">
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
        </TabsList>
        <TabsContent value="directory" className="m-0">
          <AdminDirectoryView sections={sections} />
        </TabsContent>
        <TabsContent value="kanban" className="m-0">
          <AdminKanbanView sections={sections} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
