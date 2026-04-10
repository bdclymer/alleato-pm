"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getBestAvatarUrl } from "@/lib/gravatar"
import type { User } from "@supabase/supabase-js"
import {
  Folder,
  Bell,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  DollarSign,
  List,
  MessageSquare,
  Phone,
  SlidersHorizontal,
  Users,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

import {
  sidebarNavGroups,
  buildToolUrl,
  isActivePath,
  extractProjectId,
  type NavigationTool,
  type SidebarNavGroup,
} from "@/lib/navigation-config"
import { useProjectPermissions, hasModulePermission } from "@/hooks/use-project-permissions"
import { NavUser } from "@/components/nav/nav-user"
import { ProjectSelector } from "@/components/header/project-selector"
import { useHeaderNav } from "@/components/header/use-header-nav"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// =============================================================================
// Flyout panel that appears on hover in collapsed mode
// =============================================================================

function SidebarFlyout({
  group,
  tools,
  projectId,
  pathname,
  isOpen,
  onMouseEnter,
  onMouseLeave,
}: {
  group: SidebarNavGroup
  tools: NavigationTool[]
  projectId: number | null
  pathname: string
  isOpen: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "absolute left-full top-0 z-50 ml-1.5",
        "transition-all duration-200 ease-out",
        isOpen
          ? "pointer-events-auto translate-x-0 opacity-100"
          : "pointer-events-none -translate-x-1 opacity-0"
      )}
    >
      <div className="w-52 rounded-lg border border-border/60 bg-popover py-2 shadow-sm">
        <div className="px-3 pb-1.5 pt-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {group.label}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 px-1.5">
          {tools.map((tool) => {
            const isExternal = tool.path.startsWith("http")
            const href = isExternal
              ? tool.path
              : tool.path.startsWith("/")
                ? tool.path
                : buildToolUrl(tool.path, projectId, tool.requiresProject)
            const isActive = !isExternal && (tool.path.startsWith("/")
              ? pathname === tool.path || pathname.startsWith(tool.path + "/")
              : isActivePath(pathname, tool.path))
            const Icon = tool.icon
            const linkClass = cn(
              "flex items-center rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
              isActive
                ? "font-medium text-sidebar-foreground"
                : "text-foreground/80 hover:bg-sidebar-accent/60 hover:text-foreground"
            )

            return isExternal ? (
              <a
                key={`${tool.path}:${tool.name}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                <span className="truncate">{tool.name}</span>
              </a>
            ) : (
              <Link
                key={`${tool.path}:${tool.name}`}
                href={href}
                className={linkClass}
              >
                <span className="truncate">{tool.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Collapsed icon button with flyout
// =============================================================================

function CollapsedGroupIcon({
  group,
  tools,
  projectId,
  pathname,
  hasActiveChild,
}: {
  group: SidebarNavGroup
  tools: NavigationTool[]
  projectId: number | null
  pathname: string
  hasActiveChild: boolean
}) {
  const [isHovered, setIsHovered] = React.useState(false)
  const leaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = React.useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current)
      leaveTimerRef.current = null
    }
    setIsHovered(true)
  }, [])

  const handleMouseLeave = React.useCallback(() => {
    leaveTimerRef.current = setTimeout(() => {
      setIsHovered(false)
    }, 150)
  }, [])

  React.useEffect(() => {
    return () => {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
    }
  }, [])

  const minimalIconByGroup: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
    financial: DollarSign,
    operations: List,
    company: Folder,
    admin: SlidersHorizontal,
  }
  const Icon = minimalIconByGroup[group.id] ?? List

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {/* eslint-disable-next-line design-system/no-design-violations -- sidebar nav icon trigger with custom sidebar tokens */}
      <button
        type="button"
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150",
          isHovered
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : hasActiveChild
              ? "text-sidebar-foreground"
              : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        )}
        aria-label={group.label}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={1.3} />
      </button>
      <SidebarFlyout
        group={group}
        tools={tools}
        projectId={projectId}
        pathname={pathname}
        isOpen={isHovered}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  )
}

// =============================================================================
// Expanded navigation group
// =============================================================================

function ExpandedNavGroup({
  group,
  tools,
  projectId,
  pathname,
}: {
  group: SidebarNavGroup
  tools: NavigationTool[]
  projectId: number | null
  pathname: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="px-3 pb-1 pt-4 first:pt-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {group.label}
        </span>
      </div>
      {tools.map((tool) => {
        const isExternal = tool.path.startsWith("http")
        const href = isExternal
          ? tool.path
          : tool.path.startsWith("/")
            ? tool.path
            : buildToolUrl(tool.path, projectId, tool.requiresProject)
        const isActive = !isExternal && (tool.path.startsWith("/")
          ? pathname === tool.path || pathname.startsWith(tool.path + "/")
          : isActivePath(pathname, tool.path))
        const Icon = tool.icon
        const linkClass = cn(
          "mx-2 flex items-center rounded-md px-2.5 py-[7px] text-[13px] transition-colors duration-150",
          isActive
            ? "font-medium text-sidebar-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        )

        return isExternal ? (
          <a
            key={`${tool.path}:${tool.name}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            <span className="truncate">{tool.name}</span>
          </a>
        ) : (
          <Link
            key={`${tool.path}:${tool.name}`}
            href={href}
            className={linkClass}
          >
            <span className="truncate">{tool.name}</span>
          </Link>
        )
      })}
    </div>
  )
}

// =============================================================================
// Main AppSidebar
// =============================================================================

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()
  const { state, toggleSidebar, isMobile } = useSidebar()
  const [isHovering, setIsHovering] = React.useState(false)
  const hoverTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hover-to-peek: when collapsed, hovering expands temporarily
  // The sidebar reverts to collapsed when the mouse leaves
  const isPinned = state === "expanded"
  const isVisuallyExpanded = isPinned || (isHovering && !isMobile)
  // On mobile, the sidebar renders inside a Sheet — always show expanded navigation
  const isCollapsed = isMobile ? false : !isVisuallyExpanded
  const isTeamChatPage = pathname.startsWith("/team-chat")

  const handleMouseEnter = React.useCallback(() => {
    if (isPinned || isMobile) return
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => setIsHovering(true), 200)
  }, [isPinned, isMobile])

  const handleMouseLeave = React.useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    setIsHovering(false)
  }, [])

  // Clean up timer on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    }
  }, [])

  const [user, setUser] = React.useState<User | null>(null)
  const supabase = createClient()

  // Extract project ID from URL path
  const projectId = React.useMemo(() => extractProjectId(pathname), [pathname])
  const { permissions, userType, isAppAdmin } = useProjectPermissions(projectId)

  // Header nav hook for project selector
  const nav = useHeaderNav()

  // Filter tools by permission
  const filterTools = React.useCallback(
    (tools: NavigationTool[]): NavigationTool[] => {
      return tools.filter((tool) => {
        if (tool.onlyWithoutProject && projectId) return false;
        if (tool.requiresProject && !projectId) return false
        if (tool.adminOnly && !isAppAdmin && userType !== "developer") return false
        if (tool.module && projectId) {
          return hasModulePermission(permissions, tool.module, tool.requiredPermission || "read")
        }
        return true
      })
    },
    [projectId, permissions, isAppAdmin, userType]
  )

  // Check if a group has any active child
  const groupHasActiveChild = React.useCallback(
    (tools: NavigationTool[]): boolean => {
      return tools.some((tool) => {
        if (tool.path.startsWith("/")) {
          return pathname === tool.path || pathname.startsWith(tool.path + "/")
        }
        return isActivePath(pathname, tool.path)
      })
    },
    [pathname]
  )

  // Fetch current user
  React.useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      setUser(u)
    }
    fetchUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [supabase.auth])

  // User data for NavUser
  const userData = React.useMemo(() => {
    if (!user) return null
    const customAvatar = user.user_metadata?.avatar_url
    const userEmail = user.email || ""
    const avatarSrc = getBestAvatarUrl(customAvatar, userEmail)
    const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User"
    return { name: displayName, email: userEmail, avatar: avatarSrc || "" }
  }, [user])

  // Filtered groups
  const filteredGroups = React.useMemo(() => {
    return sidebarNavGroups
      .map((group) => ({
        ...group,
        tools: filterTools(group.tools),
      }))
      .filter((group) => group.tools.length > 0)
  }, [filterTools])

  const teamChatCollapsedShortcuts = React.useMemo(
    () => [
      { id: "activity", label: "Activity", icon: Bell },
      { id: "chat", label: "Chat", icon: MessageSquare, active: true },
      { id: "teams", label: "Teams", icon: Users },
      { id: "calendar", label: "Calendar", icon: CalendarDays },
      { id: "calls", label: "Calls", icon: Phone },
    ],
    []
  )

  return (
    <Sidebar
      collapsible="icon"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-hover-expanded={isHovering && !isPinned ? "true" : undefined}
      {...props}
    >
      {/* ── Header ── */}
      <SidebarHeader className={cn(isCollapsed ? "px-0 pt-6 pb-2" : "px-3 pt-5 pb-3")}>
        {isCollapsed ? (
          // Collapsed: logo icon + expand toggle
          <div className="flex flex-col items-center gap-1.5">
            <Link href="/" className="flex items-center justify-center">
              <Image
                src="/alleato-favicon.png"
                alt="Alleato"
                width={28}
                height={28}
                className="rounded"
              />
            </Link>
            {/* eslint-disable-next-line design-system/no-design-violations -- sidebar toggle with custom sidebar tokens */}
            <button
              type="button"
              onClick={toggleSidebar}
              className="mt-1 flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground/40 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              aria-label="Expand sidebar"
            >
              <ChevronsRight className="h-4 w-4" strokeWidth={1.4} />
            </button>
          </div>
        ) : (
          // Expanded: logo + project selector + toggle
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
                <Image
                  src="/Alleato-Group-Logo_Dark.png"
                  alt="Alleato Group"
                  width={146}
                  height={28}
                  className="h-7 w-auto"
                />
              </Link>
              {/* eslint-disable-next-line design-system/no-design-violations -- sidebar toggle with custom sidebar tokens */}
              <button
                type="button"
                onClick={toggleSidebar}
                className="flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground/40 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                aria-label="Collapse sidebar"
              >
                <ChevronsLeft className="h-4 w-4" strokeWidth={1.6} />
              </button>
            </div>
            {/* Project selector */}
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
        )}
      </SidebarHeader>

      {/* ── Content ── */}
      <SidebarContent
        className={cn(
          isCollapsed ? "items-center pl-1 pr-0 py-2" : "pl-2 pr-1 py-1",
          "group-data-[hover-expanded=true]:overflow-y-auto"
        )}
      >
        {isCollapsed ? (
          // Collapsed: group icons with hover flyouts
          <div className="flex flex-col items-center gap-1">
            {isTeamChatPage ? (
              <>
                {teamChatCollapsedShortcuts.map((item) => {
                  const Icon = item.icon
                  return (
                    <Button
                      key={item.id}
                      type="button"
                      variant="ghost"
                      size="icon"
                      title={item.label}
                      className={cn(
                        "h-9 w-9 rounded-lg text-sidebar-foreground/65",
                        item.active
                          ? "text-sidebar-foreground"
                          : "hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  )
                })}
                <div className="my-1 h-px w-7 bg-sidebar-border/70" />
              </>
            ) : null}
            {filteredGroups.map((group) => (
              <CollapsedGroupIcon
                key={group.id}
                group={group}
                tools={group.tools}
                projectId={projectId}
                pathname={pathname}
                hasActiveChild={groupHasActiveChild(group.tools)}
              />
            ))}
          </div>
        ) : (
          // Expanded: full navigation
          <div className="flex flex-col">
            {filteredGroups.map((group) => (
              <ExpandedNavGroup
                key={group.id}
                group={group}
                tools={group.tools}
                projectId={projectId}
                pathname={pathname}
              />
            ))}
          </div>
        )}
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter className={cn(isCollapsed ? "px-0 py-1.5" : "p-2")}>
        {/* User menu — works in both collapsed and expanded */}
        {userData && <NavUser user={userData} />}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
