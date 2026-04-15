"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, ChevronsUpDown, GitCompare, Inbox, Menu, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectPermissions } from "@/hooks/use-project-permissions";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  headerNavGroups,
  buildToolUrl,
  filterToolsByPermission,
  type HeaderNavGroup,
  type HeaderNavigationTool,
} from "@/lib/navigation-config";

import { useHeaderNav } from "./use-header-nav";
import { ProjectSelector } from "./project-selector";
import { NotificationBell } from "./notification-bell";
import { CommentsSidebar } from "./comments-sidebar";
import { useProcorePanelStore } from "@/lib/stores/procore-panel-store";
import { LiveAvatarStack } from "./live-avatar-stack";
import { feedbackTargetProps } from "@/lib/admin-feedback/constants";

function ProcoreReferenceToggle() {
  const { open, toggle } = useProcorePanelStore();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle Procore reference panel"
      aria-pressed={open ? "true" : "false"}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors",
        open
          ? "bg-primary/10 text-primary hover:bg-primary/20"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <GitCompare className="h-4 w-4" />
    </button>
  );
}

/**
 * Top header — breadcrumbs left, tools + project selector right.
 */
export function SiteHeader() {
  const router = useRouter();
  const nav = useHeaderNav();
  const { permissions, userType, isAppAdmin } = useProjectPermissions(
    nav.projectId
  );
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  React.useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  return (
    <header
      className="relative z-40 flex h-12 shrink-0 items-center text-foreground"
      {...feedbackTargetProps("app.site-header")}
    >
      <div className="flex w-full items-center justify-between px-3 sm:px-5 lg:px-7 min-w-0">
        {/* ── Left: Mobile logo + Breadcrumbs (desktop) ── */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Mobile: Logo on left */}
          <Link href="/" className="flex items-center md:hidden" aria-label="Home">
            <Image
              src="/Alleato-Group-Logo_Dark.png"
              alt="Alleato"
              width={96}
              height={24}
              priority
              className="h-6 w-auto dark:invert"
            />
          </Link>

          {/* Breadcrumbs — Desktop */}
          {nav.breadcrumbs.length > 1 && (
            <div className="hidden md:flex items-center gap-1 text-xs min-w-0 overflow-hidden">
              {nav.breadcrumbs.map((crumb, index) => (
                <span
                  key={`${crumb.href}-${index}`}
                  className="flex items-center gap-1"
                >
                  {index > 0 && (
                    <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
                  )}
                  {index === nav.breadcrumbs.length - 1 ? (
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
          <ToolsDropdown
            projectId={nav.projectId}
            activeToolName={nav.activeToolName}
            permissions={permissions}
            isAppAdmin={isAppAdmin}
            userType={userType}
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
          <React.Suspense fallback={null}>
            <LiveAvatarStack />
          </React.Suspense>
          <React.Suspense fallback={null}>
            <CommentsSidebar />
          </React.Suspense>
          <ProcoreReferenceToggle />
          <Link
            href="/feedback-inbox"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Feedback inbox"
          >
            <Inbox className="h-4 w-4" />
          </Link>
          {(isAppAdmin || userType === "developer") && (
            <Link
              href="/annotation-inbox"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Annotation inbox"
            >
              <Sparkles className="h-4 w-4" />
            </Link>
          )}
          <React.Suspense fallback={null}>
            <NotificationBell />
          </React.Suspense>
        </div>

        {/* Mobile: Menu button on right */}
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
          className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-md text-foreground"
        >
          <Menu style={{ width: 22, height: 22 }} />
        </button>
      </div>

      {/* Mobile full-screen nav overlay */}
      <MobileNavOverlay
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        projectId={nav.projectId}
        activeToolName={nav.activeToolName}
        permissions={permissions}
        isAppAdmin={isAppAdmin}
        userType={userType}
      />
    </header>
  );
}

function MobileNavOverlay({
  open,
  onClose,
  projectId,
  activeToolName,
  permissions,
  isAppAdmin,
  userType,
}: {
  open: boolean;
  onClose: () => void;
  projectId: number | null;
  activeToolName: string;
  permissions: Record<string, string[]>;
  isAppAdmin: boolean;
  userType: string | null;
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
      userType
    ),
  }));

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 md:hidden bg-background transition-all duration-300 ease-out",
        open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      <div className="flex h-14 items-center justify-between px-4">
        <Image
          src="/Alleato-Group-Logo_Dark.png"
          alt="Alleato"
          width={96}
          height={24}
          className="h-6 w-auto dark:invert"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-foreground"
        >
          <X style={{ width: 22, height: 22 }} />
        </button>
      </div>

      <nav className="h-[calc(100svh-3.5rem)] overflow-y-auto px-6 pt-10 pb-12 flex flex-col items-center gap-10">
        {groups.map((group) => (
          <div key={group.id} className="flex flex-col items-center gap-6 w-full">
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
                  tool.requiresProject
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
                      "w-full max-w-[22rem] truncate px-2 text-center text-xl tracking-tight transition-colors",
                      isDisabled
                        ? "pointer-events-none opacity-30"
                      : isActive
                        ? "text-foreground font-semibold"
                        : "text-foreground/85"
                    )}
                  >
                    {tool.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Tools dropdown
 * ───────────────────────────────────────────────────────────────────────────── */

function ToolsDropdown({
  projectId,
  activeToolName,
  permissions,
  isAppAdmin,
  userType,
}: {
  projectId: number | null;
  activeToolName: string;
  permissions: Record<string, string[]>;
  isAppAdmin: boolean;
  userType: string | null;
}) {
  const [open, setOpen] = React.useState(false);

  const groups = headerNavGroups.map((group) => ({
    ...group,
    visibleTools: filterToolsByPermission(
      group.tools,
      projectId,
      permissions,
      isAppAdmin,
      userType
    ),
  }));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-52 justify-between gap-1.5 border border-border/60 bg-transparent px-2.5 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <span className={cn(
            "truncate text-sm",
            activeToolName === "Projects" ? "text-muted-foreground" : "text-foreground/80"
          )}>
            {activeToolName === "Projects" ? "Switch Tool" : activeToolName}
          </span>
          <ChevronsUpDown
            className="h-3 w-3 shrink-0 text-muted-foreground/60"
            strokeWidth={1.6}
          />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-[min(860px,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] p-0 border border-border shadow-sm"
      >
        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Navigate to
          </span>
          {!projectId && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              Select a project to unlock more tools
            </span>
          )}
        </div>

        {/* Groups */}
        <div className="overflow-x-auto">
          <div className="flex min-w-[760px] divide-x divide-border/40">
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
        </div>
      </PopoverContent>
    </Popover>
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
          const subTools = group.tools.filter((t) =>
            subGroup.toolNames.includes(t.name)
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
      {group.tools.map((tool) => (
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
          : "text-foreground/75 hover:bg-muted hover:text-foreground"
      )}
    >
      {Icon && (
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded border",
            isActive
              ? "border-border text-foreground"
              : "border-border/50 text-muted-foreground group-hover:border-border group-hover:text-foreground"
          )}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={1.6} />
        </span>
      )}
      <span className={cn("text-[13px]", isActive ? "font-semibold" : "font-normal")}>
        {tool.name}
      </span>
    </Link>
  );
}
