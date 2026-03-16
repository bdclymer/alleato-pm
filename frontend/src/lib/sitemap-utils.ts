export interface SitemapRoute {
  url: string;
  title: string;
  category: string;
}

export const staticRoutes: SitemapRoute[] = [
  // Main
  { url: "/", title: "Portfolio", category: "Main" },
  { url: "/pipeline", title: "Pipeline", category: "Main" },
  { url: "/create-project", title: "Create Project", category: "Main" },
  { url: "/knowledge", title: "Knowledge Base", category: "Main" },
  { url: "/updates", title: "Updates", category: "Main" },

  // Project — Financial
  { url: "/[projectId]/home", title: "Project Home", category: "Project — Financial" },
  { url: "/[projectId]/budget", title: "Budget", category: "Project — Financial" },
  { url: "/[projectId]/prime-contracts", title: "Prime Contracts", category: "Project — Financial" },
  { url: "/[projectId]/prime-contracts/new", title: "New Prime Contract", category: "Project — Financial" },
  { url: "/[projectId]/commitments", title: "Commitments", category: "Project — Financial" },
  { url: "/[projectId]/commitments/new", title: "New Commitment", category: "Project — Financial" },
  { url: "/[projectId]/change-events", title: "Change Events", category: "Project — Financial" },
  { url: "/[projectId]/change-events/new", title: "New Change Event", category: "Project — Financial" },
  { url: "/[projectId]/change-orders", title: "Change Orders", category: "Project — Financial" },
  { url: "/[projectId]/change-orders/new", title: "New Change Order", category: "Project — Financial" },
  { url: "/[projectId]/direct-costs", title: "Direct Costs", category: "Project — Financial" },
  { url: "/[projectId]/direct-costs/new", title: "New Direct Cost", category: "Project — Financial" },
  { url: "/[projectId]/invoicing", title: "Invoicing", category: "Project — Financial" },
  { url: "/[projectId]/invoicing/new", title: "New Invoice", category: "Project — Financial" },
  { url: "/[projectId]/estimates", title: "Estimates", category: "Project — Financial" },
  { url: "/[projectId]/sov", title: "Schedule of Values", category: "Project — Financial" },
  { url: "/[projectId]/reporting", title: "Reporting", category: "Project — Financial" },

  // Project — Field
  { url: "/[projectId]/schedule", title: "Schedule", category: "Project — Field" },
  { url: "/[projectId]/rfis", title: "RFIs", category: "Project — Field" },
  { url: "/[projectId]/rfis/new", title: "New RFI", category: "Project — Field" },
  { url: "/[projectId]/submittals", title: "Submittals", category: "Project — Field" },
  { url: "/[projectId]/drawings", title: "Drawings", category: "Project — Field" },
  { url: "/[projectId]/punch-list", title: "Punch List", category: "Project — Field" },
  { url: "/[projectId]/meetings", title: "Meetings", category: "Project — Field" },
  { url: "/[projectId]/documents", title: "Documents", category: "Project — Field" },
  { url: "/[projectId]/photos", title: "Photos", category: "Project — Field" },
  { url: "/[projectId]/daily-log", title: "Daily Log", category: "Project — Field" },
  { url: "/[projectId]/specifications", title: "Specifications", category: "Project — Field" },
  { url: "/[projectId]/transmittals", title: "Transmittals", category: "Project — Field" },

  // Project — Admin
  { url: "/[projectId]/directory/team", title: "Directory — Team", category: "Project — Admin" },
  { url: "/[projectId]/directory/vendors", title: "Directory — Vendors", category: "Project — Admin" },
  { url: "/[projectId]/directory/members", title: "Directory — Members", category: "Project — Admin" },
  { url: "/[projectId]/directory/groups", title: "Directory — Distribution Groups", category: "Project — Admin" },
  { url: "/[projectId]/setup", title: "Project Setup", category: "Project — Admin" },
  { url: "/[projectId]/admin", title: "Project Admin", category: "Project — Admin" },

  // Directory
  { url: "/directory/companies", title: "Companies", category: "Directory" },
  { url: "/directory/clients", title: "Clients", category: "Directory" },
  { url: "/directory/contacts", title: "Contacts", category: "Directory" },
  { url: "/directory/vendors", title: "Vendors", category: "Directory" },
  { url: "/directory/employees", title: "Employees", category: "Directory" },
  { url: "/directory/users", title: "Users", category: "Directory" },
  { url: "/directory/prospects", title: "Prospects", category: "Directory" },
  { url: "/directory/groups", title: "Distribution Groups", category: "Directory" },

  // Settings
  { url: "/settings", title: "Settings", category: "Settings" },
  { url: "/settings/account", title: "Account", category: "Settings" },
  { url: "/settings/members", title: "Members", category: "Settings" },
  { url: "/settings/integrations", title: "Integrations", category: "Settings" },
  { url: "/settings/security", title: "Security", category: "Settings" },
  { url: "/settings/preferences", title: "Preferences", category: "Settings" },
  { url: "/settings/audit", title: "Audit Log", category: "Settings" },

  // Admin
  { url: "/admin/ai-observability", title: "AI Observability", category: "Admin" },
  { url: "/admin/company-knowledge", title: "Company Knowledge", category: "Admin" },

  // AI
  { url: "/ai-assistant", title: "AI Assistant", category: "AI" },
  { url: "/rag", title: "RAG Chat", category: "AI" },

  // Auth
  { url: "/auth/login", title: "Login", category: "Auth" },
  { url: "/auth/sign-up", title: "Sign Up", category: "Auth" },
  { url: "/auth/forgot-password", title: "Forgot Password", category: "Auth" },

  // Utility
  { url: "/sitemap-view", title: "Sitemap", category: "Utility" },
  { url: "/design-system", title: "Design System", category: "Utility" },
  { url: "/api-docs", title: "API Docs", category: "Utility" },
  { url: "/style-guide", title: "Style Guide", category: "Utility" },
];

export function getRoutesByCategory(): Record<string, SitemapRoute[]> {
  const categorized: Record<string, SitemapRoute[]> = {};
  for (const route of staticRoutes) {
    if (!categorized[route.category]) categorized[route.category] = [];
    categorized[route.category].push(route);
  }
  return categorized;
}

export function searchRoutes(query: string): SitemapRoute[] {
  const q = query.toLowerCase();
  return staticRoutes.filter(
    (r) =>
      r.title.toLowerCase().includes(q) ||
      r.url.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q),
  );
}

// Keep for XML sitemap compatibility
export function getAllRoutesFlat(): SitemapRoute[] {
  return staticRoutes;
}
