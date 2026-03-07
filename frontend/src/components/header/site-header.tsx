"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { useProjectPermissions } from "@/hooks/use-project-permissions";

import { useHeaderNav } from "./use-header-nav";
import { HeaderMobileMenu } from "./header-mobile-menu";

/**
 * Minimal top header — breadcrumbs only.
 * Primary navigation and user menu live in the sidebar.
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
      <div className="flex w-full items-center px-4 lg:px-6 min-w-0">
        {/* ── Left: Mobile hamburger + Breadcrumbs ── */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Mobile: Hamburger to open sidebar sheet */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="-ml-1 h-8 w-8 p-2 text-muted-foreground hover:text-foreground md:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Mobile menu (sheet-based) */}
          <div className="md:hidden">
            <HeaderMobileMenu
              projectId={nav.projectId}
              currentProject={nav.currentProject}
              activeToolName={nav.activeToolName}
              permissions={permissions}
              isAppAdmin={isAppAdmin}
              userType={userType}
              projects={nav.projects}
              loadingProjects={nav.loadingProjects}
              onFetchProjects={nav.fetchProjects}
              onProjectSelect={nav.handleProjectSelect}
              onViewAll={() => router.push("/")}
            />
          </div>

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
      </div>
    </header>
  );
}
