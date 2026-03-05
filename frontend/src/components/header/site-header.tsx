"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronRight, Menu } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EnhancedDevPanel } from "@/components/dev-tools/enhanced-dev-panel";
import { useProjectPermissions } from "@/hooks/use-project-permissions";
import { headerNavGroups } from "@/lib/navigation-config";

import { useHeaderNav } from "./use-header-nav";
import { ProjectSelector } from "./project-selector";
import { HeaderUserMenu } from "./header-user-menu";
import { HeaderMobileMenu } from "./header-mobile-menu";
import { ToolsDropdownContent } from "./tools-dropdown-variants";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const router = useRouter();
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
        data: { user: u },
      } = await supabase.auth.getUser();
      setUser(u);
    };
    fetchUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // All project tools need a project selected
  const allToolsRequireProject =
    nav.projectId === null &&
    headerNavGroups
      .filter((g) => g.id !== "company")
      .flatMap((g) => g.tools)
      .every((t) => t.requiresProject);

  return (
    <header className="relative z-50 flex h-14 shrink-0 items-center overflow-visible bg-white py-2 text-zinc-700 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-14">
      <div className="flex w-full items-center px-2 sm:px-4 lg:px-6 min-w-0 relative">
        {/* ── Left section: Logo + Breadcrumbs ── */}
        <div className="flex items-center gap-1 lg:gap-2 min-w-0 flex-shrink">
          {/* Desktop: Sidebar trigger */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="-ml-1 hidden h-8 w-8 p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 md:flex"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Alleato Logo */}
          <Link href="/" className="hidden md:block ml-4 mt-[5px]">
            <Image
              src="/Alleato-Group-Logo_Dark.png"
              alt="Alleato"
              width={80}
              height={24}
            />
          </Link>

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

          {/* Breadcrumbs - Desktop only */}
          {nav.activeToolName !== "Projects" && (
            <>
              <Separator
                orientation="vertical"
                className="mx-2 hidden bg-zinc-200 data-[orientation=vertical]:h-4 lg:block"
              />
              <div className="hidden lg:flex items-center gap-1 text-sm font-medium min-w-0 overflow-hidden">
                {nav.breadcrumbs.map((crumb, index) => (
                  <span
                    key={`${crumb.href}-${index}`}
                    className="flex items-center gap-1"
                  >
                    {index > 0 && (
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-zinc-400" />
                    )}
                    {index === nav.breadcrumbs.length - 1 ? (
                      <span className="truncate text-zinc-900">
                        {crumb.label}
                      </span>
                    ) : (
                      <Link
                        href={crumb.href}
                        className="truncate text-zinc-500 transition-colors hover:text-zinc-900"
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="md:hidden flex-1 min-w-0" />

        {/* ── Right section: Project + Tools + controls ── */}
        <div className="ml-auto flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Project selector */}
          <div className="hidden md:flex items-center">
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

          {/* ── Single "Tools" dropdown ── */}
          <Popover
            open={nav.openPanel === "tools"}
            onOpenChange={(open) => {
              if (open) nav.setOpenPanel("tools");
              else nav.closePanels();
            }}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={() => nav.togglePanel("tools")}
                className={cn(
                  "hidden md:flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                  nav.openPanel === "tools" && "bg-zinc-100 text-zinc-900",
                  nav.activeGroupId && nav.openPanel !== "tools" && "text-zinc-900"
                )}
              >
                Tools
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    nav.openPanel === "tools" && "rotate-180"
                  )}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={12}
              className="w-auto rounded-xl border border-zinc-200 bg-white p-0 shadow-lg"
            >
              <ToolsDropdownContent
                projectId={nav.projectId}
                activeToolName={nav.activeToolName}
                permissions={permissions}
                isAppAdmin={isAppAdmin}
                userType={userType}
                allToolsRequireProject={allToolsRequireProject}
                onClose={nav.closePanels}
              />
            </PopoverContent>
          </Popover>

          <EnhancedDevPanel />
          <HeaderUserMenu
            user={user}
            projectId={nav.projectId}
            activeToolName={nav.activeToolName}
            permissions={permissions}
            isAppAdmin={isAppAdmin}
            userType={userType}
          />
        </div>
      </div>
    </header>
  );
}
