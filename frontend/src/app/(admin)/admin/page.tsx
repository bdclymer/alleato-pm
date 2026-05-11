"use client";

import Link from "next/link";
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
  Palette,
  PanelTop,
  Route,
  Sparkles,
  Table2,
  Terminal,
  UserCog,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { SectionHeader } from "@/components/ds";
import { PageShell } from "@/components/layout";
import { cn } from "@/lib/utils";

type AdminMenuItem = {
  label: string;
  href?: string;
  route: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
};

type AdminMenuSection = {
  title: string;
  description: string;
  items: AdminMenuItem[];
};

const sections: AdminMenuSection[] = [
  {
    title: "Administrative Pages",
    description: "Operator controls, user access, feedback queues, runtime errors, and internal release surfaces.",
    items: [
      {
        label: "Command Center",
        href: "/command-center",
        route: "/command-center",
        description: "Admin-level project overview and quick action workspace.",
        icon: LayoutDashboard,
      },
      {
        label: "Actions",
        href: "/actions",
        route: "/actions",
        description: "Manual triggers for administrative jobs, sends, and repair actions.",
        icon: Wrench,
      },
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
        label: "Company Info",
        href: "/admin/company-info",
        route: "/admin/company-info",
        description: "Company profile and administrative settings.",
        icon: Building2,
      },
      {
        label: "Admin Roadmap",
        href: "/admin/roadmap",
        route: "/admin/roadmap",
        description: "Roadmap items, internal priorities, and product planning.",
        icon: ListChecks,
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
        label: "Annotation Inbox",
        href: "/annotation-inbox",
        route: "/annotation-inbox",
        description: "Agentation annotation queue and response workflow.",
        icon: Inbox,
      },
      {
        label: "Runtime Errors",
        href: "/errors",
        route: "/errors",
        description: "Grouped app errors, review state, and Linear escalation.",
        icon: AlertTriangle,
      },
      {
        label: "Admin Check",
        href: "/admin-check",
        route: "/admin-check",
        description: "Verify current user admin access and profile state.",
        icon: CheckCircle2,
      },
      {
        label: "Updates",
        href: "/updates",
        route: "/updates",
        description: "Release notes, product updates, and changelog entries.",
        icon: FileText,
      },
      {
        label: "Site Map",
        href: "/site-map",
        route: "/site-map",
        description: "Route inventory, page audit state, and page notes.",
        icon: MapIcon,
      },
    ],
  },
  {
    title: "Intelligence Pages",
    description: "AI health, source attribution, project intelligence, learning loops, and executive-facing intelligence tools.",
    items: [
      {
        label: "Executive Intelligence",
        href: "/executive-intelligence",
        route: "/executive-intelligence",
        description: "Executive AI workspace for strategy, risk, finance, and operations questions.",
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
      {
        label: "AI Assistant",
        href: "/ai-assistant",
        route: "/ai-assistant",
        description: "AI Strategist chat and native action interface.",
        icon: Brain,
      },
      {
        label: "AI System Health",
        href: "/ai-system-health",
        route: "/ai-system-health",
        description: "Conversations, tokens, spend, satisfaction, model mix, and self-learning loop on one screen.",
        icon: LineChart,
      },
      {
        label: "AI Compiler Health",
        href: "/intelligence-compiler",
        route: "/intelligence-compiler",
        description: "Compiler queues, packet status, evidence, and health checks.",
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
        label: "Project Attribution",
        href: "/project-attribution",
        route: "/project-attribution",
        description: "Review unmatched source documents and approve project attribution.",
        icon: FileSearch,
      },
      {
        label: "Document Metadata",
        href: "/document-metadata",
        route: "/document-metadata",
        description: "Document metadata review and source inspection.",
        icon: FileText,
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
        href: "/ai-learning-promotions",
        route: "/ai-learning-promotions",
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
    ],
  },
  {
    title: "Database And Table Pages",
    description: "Database catalog, table explorers, generated table pages, API documentation, and schema-adjacent utilities.",
    items: [
      {
        label: "Database Catalog",
        href: "/database",
        route: "/database",
        description: "Catalog of public schema tables and table metadata.",
        icon: Database,
      },
      {
        label: "Tables Directory",
        href: "/tables-directory",
        route: "/tables-directory",
        description: "Directory of known table-backed product surfaces.",
        icon: Table2,
      },
      {
        label: "Admin Table Explorer",
        href: "/table-pages",
        route: "/table-pages",
        description: "Browse configured admin table pages.",
        icon: Table2,
      },
      {
        label: "Table Explorer Detail",
        route: "/table-pages/[table]",
        description: "Dynamic route for a specific table explorer.",
        icon: Table2,
        badge: "Dynamic",
      },
      {
        label: "Table V2",
        href: "/table-v2",
        route: "/table-v2",
        description: "Experimental table surface.",
        icon: Table2,
      },
      {
        label: "Projects Table Demo",
        href: "/projects-table-demo",
        route: "/projects-table-demo",
        description: "Projects table demo and table-pattern reference.",
        icon: Table2,
      },
      {
        label: "Spreadsheet Demo",
        href: "/spreadsheet-demo",
        route: "/spreadsheet-demo",
        description: "Spreadsheet-style data interaction demo.",
        icon: Table2,
      },
      {
        label: "Table Generator",
        href: "/dev/table-generator",
        route: "/dev/table-generator",
        description: "Generate table pages from schema metadata.",
        icon: Code2,
      },
      {
        label: "API Docs",
        href: "/api-docs",
        route: "/api-docs",
        description: "Interactive backend API documentation.",
        icon: Terminal,
      },
      {
        label: "Redoc",
        href: "/redoc",
        route: "/redoc",
        description: "Alternate API documentation reader.",
        icon: BookOpen,
      },
    ],
  },
  {
    title: "Accounting And Sync",
    description: "Accounting dashboards, WIP reporting, invoice/payment pages, and Acumatica sync evidence.",
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
        label: "Checks",
        href: "/accounting/checks",
        route: "/accounting/checks",
        description: "Check register and payment review.",
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
        label: "Acumatica Sync Logs",
        href: "/acumatica-sync-logs",
        route: "/acumatica-sync-logs",
        description: "Created, updated, skipped, and failed export audit trail.",
        icon: ArrowLeftRight,
      },
    ],
  },
  {
    title: "Testing And Verification",
    description: "QA dashboards, test matrices, browser-run history, cases, and PRP status.",
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
    ],
  },
  {
    title: "Procore Resources",
    description: "Procore tool tracking, crawled support pages, and parity documentation.",
    items: [
      {
        label: "Tools",
        href: "/tools",
        route: "/tools",
        description: "Alleato tool inventory organized by category.",
        icon: Wrench,
      },
      {
        label: "Procore Tools",
        href: "/procore-tools",
        route: "/procore-tools",
        description: "Procore tool inventory and implementation status.",
        icon: HardHat,
      },
      {
        label: "Procore Tracker",
        href: "/procore-tracker",
        route: "/procore-tracker",
        description: "Feature tracking against Procore capabilities.",
        icon: ListChecks,
      },
      {
        label: "Procore Docs",
        href: "/procore-docs",
        route: "/procore-docs",
        description: "Internal Procore docs browser.",
        icon: BookOpen,
      },
      {
        label: "Support Articles",
        href: "/support-articles",
        route: "/support-articles",
        description: "Crawled support article index.",
        icon: FileText,
      },
      {
        label: "Crawled Pages",
        href: "/crawled-pages",
        route: "/crawled-pages",
        description: "Raw crawled-page review and diagnostics.",
        icon: FileSearch,
      },
    ],
  },
  {
    title: "Design And Internal Docs",
    description: "Design-system inspection, internal documentation, and page templates.",
    items: [
      {
        label: "Design",
        href: "/design",
        route: "/design",
        description: "Live component gallery and design-system examples.",
        icon: Palette,
      },
      {
        label: "Design System",
        href: "/design-system",
        route: "/design-system",
        description: "Design-system reference surface.",
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
      {
        label: "Motion",
        href: "/motion",
        route: "/motion",
        description: "Animation and transition examples.",
        icon: Activity,
      },
      {
        label: "Docs",
        href: "/docs",
        route: "/docs",
        description: "Internal project documentation browser.",
        icon: BookOpen,
      },
      {
        label: "Form Standard",
        href: "/template/form-standard",
        route: "/template/form-standard",
        description: "Reference standard form layout.",
        icon: FileText,
      },
      {
        label: "Form Template",
        href: "/template/form-template",
        route: "/template/form-template",
        description: "Form template reference page.",
        icon: FileText,
      },
    ],
  },
];

const totalPages = sections.reduce((total, section) => total + section.items.length, 0);

function MenuItemRow({ item }: { item: AdminMenuItem }) {
  const Icon = item.icon;

  const content = (
    <>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-xs font-medium text-foreground">{item.label}</span>
          {item.badge ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {item.badge}
            </span>
          ) : null}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{item.description}</p>
        <code className="block truncate text-[11px] text-muted-foreground/80">{item.route}</code>
      </div>
    </>
  );

  const className =
    "group flex min-h-16 gap-3 px-1 py-3 sm:px-2";

  if (!item.href) {
    return <div className={cn(className, "cursor-default")}>{content}</div>;
  }

  return (
    <Link href={item.href} target="_blank" rel="noreferrer" className={className}>
      {content}
    </Link>
  );
}

export default function AdminDashboardPage() {
  return (
    <PageShell
      variant="dashboard"
      title="Admin Dashboard"
      description={`Directory for ${totalPages} admin, intelligence, database, testing, Procore, and internal documentation pages.`}
    >
      <div className="grid gap-10 lg:grid-cols-2 2xl:grid-cols-3">
        {sections.map((section) => (
          <section key={section.title} className="min-w-0 space-y-3">
            <SectionHeader title={section.title} count={section.items.length} />
            <div className="divide-y divide-border/60">
              {section.items.map((item) => (
                <MenuItemRow key={`${section.title}-${item.route}`} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
