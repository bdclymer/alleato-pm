"use client";

import Link from "next/link";

import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Building2,
  Component,
  Database,
  FileText,
  FlaskConical,
  HardHat,
  Inbox,
  LayoutDashboard,
  MapIcon,
  Newspaper,
  Palette,
  Settings,
  Sparkles,
  Table2,
  Terminal,
  type LucideIcon,
} from "lucide-react";

import { SectionHeader } from "@/components/ds";
import { PageShell } from "@/components/layout";

// ── Section data ────────────────────────────────────────────────────────────

interface AdminLink {
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
}

interface AdminSection {
  title: string;
  links: AdminLink[];
}

const sections: AdminSection[] = [
  {
    title: "Admin",
    links: [
      {
        label: "Command Center",
        href: "/command-center",
        description: "Project overview and quick actions",
        icon: LayoutDashboard,
      },
      {
        label: "Feedback Inbox",
        href: "/feedback-inbox",
        description: "Client feedback and issue triage",
        icon: Inbox,
      },
      {
        label: "Annotation Inbox",
        href: "/annotation-inbox",
        description: "Agentation annotation queue and replies",
        icon: Inbox,
      },
      {
        label: "Company Info",
        href: "/admin/company-info",
        description: "Company profile and settings",
        icon: Building2,
      },
      {
        label: "Updates",
        href: "/updates",
        description: "Release notes and changelogs",
        icon: Newspaper,
      },
      {
        label: "Site Map",
        href: "/site-map",
        description: "All routes and page audit status",
        icon: MapIcon,
      },
      {
        label: "Acumatica Sync Logs",
        href: "/acumatica-sync-logs",
        description: "Created/updated/skipped/error export audit trail",
        icon: ArrowLeftRight,
      },
    ],
  },
  {
    title: "Procore Resources",
    links: [
      {
        label: "Procore Tools",
        href: "/procore-tools",
        description: "Tool inventory and sync status",
        icon: HardHat,
      },
      {
        label: "Procore Docs",
        href: "/procore-docs",
        description: "API documentation browser",
        icon: BookOpen,
      },
    ],
  },
  {
    title: "Design",
    links: [
      {
        label: "Design",
        href: "/design",
        description: "Live component gallery",
        icon: Component,
      },
      {
        label: "Design System",
        href: "/design-system-update",
        description: "System overview and updates",
        icon: Palette,
      },
      {
        label: "Design Violations",
        href: "/design-violations",
        description: "Flagged UI issues to fix",
        icon: AlertTriangle,
      },
      {
        label: "Design Ideas",
        href: "/design-ideas",
        description: "Experimental explorations",
        icon: Sparkles,
      },
      {
        label: "Motion",
        href: "/motion",
        description: "Animation and transition patterns",
        icon: FlaskConical,
      },
    ],
  },
  {
    title: "Development",
    links: [
      {
        label: "API Docs",
        href: "/api-docs",
        description: "Interactive Swagger documentation",
        icon: Terminal,
      },
      {
        label: "Redoc",
        href: "/redoc",
        description: "Alternative API docs format",
        icon: FileText,
      },
      {
        label: "Database Explorer",
        href: "/database",
        description: "Browse and query Supabase tables",
        icon: Database,
      },
      {
        label: "RAG Eval",
        href: "/rag-eval",
        description: "RAG pipeline evaluation",
        icon: BarChart3,
      },
      {
        label: "Docs",
        href: "/docs",
        description: "Internal project documentation",
        icon: BookOpen,
      },
    ],
  },
  {
    title: "Templates & Demos",
    links: [
      {
        label: "Data Table Template",
        href: "/template/data-table",
        description: "Reference table implementation",
        icon: Table2,
      },
      {
        label: "Form Template",
        href: "/template/form-standard",
        description: "Reference form implementation",
        icon: FileText,
      },
      {
        label: "Table Generator",
        href: "/dev/table-generator",
        description: "Auto-generate pages from schema",
        icon: Settings,
      },
    ],
  },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  return (
    <PageShell variant="dashboard" title="Admin Dashboard">
      {sections.map((section) => (
        <section key={section.title}>
          <SectionHeader title={section.title} count={section.links.length} />

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {section.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group rounded-lg bg-muted/40 px-4 py-4 transition-all hover:bg-muted"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground transition-colors group-hover:text-foreground">
                    <link.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {link.label}
                  </span>
                </div>
                <p className="mt-2 pl-11 text-xs leading-relaxed text-muted-foreground">
                  {link.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </PageShell>
  );
}
