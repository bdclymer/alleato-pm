"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Folder,
  Bell,
  CalendarDays,
  ChevronDown,
  DollarSign,
  List,
  MessageSquare,
  Phone,
  SlidersHorizontal,
  Sparkles,
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
import { HeaderUserMenu } from "@/components/header/header-user-menu"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { useAiChatSidebarStore } from "@/lib/stores/ai-chat-sidebar-store"

import {
  sidebarNavGroups,
  subcontractorSidebarGroup,
  buildToolUrl,
  isActivePath,
  extractProjectId,
  type NavigationTool,
  type SidebarNavGroup,
} from "@/lib/navigation-config"
import { useProjectPermissions, hasModulePermission } from "@/hooks/use-project-permissions"
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
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
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
              "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
              isActive
                ? "bg-accent font-medium text-accent-foreground"
                : "text-foreground/75 hover:bg-accent/60 hover:text-foreground"
            )

            return isExternal ? (
              <a
                key={`${tool.path}:${tool.name}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                {Icon && <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />}
                <span className="truncate">{tool.name}</span>
              </a>
            ) : (
              <Link
                key={`${tool.path}:${tool.name}`}
                href={href}
                className={linkClass}
              >
                {Icon && <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />}
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
      <Button
        type="button"
        variant="ghost"
        size="icon"
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
      </Button>
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
  isOpen,
  onToggle,
}: {
  group: SidebarNavGroup
  tools: NavigationTool[]
  projectId: number | null
  pathname: string
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex flex-col mt-4 first:mt-1">
      <Button
        type="button"
        variant="ghost"
        onClick={onToggle}
        className="h-auto w-full justify-between rounded-md px-2 pb-1 pt-0 text-left hover:bg-transparent"
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
          {group.label}
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-sidebar-foreground/40 transition-transform duration-200",
            isOpen ? "rotate-0" : "-rotate-90"
          )}
          strokeWidth={2.5}
        />
      </Button>
      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-0.5 pb-1">
            {tools.map((tool) => {
              const isExternal = tool.path.startsWith("http")
              const href = isExternal
                ? tool.path
                : tool.path.startsWith("/")
                  ? tool.path
                  : buildToolUrl(tool.path, projectId, tool.requiresProject)
              const isActive = !isExternal && (tool.path.startsWith("/")
                ? pathname === tool.path || pathname.startsWith(`${tool.path}/`)
                : isActivePath(pathname, tool.path))
              const Icon = tool.icon
              const linkClass = cn(
                "flex items-center gap-2.5 rounded-md px-2 py-[7px] text-[13px] transition-colors duration-150",
                isActive
                  ? "bg-sidebar-accent font-medium text-sidebar-foreground"
                  : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )

              return isExternal ? (
                <a
                  key={`${tool.path}:${tool.name}`}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  {Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />}
                  <span className="truncate">{tool.name}</span>
                </a>
              ) : (
                <Link
                  key={`${tool.path}:${tool.name}`}
                  href={href}
                  className={linkClass}
                >
                  {Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />}
                  <span className="truncate">{tool.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Main AppSidebar
// =============================================================================

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()
  const { state, isMobile } = useSidebar()
  const { open: aiChatOpen, toggle: toggleAiChat } = useAiChatSidebarStore()
  const [isHovering, setIsHovering] = React.useState(false)
  const [user, setUser] = React.useState<User | null>(null)

  React.useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null))
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])
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
    hoverTimerRef.current = setTimeout(() => setIsHovering(false), 350)
  }, [])

  // Clean up timer on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    }
  }, [])

  // Extract project ID from URL path
  const projectId = React.useMemo(() => extractProjectId(pathname), [pathname])
  const { permissions, userType, isAppAdmin } = useProjectPermissions(projectId)

  // Header nav hook for project selector
  const nav = useHeaderNav()

  const isSubcontractor = userType === "subcontractor"

  // Filter tools by permission
  const filterTools = React.useCallback(
    (tools: NavigationTool[]): NavigationTool[] => {
      return tools.filter((tool) => {
        if (tool.onlyWithoutProject && projectId) return false;
        if (tool.requiresProject && !projectId) return false
        if (tool.adminOnly && !isAppAdmin && userType !== "developer") return false
        // Subcontractor-only tools: only show for subcontractors
        if (tool.subcontractorOnly && !isSubcontractor) return false
        // Hide subcontractor-only tools from non-subcontractors (already handled above)
        if (tool.module && projectId) {
          return hasModulePermission(permissions, tool.module, tool.requiredPermission || "read")
        }
        return true
      })
    },
    [projectId, permissions, isAppAdmin, userType, isSubcontractor]
  )

  // Check if a group has any active child
  const groupHasActiveChild = React.useCallback(
    (tools: NavigationTool[]): boolean => {
      return tools.some((tool) => {
        if (tool.path.startsWith("/")) {
          return pathname === tool.path || pathname.startsWith(`${tool.path}/`)
        }
        return isActivePath(pathname, tool.path)
      })
    },
    [pathname]
  )

  // Filtered groups — subcontractors get a focused single-group nav
  const filteredGroups = React.useMemo(() => {
    if (isSubcontractor && projectId) {
      const tools = filterTools(subcontractorSidebarGroup.tools)
      return tools.length > 0 ? [{ ...subcontractorSidebarGroup, tools }] : []
    }
    return sidebarNavGroups
      .map((group) => ({
        ...group,
        tools: filterTools(group.tools),
      }))
      .filter((group) => group.tools.length > 0)
  }, [filterTools, isSubcontractor, projectId])

  // Collapsible section state — first group open by default
  const [openGroupIds, setOpenGroupIds] = React.useState<Set<string>>(
    () => new Set([sidebarNavGroups[0]?.id ?? ""])
  )

  const toggleGroup = React.useCallback((groupId: string) => {
    setOpenGroupIds((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }, [])

  // Auto-expand the group that contains the active route
  React.useEffect(() => {
    const activeGroup = filteredGroups.find((g) => groupHasActiveChild(g.tools))
    if (activeGroup) {
      setOpenGroupIds((prev) => {
        if (prev.has(activeGroup.id)) return prev
        return new Set([...prev, activeGroup.id])
      })
    }
  }, [filteredGroups, groupHasActiveChild])

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
      <SidebarHeader className="px-0 pb-4 pt-5">
        {isCollapsed ? (
          // Collapsed: logo icon + AI chat button
          <div className="flex flex-col items-center gap-4">
            <Link href="/" className="flex items-center justify-center">
              <Image
                src="/alleato-favicon.png"
                alt="Alleato"
                width={28}
                height={28}
                className="rounded"
              />
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleAiChat}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                aiChatOpen
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
              aria-label="Toggle AI Strategist"
              title="AI Strategist"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          // Expanded: favicon + AI chat button
          <div className="flex flex-col gap-4">
            <div className="flex h-7 items-center justify-between gap-3 pl-6 pr-2">
              <Link
                href="/"
                className="flex items-center rounded-md transition-opacity hover:opacity-80"
              >
                <Image
                  src="/alleato-favicon.png"
                  alt="Alleato"
                  width={28}
                  height={28}
                  className="shrink-0 rounded"
                />
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleAiChat}
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
                  aiChatOpen
                    ? "bg-sidebar-accent text-sidebar-foreground"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
                aria-label="Toggle AI Strategist"
                title="AI Strategist"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </div>
            {/* Keep project selector only for mobile sidebar drawer */}
            <div className="md:hidden">
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
        )}
      </SidebarHeader>

      {/* ── Content ── */}
      <SidebarContent
        className={cn(
          isCollapsed ? "items-center pl-1 pr-0 py-2" : "px-3 py-1",
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
                isOpen={openGroupIds.has(group.id)}
                onToggle={() => toggleGroup(group.id)}
              />
            ))}
          </div>
        )}
      </SidebarContent>

      {/* User avatar — mobile sidebar only */}
      {isMobile && (
        <SidebarFooter className="border-t border-border/50 px-4 py-3">
          <HeaderUserMenu
            user={user}
            projectId={projectId}
            activeToolName=""
            permissions={permissions}
            isAppAdmin={isAppAdmin}
            userType={userType}
          />
        </SidebarFooter>
      )}

      <SidebarRail />
    </Sidebar>
  )
}
