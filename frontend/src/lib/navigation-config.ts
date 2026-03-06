// Shared navigation configuration for site header and sidebar
// This ensures consistency between different navigation components

import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  Users,
  Clock,
  CheckCircle,
  MessageCircle,
  Package,
  Mail,
  Camera,
  FileImage,
  FileText,
  FolderOpen,
  TrendingUp,
  Hammer,
  DollarSign,
  Settings,
  Shield,
  Table,
  Home,
  Briefcase,
  Bot,
} from "lucide-react";
import { hasModulePermission } from "@/hooks/use-project-permissions";

export type PermissionModule =
  | "directory"
  | "budget"
  | "contracts"
  | "documents"
  | "schedule"
  | "submittals"
  | "rfis"
  | "change_orders";

export interface NavigationTool {
  name: string;
  path: string;
  requiresProject?: boolean;
  isFavorite?: boolean;
  /** Permission module required to see this tool. If omitted, always visible. */
  module?: PermissionModule;
  /** Minimum permission level required. Defaults to "read". */
  requiredPermission?: "read" | "write" | "admin";
  /** If true, only visible to app admins or developers. */
  adminOnly?: boolean;
}

// Extended type for header navigation with icons and descriptions
export interface HeaderNavigationTool extends NavigationTool {
  icon?: LucideIcon;
  description?: string;
}

// Sub-grouping within a mega menu panel
export interface HeaderSubGroup {
  label: string;
  toolNames: string[];
  columns?: 1 | 2;
}

// A navigation group in the header (Planning, Finance, Company)
export interface HeaderNavGroup {
  id: string;
  label: string;
  tools: HeaderNavigationTool[];
  subGroups?: HeaderSubGroup[];
}

export const coreTools: NavigationTool[] = [
  { name: "Projects", path: "", requiresProject: false },
  { name: "Company Directory", path: "directory/companies", requiresProject: false, module: "directory" },
  { name: "Home", path: "home", requiresProject: true },
  { name: "360 Reporting", path: "reporting", requiresProject: true, adminOnly: true },
  { name: "Documents", path: "documents", requiresProject: true, module: "documents" },
  { name: "Directory", path: "directory", requiresProject: true, module: "directory" },
  { name: "Tables Directory", path: "tables-directory", requiresProject: false, adminOnly: true },
  { name: "Settings", path: "settings/plugins", requiresProject: false, adminOnly: true },
  { name: "Admin", path: "admin", requiresProject: true, adminOnly: true },
];

export const projectManagementTools: NavigationTool[] = [
  { name: "Emails", path: "emails", requiresProject: true, module: "documents" },
  { name: "RFIs", path: "rfis", requiresProject: true, module: "rfis" },
  { name: "Submittals", path: "submittals", requiresProject: true, module: "submittals" },
  { name: "Transmittals", path: "transmittals", requiresProject: true, module: "documents" },
  { name: "Punch List", path: "punch-list", requiresProject: true },
  { name: "Meetings", path: "meetings", requiresProject: true },
  { name: "Schedule", path: "schedule", requiresProject: true, module: "schedule" },
  { name: "Daily Log", path: "daily-log", requiresProject: true },
  { name: "Photos", path: "photos", requiresProject: true, module: "documents" },
  { name: "Drawings", path: "drawings", requiresProject: true, module: "documents" },
  { name: "Specifications", path: "specifications", requiresProject: true, module: "documents" },
];

export const financialManagementTools: NavigationTool[] = [
  { name: "Prime Contracts", path: "prime-contracts", requiresProject: true, module: "contracts" },
  { name: "Budget", path: "budget", requiresProject: true, module: "budget" },
  { name: "Commitments", path: "commitments", requiresProject: true, module: "contracts" },
  { name: "Change Orders", path: "change-orders", requiresProject: true, module: "change_orders" },
  { name: "Change Events", path: "change-events", requiresProject: true, module: "change_orders" },
  { name: "Direct Costs", path: "direct-costs", requiresProject: true, module: "budget" },
  { name: "Invoicing", path: "invoices", requiresProject: true, module: "contracts" },
];

export const adminTools: NavigationTool[] = [
  {
    name: "Settings",
    path: "/settings",
    requiresProject: false,
  },
  {
    name: "AI Assistant",
    path: "/ai-assistant",
    requiresProject: false,
  },
  {
    name: "Docs Chat",
    path: "/docs",
    requiresProject: false,
  },
  {
    name: "Document Pipeline",
    path: "/admin/documents/pipeline",
    requiresProject: false,
    adminOnly: true,
  },
  {
    name: "Company Knowledge",
    path: "/admin/company-knowledge",
    requiresProject: false,
    adminOnly: true,
  },
];

// Helper function to build project-scoped URLs
export const buildToolUrl = (
  toolPath: string,
  projectId: number | null,
  requiresProject: boolean = true
): string => {
  if (requiresProject && projectId) {
    return `/${projectId}/${toolPath}`;
  }
  return `/${toolPath}`;
};

// Helper function to check if a path is currently active
export const isActivePath = (
  pathname: string,
  toolPath: string
): boolean => {
  const segments = pathname?.split("/").filter(Boolean) ?? [];
  if (segments.length >= 2 && /^\d+$/.test(segments[0])) {
    return segments[1] === toolPath.split("/")[0];
  }
  return segments[0] === toolPath.split("/")[0];
};

// Helper to extract project ID from pathname
export const extractProjectId = (pathname: string): number | null => {
  const segments = pathname?.split("/").filter(Boolean) ?? [];
  const firstSegment = segments[0];
  if (firstSegment && /^\d+$/.test(firstSegment)) {
    return parseInt(firstSegment);
  }
  return null;
};

// Shared permission filtering for navigation tools
export function filterToolsByPermission<T extends NavigationTool>(
  tools: T[],
  projectId: number | null,
  permissions: Record<string, string[]>,
  isAppAdmin: boolean,
  userType: string | null
): T[] {
  return tools.filter((tool) => {
    // Hide project-scoped tools when no project selected
    if (tool.requiresProject && !projectId) return false;
    // Admin-only tools: only for app admins or developers
    if (tool.adminOnly && !isAppAdmin && userType !== "developer") return false;
    // Module-gated tools: check user has required permission
    if (tool.module && projectId) {
      return hasModulePermission(
        permissions,
        tool.module,
        tool.requiredPermission || "read"
      );
    }
    return true;
  });
}

// =============================================================================
// HEADER NAVIGATION GROUPS (for top navigation mega menus)
// =============================================================================

export const headerNavGroups: HeaderNavGroup[] = [
  {
    id: "finance",
    label: "Financial",
    tools: [
      {
        name: "Budget",
        path: "budget",
        requiresProject: true,
        icon: TrendingUp,
        description: "Project budget management",
        module: "budget",
      },
      {
        name: "Prime Contracts",
        path: "prime-contracts",
        requiresProject: true,
        icon: FileText,
        description: "Main project contracts",
        module: "contracts",
      },
      {
        name: "Commitments",
        path: "commitments",
        requiresProject: true,
        icon: Hammer,
        description: "Subcontracts and POs",
        module: "contracts",
      },
      {
        name: "Change Orders",
        path: "change-orders",
        requiresProject: true,
        icon: FileText,
        description: "Contract modifications",
        module: "change_orders",
      },
      {
        name: "Change Events",
        path: "change-events",
        requiresProject: true,
        icon: Clock,
        description: "Potential change tracking",
        module: "change_orders",
      },
      {
        name: "Direct Costs",
        path: "direct-costs",
        requiresProject: true,
        icon: DollarSign,
        description: "Labor and material costs",
        module: "budget",
      },
      {
        name: "Invoicing",
        path: "invoices",
        requiresProject: true,
        icon: FileText,
        description: "Billing and payments",
        module: "contracts",
      },
    ],
    subGroups: [
      { label: "Budgeting", toolNames: ["Budget", "Direct Costs"] },
      {
        label: "Contracts",
        toolNames: ["Prime Contracts", "Commitments", "Invoicing"],
      },
      { label: "Changes", toolNames: ["Change Orders", "Change Events"] },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    tools: [
      {
        name: "Schedule",
        path: "schedule",
        requiresProject: true,
        icon: Calendar,
        description: "Project timeline and milestones",
        module: "schedule",
      },
      {
        name: "Meetings",
        path: "meetings",
        requiresProject: true,
        icon: Users,
        description: "Meeting minutes and schedules",
      },
      {
        name: "Daily Log",
        path: "daily-log",
        requiresProject: true,
        icon: Clock,
        description: "Daily progress tracking",
      },
      {
        name: "Punch List",
        path: "punch-list",
        requiresProject: true,
        icon: CheckCircle,
        description: "Track completion items",
      },
      {
        name: "RFIs",
        path: "rfis",
        requiresProject: true,
        icon: MessageCircle,
        description: "Requests for Information",
        module: "rfis",
      },
      {
        name: "Submittals",
        path: "submittals",
        requiresProject: true,
        icon: Package,
        description: "Material and shop drawings",
        module: "submittals",
      },
      {
        name: "Transmittals",
        path: "transmittals",
        requiresProject: true,
        icon: Mail,
        description: "Document transmittals",
        module: "documents",
      },
      {
        name: "Emails",
        path: "emails",
        requiresProject: true,
        icon: Mail,
        description: "Email correspondence",
        module: "documents",
      },
      {
        name: "Photos",
        path: "photos",
        requiresProject: true,
        icon: Camera,
        description: "Project photo documentation",
        module: "documents",
      },
      {
        name: "Drawings",
        path: "drawings",
        requiresProject: true,
        icon: FileImage,
        description: "Blueprints and technical drawings",
        module: "documents",
      },
      {
        name: "Specifications",
        path: "specifications",
        requiresProject: true,
        icon: FileText,
        description: "Project specifications",
        module: "documents",
      },
      {
        name: "Documents",
        path: "documents",
        requiresProject: true,
        icon: FolderOpen,
        description: "Project files and documents",
        module: "documents",
      },
    ],
    subGroups: [
      {
        label: "Scheduling",
        toolNames: ["Schedule", "Meetings", "Daily Log", "Punch List"],
      },
      {
        label: "Correspondence",
        toolNames: ["RFIs", "Submittals", "Transmittals", "Emails"],
      },
      {
        label: "Documents",
        toolNames: ["Photos", "Drawings", "Specifications", "Documents"],
      },
    ],
  },
  {
    id: "company",
    label: "Company",
    tools: [
      {
        name: "Projects",
        path: "",
        requiresProject: false,
        icon: Briefcase,
        description: "All projects",
      },
      {
        name: "Company Directory",
        path: "directory/companies",
        requiresProject: false,
        icon: Users,
        description: "People, companies, contacts",
        module: "directory",
      },
      {
        name: "360 Reporting",
        path: "reporting",
        requiresProject: false,
        icon: TrendingUp,
        description: "Company-wide analytics",
        adminOnly: true,
      },
      {
        name: "AI Strategist",
        path: "ai-assistant",
        requiresProject: false,
        icon: Bot,
        description: "AI-powered project guidance",
      },
    ],
  },
];

// Admin/Settings tools (shown in gear icon dropdown)
export const adminSettingsTools: HeaderNavigationTool[] = [
  {
    name: "Settings",
    path: "settings/plugins",
    requiresProject: false,
    icon: Settings,
    description: "App configuration",
    adminOnly: true,
  },
  {
    name: "Admin Panel",
    path: "admin",
    requiresProject: true,
    icon: Shield,
    description: "Project administration",
    adminOnly: true,
  },
  {
    name: "Tables Directory",
    path: "tables-directory",
    requiresProject: false,
    icon: Table,
    description: "Database tables",
    adminOnly: true,
  },
  {
    name: "Document Pipeline",
    path: "/admin/documents/pipeline",
    requiresProject: false,
    icon: FolderOpen,
    description: "Document workflows",
    adminOnly: true,
  },
];

// Helper to find which header group contains the active tool
export function getActiveGroupId(
  toolPath: string,
  groups: HeaderNavGroup[]
): string | null {
  for (const group of groups) {
    const match = group.tools.find(
      (tool) => tool.path === toolPath || toolPath.startsWith(tool.path + "/")
    );
    if (match) return group.id;
  }
  return null;
}
