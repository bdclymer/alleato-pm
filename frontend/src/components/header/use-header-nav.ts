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

const meetingTitleCache = new Map<string, string>();
const globalMeetingTitleCache = new Map<string, string>();
const primeContractTitleCache = new Map<string, string>();
const companyTitleCache = new Map<string, string>();
const commitmentTitleCache = new Map<string, string>();
const changeEventTitleCache = new Map<string, string>();
const primeCoTitleCache = new Map<string, string>();

const TABLE_ROUTE_ALIASES: Record<string, string> = {
  tasks: "tasks",
  projects: "projects",
};

export function useHeaderNav(): UseHeaderNavReturn {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [meetingTitle, setMeetingTitle] = useState<string | null>(null);
  const [globalMeetingTitle, setGlobalMeetingTitle] = useState<string | null>(null);
  const [primeContractTitle, setPrimeContractTitle] = useState<string | null>(
    null,
  );
  const [companyTitle, setCompanyTitle] = useState<string | null>(null);
  const [commitmentTitle, setCommitmentTitle] = useState<string | null>(null);
  const [changeEventTitle, setChangeEventTitle] = useState<string | null>(null);
  const [primeCoTitle, setPrimeCoTitle] = useState<string | null>(null);

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
      const aliasedPath = TABLE_ROUTE_ALIASES[firstSegment];
      const allTools: HeaderNavigationTool[] = [
        ...headerNavGroups.flatMap((g) => g.tools),
        ...adminSettingsTools,
      ];
      const matchingTool = allTools.find(
        (tool) =>
          tool.path === firstSegment ||
          (aliasedPath ? tool.path === aliasedPath : false) ||
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
      toolPath = TABLE_ROUTE_ALIASES[segments[0]] ?? segments[0];
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
    const isGlobalMeetingDetailRoute =
      segments.length === 2 &&
      segments[0] === "meetings";
    const isPrimeContractDetailRoute =
      segments.length >= 3 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "prime-contracts";
    const isCommitmentDetailRoute =
      segments.length >= 3 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "commitments" &&
      segments[2] !== "new" &&
      segments[2] !== "recycle-bin" &&
      segments[2] !== "settings";
    const isChangeEventDetailRoute =
      segments.length >= 3 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "change-events" &&
      segments[2] !== "new";
    const isPrimeCoDetailRoute =
      segments.length >= 4 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "change-orders" &&
      segments[2] === "prime" &&
      segments[3] !== "new";
    const isGlobalCompanyDetailRoute =
      segments.length >= 3 &&
      segments[0] === "directory" &&
      segments[1] === "companies" &&
      segments[2] !== "new";
    const isProjectCompanyDetailRoute =
      segments.length >= 4 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "directory" &&
      segments[2] === "companies" &&
      segments[3] !== "new";

    // Always start with Projects
    crumbs.push({ label: "Projects", href: "/" });

    segments.forEach((segment, index) => {
      let href = `/${segments.slice(0, index + 1).join("/")}`;
      let label: string;

      // Check if this segment is a project ID (numeric)
      if (index === 0 && /^\d+$/.test(segment)) {
        label = currentProject?.name || `Project ${segment}`;
        href = `/${segment}/home`;
      } else if (isGlobalMeetingDetailRoute && index === 1) {
        label = globalMeetingTitle || "Meeting";
      } else if (isMeetingDetailRoute && index === 2) {
        label = meetingTitle || "Meeting";
      } else if (isPrimeContractDetailRoute && index === 2) {
        label = primeContractTitle || "Prime Contract";
      } else if (isCommitmentDetailRoute && index === 2) {
        label = commitmentTitle || "Commitment";
      } else if (isChangeEventDetailRoute && index === 2) {
        label = changeEventTitle || "Change Event";
      } else if (isPrimeCoDetailRoute && index === 3) {
        label = primeCoTitle || "Prime CO";
      } else if (isGlobalCompanyDetailRoute && index === 2) {
        label = companyTitle || "Company";
      } else if (isProjectCompanyDetailRoute && index === 3) {
        label = companyTitle || "Company";
      } else {
        // Try to find a matching tool name
        const allTools: HeaderNavigationTool[] = [
          ...headerNavGroups.flatMap((g) => g.tools),
          ...adminSettingsTools,
        ];
        const matchingTool = allTools.find((tool) => tool.path === segment);
        const aliasMatchingTool =
          index === 0 && TABLE_ROUTE_ALIASES[segment]
            ? allTools.find((tool) => tool.path === TABLE_ROUTE_ALIASES[segment])
            : null;

        if (matchingTool || aliasMatchingTool) {
          const resolvedTool = matchingTool ?? aliasMatchingTool;
          label = resolvedTool?.name ?? segment;
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
  }, [pathname, companyTitle, currentProject, meetingTitle, globalMeetingTitle, primeContractTitle, commitmentTitle, changeEventTitle, primeCoTitle]);
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

    const cachedTitle = meetingTitleCache.get(meetingId);
    if (cachedTitle) {
      setMeetingTitle(cachedTitle);
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
          if (typeof title === "string" && title.length > 0) {
            meetingTitleCache.set(meetingId, title);
            setMeetingTitle(title);
          } else {
            setMeetingTitle(null);
          }
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

  // Fetch title for global /meetings/[meetingId] route
  useEffect(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const isGlobalMeetingRoute =
      segments.length === 2 && segments[0] === "meetings";

    if (!isGlobalMeetingRoute) {
      setGlobalMeetingTitle(null);
      return;
    }

    const meetingId = segments[1];
    const cached = globalMeetingTitleCache.get(meetingId);
    if (cached) {
      setGlobalMeetingTitle(cached);
      return;
    }

    let isActive = true;
    const fetchTitle = async () => {
      try {
        const response = await fetch(`/api/meetings/${meetingId}`);
        if (!response.ok) return;
        const data = await response.json();
        const title = typeof data?.title === "string" && data.title.length > 0 ? data.title : null;
        if (isActive && title) {
          globalMeetingTitleCache.set(meetingId, title);
          setGlobalMeetingTitle(title);
        }
      } catch {
        // Best-effort; raw ID fallback is fine
      }
    };

    fetchTitle();
    return () => { isActive = false; };
  }, [pathname]);

  useEffect(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const isPrimeContractDetailRoute =
      segments.length >= 3 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "prime-contracts";

    if (!isPrimeContractDetailRoute) {
      setPrimeContractTitle(null);
      return;
    }

    const contractId = segments[2];
    if (!contractId || contractId === "new") {
      setPrimeContractTitle(null);
      return;
    }

    const cacheKey = `${segments[0]}:${contractId}`;
    const cachedTitle = primeContractTitleCache.get(cacheKey);
    if (cachedTitle) {
      setPrimeContractTitle(cachedTitle);
      return;
    }

    let isActive = true;
    const fetchPrimeContractTitle = async () => {
      try {
        const response = await fetch(
          `/api/projects/${segments[0]}/contracts/${contractId}`,
        );
        if (!response.ok) return;

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) return;

        const data = await response.json();
        const title =
          typeof data?.title === "string" && data.title.length > 0
            ? data.title
            : null;

        if (isActive) {
          if (title) {
            primeContractTitleCache.set(cacheKey, title);
            setPrimeContractTitle(title);
          } else {
            setPrimeContractTitle(null);
          }
        }
      } catch {
        // Best-effort only; fallback label remains
      }
    };

    fetchPrimeContractTitle();
    return () => {
      isActive = false;
    };
  }, [pathname]);

  useEffect(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const isCommitmentDetailRoute =
      segments.length >= 3 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "commitments" &&
      segments[2] !== "new" &&
      segments[2] !== "recycle-bin" &&
      segments[2] !== "settings";

    if (!isCommitmentDetailRoute) {
      setCommitmentTitle(null);
      return;
    }

    const commitmentId = segments[2];
    const cacheKey = `${segments[0]}:${commitmentId}`;
    const cachedTitle = commitmentTitleCache.get(cacheKey);
    if (cachedTitle) {
      setCommitmentTitle(cachedTitle);
      return;
    }

    let isActive = true;
    const fetchCommitmentTitle = async () => {
      try {
        const response = await fetch(`/api/commitments/${commitmentId}`);
        if (!response.ok) return;

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) return;

        const data = await response.json();
        const number = typeof data?.number === "string" && data.number.length > 0 && !/^[0-9a-f-]{36}$/i.test(data.number) ? data.number : null;
        const title = number ?? (typeof data?.title === "string" && data.title.length > 0 ? data.title : null);

        if (isActive) {
          if (title) {
            commitmentTitleCache.set(cacheKey, title);
            setCommitmentTitle(title);
          } else {
            setCommitmentTitle(null);
          }
        }
      } catch {
        // Best-effort only
      }
    };

    fetchCommitmentTitle();
    return () => {
      isActive = false;
    };
  }, [pathname]);

  // Fetch title for change event detail routes
  useEffect(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const isChangeEventDetailRoute =
      segments.length >= 3 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "change-events" &&
      segments[2] !== "new";

    if (!isChangeEventDetailRoute) {
      setChangeEventTitle(null);
      return;
    }

    const changeEventId = segments[2];
    const cacheKey = `${segments[0]}:${changeEventId}`;
    const cachedTitle = changeEventTitleCache.get(cacheKey);
    if (cachedTitle) {
      setChangeEventTitle(cachedTitle);
      return;
    }

    let isActive = true;
    const fetchChangeEventTitle = async () => {
      try {
        const response = await fetch(
          `/api/projects/${segments[0]}/change-events/${changeEventId}`,
        );
        if (!response.ok) return;

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) return;

        const data = await response.json();
        const title =
          typeof data?.title === "string" && data.title.length > 0
            ? data.title
            : typeof data?.number === "string" && data.number.length > 0
              ? data.number
              : null;

        if (isActive) {
          if (title) {
            changeEventTitleCache.set(cacheKey, title);
            setChangeEventTitle(title);
          } else {
            setChangeEventTitle(null);
          }
        }
      } catch {
        // Best-effort only; fallback label remains
      }
    };

    fetchChangeEventTitle();
    return () => {
      isActive = false;
    };
  }, [pathname]);

  // Fetch title for prime CO detail routes ([projectId]/change-orders/prime/[primeCoId])
  useEffect(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const isPrimeCoRoute =
      segments.length >= 4 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "change-orders" &&
      segments[2] === "prime" &&
      segments[3] !== "new";

    if (!isPrimeCoRoute) {
      setPrimeCoTitle(null);
      return;
    }

    const primeCoId = segments[3];
    const cacheKey = `${segments[0]}:${primeCoId}`;
    const cached = primeCoTitleCache.get(cacheKey);
    if (cached) {
      setPrimeCoTitle(cached);
      return;
    }

    let isActive = true;
    const fetchTitle = async () => {
      try {
        const response = await fetch(
          `/api/projects/${segments[0]}/prime-contract-change-orders/${primeCoId}`,
        );
        if (!response.ok) return;
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) return;
        const data = await response.json();
        const title =
          (typeof data?.pcco_number === "string" && data.pcco_number.length > 0
            ? data.pcco_number
            : null) ||
          (typeof data?.title === "string" && data.title.length > 0
            ? data.title
            : null);
        if (isActive) {
          if (title) {
            primeCoTitleCache.set(cacheKey, title);
            setPrimeCoTitle(title);
          } else {
            setPrimeCoTitle(null);
          }
        }
      } catch {
        // Best-effort only
      }
    };

    fetchTitle();
    return () => { isActive = false; };
  }, [pathname]);

  useEffect(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const isGlobalCompanyDetailRoute =
      segments.length >= 3 &&
      segments[0] === "directory" &&
      segments[1] === "companies" &&
      segments[2] !== "new";
    const isProjectCompanyDetailRoute =
      segments.length >= 4 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "directory" &&
      segments[2] === "companies" &&
      segments[3] !== "new";

    if (!isGlobalCompanyDetailRoute && !isProjectCompanyDetailRoute) {
      setCompanyTitle(null);
      return;
    }

    const projectId = isProjectCompanyDetailRoute ? segments[0] : null;
    const companyId = isProjectCompanyDetailRoute ? segments[3] : segments[2];
    if (!companyId) {
      setCompanyTitle(null);
      return;
    }

    const cacheKey = projectId ? `${projectId}:${companyId}` : companyId;
    const cachedTitle = companyTitleCache.get(cacheKey);
    if (cachedTitle) {
      setCompanyTitle(cachedTitle);
      return;
    }

    let isActive = true;
    const fetchCompanyTitle = async () => {
      try {
        const endpoint = projectId
          ? `/api/projects/${projectId}/directory/companies/${companyId}`
          : `/api/directory/companies/${companyId}`;
        const response = await fetch(endpoint);
        if (!response.ok) return;

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) return;

        const data = await response.json();
        const title =
          (typeof data?.name === "string" && data.name.length > 0
            ? data.name
            : null) ||
          (typeof data?.company?.name === "string" &&
          data.company.name.length > 0
            ? data.company.name
            : null);
        if (isActive) {
          if (title) {
            companyTitleCache.set(cacheKey, title);
            setCompanyTitle(title);
          } else {
            setCompanyTitle(null);
          }
        }
      } catch {
        // Best-effort only; fallback label remains
      }
    };

    fetchCompanyTitle();
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
          const response = await fetch(`/api/projects/${projectId}`);
          if (!response.ok) return;

          const contentType = response.headers.get("content-type") || "";
          if (!contentType.includes("application/json")) return;

          const project = (await response.json()) as Project;
          if (project?.id === projectId) {
            setCurrentProject(project);
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
      const allProjects: Project[] = [];
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const response = await fetch(
          `/api/projects?limit=100&page=${page}&archived=false`,
        );
        if (!response.ok) return;

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) return;

        const result = await response.json();
        const pageProjects = Array.isArray(result?.data) ? result.data : [];
        allProjects.push(...pageProjects);

        const apiTotalPages =
          typeof result?.meta?.totalPages === "number"
            ? result.meta.totalPages
            : 1;
        totalPages = Math.max(apiTotalPages, 1);
        page += 1;
      }

      setProjects(allProjects);
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
