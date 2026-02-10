"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  extractProjectId,
  headerNavGroups,
  getActiveGroupId,
  adminSettingsTools,
  type HeaderNavigationTool,
} from "@/lib/navigation-config";

interface Project {
  id: number;
  name: string;
  "job number": string | null;
}

interface Breadcrumb {
  label: string;
  href: string;
}

interface UseHeaderNavReturn {
  projectId: number | null;
  currentProject: Project | null;
  activeToolName: string;
  activeGroupId: string | null;
  breadcrumbs: Breadcrumb[];
  openPanel: string | null;
  setOpenPanel: (id: string | null) => void;
  togglePanel: (id: string) => void;
  closePanels: () => void;
  projects: Project[];
  loadingProjects: boolean;
  fetchProjects: () => void;
  handleProjectSelect: (projectId: number) => void;
}

export function useHeaderNav(): UseHeaderNavReturn {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [meetingTitle, setMeetingTitle] = useState<string | null>(null);

  // Extract project ID from URL path or query parameters
  const projectId = useMemo(() => {
    const pathId = extractProjectId(pathname);
    if (pathId) return pathId;

    // Fallback to query parameters for legacy URLs
    const projectParam =
      searchParams?.get("project") || searchParams?.get("projectId");
    if (projectParam && /^\d+$/.test(projectParam)) {
      return parseInt(projectParam);
    }
    return null;
  }, [pathname, searchParams]);

  // Determine the currently active tool from the URL
  const activeToolName = useMemo(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];

    // Check if we're on a project-scoped page (/{projectId}/{tool})
    if (segments.length >= 2 && /^\d+$/.test(segments[0])) {
      const toolPath = segments[1];

      // Search through header nav groups and admin tools
      const allTools: HeaderNavigationTool[] = [
        ...headerNavGroups.flatMap((g) => g.tools),
        ...adminSettingsTools,
      ];
      const matchingTool = allTools.find(
        (tool) => tool.path === toolPath || tool.path.split("/")[0] === toolPath
      );
      return matchingTool?.name || "Home";
    }

    // Check global routes
    if (segments.length >= 1) {
      const firstSegment = segments[0];
      const allTools: HeaderNavigationTool[] = [
        ...headerNavGroups.flatMap((g) => g.tools),
        ...adminSettingsTools,
      ];
      const matchingTool = allTools.find(
        (tool) =>
          tool.path === firstSegment ||
          tool.path === segments.join("/") ||
          tool.path.split("/")[0] === firstSegment
      );
      if (matchingTool) return matchingTool.name;
    }

    return "Projects";
  }, [pathname]);

  // Determine which header group contains the active tool
  const activeGroupId = useMemo(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    let toolPath = "";

    if (segments.length >= 2 && /^\d+$/.test(segments[0])) {
      toolPath = segments[1];
    } else if (segments.length >= 1) {
      toolPath = segments[0];
    }

    return getActiveGroupId(toolPath, headerNavGroups);
  }, [pathname]);

  // Generate breadcrumbs
  const breadcrumbs = useMemo(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const crumbs: Breadcrumb[] = [];
    const isMeetingDetailRoute =
      segments.length >= 3 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "meetings";

    // Always start with Projects
    crumbs.push({ label: "Projects", href: "/" });

    segments.forEach((segment, index) => {
      let href = `/${segments.slice(0, index + 1).join("/")}`;
      let label: string;

      // Check if this segment is a project ID (numeric)
      if (index === 0 && /^\d+$/.test(segment)) {
        label = currentProject?.name || `Project ${segment}`;
        href = `/${segment}/home`;
      } else if (isMeetingDetailRoute && index === 2) {
        label = meetingTitle || "Meeting";
      } else {
        // Try to find a matching tool name
        const allTools: HeaderNavigationTool[] = [
          ...headerNavGroups.flatMap((g) => g.tools),
          ...adminSettingsTools,
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

          // Special cases
          const labelMap: Record<string, string> = {
            "prime-contracts": "Prime Contracts",
            "change-events": "Change Events",
            "change-orders": "Change Orders",
            "direct-costs": "Direct Costs",
            "daily-log": "Daily Log",
            "punch-list": "Punch List",
            sov: "Schedule of Values",
            rfis: "RFIs",
            "line-item": "Line Item",
            new: "New",
            edit: "Edit",
          };

          if (labelMap[segment]) {
            label = labelMap[segment];
          }
        }
      }

      crumbs.push({ label, href });
    });

    return crumbs;
  }, [pathname, currentProject, meetingTitle]);
  useEffect(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const isMeetingDetailRoute =
      segments.length >= 3 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "meetings";

    if (!isMeetingDetailRoute) {
      setMeetingTitle(null);
      return;
    }

    const meetingId = segments[2];
    if (!meetingId || meetingId === "new") {
      setMeetingTitle(null);
      return;
    }

    let isActive = true;
    const fetchMeetingTitle = async () => {
      try {
        const response = await fetch(
          `/api/projects/${segments[0]}/meetings/${meetingId}`
        );
        if (!response.ok) return;

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) return;

        const data = await response.json();
        const title = data?.data?.title;
        if (isActive) {
          setMeetingTitle(typeof title === "string" ? title : null);
        }
      } catch {
        // Best-effort only; fallback label remains
      }
    };

    fetchMeetingTitle();
    return () => {
      isActive = false;
    };
  }, [pathname]);

  // Auto-close panels on route change
  useEffect(() => {
    setOpenPanel(null);
  }, [pathname]);

  // Fetch current project details when project ID changes
  useEffect(() => {
    const fetchCurrentProject = async () => {
      if (projectId) {
        try {
          const response = await fetch(`/api/projects`);
          if (!response.ok) return;

          const contentType = response.headers.get("content-type") || "";
          if (!contentType.includes("application/json")) return;

          const data = await response.json();
          if (data?.data?.length) {
            const project = data.data.find(
              (p: Project) => p.id === projectId
            );
            if (project) {
              setCurrentProject(project);
            }
          }
        } catch {
          // Silently fail - project name is optional
        }
      } else {
        setCurrentProject(null);
      }
    };

    fetchCurrentProject();
  }, [projectId]);

  // Fetch projects for the selector dropdown
  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const response = await fetch("/api/projects?limit=10&archived=false");
      if (!response.ok) return;

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) return;

      const data = await response.json();
      if (data?.data) {
        setProjects(data.data);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  // Handle project selection - navigate to the same tool for the new project
  const handleProjectSelect = useCallback(
    (newProjectId: number) => {
      const segments = pathname?.split("/").filter(Boolean) ?? [];

      // Check if we're currently on a project-scoped page
      if (segments.length >= 2 && /^\d+$/.test(segments[0])) {
        // Navigate to the same tool for the new project
        const toolPath = segments.slice(1).join("/");
        router.push(`/${newProjectId}/${toolPath}`);
      } else {
        // Navigate to home for the new project
        router.push(`/${newProjectId}/home`);
      }
    },
    [pathname, router]
  );

  const togglePanel = useCallback((id: string) => {
    setOpenPanel((prev) => (prev === id ? null : id));
  }, []);

  const closePanels = useCallback(() => {
    setOpenPanel(null);
  }, []);

  return {
    projectId,
    currentProject,
    activeToolName,
    activeGroupId,
    breadcrumbs,
    openPanel,
    setOpenPanel,
    togglePanel,
    closePanels,
    projects,
    loadingProjects,
    fetchProjects,
    handleProjectSelect,
  };
}
