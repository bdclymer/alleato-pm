"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getBestAvatarUrl } from "@/lib/gravatar"
import type { User } from "@supabase/supabase-js"
import { toast } from "sonner"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

import {
  coreTools,
  projectManagementTools,
  financialManagementTools,
  adminTools,
  buildToolUrl,
  isActivePath,
  extractProjectId,
  type NavigationTool,
} from "@/lib/navigation-config"
import { useProjectPermissions, hasModulePermission } from "@/hooks/use-project-permissions"

import { NavUser } from "@/components/nav/nav-user"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = React.useState<User | null>(null)
  const supabase = createClient()

  // Extract project ID from URL path
  const projectId = React.useMemo(() => extractProjectId(pathname), [pathname])
  const { permissions, userType, isAppAdmin, isLoading: permissionsLoading } = useProjectPermissions(projectId)

  // Filter tools by permission
  const filterTools = React.useCallback(
    (tools: NavigationTool[]): NavigationTool[] => {
      return tools.filter((tool) => {
        // Hide project-scoped tools when no project selected
        if (tool.requiresProject && !projectId) return false
        // Admin-only tools: only for app admins or developers
        if (tool.adminOnly && !isAppAdmin && userType !== "developer") return false
        // Module-gated tools: check user has required permission
        if (tool.module && projectId) {
          return hasModulePermission(permissions, tool.module, tool.requiredPermission || "read")
        }
        return true
      })
    },
    [projectId, permissions, isAppAdmin, userType]
  )

  // Fetch current user on mount and listen for auth changes
  React.useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    fetchUser()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  // Generate user data for NavUser component
  const userData = React.useMemo(() => {
    if (!user) return null

    const customAvatar = user.user_metadata?.avatar_url
    const userEmail = user.email || ""
    const avatarSrc = getBestAvatarUrl(customAvatar, userEmail)
    const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User"

    return {
      name: displayName,
      email: userEmail,
      avatar: avatarSrc || "",
    }
  }, [user])

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2 px-2 py-1 hover:opacity-80 transition-opacity">
          <Image
            src="/favicon-light.png"
            alt="Alleato"
            width={32}
            height={32}
            className="rounded"
          />
          <span className="font-semibold text-sidebar-foreground">Alleato</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {/* Core Tools */}
        {(() => {
          const visibleCoreTools = filterTools(coreTools)
          return visibleCoreTools.length > 0 ? (
            <SidebarGroup>
              <SidebarGroupLabel className="text-primary font-semibold">Core Tools</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleCoreTools.map((tool) => {
                    const href = buildToolUrl(tool.path, projectId, tool.requiresProject)
                    const isActive = isActivePath(pathname, tool.path)

                    return (
                      <SidebarMenuItem key={tool.name}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link href={href}>
                            {tool.name}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : null
        })()}

        {/* Project Management */}
        {(() => {
          const visibleProjectTools = filterTools(projectManagementTools)
          return visibleProjectTools.length > 0 ? (
            <SidebarGroup>
              <SidebarGroupLabel className="text-primary font-semibold">Project Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleProjectTools.map((tool) => {
                    const href = buildToolUrl(tool.path, projectId, tool.requiresProject)
                    const isActive = isActivePath(pathname, tool.path)

                    return (
                      <SidebarMenuItem key={tool.name}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link href={href}>
                            {tool.name}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : null
        })()}

        {/* Financial Management */}
        {(() => {
          const visibleFinancialTools = filterTools(financialManagementTools)
          return visibleFinancialTools.length > 0 ? (
            <SidebarGroup>
              <SidebarGroupLabel className="text-primary font-semibold">Financial Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleFinancialTools.map((tool) => {
                    const href = buildToolUrl(tool.path, projectId, tool.requiresProject)
                    const isActive = isActivePath(pathname, tool.path)

                    return (
                      <SidebarMenuItem key={tool.name}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link href={href}>
                            {tool.name}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : null
        })()}

        {/* Admin Tools */}
        {(() => {
          const visibleAdminTools = filterTools(adminTools)
          return visibleAdminTools.length > 0 ? (
            <SidebarGroup>
              <SidebarGroupLabel className="text-primary font-semibold">Admin Tools</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleAdminTools.map((tool) => {
                    const href = tool.path
                    const isActive = pathname === tool.path

                    return (
                      <SidebarMenuItem key={tool.name}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link href={href}>
                            {tool.name}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : null
        })()}
      </SidebarContent>
      {userData && (
        <SidebarFooter>
          <NavUser user={userData} />
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  )
}