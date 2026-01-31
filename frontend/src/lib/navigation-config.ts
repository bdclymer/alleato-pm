// Shared navigation configuration for site header and sidebar
// This ensures consistency between different navigation components

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

export const coreTools: NavigationTool[] = [
  { name: "Projects", path: "", requiresProject: false },
  { name: "Company Directory", path: "directory/companies", requiresProject: false, module: "directory" },
  { name: "Home", path: "home", requiresProject: true },
  { name: "360 Reporting", path: "reporting", requiresProject: true, adminOnly: true },
  { name: "Documents", path: "documents", requiresProject: true, module: "documents" },
  { name: "Directory", path: "directory", requiresProject: true, module: "directory" },
  { name: "Tables Directory", path: "tables-directory", requiresProject: false, adminOnly: true },
  { name: "Settings", path: "settings/plugins", requiresProject: false, adminOnly: true },
  { name: "Tasks", path: "tasks", requiresProject: true },
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
  { name: "Budget V2", path: "budget-v2", requiresProject: true, module: "budget" },
  { name: "Commitments", path: "commitments", requiresProject: true, module: "contracts" },
  { name: "Change Orders", path: "change-orders", requiresProject: true, module: "change_orders" },
  { name: "Change Events", path: "change-events", requiresProject: true, module: "change_orders" },
  { name: "Direct Costs", path: "direct-costs", requiresProject: true, module: "budget" },
  { name: "Invoicing", path: "invoices", requiresProject: true, module: "contracts" },
];

export const adminTools: NavigationTool[] = [
  {
    name: "Document Pipeline",
    path: "/admin/documents/pipeline",
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