import {
  ProjectTool,
  RecentActivity,
  ProjectInfo,
  QuickAction,
  ProjectTeamMember,
  ProjectOverviewItem,
  MyOpenItem,
} from "@/types/project-home";

export const projectTools: ProjectTool[] = [
  // Core Tools
  {
    id: "home",
    name: "Home",
    description: "Project overview and dashboard",
    icon: "Home",
    href: "/projects/[projectId]/home",
    category: "core",
    isConfigured: true,
  },
  {
    id: "directory",
    name: "Directory",
    description: "Project contacts and team members",
    icon: "Users",
    href: "/projects/[projectId]/directory",
    category: "core",
    itemCount: 24,
    isConfigured: true,
  },
  {
    id: "documents",
    name: "Documents",
    description: "Project files and documents",
    icon: "FileText",
    href: "/projects/[projectId]/documents",
    category: "core",
    itemCount: 156,
    isConfigured: true,
  },
  {
    id: "photos",
    name: "Photos",
    description: "Project photos and albums",
    icon: "Image",
    href: "/projects/[projectId]/photos",
    category: "core",
    itemCount: 342,
    isConfigured: true,
  },
  // Project Management
  {
    id: "rfis",
    name: "RFIs",
    description: "Requests for Information",
    icon: "HelpCircle",
    href: "/projects/[projectId]/rfis",
    category: "project-management",
    itemCount: 12,
    isConfigured: true,
  },
  {
    id: "submittals",
    name: "Submittals",
    description: "Material and shop drawing submittals",
    icon: "ClipboardCheck",
    href: "/projects/[projectId]/submittals",
    category: "project-management",
    itemCount: 45,
    isConfigured: true,
  },
  {
    id: "daily-log",
    name: "Daily Log",
    description: "Daily site reports and logs",
    icon: "Calendar",
    href: "/projects/[projectId]/daily-log",
    category: "project-management",
    isConfigured: true,
  },
  {
    id: "meetings",
    name: "Meetings",
    description: "Meeting minutes and agendas",
    icon: "Users2",
    href: "/projects/[projectId]/meetings",
    category: "project-management",
    itemCount: 8,
    isConfigured: true,
  },
  {
    id: "schedule",
    name: "Schedule",
    description: "Project schedule and milestones",
    icon: "CalendarDays",
    href: "/projects/[projectId]/schedule",
    category: "project-management",
    isConfigured: true,
  },
  // Financial Management
  {
    id: "budget",
    name: "Budget",
    description: "Project budget and cost tracking",
    icon: "DollarSign",
    href: "/projects/[projectId]/budget",
    category: "financial-management",
    isConfigured: true,
  },
  {
    id: "commitments",
    name: "Commitments",
    description: "Subcontracts and purchase orders",
    icon: "FileSignature",
    href: "/projects/[projectId]/commitments",
    category: "financial-management",
    itemCount: 18,
    isConfigured: true,
  },
  {
    id: "prime-contracts",
    name: "Prime Contracts",
    description: "Owner contracts",
    icon: "Handshake",
    href: "/projects/[projectId]/prime-contracts",
    category: "financial-management",
    itemCount: 1,
    isConfigured: true,
  },
  {
    id: "invoicing",
    name: "Invoicing",
    description: "Payment applications and invoices",
    icon: "Receipt",
    href: "/projects/[projectId]/invoicing",
    category: "financial-management",
    itemCount: 6,
    isConfigured: true,
  },
  {
    id: "change-orders",
    name: "Change Orders",
    description: "Budget and contract changes",
    icon: "FileEdit",
    href: "/projects/[projectId]/change-orders",
    category: "financial-management",
    itemCount: 4,
    isConfigured: true,
  },
];

export const quickActions: QuickAction[] = [
  {
    id: "create-rfi",
    label: "Create RFI",
    icon: "Plus",
    href: "/projects/[projectId]/rfis/new",
  },
  {
    id: "add-daily-log",
    label: "Add Daily Log",
    icon: "Calendar",
    href: "/projects/[projectId]/daily-log/new",
  },
  {
    id: "upload-document",
    label: "Upload Document",
    icon: "Upload",
    href: "/projects/[projectId]/documents/upload",
  },
  {
    id: "add-photo",
    label: "Add Photo",
    icon: "Camera",
    href: "/projects/[projectId]/photos/upload",
  },
];

// Recent activity - empty placeholder, will be populated from database
// Note: Previously contained demo data with names "John Smith" and "Maria Garcia"
// Should be fetched from activity/audit log in production
export const recentActivity: RecentActivity[] = [];

// Default project info (placeholder)
export const defaultProjectInfo: ProjectInfo = {
  id: "1",
  name: "Project Name",
  projectNumber: "00-000",
  address: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  status: "Active",
  stage: "In Progress",
  type: "General",
  startDate: new Date(),
  estimatedCompletionDate: new Date(),
  projectValue: 0,
  owner: "",
  architect: "",
  generalContractor: "",
};

// Project Team placeholder
export const projectTeam: ProjectTeamMember[] = [];

// Project Overview placeholder
export const projectOverview: ProjectOverviewItem[] = [
  {
    id: "schedule",
    name: "Schedule",
    overdue: 0,
    nextSevenDays: 0,
    moreThanSevenDays: 0,
    totalOpen: 0,
    link: "/projects/[projectId]/schedule",
  },
  {
    id: "punch-list",
    name: "Punch List",
    overdue: 0,
    nextSevenDays: 0,
    moreThanSevenDays: 0,
    totalOpen: 0,
    link: "/projects/[projectId]/punch-list",
  },
  {
    id: "meetings",
    name: "Meetings",
    overdue: 0,
    nextSevenDays: 0,
    moreThanSevenDays: 0,
    totalOpen: 0,
    link: "/projects/[projectId]/meetings",
  },
];

// My Open Items placeholder
export const myOpenItems: MyOpenItem[] = [];

// Helper to get tools by category
export function getToolsByCategory(
  category: ProjectTool["category"],
): ProjectTool[] {
  return projectTools.filter((tool) => tool.category === category);
}
