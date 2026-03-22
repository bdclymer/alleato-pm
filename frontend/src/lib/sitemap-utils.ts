export interface SitemapRoute {
  url: string;
  title: string;
  category: string;
  type: "list" | "form" | "detail" | "settings" | "dashboard" | "auth" | "admin" | "utility" | "chat";
  dynamic: boolean;
}

export const staticRoutes: SitemapRoute[] = [
  // ── Main ──────────────────────────────────────────────
  { url: "/", title: "Portfolio", category: "Main", type: "dashboard", dynamic: false },
  { url: "/pipeline", title: "Pipeline", category: "Main", type: "list", dynamic: false },
  { url: "/projects", title: "Projects", category: "Main", type: "list", dynamic: false },
  { url: "/create-project", title: "Create Project", category: "Main", type: "form", dynamic: false },
  { url: "/knowledge", title: "Knowledge Base", category: "Main", type: "dashboard", dynamic: false },
  { url: "/updates", title: "Updates", category: "Main", type: "list", dynamic: false },
  { url: "/financial-insights", title: "Financial Insights", category: "Main", type: "dashboard", dynamic: false },
  { url: "/stats", title: "Stats", category: "Main", type: "dashboard", dynamic: false },
  { url: "/billing-periods", title: "Billing Periods", category: "Main", type: "list", dynamic: false },

  // ── Project — Financial ───────────────────────────────
  { url: "/[projectId]/home", title: "Project Home", category: "Project — Financial", type: "dashboard", dynamic: true },
  { url: "/[projectId]/budget", title: "Budget", category: "Project — Financial", type: "list", dynamic: true },
  { url: "/[projectId]/budget/setup", title: "Budget Setup", category: "Project — Financial", type: "settings", dynamic: true },
  { url: "/[projectId]/budget/line-item/new", title: "New Budget Line Item", category: "Project — Financial", type: "form", dynamic: true },
  { url: "/[projectId]/prime-contracts", title: "Prime Contracts", category: "Project — Financial", type: "list", dynamic: true },
  { url: "/[projectId]/prime-contracts/new", title: "New Prime Contract", category: "Project — Financial", type: "form", dynamic: true },
  { url: "/[projectId]/prime-contracts/configure", title: "Prime Contracts Config", category: "Project — Financial", type: "settings", dynamic: true },
  { url: "/[projectId]/prime-contracts/[contractId]/edit", title: "Edit Prime Contract", category: "Project — Financial", type: "form", dynamic: true },
  { url: "/[projectId]/commitments", title: "Commitments", category: "Project — Financial", type: "list", dynamic: true },
  { url: "/[projectId]/commitments/new", title: "New Commitment", category: "Project — Financial", type: "form", dynamic: true },
  { url: "/[projectId]/commitments/configure", title: "Commitments Config", category: "Project — Financial", type: "settings", dynamic: true },
  { url: "/[projectId]/commitments/[commitmentId]/edit", title: "Edit Commitment", category: "Project — Financial", type: "form", dynamic: true },
  { url: "/[projectId]/commitments/recycle-bin", title: "Commitments Recycle Bin", category: "Project — Financial", type: "list", dynamic: true },
  { url: "/[projectId]/change-events", title: "Change Events", category: "Project — Financial", type: "list", dynamic: true },
  { url: "/[projectId]/change-events/new2", title: "New Change Event", category: "Project — Financial", type: "form", dynamic: true },
  { url: "/[projectId]/change-events/[changeEventId]/edit", title: "Edit Change Event", category: "Project — Financial", type: "form", dynamic: true },
  { url: "/[projectId]/change-orders", title: "Change Orders", category: "Project — Financial", type: "list", dynamic: true },
  { url: "/[projectId]/change-orders/new", title: "New Change Order", category: "Project — Financial", type: "form", dynamic: true },
  { url: "/[projectId]/change-orders/[changeOrderId]/edit", title: "Edit Change Order", category: "Project — Financial", type: "form", dynamic: true },
  { url: "/[projectId]/direct-costs", title: "Direct Costs", category: "Project — Financial", type: "list", dynamic: true },
  { url: "/[projectId]/direct-costs/new", title: "New Direct Cost", category: "Project — Financial", type: "form", dynamic: true },
  { url: "/[projectId]/direct-costs/[costId]", title: "Direct Cost Detail", category: "Project — Financial", type: "detail", dynamic: true },
  { url: "/[projectId]/invoicing", title: "Invoicing", category: "Project — Financial", type: "list", dynamic: true },
  { url: "/[projectId]/invoicing/[invoiceId]", title: "Invoice Detail", category: "Project — Financial", type: "detail", dynamic: true },
  { url: "/[projectId]/invoices/new", title: "New Invoice", category: "Project — Financial", type: "form", dynamic: true },
  { url: "/[projectId]/estimates", title: "Estimates", category: "Project — Financial", type: "list", dynamic: true },
  { url: "/[projectId]/estimates/[estimateId]", title: "Estimate Detail", category: "Project — Financial", type: "detail", dynamic: true },
  { url: "/[projectId]/sov", title: "Schedule of Values", category: "Project — Financial", type: "list", dynamic: true },
  { url: "/[projectId]/reporting", title: "Reporting", category: "Project — Financial", type: "dashboard", dynamic: true },
  { url: "/[projectId]/client-dashboard", title: "Client Dashboard", category: "Project — Financial", type: "dashboard", dynamic: true },

  // ── Project — Field ───────────────────────────────────
  { url: "/[projectId]/schedule", title: "Schedule", category: "Project — Field", type: "list", dynamic: true },
  { url: "/[projectId]/rfis", title: "RFIs", category: "Project — Field", type: "list", dynamic: true },
  { url: "/[projectId]/rfis/new", title: "New RFI", category: "Project — Field", type: "form", dynamic: true },
  { url: "/[projectId]/rfis/[rfiId]", title: "RFI Detail", category: "Project — Field", type: "detail", dynamic: true },
  { url: "/[projectId]/submittals", title: "Submittals", category: "Project — Field", type: "list", dynamic: true },
  { url: "/[projectId]/submittals/[submittalId]", title: "Submittal Detail", category: "Project — Field", type: "detail", dynamic: true },
  { url: "/[projectId]/drawings", title: "Drawings", category: "Project — Field", type: "list", dynamic: true },
  { url: "/[projectId]/drawings/areas", title: "Drawing Areas", category: "Project — Field", type: "list", dynamic: true },
  { url: "/[projectId]/drawings/board", title: "Drawing Board", category: "Project — Field", type: "dashboard", dynamic: true },
  { url: "/[projectId]/punch-list", title: "Punch List", category: "Project — Field", type: "list", dynamic: true },
  { url: "/[projectId]/meetings", title: "Meetings", category: "Project — Field", type: "list", dynamic: true },
  { url: "/[projectId]/meetings/[meetingId]", title: "Meeting Detail", category: "Project — Field", type: "detail", dynamic: true },
  { url: "/[projectId]/meetings/[meetingId]/prep", title: "Meeting Prep", category: "Project — Field", type: "detail", dynamic: true },
  { url: "/[projectId]/documents", title: "Documents", category: "Project — Field", type: "list", dynamic: true },
  { url: "/[projectId]/photos", title: "Photos", category: "Project — Field", type: "list", dynamic: true },
  { url: "/[projectId]/daily-log", title: "Daily Log", category: "Project — Field", type: "list", dynamic: true },
  { url: "/[projectId]/specifications", title: "Specifications", category: "Project — Field", type: "list", dynamic: true },
  { url: "/[projectId]/specifications/[sectionId]", title: "Specification Section", category: "Project — Field", type: "detail", dynamic: true },
  { url: "/[projectId]/transmittals", title: "Transmittals", category: "Project — Field", type: "list", dynamic: true },
  { url: "/[projectId]/emails", title: "Project Emails", category: "Project — Field", type: "list", dynamic: true },

  // ── Project — Admin ───────────────────────────────────
  { url: "/[projectId]/directory/team", title: "Directory — Team", category: "Project — Admin", type: "list", dynamic: true },
  { url: "/[projectId]/directory/vendors", title: "Directory — Vendors", category: "Project — Admin", type: "list", dynamic: true },
  { url: "/[projectId]/directory/members", title: "Directory — Members", category: "Project — Admin", type: "list", dynamic: true },
  { url: "/[projectId]/directory/groups", title: "Directory — Distribution Groups", category: "Project — Admin", type: "list", dynamic: true },
  { url: "/[projectId]/setup", title: "Project Setup", category: "Project — Admin", type: "settings", dynamic: true },
  { url: "/[projectId]/admin", title: "Project Admin", category: "Project — Admin", type: "admin", dynamic: true },

  // ── Company Lists ─────────────────────────────────────
  { url: "/daily-logs", title: "Daily Logs", category: "Company Lists", type: "list", dynamic: false },
  { url: "/daily-reports", title: "Daily Reports", category: "Company Lists", type: "list", dynamic: false },
  { url: "/decisions", title: "Decisions", category: "Company Lists", type: "list", dynamic: false },
  { url: "/emails", title: "Emails", category: "Company Lists", type: "list", dynamic: false },
  { url: "/insights", title: "Insights", category: "Company Lists", type: "list", dynamic: false },
  { url: "/meetings", title: "Meetings (Company)", category: "Company Lists", type: "list", dynamic: false },
  { url: "/meeting-segments", title: "Meeting Segments", category: "Company Lists", type: "list", dynamic: false },
  { url: "/notes", title: "Notes", category: "Company Lists", type: "list", dynamic: false },
  { url: "/opportunities", title: "Opportunities", category: "Company Lists", type: "list", dynamic: false },
  { url: "/risks", title: "Risks", category: "Company Lists", type: "list", dynamic: false },
  { url: "/subcontractors", title: "Subcontractors", category: "Company Lists", type: "list", dynamic: false },
  { url: "/submittals", title: "Submittals (Company)", category: "Company Lists", type: "list", dynamic: false },
  { url: "/drawings", title: "Drawings (Company)", category: "Company Lists", type: "list", dynamic: false },
  { url: "/punch-list", title: "Punch List (Company)", category: "Company Lists", type: "list", dynamic: false },
  { url: "/rfis", title: "RFIs (Company)", category: "Company Lists", type: "list", dynamic: false },

  // ── Directory ─────────────────────────────────────────
  { url: "/directory", title: "Directory", category: "Directory", type: "dashboard", dynamic: false },
  { url: "/directory/companies", title: "Companies", category: "Directory", type: "list", dynamic: false },
  { url: "/directory/companies/[companyId]", title: "Company Detail", category: "Directory", type: "detail", dynamic: true },
  { url: "/directory/clients", title: "Clients", category: "Directory", type: "list", dynamic: false },
  { url: "/directory/contacts", title: "Contacts", category: "Directory", type: "list", dynamic: false },
  { url: "/directory/vendors", title: "Vendors", category: "Directory", type: "list", dynamic: false },
  { url: "/directory/employees", title: "Employees", category: "Directory", type: "list", dynamic: false },
  { url: "/directory/users", title: "Users", category: "Directory", type: "list", dynamic: false },
  { url: "/directory/prospects", title: "Prospects", category: "Directory", type: "list", dynamic: false },
  { url: "/directory/groups", title: "Distribution Groups", category: "Directory", type: "list", dynamic: false },

  // ── Settings ──────────────────────────────────────────
  { url: "/settings", title: "Settings", category: "Settings", type: "settings", dynamic: false },
  { url: "/settings/account", title: "Account", category: "Settings", type: "settings", dynamic: false },
  { url: "/settings/members", title: "Members", category: "Settings", type: "settings", dynamic: false },
  { url: "/settings/integrations", title: "Integrations", category: "Settings", type: "settings", dynamic: false },
  { url: "/settings/security", title: "Security", category: "Settings", type: "settings", dynamic: false },
  { url: "/settings/preferences", title: "Preferences", category: "Settings", type: "settings", dynamic: false },
  { url: "/settings/audit", title: "Audit Log", category: "Settings", type: "settings", dynamic: false },
  { url: "/settings/plugins", title: "Plugins", category: "Settings", type: "settings", dynamic: false },

  // ── Submittals Settings ───────────────────────────────
  { url: "/submittals/settings/general", title: "Submittals — General Settings", category: "Settings", type: "settings", dynamic: false },
  { url: "/submittals/settings/custom-fields", title: "Submittals — Custom Fields", category: "Settings", type: "settings", dynamic: false },
  { url: "/submittals/settings/workflow-templates", title: "Submittals — Workflow Templates", category: "Settings", type: "settings", dynamic: false },

  // ── Admin ─────────────────────────────────────────────
  { url: "/admin/ai-observability", title: "AI Observability", category: "Admin", type: "admin", dynamic: false },
  { url: "/admin/company-knowledge", title: "Company Knowledge", category: "Admin", type: "admin", dynamic: false },
  { url: "/admin-check", title: "Admin Check", category: "Admin", type: "admin", dynamic: false },
  { url: "/qa-audit", title: "QA Audit", category: "Admin", type: "admin", dynamic: false },
  { url: "/procore-tools", title: "Procore Tools", category: "Admin", type: "admin", dynamic: false },
  { url: "/procore-tracker", title: "Procore Tracker", category: "Admin", type: "list", dynamic: false },
  { url: "/procore-tracker/[featureId]", title: "Procore Feature Detail", category: "Admin", type: "detail", dynamic: true },
  { url: "/design-system-update", title: "Design System Update", category: "Admin", type: "admin", dynamic: false },
  { url: "/tables-directory", title: "Tables Directory", category: "Admin", type: "list", dynamic: false },
  { url: "/tables/[table]", title: "Table Viewer", category: "Admin", type: "list", dynamic: true },
  { url: "/tables/[table]/new", title: "New Table Row", category: "Admin", type: "form", dynamic: true },
  { url: "/fm_global_tables", title: "FM Global Tables", category: "Admin", type: "list", dynamic: false },

  // ── AI ────────────────────────────────────────────────
  { url: "/ai-assistant", title: "AI Assistant", category: "AI", type: "chat", dynamic: false },
  { url: "/rag", title: "RAG Chat", category: "AI", type: "chat", dynamic: false },
  { url: "/team-chat", title: "Team Chat", category: "AI", type: "chat", dynamic: false },

  // ── Auth ──────────────────────────────────────────────
  { url: "/auth/login-v2", title: "Login", category: "Auth", type: "auth", dynamic: false },
  { url: "/auth/sign-up", title: "Sign Up", category: "Auth", type: "auth", dynamic: false },
  { url: "/auth/sign-up-success", title: "Sign Up Success", category: "Auth", type: "auth", dynamic: false },
  { url: "/auth/forgot-password", title: "Forgot Password", category: "Auth", type: "auth", dynamic: false },
  { url: "/auth/update-password", title: "Update Password", category: "Auth", type: "auth", dynamic: false },
  { url: "/auth/error", title: "Auth Error", category: "Auth", type: "auth", dynamic: false },
  { url: "/access-denied", title: "Access Denied", category: "Auth", type: "auth", dynamic: false },

  // ── Utility ───────────────────────────────────────────
  { url: "/site-map", title: "Sitemap", category: "Utility", type: "utility", dynamic: false },
  { url: "/profile", title: "Profile", category: "Utility", type: "settings", dynamic: false },
  { url: "/table-v2", title: "Table V2 Demo", category: "Utility", type: "utility", dynamic: false },
  { url: "/docs", title: "Documentation", category: "Utility", type: "utility", dynamic: false },

  // ── Templates ─────────────────────────────────────────
  { url: "/template/data-table", title: "Data Table Template", category: "Templates", type: "utility", dynamic: false },
  { url: "/template/form-standard", title: "Standard Form Template", category: "Templates", type: "utility", dynamic: false },
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
