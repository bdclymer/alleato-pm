"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ChevronsUpDown, Menu } from "lucide-react";
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
  buildToolUrl,
  filterToolsByPermission,
  type HeaderNavGroup,
} from "@/lib/navigation-config";

import { useHeaderNav } from "./use-header-nav";
import { ProjectSelector } from "./project-selector";
import { NotificationBell } from "./notification-bell";

/**
 * Top header — breadcrumbs left, tools + project selector right.
 */
export function SiteHeader() {
  const router = useRouter();
  const nav = useHeaderNav();
  const { toggleSidebar } = useSidebar();
  const { permissions, userType, isAppAdmin } = useProjectPermissions(
    nav.projectId
  );

  return (
    <header className="relative z-40 flex h-12 shrink-0 items-center bg-background text-foreground">
      <div className="flex w-full items-center justify-between px-3 sm:px-5 lg:px-7 min-w-0">
        {/* ── Left: Mobile hamburger + Breadcrumbs ── */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Mobile: Hamburger to open sidebar sheet */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="-ml-2 h-11 w-11 p-2 text-muted-foreground hover:text-foreground md:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Breadcrumbs — Desktop */}
          {nav.activeToolName !== "Projects" && (
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
          <React.Suspense fallback={null}>
            <NotificationBell />
          </React.Suspense>
          <ProjectSelector
            projectId={nav.projectId}
            currentProject={nav.currentProject}
            projects={nav.projects}
            loadingProjects={nav.loadingProjects}
            onFetchProjects={nav.fetchProjects}
            onProjectSelect={nav.handleProjectSelect}
            onViewAll={() => router.push("/")}
          />
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Tools dropdown — clean popover with grouped tool links
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

  // Build visible tools per group
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
          className="h-8 max-w-[200px] justify-between border border-border/40 px-2 hover:bg-muted focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <span className="truncate text-xs text-foreground/80 sm:text-sm">
            {activeToolName === "Projects" ? "Tools" : activeToolName}
          </span>
          <ChevronsUpDown
            className="ml-1.5 h-3 w-3 shrink-0 text-muted-foreground"
            strokeWidth={1.6}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-auto p-0"
      >
        <div className="flex gap-8 p-5">
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
        {!projectId && (
          <div className="border-t border-border/40 px-5 py-2.5">
            <p className="text-xs text-muted-foreground text-center">
              Select a project to access project tools
            </p>
          </div>
        )}
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
  group: HeaderNavGroup;
  visibleTools: HeaderNavGroup["tools"];
  projectId: number | null;
  activeToolName: string;
  onClose: () => void;
}) {
  return (
    <div className="min-w-[140px]">
      <h3 className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {group.label}
      </h3>
      <div className="flex flex-col">
        {group.tools.map((tool) => {
          const isActive = tool.name === activeToolName;
          const isDisabled =
            (tool.requiresProject && !projectId) ||
            !visibleTools.includes(tool);
          const href = buildToolUrl(
            tool.path,
            projectId,
            tool.requiresProject
          );

          return (
            <Link
              key={tool.name}
              href={href}
              onClick={(e) => {
                if (isDisabled) {
                  e.preventDefault();
                  return;
                }
                onClose();
              }}
              className={cn(
                "rounded-md px-2 py-1.5 text-[13px] transition-colors",
                isDisabled
                  ? "cursor-not-allowed opacity-30"
                  : "hover:bg-muted",
                isActive && "bg-muted font-medium text-foreground",
                !isActive && !isDisabled && "text-foreground/80"
              )}
            >
              {tool.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
