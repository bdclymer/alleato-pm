"use client";

import {

  Activity,

  AlertTriangle,

  ArrowLeftRight,

  BarChart3,

  BookOpen,

  Brain,

  BrainCircuit,

  Building2,

  CheckCircle2,

  ClipboardCheck,

  Code2,

  Database,

  FileSearch,

  FileText,

  FlaskConical,

  HardHat,

  Inbox,

  LayoutDashboard,

  LineChart,

  ListChecks,

  MapIcon,


  Eye,

  Palette,

  PanelTop,

  Route,

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
import { ProductBoardClient } from "@/features/product-board/product-board-client";

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
    title: "Operations",
    description: "Day-to-day platform operations, planning, feedback queues, manual actions, and releases.",
    groups: [
      {
        title: "Operations",
        items: [
          {
            label: "Command Center",
            href: "/command-center",
            route: "/command-center",
            description: "Admin-level project overview and quick action workspace.",
            icon: LayoutDashboard,
          },
          {
            label: "Product Board",
            href: "/product-board",
            route: "/product-board",
            description: "Product ideas, status, and planning board.",
            icon: PanelTop,
          },
          {
            label: "Feedback Inbox",
            href: "/feedback-inbox",
            route: "/feedback-inbox",
            description: "Client feedback, issues, comments, and triage assignments.",
            icon: Inbox,
          },
          {
            label: "Learning & Feedback",
            href: "/learning-feedback",
            route: "/learning-feedback",
            description: "AI learning review queue, feedback coverage, and the triage pipeline in one place.",
            icon: Brain,
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
            description: "Manual triggers for administrative jobs, sends, and repair actions.",
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
            description: "Release notes, product updates, and changelog entries.",
            icon: FileText,
          },
        ],
      },
    ],
  },
  {
    title: "Access & Settings",
    description: "People, permissions, company configuration, route access, and admin verification.",
    groups: [
      {
        title: "Access & Settings",
        items: [
          {
            label: "User Management",
            href: "/user-management",
            route: "/user-management",
            description: "Invite users, grant access, and review company-wide permissions.",
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
    title: "AI Workspaces",
    description: "The surfaces where people actually use the assistant and its output.",
    groups: [
      {
        title: "AI Workspaces",
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
            description: "Project-scoped intelligence page; open it from a specific project.",
            icon: BrainCircuit,
            badge: "Project scoped",
          },
        ],
      },
    ],
  },
  {
    title: "AI Observability",
    description: "Monitor what the assistant is doing — conversations, runs, prompts, and outputs.",
    groups: [
      {
        title: "AI Observability",
        items: [
          {
            label: "AI System Health",
            href: "/ai-system-health",
            route: "/ai-system-health",
            description: "Conversations, tokens, spend, satisfaction, model mix, and self-learning loop on one screen.",
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
            description: "Inspect assembled assistant system prompts, context blocks, and prompt size before model calls.",
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
        ],
      },
    ],
  },
  {
    title: "AI Quality & Learning",
    description: "Evaluate answer quality and review the feedback that trains the assistant.",
    groups: [
      {
        title: "AI Quality & Learning",
        items: [
          {
            label: "Assistant Eval Runs",
            href: "/eval-runs",
            route: "/eval-runs",
            description: "Assistant evaluation runs and scored results.",
            icon: FlaskConical,
          },
          {
            label: "RAG Eval",
            href: "/rag-eval",
            route: "/rag-eval",
            description: "Evaluate retrieval quality and answer grounding.",
            icon: BarChart3,
          },
          {
            label: "AI Learning Promotions",
            href: "/ai/learning-promotions",
            route: "/ai/learning-promotions",
            description: "Approve retrieval-learning candidates and monitor promotion history.",
            icon: Sparkles,
          },
          {
            label: "Task Training",
            href: "/task-training",
            route: "/task-training",
            description: "Review task feedback examples that train extraction behavior.",
            icon: ClipboardCheck,
          },
          {
            label: "Outlook Draft Feedback",
            href: "/outlook-draft-feedback",
            route: "/outlook-draft-feedback",
            description: "Review feedback on AI-generated Outlook email drafts.",
            icon: Inbox,
          },
        ],
      },
    ],
  },
  {
    title: "AI Configuration & Docs",
    description: "Agent and skill setup, plus architecture and roadmap reference.",
    groups: [
      {
        title: "AI Configuration & Docs",
        items: [
          {
            label: "AI Agents",
            href: "/ai/admin/agents",
            route: "/ai/admin/agents",
            description: "Registered AI agents, their tools, and configuration.",
            icon: BrainCircuit,
          },
          {
            label: "AI Skills Admin",
            href: "/ai/admin/skills",
            route: "/ai/admin/skills",
            description: "Review approved, candidate, and retired Skill Library records.",
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
            description: "Architecture overview of data sources, models, tools, and learning.",
            icon: BookOpen,
          },
        ],
      },
    ],
  },
  {
    title: "RAG Pipeline",
    description: "The RAG ingestion pipeline that feeds the assistant — health, sync, metadata, and attribution.",
    groups: [
      {
        title: "Knowledge Pipeline",
        items: [
          {
            label: "RAG Health",
            href: "/rag",
            route: "/rag",
            description: "Pipeline stage funnel, document status, and source-sync alerts on one screen.",
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
            description: "Source ingestion freshness, sync runs, and recompute controls.",
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
            description: "Review unmatched source documents and approve project attribution.",
            icon: FileSearch,
          },
        ],
      },
    ],
  },
  {
    title: "Accounting",
    description: "Accounting dashboards, financial workflows, and external accounting sync.",
    groups: [
      {
        title: "Accounting",
        items: [
          {
            label: "Accounting",
            href: "/accounting",
            route: "/accounting",
            description: "Accounting dashboard and financial operations entry point.",
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
            description: "Standard-operating-procedure backlog and processing queue.",
            icon: ListChecks,
          },
          {
            label: "Acumatica Sync Logs",
            href: "/acumatica-sync-logs",
            route: "/acumatica-sync-logs",
            description: "Created, updated, skipped, and failed export audit trail.",
            icon: ArrowLeftRight,
          },
        ],
      },
    ],
  },
  {
    title: "Database & APIs",
    description: "Database catalog, table explorers, generated table pages, audit log, and API documentation.",
    groups: [
      {
        title: "Database & APIs",
        items: [
          {
            label: "Database Inventory",
            href: "/database-inventory",
            route: "/database-inventory",
            description: "Full MAIN + RAG table inventory with purpose, gotchas, owners, and live counts.",
            icon: Database,
            badge: "Developer",
          },
          {
            label: "Tables Directory",
            href: "/tables-directory",
            route: "/tables-directory",
            description: "Directory of known table-backed product surfaces.",
            icon: Table2,
            badge: "Developer",
          },
          {
            label: "DB Audit Log",
            href: "/db-audit-log",
            route: "/db-audit-log",
            description: "Database write audit trail and change history.",
            icon: Database,
            badge: "Developer",
          },
          {
            label: "Projects Table Demo",
            href: "/projects-table-demo",
            route: "/projects-table-demo",
            description: "Projects table demo and table-pattern reference.",
            icon: Table2,
            badge: "Developer",
          },
          {
            label: "Table Generator",
            href: "/dev/table-generator",
            route: "/dev/table-generator",
            description: "Generate table pages from schema metadata.",
            icon: Code2,
            badge: "Developer",
          },
          {
            label: "API Docs",
            href: "/api-docs",
            route: "/api-docs",
            description: "Interactive backend API documentation.",
            icon: Terminal,
            badge: "Developer",
          },
          {
            label: "Redoc",
            href: "/redoc",
            route: "/redoc",
            description: "Alternate API documentation reader.",
            icon: BookOpen,
            badge: "Developer",
          },
        ],
      },
    ],
  },
  {
    title: "QA & Testing",
    description: "Quality dashboards, test matrices, run history, cases, PRP status, and runtime errors.",
    groups: [
      {
        title: "QA & Testing",
        items: [
          {
            label: "Testing",
            href: "/testing",
            route: "/testing",
            description: "Main testing dashboard.",
            icon: FlaskConical,
          },
          {
            label: "Testing Runs",
            href: "/testing/runs",
            route: "/testing/runs",
            description: "Run history and verification artifacts.",
            icon: Activity,
          },
          {
            label: "Testing Parity",
            href: "/testing/parity",
            route: "/testing/parity",
            description: "Parity coverage tracking.",
            icon: CheckCircle2,
          },
          {
            label: "Test Matrix",
            href: "/test-matrix",
            route: "/test-matrix",
            description: "Feature and workflow coverage matrix.",
            icon: ListChecks,
          },
          {
            label: "Test Cases",
            href: "/test-cases",
            route: "/test-cases",
            description: "Test case catalog and tool mapping.",
            icon: ClipboardCheck,
          },
          {
            label: "PRP Status",
            href: "/prp-status",
            route: "/prp-status",
            description: "PRP pipeline and implementation status.",
            icon: Route,
          },
          {
            label: "Runtime Errors",
            href: "/errors",
            route: "/errors",
            description: "Grouped app errors, review state, and Linear escalation.",
            icon: AlertTriangle,
          },
        ],
      },
    ],
  },
  {
    title: "Product Resources",
    description: "Construction references, tool tracking, and crawled support documentation.",
    groups: [
      {
        title: "Product Resources",
        items: [
          {
            label: "Tools",
            href: "/tools",
            route: "/tools",
            description: "Alleato tool inventory organized by category.",
            icon: Wrench,
          },
          {
            label: "PC Tools",
            href: "/procore-tools",
            route: "/procore-tools",
            description: "PC tool inventory and implementation status.",
            icon: HardHat,
          },
          {
            label: "PC Docs",
            href: "/procore-docs",
            route: "/procore-docs",
            description: "Internal PC docs browser.",
            icon: BookOpen,
          },
          {
            label: "Support Articles",
            href: "/support-articles",
            route: "/support-articles",
            description: "Crawled support article index.",
            icon: FileText,
          },
        ],
      },
    ],
  },
  {
    title: "Design System",
    description: "Design-system inspection, migration notes, UI drift, and experimental explorations.",
    groups: [
      {
        title: "Design System",
        items: [
          {
            label: "Design",
            href: "/design",
            route: "/design",
            description: "Live component gallery and design-system examples.",
            icon: Palette,
          },
          {
            label: "Design System Update",
            href: "/design-system-update",
            route: "/design-system-update",
            description: "Design-system update and migration notes.",
            icon: Palette,
          },
          {
            label: "Design Violations",
            href: "/design-violations",
            route: "/design-violations",
            description: "Flagged UI issues and design drift.",
            icon: AlertTriangle,
          },
          {
            label: "Design Ideas",
            href: "/design-ideas",
            route: "/design-ideas",
            description: "Experimental design explorations.",
            icon: Sparkles,
          },
        ],
      },
    ],
  },
];


const totalPages = sections.reduce(

  (total, section) => total + section.groups.reduce((sectionTotal, group) => sectionTotal + group.items.length, 0),

  0,

);

export default function AdminDashboardPage() {

  return (

    <PageShell

      variant="dashboard"

      title="Admin Dashboard"

      description={`Directory of ${totalPages} internal pages across operations, access, AI, accounting, database, QA, and design.`}

    >

      <Tabs defaultValue="directory" className="gap-6">
        <TabsList variant="line">
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="product-board">Product Board</TabsTrigger>
        </TabsList>
        <TabsContent value="directory" className="m-0">
          <AdminDirectoryView sections={sections} />
        </TabsContent>
        <TabsContent value="product-board" className="m-0">
          <ProductBoardClient />
        </TabsContent>
      </Tabs>

    </PageShell>

  );

}
