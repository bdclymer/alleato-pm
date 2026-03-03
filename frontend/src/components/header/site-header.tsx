"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Menu } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/ui/sidebar";
import { EnhancedDevPanel } from "@/components/dev-tools/enhanced-dev-panel";
import { useProjectPermissions } from "@/hooks/use-project-permissions";
import { headerNavGroups, type HeaderNavGroup as HeaderNavGroupConfig } from "@/lib/navigation-config";

import { useHeaderNav } from "./use-header-nav";
import { HeaderNavGroup } from "./header-nav-group";
import { ProjectSelector } from "./project-selector";
import { HeaderUserMenu } from "./header-user-menu";
import { HeaderAdminMenu } from "./header-admin-menu";
import { HeaderMobileMenu } from "./header-mobile-menu";

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const nav = useHeaderNav();
  const { toggleSidebar } = useSidebar();
  const { permissions, userType, isAppAdmin } = useProjectPermissions(
    nav.projectId
  );

  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  // Fetch current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const isProjectHome =
    Boolean(nav.projectId) && pathname === `/${nav.projectId}/home`;
  const toolsMenuTools = headerNavGroups.flatMap((group) =>
    group.tools.map((tool) => {
      if (!nav.projectId && tool.name === "Meetings") {
        return { ...tool, requiresProject: false };
      }
      return tool;
    })
  );
  const toolsGroup: HeaderNavGroupConfig = {
    id: "tools",
    label: "Tools",
    tools: toolsMenuTools,
    subGroups: headerNavGroups.map((group) => ({
      label: group.label,
      toolNames: group.tools.map((tool) => tool.name),
      columns: group.id === "planning" ? 2 : 1,
    })),
  };

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 py-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) overflow-hidden bg-[#252525] text-zinc-100">
      <div className="flex w-full items-center gap-1 px-2 sm:px-4 lg:gap-2 lg:px-6 min-w-0">
        {/* Desktop: Sidebar trigger (hamburger lines) */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="-ml-1 hidden md:flex p-2 h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-800"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Alleato Logo */}
        <Image
          src="/Alleato-Group-Logo_Light.png"
          alt="Alleato"
          width={80}
          height={24}
          className="hidden md:block ml-4 mt-[5px]"
        />

        {/* Mobile: Hamburger menu */}
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

        {!isProjectHome && (
          <>
            <Separator
              orientation="vertical"
              className="mx-2 data-[orientation=vertical]:h-4 hidden md:block bg-zinc-700"
            />

            {/* Breadcrumbs - Desktop only */}
            <div className="hidden lg:flex items-center gap-1 text-sm font-medium min-w-0 overflow-hidden">
              {nav.breadcrumbs.map((crumb, index) => (
                <span key={`${crumb.href}-${index}`} className="flex items-center gap-1">
                  {index > 0 && (
                    <ChevronRight className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                  )}
                  {index === nav.breadcrumbs.length - 1 ? (
                    <span className="text-white truncate">{crumb.label}</span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="text-zinc-400 hover:text-white transition-colors truncate"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </span>
              ))}
            </div>
          </>
        )}

        <div className="md:hidden flex-1 min-w-0" />

        {/* Right side controls */}
        <div className="ml-auto flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Project Selector (desktop) */}
          <div className="hidden md:flex items-center gap-2 mr-2">
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

          {/* Tools Navigation (desktop only) */}
          <nav className="hidden md:flex items-center gap-0.5 mr-2">
            <HeaderNavGroup
              group={toolsGroup}
              isOpen={nav.openPanel === toolsGroup.id}
              onToggle={() => nav.togglePanel(toolsGroup.id)}
              onClose={nav.closePanels}
              projectId={nav.projectId}
              activeToolName={nav.activeToolName}
              activeGroupId={nav.activeGroupId ? toolsGroup.id : null}
              permissions={permissions}
              isAppAdmin={isAppAdmin}
              userType={userType}
            />
          </nav>

          {/* Admin/Settings Menu */}
          <HeaderAdminMenu
            projectId={nav.projectId}
            activeToolName={nav.activeToolName}
            permissions={permissions}
            isAppAdmin={isAppAdmin}
            userType={userType}
          />

          {/* Dev Tools Panel (dev only) */}
          <EnhancedDevPanel />

          {/* User Menu */}
          <HeaderUserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
