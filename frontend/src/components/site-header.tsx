"use client";

import { useMemo, useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Menu, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getBestAvatarUrl } from "@/lib/gravatar";
import { toast } from "sonner";
import { IconLogout, IconUserCircle } from "@tabler/icons-react";

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Tool configuration - these will be scoped to projectId when available
const coreTools: Array<{
  name: string;
  path: string;
  requiresProject?: boolean;
}> = [
  { name: "Home", path: "home", requiresProject: true },
  { name: "360 Reporting", path: "reporting", requiresProject: true },
  { name: "Documents", path: "documents", requiresProject: true },
  { name: "Directory", path: "directory", requiresProject: true },
  { name: "Tables Directory", path: "tables-directory", requiresProject: false },
  { name: "Settings", path: "settings/plugins", requiresProject: false },
  { name: "Tasks", path: "tasks", requiresProject: true },
  { name: "Admin", path: "admin", requiresProject: true },
];

const projectManagementTools: Array<{
  name: string;
  path: string;
  requiresProject?: boolean;
}> = [
  { name: "Emails", path: "emails", requiresProject: true },
  { name: "RFIs", path: "rfis", requiresProject: true },
  { name: "Submittals", path: "submittals", requiresProject: true },
  { name: "Transmittals", path: "transmittals", requiresProject: true },
  { name: "Punch List", path: "punch-list", requiresProject: true },
  { name: "Meetings", path: "meetings", requiresProject: true },
  { name: "Schedule", path: "schedule", requiresProject: true },
  { name: "Daily Log", path: "daily-log", requiresProject: true },
  { name: "Photos", path: "photos", requiresProject: true },
  { name: "Drawings", path: "drawings", requiresProject: true },
  { name: "Specifications", path: "specifications", requiresProject: true },
];

const financialManagementTools: Array<{
  name: string;
  path: string;
  requiresProject?: boolean;
}> = [
  { name: "Prime Contracts", path: "prime-contracts", requiresProject: true },
  { name: "Budget", path: "budget", requiresProject: true },
  { name: "Budget V2", path: "budget-v2", requiresProject: true },
  { name: "Commitments", path: "commitments", requiresProject: true },
  { name: "Change Orders", path: "change-orders", requiresProject: true },
  { name: "Change Events", path: "change-events", requiresProject: true },
  { name: "Direct Costs", path: "direct-costs", requiresProject: true },
  { name: "Invoicing", path: "invoices", requiresProject: true },
];

const adminTools: Array<{
  name: string;
  path: string;
  requiresProject?: boolean;
}> = [
  {
    name: "Document Pipeline",
    path: "/admin/documents/pipeline",
    requiresProject: false,
  },
];

interface Project {
  id: number;
  name: string;
  "job number": string | null;
}

export function SiteHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [projectToolsOpen, setProjectToolsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
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

  // Generate avatar data from user
  const userEmail = user?.email || "";
  const avatarSrc = getBestAvatarUrl(user?.user_metadata?.avatar_url, userEmail);
  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User";
  const fallbackInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : displayName.slice(0, 2).toUpperCase();

  const parseProjectsResponse = async (response: Response) => {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        return await response.json();
      } catch (error) {
        return null;
      }
    }

    const fallbackBody = await response.text();
    console.error(
      "Projects API returned non-JSON response:",
      fallbackBody.slice(0, 200),
    );
    return null;
  };

  // Extract project ID from URL path or query parameters
  const projectId = useMemo(() => {
    // First check URL path segments
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const firstSegment = segments[0];
    if (firstSegment && /^\d+$/.test(firstSegment)) {
      return parseInt(firstSegment);
    }

    // Then check query parameters (both 'project' and 'projectId' for compatibility)
    const projectParam =
      searchParams?.get("project") || searchParams?.get("projectId");
    if (projectParam && /^\d+$/.test(projectParam)) {
      return parseInt(projectParam);
    }

    return null;
  }, [pathname, searchParams]);

  // Fetch current project details when project ID changes
  useEffect(() => {
    const fetchCurrentProject = async () => {
      if (projectId) {
        try {
          const response = await fetch(`/api/projects`);
          const data = await parseProjectsResponse(response);
          if (data?.data?.length) {
            const project = data.data.find((p: Project) => p.id === projectId);
            if (project) {
              setCurrentProject(project);
            }
          } else if (!response.ok) {
            }
        } catch (error) {

          console.error("Failed to process header data:", error);

          // Intentionally swallowed: error handling done by caller

        }
      } else {
        setCurrentProject(null);
      }
    };

    fetchCurrentProject();
  }, [projectId]);

  // Fetch projects when dropdown is opened
  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await fetch("/api/projects?limit=10&archived=false");
      const data = await parseProjectsResponse(response);
      if (data?.data) {
        setProjects(data.data);
      } else if (!response.ok) {
        }
    } catch (error) {

      console.error("Failed to fetch header data:", error);

      // Intentionally swallowed: component shows appropriate state on error

    } finally {
      setLoadingProjects(false);
    }
  };

  // Handle project selection - navigate to the same tool for the new project
  const handleProjectSelect = (newProjectId: number) => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];

    // Check if we're currently on a project-scoped page
    if (segments.length >= 2 && /^\d+$/.test(segments[0])) {
      // We're on a project page - navigate to the same tool for the new project
      const toolPath = segments.slice(1).join("/");
      router.push(`/${newProjectId}/${toolPath}`);
    } else {
      // Not on a project page - navigate to home for the new project
      router.push(`/${newProjectId}/home`);
    }
  };

  // Helper function to build project-scoped URLs
  const buildToolUrl = (toolPath: string, requiresProject: boolean = true) => {
    if (requiresProject && projectId) {
      return `/${projectId}/${toolPath}`;
    }
    return `/${toolPath}`;
  };

  // Determine the currently active tool from the URL
  const activeToolName = useMemo(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];

    // Check if we're on a project-scoped page (/{projectId}/{tool})
    if (segments.length >= 2 && /^\d+$/.test(segments[0])) {
      const toolPath = segments[1];

      // Search through all tool arrays to find the matching tool name
      const allTools = [
        ...coreTools,
        ...projectManagementTools,
        ...financialManagementTools,
      ];
      const matchingTool = allTools.find((tool) => tool.path === toolPath);

      return matchingTool?.name || "Home";
    }

    // Check if we're on a legacy query-param based page (e.g., /budget/line-item/new?projectId=47)
    if (segments.length >= 1) {
      const firstSegment = segments[0];
      const allTools = [
        ...coreTools,
        ...projectManagementTools,
        ...financialManagementTools,
      ];
      const matchingTool = allTools.find((tool) => tool.path === firstSegment);

      if (matchingTool) {
        return matchingTool.name;
      }
    }

    return "Home";
  }, [pathname]);

  // Generate breadcrumbs
  const breadcrumbs = useMemo(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const crumbs: Array<{ label: string; href: string }> = [];

    // Always start with home/projects
    crumbs.push({ label: "Home", href: "/" });

    segments.forEach((segment, index) => {
      const href = `/${segments.slice(0, index + 1).join("/")}`;
      let label: string;

      // Check if this segment is a project ID (numeric)
      if (index === 0 && /^\d+$/.test(segment)) {
        // This is a project ID - use the project name if available
        label = currentProject?.name || `Project ${segment}`;
      } else {
        // Try to find a matching tool name first
        const allTools = [
          ...coreTools,
          ...projectManagementTools,
          ...financialManagementTools,
          ...adminTools,
        ];
        const matchingTool = allTools.find((tool) => tool.path === segment);

        if (matchingTool) {
          label = matchingTool.name;
        } else {
          // Format segment name for display
          label = segment
            .split("-")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ");

          // Special cases for common paths
          const labelMap: Record<string, string> = {
            "budget-v2": "Budget V2",
            "prime-contracts": "Prime Contracts",
            "change-events": "Change Events",
            "change-orders": "Change Orders",
            "direct-costs": "Direct Costs",
            "daily-log": "Daily Log",
            "punch-list": "Punch List",
            "sov": "Schedule of Values",
            "rfis": "RFIs",
            "line-item": "Line Item",
            "new": "New",
            "edit": "Edit",
          };

          if (labelMap[segment]) {
            label = labelMap[segment];
          }
        }
      }

      crumbs.push({ label, href });
    });

    return crumbs;
  }, [pathname, currentProject]);

  // Component to render navigation tools in a mobile-friendly list
  const MobileToolsList = ({ closeMenu }: { closeMenu: () => void }) => (
    <div className="space-y-6 py-4">
      {/* Core Tools Section */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 px-4">
          Core Tools
        </h3>
        <div className="space-y-2">
          {coreTools.map((tool) => {
            const href = buildToolUrl(tool.path, tool.requiresProject);
            const isDisabled = tool.requiresProject && !projectId;

            return (
              <Link
                key={tool.name}
                href={href}
                onClick={(e) => {
                  if (isDisabled) {
                    e.preventDefault();
                  } else {
                    closeMenu();
                  }
                }}
                className={`flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                  isDisabled
                    ? "opacity-50 cursor-not-allowed text-muted-foreground"
                    : "text-foreground hover:bg-muted active:bg-muted/80"
                }`}
              >
                <span>{tool.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Project Management Section */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 px-4">
          Project Management
        </h3>
        <div className="space-y-2">
          {projectManagementTools.map((tool) => {
            const href = buildToolUrl(tool.path, tool.requiresProject);
            const isDisabled = tool.requiresProject && !projectId;

            return (
              <Link
                key={tool.name}
                href={href}
                onClick={(e) => {
                  if (isDisabled) {
                    e.preventDefault();
                  } else {
                    closeMenu();
                  }
                }}
                className={`flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                  isDisabled
                    ? "opacity-50 cursor-not-allowed text-muted-foreground"
                    : "text-foreground hover:bg-muted active:bg-muted/80"
                }`}
              >
                <span>{tool.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Financial Management Section */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 px-4">
          Financial Management
        </h3>
        <div className="space-y-2">
          {financialManagementTools.map((tool) => {
            const href = buildToolUrl(tool.path, tool.requiresProject);
            const isDisabled = tool.requiresProject && !projectId;

            return (
              <Link
                key={tool.name}
                href={href}
                onClick={(e) => {
                  if (isDisabled) {
                    e.preventDefault();
                  } else {
                    closeMenu();
                  }
                }}
                className={`flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                  isDisabled
                    ? "opacity-50 cursor-not-allowed text-muted-foreground"
                    : "text-foreground hover:bg-muted active:bg-muted/80"
                }`}
              >
                <span>{tool.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Admin Tools Section */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 px-4">
          Admin Tools
        </h3>
        <div className="space-y-2">
          {adminTools.map((tool) => (
            <Link
              key={tool.name}
              href={tool.path}
              onClick={closeMenu}
              className="flex items-center px-4 py-3 text-sm font-medium text-foreground hover:bg-muted active:bg-muted/80 transition-colors"
            >
              <span>{tool.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 pt-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) overflow-hidden">
      <div className="flex w-full items-center gap-1 px-2 sm:px-4 lg:gap-2 lg:px-6 min-w-0">
        {/* Desktop: Show sidebar trigger */}
        <SidebarTrigger className="-ml-1 hidden md:flex" />

        {/* Mobile: Show hamburger menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden p-2 h-8 w-8 hover:bg-muted"
              aria-label="Open navigation menu"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0">
            <SheetHeader className="px-4 py-6 border-b">
              <SheetTitle className="text-left">Navigation</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto h-[calc(100vh-120px)]">
              <MobileToolsList closeMenu={() => setMobileMenuOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4 hidden md:block"
        />

        {/* Breadcrumbs - Hidden on small screens */}
        <div className="hidden lg:flex items-center gap-1 text-sm font-medium min-w-0 overflow-hidden">
          {breadcrumbs.map((crumb, index) => (
            <span key={`${crumb.href}-${index}`} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              {index === breadcrumbs.length - 1 ? (
                <span className="text-foreground truncate">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors truncate"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </div>

        {/* Current page title for mobile */}
        <div className="lg:hidden flex-1 min-w-0">
          <h1 className="text-sm font-semibold truncate">
            {activeToolName}
          </h1>
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Project Selector - Responsive width */}
          <Select
            value={projectId?.toString() || ""}
            onValueChange={(value) => {
              if (value === "view-all") {
                router.push("/");
              } else {
                handleProjectSelect(parseInt(value));
              }
            }}
            onOpenChange={(open) => open && fetchProjects()}
          >
            <SelectTrigger className="h-8 w-[120px] sm:w-[160px] lg:w-[240px]">
              <SelectValue placeholder="Project">
                {currentProject ? (
                  <div className="flex items-center gap-1 min-w-0">
                    {currentProject["job number"] && (
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        #{currentProject["job number"]}
                      </span>
                    )}
                    <span className="font-medium truncate text-xs sm:text-sm">
                      {currentProject.name}
                    </span>
                  </div>
                ) : (
                  "Project"
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Recent Projects</SelectLabel>
                {loadingProjects ? (
                  <div className="py-2 px-2 text-center text-sm text-muted-foreground">
                    Loading...
                  </div>
                ) : projects.length > 0 ? (
                  projects.slice(0, 10).map((project) => (
                    <SelectItem
                      key={project.id}
                      value={project.id.toString()}
                      className="h-auto py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {project["job number"] && (
                          <span className="text-xs text-muted-foreground">
                            #{project["job number"]}
                          </span>
                        )}
                        <span className="font-medium truncate">{project.name}</span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <div className="py-2 px-2 text-center text-sm text-muted-foreground">
                    No projects found
                  </div>
                )}
              </SelectGroup>
              <SelectGroup>
                <SelectItem value="view-all" className="font-medium h-auto py-2">
                  View All Projects
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* Desktop Project Tools Dropdown */}
          <DropdownMenu
            open={projectToolsOpen}
            onOpenChange={setProjectToolsOpen}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-8 min-h-[2rem] hidden md:flex items-center gap-2 px-3 py-0 text-sm"
              >
                <span className="text-xs text-muted-foreground hidden lg:inline">
                  Project Tools
                </span>
                <span className="text-sm font-medium">
                  {activeToolName}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-screen max-w-4xl p-6 rounded-none border-x-0"
            >
              <div className="container mx-auto">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                  {/* Core Tools Column */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-foreground">
                      Core Tools
                    </h3>
                    <div className="space-y-1">
                      {coreTools.map((tool) => {
                        const href = buildToolUrl(tool.path, tool.requiresProject);
                        const isDisabled = tool.requiresProject && !projectId;

                        return (
                          <Link
                            key={tool.name}
                            href={href}
                            onClick={(e) => {
                              if (isDisabled) {
                                e.preventDefault();
                              } else {
                                setProjectToolsOpen(false);
                              }
                            }}
                            className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm transition-smooth ${
                              isDisabled
                                ? "opacity-50 cursor-not-allowed hover:bg-transparent"
                                : "hover:bg-muted"
                            }`}
                            aria-disabled={isDisabled}
                          >
                            <span>{tool.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* Project Management Column */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-foreground">
                      Project Management
                    </h3>
                    <div className="space-y-1">
                      {projectManagementTools.map((tool) => {
                        const href = buildToolUrl(tool.path, tool.requiresProject);
                        const isDisabled = tool.requiresProject && !projectId;

                        return (
                          <Link
                            key={tool.name}
                            href={href}
                            onClick={(e) => {
                              if (isDisabled) {
                                e.preventDefault();
                              } else {
                                setProjectToolsOpen(false);
                              }
                            }}
                            className={`flex w-full items-center rounded px-2 py-1.5 text-left text-sm transition-smooth ${
                              isDisabled
                                ? "opacity-50 cursor-not-allowed hover:bg-transparent"
                                : "hover:bg-muted"
                            }`}
                            aria-disabled={isDisabled}
                          >
                            <span>{tool.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* Financial Management Column */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-foreground">
                      Financial Management
                    </h3>
                    <div className="space-y-1">
                      {financialManagementTools.map((tool) => {
                        const href = buildToolUrl(tool.path, tool.requiresProject);
                        const isDisabled = tool.requiresProject && !projectId;

                        return (
                          <Link
                            key={tool.name}
                            href={href}
                            onClick={(e) => {
                              if (isDisabled) {
                                e.preventDefault();
                              } else {
                                setProjectToolsOpen(false);
                              }
                            }}
                            className={`flex w-full items-center rounded px-2 py-1.5 text-left text-sm transition-smooth ${
                              isDisabled
                                ? "opacity-50 cursor-not-allowed hover:bg-transparent"
                                : "hover:bg-muted"
                            }`}
                            aria-disabled={isDisabled}
                          >
                            <span>{tool.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* Admin Tools Column */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-foreground">
                      Admin Tools
                    </h3>
                    <div className="space-y-1">
                      {adminTools.map((tool) => (
                        <Link
                          key={tool.name}
                          href={tool.path}
                          onClick={() => setProjectToolsOpen(false)}
                          className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-muted transition-smooth"
                        >
                          <span>{tool.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center rounded-full border-2 border-border p-0.5 transition-smooth hover:border-primary hover:scale-105 focus-ring-brand"
                aria-label="Open user menu"
              >
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8 rounded-full">
                  <AvatarImage
                    src={avatarSrc}
                    alt="User avatar"
                    className="rounded-full"
                  />
                  <AvatarFallback className="rounded-full bg-primary/10 font-medium text-xs sm:text-sm">
                    {fallbackInitials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4} className="w-48">
              <DropdownMenuLabel className="text-sm font-semibold">
                {displayName}
              </DropdownMenuLabel>
              {user?.email && (
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  {user.email}
                </DropdownMenuLabel>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer transition-smooth">
                  <IconUserCircle className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive transition-smooth"
                onClick={async () => {
                  try {
                    await supabase.auth.signOut();
                    toast.success("Logged out successfully");
                    router.push("/auth/login");
                    router.refresh();
                  } catch (error) {
                    console.error("Logout error:", error);
                    toast.error("Failed to log out");
                  }
                }}
              >
                <IconLogout className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
