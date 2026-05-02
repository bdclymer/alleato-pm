"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  IconBook,
  IconBriefcase,
  IconBuildingBank,
  IconCalendar,
  IconChartBar,
  IconCheckbox,
  IconClipboardList,
  IconCoin,
  IconFileDescription,
  IconFileInvoice,
  IconFileText,
  IconFolders,
  IconHome,
  IconMail,
  IconMessageChatbot,
  IconPencil,
  IconPhoto,
  IconQuestionMark,
  IconReportMoney,
  IconSend,
  IconSettings,
  IconShieldCheck,
  IconTable,
  IconUsers,
  IconWorldWww,
} from "@tabler/icons-react";

import { NavDocuments } from "@/components/nav/nav-documents";
import { NavSecondary } from "@/components/nav/nav-secondary";
import { NavUser } from "@/components/nav/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

// Tool configurations matching site-header.tsx
const coreTools = [
  { name: "Home", path: "home", icon: IconHome, requiresProject: true },
  { name: "Client Dashboard", path: "client-dashboard", icon: IconChartBar, requiresProject: true, clientOnly: true },
  { name: "360 Reporting", path: "reporting", icon: IconChartBar, requiresProject: true },
  { name: "Documents", path: "documents", icon: IconFolders, requiresProject: true },
  { name: "Directory", path: "directory", icon: IconUsers, requiresProject: true },
  { name: "Settings", path: "settings", icon: IconSettings, requiresProject: false },
  { name: "Tasks", path: "tasks", icon: IconCheckbox, requiresProject: true },
];

const projectManagementTools = [
  { name: "Emails", path: "emails", icon: IconMail, requiresProject: true },
  { name: "Outlook Emails", path: "outlook-emails", icon: IconMail, requiresProject: true },
  { name: "RFIs", path: "rfis", icon: IconQuestionMark, requiresProject: true },
  { name: "Submittals", path: "submittals", icon: IconSend, requiresProject: true },
  { name: "Transmittals", path: "transmittals", icon: IconFileText, requiresProject: true },
  { name: "Punch List", path: "punch-list", icon: IconClipboardList, requiresProject: true },
  { name: "Meetings", path: "meetings", icon: IconCalendar, requiresProject: true },
  { name: "Schedule", path: "schedule", icon: IconCalendar, requiresProject: true },
  { name: "Daily Log", path: "daily-log", icon: IconBook, requiresProject: true },
  { name: "Photos", path: "photos", icon: IconPhoto, requiresProject: true },
  { name: "Drawings", path: "drawings", icon: IconPencil, requiresProject: true },
  { name: "Specifications", path: "specifications", icon: IconFileDescription, requiresProject: true },
];

const financialManagementTools = [
  { name: "Prime Contracts", path: "contracts", icon: IconFileDescription, requiresProject: true },
{ name: "Budget", path: "budget", icon: IconReportMoney, requiresProject: true },
  { name: "Commitments", path: "commitments", icon: IconBriefcase, requiresProject: true },
  { name: "Change Orders", path: "change-orders", icon: IconFileInvoice, requiresProject: true },
  { name: "Prime PCOs", path: "prime-contract-pcos", icon: IconFileInvoice, requiresProject: true },
  { name: "Commitment PCOs", path: "commitment-pcos", icon: IconFileInvoice, requiresProject: true },
  { name: "Change Events", path: "change-events", icon: IconCoin, requiresProject: true },
  { name: "Direct Costs", path: "direct-costs", icon: IconBuildingBank, requiresProject: true },
  { name: "Invoicing", path: "invoices", icon: IconBuildingBank, requiresProject: true },
];

const adminTools = [
  { name: "All Project Documents", path: "/project-documents", icon: IconFolders, requiresProject: false },
  { name: "Financial Insights", path: "/financial-insights", icon: IconShieldCheck, requiresProject: false },
  { name: "Executive", path: "/executive", icon: IconChartBar, requiresProject: false },
  { name: "Spreadsheet", path: "/spreadsheet-demo", icon: IconTable, requiresProject: false },
  { name: "Crawled Pages", path: "/crawled-pages", icon: IconWorldWww, requiresProject: false },
  { name: "AI Strategist", path: "/ai-assistant", icon: IconMessageChatbot, requiresProject: false },
  { name: "Documentation", path: "/docs", icon: IconBook, requiresProject: false },
  { name: "FM Global", path: "/fm-global", icon: IconTable, requiresProject: false },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const params = useParams();
  const projectId = params?.projectId as string | undefined;

  // Helper to build URLs - project-scoped for requiresProject tools
  const buildUrl = (path: string, requiresProject: boolean) => {
    if (requiresProject && projectId) {
      return `/${projectId}/${path}`;
    }
    // If path already starts with /, use it directly
    if (path.startsWith("/")) {
      return path;
    }
    return `/${path}`;
  };

  // Transform tools to nav format
  const coreNavItems = coreTools.map((tool) => ({
    name: tool.name,
    url: buildUrl(tool.path, tool.requiresProject),
    icon: tool.icon,
    disabled: tool.requiresProject && !projectId,
  }));

  const projectManagementNavItems = projectManagementTools.map((tool) => ({
    name: tool.name,
    url: buildUrl(tool.path, tool.requiresProject),
    icon: tool.icon,
    disabled: tool.requiresProject && !projectId,
  }));

  const financialNavItems = financialManagementTools.map((tool) => ({
    name: tool.name,
    url: buildUrl(tool.path, tool.requiresProject),
    icon: tool.icon,
    disabled: tool.requiresProject && !projectId,
  }));

  const adminNavItems = adminTools.map((tool) => ({
    title: tool.name,
    url: buildUrl(tool.path, tool.requiresProject),
    icon: tool.icon,
  }));

  return (
    <Sidebar
      collapsible="icon"
      variant={props.variant}
      side={props.side}
      className="bg-background text-foreground"
      data-testid="app-sidebar-with-icon-collapsible"
    >
      <SidebarHeader className="py-2 px-4">
        <Link href="/" className="flex items-center">
          <Image
            src="/Alleato Favicon.png"
            alt="Alleato"
            width={24}
            height={24}
            priority
            className="object-contain w-6 h-6 transition-all"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-4">
        <NavDocuments items={coreNavItems} label="Core Tools" />
        <NavDocuments items={projectManagementNavItems} label="Project Management" />
        <NavDocuments items={financialNavItems} label="Financial Management" />
        <NavSecondary items={adminNavItems} label="Admin" className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
