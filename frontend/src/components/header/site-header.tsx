"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Building2,
  ChevronsLeft,
  ChevronsRight,
  ChevronRight,
  ChevronDown,
  GitCompare,
  Inbox,
  Menu,
  Sparkles,
  X,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { useProjectPermissions } from "@/hooks/use-project-permissions";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  headerNavGroups,
  companyWideHeaderTools,
  companyWideToolSections,
  developerCompanyAdminTools,
  buildToolUrl,
  filterToolsByPermission,
  type HeaderNavGroup,
  type HeaderNavigationTool,
} from "@/lib/navigation-config";

import { useHeaderNav } from "./use-header-nav";
import { ProjectSelector } from "./project-selector";
import { NotificationBell } from "./notification-bell";
import { CommentsSidebarButton } from "./comments-sidebar-button";
import { useProcorePanelStore } from "@/lib/stores/procore-panel-store";
import { feedbackTargetProps } from "@/lib/admin-feedback/constants";
import { HeaderUserMenu } from "./header-user-menu";
import { HeaderSearch } from "./header-search";
import { createClient } from "@/lib/supabase/client";
import {
  getCurrentBrowserUser,
  resetCurrentBrowserUserCache,
} from "@/lib/supabase/current-user";
import { apiFetch } from "@/lib/api-client";
import { headerSelectTriggerClassName } from "./header-control-styles";

type PermissionUserBreadcrumbRecord = {
  personId: string;
  authUserId: string | null;
  firstName: string;
  lastName: string;
  email: string;
};

const userManagementBreadcrumbTitleCache = new Map<string, string>();

function ProcoreReferenceToggle() {
  const { open, toggle } = useProcorePanelStore();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-label="Toggle Procore reference panel"
      aria-pressed={open ? "true" : "false"}
      className={cn(
        "h-8 w-8",
        open
          ? "bg-primary/10 text-primary hover:bg-primary/20"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <GitCompare className="h-4 w-4" />
    </Button>
  );
}

function AiChatButton() {
  const pathname = usePathname()!;
  const isActive =
    pathname === "/ai" ||
    pathname?.startsWith("/ai/") ||
    pathname === "/ai-assistant" ||
    pathname?.startsWith("/ai-assistant/");
  return (
    <Link
      href="/ai"
      aria-label="AI"
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors",
        isActive
          ? "bg-primary/10 text-primary hover:bg-primary/20"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Sparkles className="h-4 w-4" />
    </Link>
  );
}

function SidebarToggleButton() {
  const { state, toggleSidebar } = useSidebar();
  const isExpanded = state === "expanded";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggleSidebar}
      aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
      className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-accent hover:text-foreground hidden md:inline-flex"
    >
      {isExpanded ? (
        <ChevronsLeft className="h-4 w-4" strokeWidth={1.6} />
      ) : (
        <ChevronsRight className="h-4 w-4" strokeWidth={1.4} />
      )}
    </Button>
  );
}

/**
 * Top header — breadcrumbs left, tools + project selector right.
 */
export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname()!;
  const nav = useHeaderNav();
  const { permissions, userType, isAppAdmin } = useProjectPermissions(
    nav.projectId,
  );
  const isDeveloper = userType === "developer";
  const [user, setUser] = React.useState<User | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [userManagementBreadcrumbTitle, setUserManagementBreadcrumbTitle] =
    React.useState<string | null>(null);

  React.useEffect(() => {
    const supabase = createClient();

    const fetchUser = async () => {
      const currentUser = await getCurrentBrowserUser(supabase);
      setUser(currentUser);
    };

    void fetchUser();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      resetCurrentBrowserUserCache();
      setUser(session?.user ?? null);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  React.useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  const userManagementUserId = React.useMemo(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    if (
      segments.length >= 3 &&
      segments[0] === "user-management" &&
      segments[1] === "users" &&
      /^[0-9a-f-]{36}$/i.test(segments[2])
    ) {
      return segments[2];
    }

    return null;
  }, [pathname]);

  React.useEffect(() => {
    if (!userManagementUserId) {
      setUserManagementBreadcrumbTitle(null);
      return;
    }

    const cachedTitle =
      userManagementBreadcrumbTitleCache.get(userManagementUserId);
    if (cachedTitle) {
      setUserManagementBreadcrumbTitle(cachedTitle);
      return;
    }

    let isActive = true;
    const loadUserTitle = async () => {
      try {
        const response = await apiFetch<{
          data: PermissionUserBreadcrumbRecord[];
        }>("/api/permissions/users");
        const userRecord = response.data.find(
          (item) =>
            item.personId === userManagementUserId ||
            item.authUserId === userManagementUserId,
        );
        if (!userRecord || !isActive) return;

        const fullName = [userRecord.firstName, userRecord.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();
        const title = fullName || userRecord.email;
        if (!title) return;

        userManagementBreadcrumbTitleCache.set(userManagementUserId, title);
        setUserManagementBreadcrumbTitle(title);
      } catch {
        if (isActive) setUserManagementBreadcrumbTitle(null);
      }
    };

    loadUserTitle();
    return () => {
      isActive = false;
    };
  }, [userManagementUserId]);

  const breadcrumbs = React.useMemo(() => {
    if (!userManagementUserId || !userManagementBreadcrumbTitle) {
      return nav.breadcrumbs;
    }

    return nav.breadcrumbs.map((crumb, index) =>
      index === nav.breadcrumbs.length - 1
        ? { ...crumb, label: userManagementBreadcrumbTitle }
        : crumb,
    );
  }, [nav.breadcrumbs, userManagementBreadcrumbTitle, userManagementUserId]);

  return (
    <header
      className="relative z-40 flex h-12 shrink-0 items-center text-foreground"
      {...feedbackTargetProps("app.site-header")}
    >
      <div className="flex w-full items-center justify-between px-3 sm:px-5 lg:px-7 min-w-0">
        {/* ── Left: Sidebar toggle + Mobile logo + Breadcrumbs (desktop) ── */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Sidebar toggle — desktop only, left of breadcrumbs */}
          <SidebarToggleButton />

          {/* Mobile: Logo on left */}
          <Link
            href="/"
            className="flex items-center md:hidden"
            aria-label="Home"
          >
            <Image
              src="/Alleato-Group-Logo_Dark.png"
              alt="Alleato"
              width={96}
              height={21}
              priority
              className="h-auto w-24 dark:invert"
              style={{ height: "auto" }}
            />
          </Link>

          {/* Breadcrumbs — Desktop */}
          {breadcrumbs.length > 1 && (
            <div className="hidden md:flex items-center gap-1 text-xs min-w-0 overflow-hidden">
              {breadcrumbs.map((crumb, index) => (
                <span
                  key={`${crumb.href}-${index}`}
                  className="flex items-center gap-1"
                >
                  {index > 0 && (
                    <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
                  )}
                  {index === breadcrumbs.length - 1 ? (
                    <span className="truncate font-medium text-foreground">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="truncate text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Tools dropdown + Project selector (desktop only) ── */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          <HeaderSearch
            projectId={nav.projectId}
            projects={nav.projects}
            loadingProjects={nav.loadingProjects}
            onFetchProjects={nav.fetchProjects}
            permissions={permissions}
            isAppAdmin={isAppAdmin}
            userType={userType}
            isDeveloper={isDeveloper}
          />
          <ProjectSelector
            projectId={nav.projectId}
            currentProject={nav.currentProject}
            projects={nav.projects}
            loadingProjects={nav.loadingProjects}
            onFetchProjects={nav.fetchProjects}
            onProjectSelect={nav.handleProjectSelect}
            onViewAll={() => router.push("/")}
          />
          <ToolsDropdown
            projectId={nav.projectId}
            currentProject={nav.currentProject}
            projects={nav.projects}
            loadingProjects={nav.loadingProjects}
            onFetchProjects={nav.fetchProjects}
            onProjectSelect={nav.handleProjectSelect}
            onViewAll={() => router.push("/")}
            activeToolName={nav.activeToolName}
            permissions={permissions}
            isAppAdmin={isAppAdmin}
            userType={userType}
            isDeveloper={isDeveloper}
          />
          <AiChatButton />
          <Link
            href="/feedback-inbox"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Feedback inbox"
          >
            <Inbox className="h-4 w-4" />
          </Link>
          <CommentsSidebarButton />
          <React.Suspense fallback={null}>
            <NotificationBell />
          </React.Suspense>
          {user?.email === "megan@megankharrison.com" && (
            <ProcoreReferenceToggle />
          )}
          <HeaderUserMenu
            user={user}
            projectId={nav.projectId}
            activeToolName={nav.activeToolName}
            permissions={permissions}
            isAppAdmin={isAppAdmin}
            userType={userType}
          />
        </div>

        {/* Mobile: Menu button on right */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
          className="md:hidden h-12 w-12 shrink-0 text-foreground"
        >
          <Menu className="size-6" strokeWidth={1.8} />
        </Button>
      </div>

      {/* Mobile full-screen nav overlay */}
      <MobileNavOverlay
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        projectId={nav.projectId}
        currentProject={nav.currentProject}
        projects={nav.projects}
        loadingProjects={nav.loadingProjects}
        onFetchProjects={nav.fetchProjects}
        onProjectSelect={nav.handleProjectSelect}
        activeToolName={nav.activeToolName}
        permissions={permissions}
        isAppAdmin={isAppAdmin}
        userType={userType}
        isDeveloper={isDeveloper}
        user={user}
      />
    </header>
  );
}

function MobileNavOverlay({
  open,
  onClose,
  projectId,
  currentProject,
  projects,
  loadingProjects,
  onFetchProjects,
  onProjectSelect,
  activeToolName,
  permissions,
  isAppAdmin,
  userType,
  isDeveloper,
  user,
}: {
  open: boolean;
  onClose: () => void;
  projectId: number | null;
  currentProject: {
    id: number;
    name: string | null;
    "job number": string | null;
  } | null;
  projects: { id: number; name: string | null; "job number": string | null }[];
  loadingProjects: boolean;
  onFetchProjects: () => void;
  onProjectSelect: (projectId: number) => void;
  activeToolName: string;
  permissions: Record<string, string[]>;
  isAppAdmin: boolean;
  userType: string | null;
  isDeveloper: boolean;
  user: User | null;
}) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
    } else {
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!mounted && !open) return null;

  const groups = headerNavGroups.map((group) => ({
    ...group,
    visibleTools: filterToolsByPermission(
      group.tools,
      projectId,
      permissions,
      isAppAdmin,
      userType,
      isDeveloper,
    ),
  }));
  const companyToolList = [
    ...companyWideHeaderTools,
    ...(isDeveloper ? developerCompanyAdminTools : []),
  ];
  const companyTools = filterToolsByPermission(
    companyToolList,
    projectId,
    permissions,
    isAppAdmin,
    userType,
    isDeveloper,
  );

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 md:hidden bg-background transition-all duration-300 ease-out flex flex-col",
        open
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none",
      )}
    >
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between px-4">
        <Image
          src="/Alleato-Group-Logo_Dark.png"
          alt="Alleato"
          width={96}
          height={21}
          className="h-auto w-24 dark:invert"
          style={{ height: "auto" }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close menu"
          className="h-12 w-12 shrink-0 text-foreground"
        >
          <X className="size-6" strokeWidth={1.8} />
        </Button>
      </div>

      {/* Nav — fills remaining space */}
      <nav className="flex-1 overflow-y-auto px-6 pt-8 pb-4 flex flex-col items-center gap-10">
        {groups.map((group) => (
          <div
            key={group.id}
            className="flex flex-col items-center gap-6 w-full"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {group.label}
            </p>
            <div className="flex flex-col items-center gap-5 w-full">
              {group.tools.map((tool) => {
                const isDisabled =
                  (tool.requiresProject && !projectId) ||
                  !group.visibleTools.includes(tool);
                const href = buildToolUrl(
                  tool.path,
                  projectId,
                  tool.requiresProject,
                );
                const isActive = tool.name === activeToolName;
                return (
                  <Link
                    key={`${tool.path}:${tool.name}`}
                    href={href}
                    onClick={(e) => {
                      if (isDisabled) {
                        e.preventDefault();
                        return;
                      }
                      onClose();
                    }}
                    className={cn(
                      "w-full max-w-[22rem] truncate px-2 text-center text-lg tracking-tight transition-colors",
                      isDisabled
                        ? "pointer-events-none opacity-30"
                        : isActive
                          ? "text-foreground font-semibold"
                          : "text-foreground/85",
                    )}
                  >
                    {tool.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
        <div className="flex w-full flex-col items-center gap-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Company Tools
          </p>
          <div className="flex w-full flex-col items-center gap-5">
            {companyToolList.map((tool) => {
              const isDisabled = !companyTools.includes(tool);
              const href = buildToolUrl(
                tool.path,
                projectId,
                tool.requiresProject,
              );
              const isActive = tool.name === activeToolName;
              return (
                <Link
                  key={`${tool.path}:${tool.name}`}
                  href={href}
                  onClick={(e) => {
                    if (isDisabled) {
                      e.preventDefault();
                      return;
                    }
                    onClose();
                  }}
                  className={cn(
                    "w-full max-w-[22rem] truncate px-2 text-center text-lg tracking-tight transition-colors",
                    isDisabled
                      ? "pointer-events-none opacity-30"
                      : isActive
                        ? "font-semibold text-foreground"
                        : "text-foreground/85",
                  )}
                >
                  {tool.name}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Bottom: project selector + user menu */}
      <div className="shrink-0 border-t border-border/50 bg-background">
        <div className="flex justify-center px-4 pt-3 pb-2 [&_.project-selector-trigger]:!border-0 [&_.project-selector-trigger]:justify-center">
          <ProjectSelector
            projectId={projectId}
            currentProject={currentProject}
            projects={projects}
            loadingProjects={loadingProjects}
            onFetchProjects={onFetchProjects}
            onProjectSelect={(id) => {
              onProjectSelect(id);
              onClose();
            }}
            onViewAll={onClose}
          />
        </div>
        <div className="px-4 pb-3">
          <HeaderUserMenu
            user={user}
            projectId={projectId}
            activeToolName={activeToolName}
            permissions={permissions}
            isAppAdmin={isAppAdmin}
            userType={userType}
          />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Tools dropdown
 * ───────────────────────────────────────────────────────────────────────────── */

function ToolsDropdown({
  projectId,
  currentProject,
  projects,
  loadingProjects,
  onFetchProjects,
  onProjectSelect,
  onViewAll,
  activeToolName,
  permissions,
  isAppAdmin,
  userType,
  isDeveloper,
}: {
  projectId: number | null;
  currentProject: {
    id: number;
    name: string | null;
    "job number": string | null;
  } | null;
  projects: { id: number; name: string | null; "job number": string | null }[];
  loadingProjects: boolean;
  onFetchProjects: () => void;
  onProjectSelect: (projectId: number) => void;
  onViewAll: () => void;
  activeToolName: string;
  permissions: Record<string, string[]>;
  isAppAdmin: boolean;
  userType: string | null;
  isDeveloper: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [showCompanyTools, setShowCompanyTools] = React.useState(false);

  const groups = headerNavGroups.map((group) => ({
    ...group,
    visibleTools: filterToolsByPermission(
      group.tools,
      projectId,
      permissions,
      isAppAdmin,
      userType,
      isDeveloper,
    ),
  }));
  const visibleCompanyTools = filterToolsByPermission(
    companyWideHeaderTools,
    projectId,
    permissions,
    isAppAdmin,
    userType,
    isDeveloper,
  );
  const visibleDeveloperAdminTools = filterToolsByPermission(
    isDeveloper ? developerCompanyAdminTools : [],
    projectId,
    permissions,
    isAppAdmin,
    userType,
    isDeveloper,
  );

  React.useEffect(() => {
    if (!open) {
      setShowCompanyTools(false);
      return;
    }
    if (!projectId) {
      setShowCompanyTools(true);
    }
  }, [open, projectId]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("w-52", headerSelectTriggerClassName)}
        >
          <span
            className={cn(
              "truncate text-xs",
              activeToolName === "Projects"
                ? "text-muted-foreground"
                : "text-foreground/80",
            )}
          >
            {activeToolName === "Projects" ? "Select Tool" : activeToolName}
          </span>
          <ChevronDown
            className="h-3 w-3 shrink-0 text-muted-foreground/60"
            strokeWidth={1.6}
          />
        </Button>
      </PopoverTrigger>
      {open && (
        <Button
          type="button"
          variant="ghost"
          aria-label="Close tools menu"
          className="fixed inset-x-0 bottom-0 top-12 z-30 h-auto cursor-default rounded-none bg-background/55 p-0 backdrop-blur-sm animate-in fade-in duration-150 hover:bg-background/55 focus-visible:ring-0 focus-visible:ring-offset-0"
          onClick={() => setOpen(false)}
        />
      )}

      <PopoverContent
        align="end"
        sideOffset={6}
        className="border border-border bg-popover p-0 shadow-sm"
        style={{
          width: "min(860px, calc(100vw - 1.5rem))",
          maxWidth: "calc(100vw - 1.5rem)",
        }}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-2.5">
          <div className="flex items-center gap-2">
            {showCompanyTools && projectId && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setShowCompanyTools(false)}
                aria-label="Back to project tools"
              >
                <ChevronsLeft className="h-3.5 w-3.5" strokeWidth={1.6} />
              </Button>
            )}
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {showCompanyTools ? "Company-wide tools" : "Project tools"}
            </span>
          </div>
          {!projectId && !showCompanyTools && (
            <span className="rounded-full bg-status-warning/10 px-2 py-0.5 text-[10px] font-medium text-status-warning">
              Select a project to unlock more tools
            </span>
          )}
        </div>

        {/* Groups */}
        <div
          key={showCompanyTools ? "company-tools" : "project-tools"}
          className="animate-in fade-in duration-200"
        >
          {showCompanyTools ? (
            <>
              <CompanyToolsPanel
                tools={companyWideHeaderTools}
                visibleTools={visibleCompanyTools}
                adminTools={isDeveloper ? developerCompanyAdminTools : []}
                visibleAdminTools={visibleDeveloperAdminTools}
                projectId={projectId}
                activeToolName={activeToolName}
                onClose={() => setOpen(false)}
              />
              {!projectId && (
                <div className="border-t border-border/50 px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-medium text-muted-foreground">
                      Select a project
                    </span>
                    <ProjectSelector
                      projectId={projectId}
                      currentProject={currentProject}
                      projects={projects}
                      loadingProjects={loadingProjects}
                      onFetchProjects={onFetchProjects}
                      onProjectSelect={(nextProjectId) => {
                        onProjectSelect(nextProjectId);
                        setShowCompanyTools(false);
                        setOpen(false);
                      }}
                      onViewAll={onViewAll}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="overflow-x-auto">
              <div
                className="flex divide-x divide-border/40"
                style={{ minWidth: 760 }}
              >
                {groups.map((group) => (
                  <ToolsGroup
                    key={group.id}
                    group={group}
                    visibleTools={group.visibleTools}
                    projectId={projectId}
                    activeToolName={activeToolName}
                    onClose={() => setOpen(false)}
                  />
                ))}
              </div>
              <div className="border-t border-border/50 px-5 py-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCompanyTools(true)}
                  className="h-8 gap-2 px-2 text-[13px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Building2 className="h-3.5 w-3.5" strokeWidth={1.6} />
                  View Company Tools
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.6} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CompanyToolsPanel({
  tools,
  visibleTools,
  adminTools,
  visibleAdminTools,
  projectId,
  activeToolName,
  onClose,
}: {
  tools: HeaderNavigationTool[];
  visibleTools: HeaderNavigationTool[];
  adminTools: HeaderNavigationTool[];
  visibleAdminTools: HeaderNavigationTool[];
  projectId: number | null;
  activeToolName: string;
  onClose: () => void;
}) {
  const sections = adminTools.length
    ? [
        ...companyWideToolSections,
        { label: "Admin", toolNames: adminTools.map((tool) => tool.name) },
      ]
    : companyWideToolSections;
  const allTools = [...tools, ...adminTools];
  const allVisibleTools = [...visibleTools, ...visibleAdminTools];

  return (
    <div className="overflow-x-auto">
      <div className="flex divide-x divide-border/40" style={{ minWidth: 760 }}>
        {sections.map((section) => (
          <div key={section.label} className="flex flex-1 flex-col gap-0 p-4">
            <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {section.label}
            </p>
            {section.toolNames.map((toolName) => {
              const tool = allTools.find(
                (candidate) => candidate.name === toolName,
              );
              if (!tool) return null;
              return (
                <ToolItem
                  key={`${tool.path}:${tool.name}`}
                  tool={tool}
                  projectId={projectId}
                  isActive={tool.name === activeToolName}
                  isDisabled={!allVisibleTools.includes(tool)}
                  onClose={onClose}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolsGroup({
  group,
  visibleTools,
  projectId,
  activeToolName,
  onClose,
}: {
  group: HeaderNavGroup & { visibleTools: HeaderNavigationTool[] };
  visibleTools: HeaderNavigationTool[];
  projectId: number | null;
  activeToolName: string;
  onClose: () => void;
}) {
  // If the group has subGroups, render with sub-section headers
  if (group.subGroups && group.subGroups.length > 0) {
    return (
      <div className="flex flex-1 flex-col gap-0 p-4">
        <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          {group.label}
        </p>
        {group.subGroups.map((subGroup) => {
          const subTools = group.tools.filter(
            (tool) =>
              subGroup.toolNames.includes(tool.name) &&
              (!tool.developerOnly || visibleTools.includes(tool)),
          );
          return (
            <div key={subGroup.label} className="mb-3 last:mb-0">
              <p className="mb-1 px-2 text-[10px] font-medium text-muted-foreground/70">
                {subGroup.label}
              </p>
              {subTools.map((tool) => (
                <ToolItem
                  key={`${tool.path}:${tool.name}`}
                  tool={tool}
                  projectId={projectId}
                  isActive={tool.name === activeToolName}
                  isDisabled={
                    (tool.requiresProject && !projectId) ||
                    !visibleTools.includes(tool)
                  }
                  onClose={onClose}
                />
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  // Default: flat list
  return (
    <div className="flex flex-1 flex-col gap-0 p-4">
      <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {group.label}
      </p>
      {group.tools
        .filter((tool) => !tool.developerOnly || visibleTools.includes(tool))
        .map((tool) => (
          <ToolItem
            key={`${tool.path}:${tool.name}`}
            tool={tool}
            projectId={projectId}
            isActive={tool.name === activeToolName}
            isDisabled={
              (tool.requiresProject && !projectId) ||
              !visibleTools.includes(tool)
            }
            onClose={onClose}
          />
        ))}
    </div>
  );
}

function ToolItem({
  tool,
  projectId,
  isActive,
  isDisabled,
  onClose,
}: {
  tool: HeaderNavigationTool;
  projectId: number | null;
  isActive: boolean;
  isDisabled: boolean;
  onClose: () => void;
}) {
  const href = buildToolUrl(tool.path, projectId, tool.requiresProject);
  const Icon = tool.icon;

  return (
    <Link
      href={href}
      onClick={(e) => {
        if (isDisabled) {
          e.preventDefault();
          return;
        }
        onClose();
      }}
      className={cn(
        "group flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors",
        isDisabled
          ? "pointer-events-none opacity-30"
          : isActive
            ? "bg-muted text-foreground"
            : "text-foreground/75 hover:bg-muted hover:text-foreground",
      )}
    >
      {Icon && (
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center",
            isActive
              ? "text-foreground"
              : "text-muted-foreground group-hover:text-foreground",
          )}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={1.6} />
        </span>
      )}
      <span
        className={cn(
          "text-[13px]",
          isActive ? "font-semibold" : "font-normal",
        )}
      >
        {tool.name}
      </span>
    </Link>
  );
}
