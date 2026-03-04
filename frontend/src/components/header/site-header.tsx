"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { headerNavGroups } from "@/lib/navigation-config";

import { useHeaderNav } from "./use-header-nav";
import { MegaMenuPanel } from "./mega-menu-panel";
import { ProjectSelector } from "./project-selector";
import { HeaderUserMenu } from "./header-user-menu";
import { HeaderAdminMenu } from "./header-admin-menu";
import { HeaderMobileMenu } from "./header-mobile-menu";
import { cn } from "@/lib/utils";

// Display labels for each group in the header nav
const GROUP_LABELS: Record<string, string> = {
  operations: "Operations",
  finance: "Financial",
  company: "Company Tools",
};

export function SiteHeader() {
  const router = useRouter();
  const nav = useHeaderNav();
  const { toggleSidebar } = useSidebar();
  const { permissions, userType, isAppAdmin } = useProjectPermissions(
    nav.projectId
  );

  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  // ── Hover state for Apple-style nav ──────────────────────────────────────
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const startCloseTimeout = useCallback(() => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredGroup(null);
    }, 250);
  }, [clearCloseTimeout]);

  const handleNavItemEnter = useCallback(
    (groupId: string) => {
      clearCloseTimeout();
      setHoveredGroup(groupId);
    },
    [clearCloseTimeout]
  );

  const handleNavItemLeave = useCallback(() => {
    startCloseTimeout();
  }, [startCloseTimeout]);

  const handlePanelEnter = useCallback(() => {
    clearCloseTimeout();
  }, [clearCloseTimeout]);

  const handlePanelLeave = useCallback(() => {
    startCloseTimeout();
  }, [startCloseTimeout]);

  const closeMenu = useCallback(() => {
    clearCloseTimeout();
    setHoveredGroup(null);
  }, [clearCloseTimeout]);

  // Close on Escape
  useEffect(() => {
    if (!hoveredGroup) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [hoveredGroup, closeMenu]);

  // Close on click outside nav + panel
  useEffect(() => {
    if (!hoveredGroup) return;
    const handleClick = (e: MouseEvent) => {
      if (
        navRef.current &&
        !navRef.current.contains(e.target as Node) &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        closeMenu();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [hoveredGroup, closeMenu]);

  // Close on route change — track previous tool to detect navigation
  const prevToolRef = useRef(nav.activeToolName);
  useEffect(() => {
    if (prevToolRef.current !== nav.activeToolName) {
      prevToolRef.current = nav.activeToolName;
      setHoveredGroup(null);
    }
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => clearCloseTimeout();
  }, [clearCloseTimeout]);

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

  return (
    <header className="flex h-14 shrink-0 items-center py-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-14 overflow-visible bg-[#252525] text-zinc-300 relative z-50">
      <div className="flex w-full items-center px-2 sm:px-4 lg:px-6 min-w-0 relative">
        {/* ── Left section: Logo + Breadcrumbs ── */}
        <div className="flex items-center gap-1 lg:gap-2 min-w-0 flex-shrink">
          {/* Desktop: Sidebar trigger */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="-ml-1 hidden md:flex p-2 h-8 w-8 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
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

          {/* Breadcrumbs - Desktop only */}
          {nav.activeToolName !== "Projects" && (
            <>
              <Separator
                orientation="vertical"
                className="mx-2 data-[orientation=vertical]:h-4 hidden lg:block bg-zinc-700"
              />
              <div className="hidden lg:flex items-center gap-1 text-sm font-medium min-w-0 overflow-hidden">
                {nav.breadcrumbs.map((crumb, index) => (
                  <span
                    key={`${crumb.href}-${index}`}
                    className="flex items-center gap-1"
                  >
                    {index > 0 && (
                      <ChevronRight className="h-4 w-4 text-zinc-600 flex-shrink-0" />
                    )}
                    {index === nav.breadcrumbs.length - 1 ? (
                      <span className="text-zinc-200 truncate">
                        {crumb.label}
                      </span>
                    ) : (
                      <Link
                        href={crumb.href}
                        className="text-zinc-500 hover:text-zinc-200 transition-colors truncate"
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

        {/* ── Right section: Project + nav + controls ── */}
        <div className="ml-auto flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Project name — simplified, no background */}
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

          {/* Nav group links — right of project selector */}
          <nav
            ref={navRef}
            className="hidden md:flex items-center gap-3 ml-2"
          >
            {headerNavGroups.map((group) => {
              const isHovered = hoveredGroup === group.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  onMouseEnter={() => handleNavItemEnter(group.id)}
                  onMouseLeave={handleNavItemLeave}
                  onClick={() =>
                    setHoveredGroup((prev) =>
                      prev === group.id ? null : group.id
                    )
                  }
                  className={cn(
                    "px-2 py-1.5 text-sm font-medium transition-colors",
                    "text-zinc-400 hover:text-zinc-200",
                    isHovered && "text-zinc-200"
                  )}
                >
                  {GROUP_LABELS[group.id] || group.label}
                </button>
              );
            })}
          </nav>

          <HeaderAdminMenu
            projectId={nav.projectId}
            activeToolName={nav.activeToolName}
            permissions={permissions}
            isAppAdmin={isAppAdmin}
            userType={userType}
          />

          <EnhancedDevPanel />
          <HeaderUserMenu user={user} />
        </div>
      </div>

      {/* ── Full-width mega menu panel (Apple-style) ───────────────────────── */}
      {hoveredGroup && (
        <>
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div
            className="fixed inset-0 z-40 bg-black/40 top-14"
            onClick={closeMenu}
            aria-hidden="true"
          />
          <div
            ref={panelRef}
            className="fixed left-0 right-0 z-50 top-14 animate-in fade-in duration-150"
            onMouseEnter={handlePanelEnter}
            onMouseLeave={handlePanelLeave}
          >
            <MegaMenuPanel
              activeGroupId={hoveredGroup}
              projectId={nav.projectId}
              activeToolName={nav.activeToolName}
              onToolClick={closeMenu}
              permissions={permissions}
              isAppAdmin={isAppAdmin}
              userType={userType}
            />
          </div>
        </>
      )}
    </header>
  );
}
