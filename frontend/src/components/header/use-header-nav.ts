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
import { apiFetch } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";

interface Project {
  id: number;
  name: string;
  "job number": string | null;
  phase: string | null;
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
const vendorTitleCache = new Map<string, string>();
const contactTitleCache = new Map<string, string>();
const commitmentTitleCache = new Map<string, string>();
const primePcoTitleCache = new Map<string, string>();
const changeEventTitleCache = new Map<string, string>();
const primeCoTitleCache = new Map<string, string>();
const commitmentCoTitleCache = new Map<string, string>();
const invoiceTitleCache = new Map<string, string>();
const rfiTitleCache = new Map<string, string>();
const submittalTitleCache = new Map<string, string>();
const subcontractorInvoiceTitleCache = new Map<string, { commitmentLabel: string; invoiceLabel: string }>();
const drawingTitleCache = new Map<string, string>();
const testRunTitleCache = new Map<string, string>();
const progressReportTitleCache = new Map<string, string>();

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
  const [vendorTitle, setVendorTitle] = useState<string | null>(null);
  const [contactTitle, setContactTitle] = useState<string | null>(null);
  const [commitmentTitle, setCommitmentTitle] = useState<string | null>(null);
  const [primePcoTitle, setPrimePcoTitle] = useState<string | null>(null);
  const [changeEventTitle, setChangeEventTitle] = useState<string | null>(null);
  const [primeCoTitle, setPrimeCoTitle] = useState<string | null>(null);
  const [commitmentCoTitle, setCommitmentCoTitle] = useState<string | null>(null);
  const [invoiceTitle, setInvoiceTitle] = useState<string | null>(null);
  const [rfiTitle, setRfiTitle] = useState<string | null>(null);
  const [submittalTitle, setSubmittalTitle] = useState<string | null>(null);
  const [subcontractorInvoiceInfo, setSubcontractorInvoiceInfo] = useState<{ commitmentLabel: string; invoiceLabel: string } | null>(null);
  const [drawingTitle, setDrawingTitle] = useState<string | null>(null);
  const [testRunTitle, setTestRunTitle] = useState<string | null>(null);
  const [progressReportTitle, setProgressReportTitle] = useState<string | null>(null);

  // Extract project ID from URL path or query parameters
  const projectId = useMemo(() => {
    const pathId = extractProjectId(pathname ?? "");
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
    const allTools: HeaderNavigationTool[] = [
      ...headerNavGroups.flatMap((g) => g.tools),
      ...adminSettingsTools,
    ];

    // Check if we're on a project-scoped page (/{projectId}/{tool})
    if (segments.length >= 2 && /^\d+$/.test(segments[0])) {
      const scopedPath = segments.slice(1).join("/");
      const scopedFirstSegment = segments[1];

      // Prefer the most specific path match to avoid collisions like
      // "directory" vs "directory/companies".
      const matchingTool = allTools
        .filter((tool) => tool.requiresProject !== false)
        .sort((left, right) => right.path.length - left.path.length)
        .find(
          (tool) =>
            tool.path === scopedPath ||
            scopedPath.startsWith(`${tool.path}/`) ||
            tool.path === scopedFirstSegment
        );
      return matchingTool?.name || "Home";
    }

    // Check global routes
    if (segments.length >= 1) {
      const firstSegment = segments[0];
      const aliasedPath = TABLE_ROUTE_ALIASES[firstSegment];
      const globalPath = segments.join("/");

      // Non-project URLs should resolve against non-project tools first.
      const globalTools = allTools.filter((tool) => tool.requiresProject === false);

      // Prefer exact full-path matches before first-segment fallbacks.
      const matchingTool = globalTools
        .sort((left, right) => right.path.length - left.path.length)
        .find(
          (tool) =>
            tool.path === globalPath ||
            (aliasedPath ? tool.path === aliasedPath : false) ||
            globalPath.startsWith(`${tool.path}/`) ||
            tool.path === firstSegment ||
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
    const skippedIndexes = new Set<number>();
    const allTools: HeaderNavigationTool[] = [
      ...headerNavGroups.flatMap((g) => g.tools),
      ...adminSettingsTools,
    ];
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
    const isPrimePcoDetailRoute =
      segments.length >= 3 &&
      segments[1] === "prime-contract-pcos" &&
      segments[2] !== "new";
    const isNestedPrimePcoDetailRoute =
      segments.length >= 6 &&
      segments[1] === "prime-contracts" &&
      segments[3] === "change-orders" &&
      segments[4] === "pcos" &&
      segments[5] !== "new";
    const isPrimeCoDetailRoute =
      segments.length >= 4 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "change-orders" &&
      segments[2] === "prime" &&
      segments[3] !== "new";
    const isCommitmentCoDetailRoute =
      segments.length >= 4 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "change-orders" &&
      segments[2] === "commitment" &&
      segments[3] !== "new";
    const isInvoiceDetailRoute =
      segments.length >= 5 &&
      segments[1] === "prime-contracts" &&
      segments[3] === "invoices" &&
      segments[4] !== "new";
    const isGlobalCompanyDetailRoute =
      segments.length >= 3 &&
      segments[0] === "directory" &&
      segments[1] === "companies" &&
      segments[2] !== "new";
    const isGlobalVendorDetailRoute =
      segments.length >= 3 &&
      segments[0] === "directory" &&
      segments[1] === "vendors" &&
      segments[2] !== "new";
    const isGlobalContactDetailRoute =
      segments.length >= 3 &&
      segments[0] === "directory" &&
      segments[1] === "contacts" &&
      segments[2] !== "new";
    const isProjectCompanyDetailRoute =
      segments.length >= 4 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "directory" &&
      segments[2] === "companies" &&
      segments[3] !== "new";
    const isRfiDetailRoute =
      segments.length >= 3 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "rfis" &&
      segments[2] !== "new";
    const isSubmittalDetailRoute =
      segments.length >= 3 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "submittals" &&
      segments[2] !== "new" &&
      segments[2] !== "recycle-bin" &&
      segments[2] !== "settings";
    const isSubcontractorInvoiceDetailRoute =
      segments.length >= 4 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "invoicing" &&
      segments[2] === "subcontractor" &&
      segments[3] !== "new";
    const isDrawingViewerRoute =
      segments.length >= 4 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "drawings" &&
      segments[2] === "viewer";
    const isDrawingDetailRoute =
      segments.length >= 3 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "drawings" &&
      ![
        "viewer",
        "board",
        "areas",
        "sets",
        "recycle-bin",
        "revisions-report",
        "new",
      ].includes(segments[2]);
    const isProgressReportDetailRoute =
      segments.length >= 3 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "progress-reports" &&
      /^[0-9a-f-]{36}$/i.test(segments[2]);
    const isTestRunDetailRoute =
      segments.length >= 3 &&
      segments[0] === "testing" &&
      segments[1] === "runs" &&
      /^[0-9a-f-]{36}$/i.test(segments[2]);

    // Always start with Projects
    crumbs.push({ label: "Projects", href: "/" });

    segments.forEach((segment, index) => {
      if (skippedIndexes.has(index)) return;

      let href = `/${segments.slice(0, index + 1).join("/")}`;
      let label: string;

      // Keep nested prime-contract PCO breadcrumbs on valid routes.
      if (isNestedPrimePcoDetailRoute) {
        const nestedProjectId = segments[0];
        const nestedContractId = segments[2];
        const nestedPcoId = segments[5];

        if (index === 3) {
          href = `/${nestedProjectId}/prime-contracts/change-orders`;
        } else if (index === 4) {
          href = `/${nestedProjectId}/prime-contracts/${nestedContractId}`;
        } else if (index === 5) {
          href = `/${nestedProjectId}/prime-contracts/${nestedContractId}/change-orders/pcos/${nestedPcoId}`;
        }
      }

      if (index === 0 && !/^\d+$/.test(segment)) {
        const globalMultiSegmentTool = allTools.find((tool) => {
          if (tool.requiresProject || !tool.path.includes("/")) return false;

          const toolSegments = tool.path.split("/");
          return segments.slice(0, toolSegments.length).join("/") === tool.path;
        });

        if (globalMultiSegmentTool) {
          label = globalMultiSegmentTool.name;
          href = `/${globalMultiSegmentTool.path}`;

          const toolDepth = globalMultiSegmentTool.path.split("/").length;
          for (let skippedIndex = 1; skippedIndex < toolDepth; skippedIndex += 1) {
            skippedIndexes.add(skippedIndex);
          }

          crumbs.push({ label, href });
          return;
        }
      }

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
      } else if (isPrimePcoDetailRoute && index === 2) {
        label = primePcoTitle || "Prime PCO";
      } else if (isNestedPrimePcoDetailRoute && index === 5) {
        label = primePcoTitle || "Prime PCO";
      } else if (isChangeEventDetailRoute && index === 2) {
        label = changeEventTitle || "Change Event";
      } else if (isPrimeCoDetailRoute && index === 3) {
        label = primeCoTitle || "Prime CO";
      } else if (isCommitmentCoDetailRoute && index === 3) {
        label = commitmentCoTitle || "Commitment CO";
      } else if (isInvoiceDetailRoute && index === 4) {
        label = invoiceTitle || "Invoice";
      } else if (isGlobalCompanyDetailRoute && index === 2) {
        label = companyTitle || "Company";
      } else if (isGlobalVendorDetailRoute && index === 2) {
        label = vendorTitle || "Vendor";
      } else if (isGlobalContactDetailRoute && index === 2) {
        label = contactTitle || "Contact";
      } else if (isProjectCompanyDetailRoute && index === 3) {
        label = companyTitle || "Company";
      } else if (isRfiDetailRoute && index === 2) {
        label = rfiTitle || "RFI";
      } else if (isSubmittalDetailRoute && index === 2) {
        label = submittalTitle || "Submittal";
      } else if (isSubcontractorInvoiceDetailRoute && index === 2) {
        label = subcontractorInvoiceInfo?.commitmentLabel ?? "Subcontractor";
      } else if (isSubcontractorInvoiceDetailRoute && index === 3) {
        label = subcontractorInvoiceInfo?.invoiceLabel ?? `Invoice #${segment}`;
      } else if (isDrawingDetailRoute && index === 2) {
        label = drawingTitle || "Drawing";
      } else if (isDrawingViewerRoute && index === 3) {
        label = drawingTitle || "Drawing";
      } else if (isTestRunDetailRoute && index === 2) {
        label = testRunTitle || "Run";
      } else if (isProgressReportDetailRoute && index === 2) {
        label = progressReportTitle || "Progress Report";
      } else if (index === 0 && segment === "directory") {
        // Global directory routes (/directory/vendors, /directory/clients, etc.)
        // — not project-scoped, so label as Company Directory
        label = "Company Directory";
      } else {
        // Try to find a matching tool name
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
            "prime-contract-pcos": "Prime Contract PCOs",
            pcos: "Potential Change Orders",
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
  }, [pathname, companyTitle, vendorTitle, contactTitle, currentProject, meetingTitle, globalMeetingTitle, primeContractTitle, commitmentTitle, primePcoTitle, changeEventTitle, primeCoTitle, commitmentCoTitle, invoiceTitle, rfiTitle, submittalTitle, subcontractorInvoiceInfo, drawingTitle, testRunTitle, progressReportTitle]);
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
        const data = await apiFetch<{ data?: { title?: unknown } }>(
          `/api/projects/${segments[0]}/meetings/${meetingId}`
        );
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

  useEffect(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const isDrawingViewerRoute =
      segments.length >= 4 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "drawings" &&
      segments[2] === "viewer";
    const isDrawingDetailRoute =
      segments.length >= 3 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "drawings" &&
      ![
        "viewer",
        "board",
        "areas",
        "sets",
        "recycle-bin",
        "revisions-report",
        "new",
      ].includes(segments[2]);

    if (!isDrawingViewerRoute && !isDrawingDetailRoute) {
      setDrawingTitle(null);
      return;
    }

    const projectId = segments[0];
    const drawingId = isDrawingViewerRoute ? segments[3] : segments[2];
    if (!drawingId) {
      setDrawingTitle(null);
      return;
    }

    const cacheKey = `${projectId}:${drawingId}`;
    const cachedTitle = drawingTitleCache.get(cacheKey);
    if (cachedTitle) {
      setDrawingTitle(cachedTitle);
      return;
    }

    let isActive = true;
    const fetchDrawingTitle = async () => {
      try {
        const data = await apiFetch<{ title?: unknown; drawing_number?: unknown }>(
          `/api/projects/${projectId}/drawings/${drawingId}`,
        );
        const resolvedTitle =
          (typeof data?.title === "string" && data.title.trim().length > 0
            ? data.title.trim()
            : null) ||
          (typeof data?.drawing_number === "string" &&
          data.drawing_number.trim().length > 0
            ? data.drawing_number.trim()
            : null);

        if (!isActive) return;
        if (resolvedTitle) {
          drawingTitleCache.set(cacheKey, resolvedTitle);
          setDrawingTitle(resolvedTitle);
        } else {
          setDrawingTitle(null);
        }
      } catch {
        // Best-effort only
      }
    };

    fetchDrawingTitle();
    return () => {
      isActive = false;
    };
  }, [pathname]);

  useEffect(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const isTestRunRoute =
      segments.length >= 3 &&
      segments[0] === "testing" &&
      segments[1] === "runs" &&
      /^[0-9a-f-]{36}$/i.test(segments[2]);

    if (!isTestRunRoute) {
      setTestRunTitle(null);
      return;
    }

    const runId = segments[2];
    const cached = testRunTitleCache.get(runId);
    if (cached) {
      setTestRunTitle(cached);
      return;
    }

    let isActive = true;
    const fetchTitle = async () => {
      try {
        const data = await apiFetch<{ run?: { suite?: { display_name?: unknown } } }>(
          `/api/testing/runs/${runId}`,
        );
        const title: string | null =
          typeof data?.run?.suite?.display_name === "string" &&
          data.run.suite.display_name.length > 0
            ? data.run.suite.display_name
            : null;
        if (isActive && title) {
          testRunTitleCache.set(runId, title);
          setTestRunTitle(title);
        }
      } catch {
        // Best-effort; raw "Run" fallback is fine
      }
    };

    fetchTitle();
    return () => { isActive = false; };
  }, [pathname]);

  useEffect(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const isProgressReportDetail =
      segments.length >= 3 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "progress-reports" &&
      /^[0-9a-f-]{36}$/i.test(segments[2]);

    if (!isProgressReportDetail) {
      setProgressReportTitle(null);
      return;
    }

    const reportId = segments[2];
    const cached = progressReportTitleCache.get(reportId);
    if (cached) {
      setProgressReportTitle(cached);
      return;
    }

    let isActive = true;
    const fetchTitle = async () => {
      try {
        const data = await apiFetch<{ report?: { title?: unknown } }>(
          `/api/projects/${segments[0]}/progress-reports/${reportId}`,
        );
        const title = typeof data?.report?.title === "string" && data.report.title.length > 0
          ? data.report.title
          : null;
        if (isActive && title) {
          progressReportTitleCache.set(reportId, title);
          setProgressReportTitle(title);
        }
      } catch {
        // Best-effort; "Progress Report" fallback is fine
      }
    };

    fetchTitle();
    return () => { isActive = false; };
  }, [pathname]);

  useEffect(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const isGlobalVendorDetailRoute =
      segments.length >= 3 &&
      segments[0] === "directory" &&
      segments[1] === "vendors" &&
      segments[2] !== "new";

    if (!isGlobalVendorDetailRoute) {
      setVendorTitle(null);
      return;
    }

    const vendorId = segments[2];
    if (!vendorId) {
      setVendorTitle(null);
      return;
    }

    const cachedTitle = vendorTitleCache.get(vendorId);
    if (cachedTitle) {
      setVendorTitle(cachedTitle);
      return;
    }

    let isActive = true;
    const fetchVendorTitle = async () => {
      try {
        const data = await apiFetch<{ name?: unknown }>(`/api/directory/vendors/${vendorId}`);
        const title =
          (typeof data?.name === "string" && data.name.length > 0 ? data.name : null);

        if (isActive) {
          if (title) {
            vendorTitleCache.set(vendorId, title);
            setVendorTitle(title);
          } else {
            setVendorTitle(null);
          }
        }
      } catch {
        // Best-effort only; fallback label remains
      }
    };

    fetchVendorTitle();
    return () => {
      isActive = false;
    };
  }, [pathname]);

  useEffect(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const isGlobalContactDetailRoute =
      segments.length >= 3 &&
      segments[0] === "directory" &&
      segments[1] === "contacts" &&
      segments[2] !== "new";

    if (!isGlobalContactDetailRoute) {
      setContactTitle(null);
      return;
    }

    const contactId = segments[2];
    if (!contactId) {
      setContactTitle(null);
      return;
    }

    const cachedTitle = contactTitleCache.get(contactId);
    if (cachedTitle) {
      setContactTitle(cachedTitle);
      return;
    }

    let isActive = true;
    const fetchContactTitle = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("people")
          .select("first_name, last_name, email")
          .eq("id", contactId)
          .single();

        if (error || !isActive) return;

        const fullName = `${data.first_name || ""} ${data.last_name || ""}`.trim();
        const title =
          (fullName.length > 0 ? fullName : null) ||
          (typeof data.email === "string" && data.email.length > 0 ? data.email : null);

        if (title) {
          contactTitleCache.set(contactId, title);
          setContactTitle(title);
        } else {
          setContactTitle(null);
        }
      } catch {
        // Best-effort only; fallback label remains
      }
    };

    fetchContactTitle();
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
        const data = await apiFetch<{ title?: unknown }>(`/api/meetings/${meetingId}`);
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
        const data = await apiFetch<{ title?: unknown }>(
          `/api/projects/${segments[0]}/contracts/${contractId}`,
        );
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
        const json = await apiFetch<{
          data?: { contract_number?: unknown; title?: unknown };
        }>(`/api/commitments/${commitmentId}`);
        const record = json?.data;
        const number = typeof record?.contract_number === "string" && record.contract_number.length > 0 && !/^[0-9a-f-]{36}$/i.test(record.contract_number) ? record.contract_number : null;
        const title = number ?? (typeof record?.title === "string" && record.title.length > 0 ? record.title : null);

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

  // Fetch title for prime contract PCO detail routes ([projectId]/prime-contract-pcos/[pcoId]).
  useEffect(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const isFlatPrimePcoDetailRoute =
      segments.length >= 3 &&
      segments[1] === "prime-contract-pcos" &&
      segments[2] !== "new";
    const isNestedPrimePcoDetailRoute =
      segments.length >= 6 &&
      segments[1] === "prime-contracts" &&
      segments[3] === "change-orders" &&
      segments[4] === "pcos" &&
      segments[5] !== "new";

    if (!isFlatPrimePcoDetailRoute && !isNestedPrimePcoDetailRoute) {
      setPrimePcoTitle(null);
      return;
    }

    const projectId = segments[0];
    const pcoId = isFlatPrimePcoDetailRoute ? segments[2] : segments[5];
    const cacheKey = `${projectId}:${pcoId}`;
    const cachedTitle = primePcoTitleCache.get(cacheKey);
    if (cachedTitle) {
      setPrimePcoTitle(cachedTitle);
      return;
    }

    let isActive = true;
    const fetchPrimePcoTitle = async () => {
      try {
        const data = await apiFetch<{ pco_number?: unknown; title?: unknown }>(
          `/api/projects/${projectId}/prime-contract-pcos/${pcoId}`,
        );
        const numberPart =
          typeof data?.pco_number === "string" && data.pco_number.length > 0
            ? `PCO #${data.pco_number}`
            : null;
        const titlePart =
          typeof data?.title === "string" && data.title.length > 0
            ? data.title
            : null;
        const title = titlePart && numberPart
          ? `${numberPart} — ${titlePart}`
          : (titlePart ?? numberPart);

        if (isActive) {
          if (title) {
            primePcoTitleCache.set(cacheKey, title);
            setPrimePcoTitle(title);
          } else {
            setPrimePcoTitle(null);
          }
        }
      } catch {
        // Best-effort only
      }
    };

    fetchPrimePcoTitle();
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
        const data = await apiFetch<{ title?: unknown; number?: unknown }>(
          `/api/projects/${segments[0]}/change-events/${changeEventId}`,
        );
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
        const data = await apiFetch<{ pcco_number?: unknown; title?: unknown }>(
          `/api/projects/${segments[0]}/prime-contract-change-orders/${primeCoId}`,
        );
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

  // Fetch title for commitment CO detail routes ([projectId]/change-orders/commitment/[commitmentCoId])
  useEffect(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const isCommitmentCoRoute =
      segments.length >= 4 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "change-orders" &&
      segments[2] === "commitment" &&
      segments[3] !== "new";

    if (!isCommitmentCoRoute) {
      setCommitmentCoTitle(null);
      return;
    }

    const projectId = segments[0];
    const commitmentCoId = segments[3];
    const cacheKey = `${projectId}:${commitmentCoId}`;
    const cached = commitmentCoTitleCache.get(cacheKey);
    if (cached) {
      setCommitmentCoTitle(cached);
      return;
    }

    let isActive = true;
    const fetchTitle = async () => {
      try {
        const data = await apiFetch<{
          title?: unknown;
          change_order_number?: unknown;
        }>(
          `/api/projects/${projectId}/commitment-change-orders/${commitmentCoId}`,
        );
        const titlePart =
          typeof data?.title === "string" && data.title.trim().length > 0
            ? data.title.trim()
            : null;
        const numberPart =
          typeof data?.change_order_number === "string" &&
          data.change_order_number.trim().length > 0
            ? `CO ${data.change_order_number.trim()}`
            : null;
        const title =
          titlePart && numberPart
            ? `${numberPart} — ${titlePart}`
            : (titlePart ?? numberPart);

        if (isActive) {
          if (title) {
            commitmentCoTitleCache.set(cacheKey, title);
            setCommitmentCoTitle(title);
          } else {
            setCommitmentCoTitle(null);
          }
        }
      } catch {
        // Best-effort only; fallback label remains
      }
    };

    fetchTitle();
    return () => {
      isActive = false;
    };
  }, [pathname]);

  // Fetch title for invoice detail routes ([projectId]/prime-contracts/[contractId]/invoices/[invoiceId])
  useEffect(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const isInvoiceRoute =
      segments.length >= 5 &&
      segments[1] === "prime-contracts" &&
      segments[3] === "invoices" &&
      segments[4] !== "new";

    if (!isInvoiceRoute) {
      setInvoiceTitle(null);
      return;
    }

    const projectId = segments[0];
    const contractId = segments[2];
    const invoiceId = segments[4];
    const cacheKey = `${projectId}:${contractId}:${invoiceId}`;
    const cached = invoiceTitleCache.get(cacheKey);
    if (cached) {
      setInvoiceTitle(cached);
      return;
    }

    let isActive = true;
    const fetchTitle = async () => {
      try {
        const data = await apiFetch<{ application_number?: unknown; title?: unknown }>(
          `/api/projects/${projectId}/contracts/${contractId}/payment-applications/${invoiceId}`,
        );
        // Note: page URL uses "invoices/[id]" but API route uses "payment-applications/[id]"
        const appNumber =
          typeof data?.application_number === "string" &&
          data.application_number.length > 0
            ? `Invoice #${data.application_number}`
            : null;
        const title =
          appNumber ||
          (typeof data?.title === "string" && data.title.length > 0
            ? data.title
            : null);
        if (isActive) {
          if (title) {
            invoiceTitleCache.set(cacheKey, title);
            setInvoiceTitle(title);
          } else {
            setInvoiceTitle(null);
          }
        }
      } catch {
        // Best-effort only
      }
    };

    fetchTitle();
    return () => {
      isActive = false;
    };
  }, [pathname]);

  // Fetch title for RFI detail routes ([projectId]/rfis/[rfiId])
  useEffect(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const isRfiDetailRoute =
      segments.length >= 3 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "rfis" &&
      segments[2] !== "new";

    if (!isRfiDetailRoute) {
      setRfiTitle(null);
      return;
    }

    const rfiId = segments[2];
    const cacheKey = `${segments[0]}:${rfiId}`;
    const cached = rfiTitleCache.get(cacheKey);
    if (cached) {
      setRfiTitle(cached);
      return;
    }

    let isActive = true;
    const fetchRfiTitle = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("rfis")
          .select("number, subject")
          .eq("id", rfiId)
          .single();

        if (!isActive || !data) return;
        const number =
          data.number != null && String(data.number).length > 0
            ? `RFI #${data.number}`
            : null;
        const subject =
          typeof data.subject === "string" && data.subject.length > 0
            ? data.subject
            : null;
        const title = subject ?? number;
        if (title) {
          rfiTitleCache.set(cacheKey, title);
          setRfiTitle(title);
        } else {
          setRfiTitle(null);
        }
      } catch {
        // Best-effort only
      }
    };

    fetchRfiTitle();
    return () => {
      isActive = false;
    };
  }, [pathname]);

  // Fetch title for submittal detail routes ([projectId]/submittals/[submittalId]).
  useEffect(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const isSubmittalDetailRoute =
      segments.length >= 3 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "submittals" &&
      segments[2] !== "new" &&
      segments[2] !== "recycle-bin" &&
      segments[2] !== "settings";

    if (!isSubmittalDetailRoute) {
      setSubmittalTitle(null);
      return;
    }

    const projectId = segments[0];
    const submittalId = segments[2];
    const cacheKey = `${projectId}:${submittalId}`;
    const cached = submittalTitleCache.get(cacheKey);
    if (cached) {
      setSubmittalTitle(cached);
      return;
    }

    let isActive = true;
    const fetchSubmittalTitle = async () => {
      // Resolve breadcrumb label from submittal number + title to avoid raw UUID crumbs.
      try {
        const data = await apiFetch<{ submittal_number?: unknown; title?: unknown }>(
          `/api/projects/${projectId}/submittals/${submittalId}`,
        );
        const number =
          typeof data?.submittal_number === "string" &&
          data.submittal_number.trim().length > 0
            ? data.submittal_number.trim()
            : null;
        const title =
          typeof data?.title === "string" && data.title.trim().length > 0
            ? data.title.trim()
            : null;
        const resolvedTitle = number && title ? `${number} — ${title}` : (title ?? number);

        if (!isActive) return;
        if (resolvedTitle) {
          submittalTitleCache.set(cacheKey, resolvedTitle);
          setSubmittalTitle(resolvedTitle);
        } else {
          setSubmittalTitle(null);
        }
      } catch {
        // Best-effort only
      }
    };

    fetchSubmittalTitle();
    return () => {
      isActive = false;
    };
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
        const data = await apiFetch<{ name?: unknown; company?: { name?: unknown } }>(endpoint);
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

  // Fetch info for subcontractor invoice detail routes ([projectId]/invoicing/subcontractor/[invoiceId])
  useEffect(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const isSubcontractorInvoiceDetailRoute =
      segments.length >= 4 &&
      /^\d+$/.test(segments[0]) &&
      segments[1] === "invoicing" &&
      segments[2] === "subcontractor" &&
      segments[3] !== "new";

    if (!isSubcontractorInvoiceDetailRoute) {
      setSubcontractorInvoiceInfo(null);
      return;
    }

    const projectId = segments[0];
    const invoiceId = segments[3];
    const cacheKey = `${projectId}:${invoiceId}`;
    const cached = subcontractorInvoiceTitleCache.get(cacheKey);
    if (cached) {
      setSubcontractorInvoiceInfo(cached);
      return;
    }

    let isActive = true;
    const fetchInfo = async () => {
      try {
        const data = await apiFetch<{
          data?: {
            subcontracts?: { contract_number?: string | null; title?: string | null } | null;
            purchase_orders?: { contract_number?: string | null; title?: string | null } | null;
            invoice_number?: unknown;
            id?: unknown;
          };
        }>(
          `/api/projects/${projectId}/invoicing/subcontractor/invoices/${invoiceId}`,
        );
        const invoice = data?.data;
        if (!invoice || !isActive) return;

        const sc = invoice.subcontracts ?? null;
        const po = invoice.purchase_orders ?? null;
        const contractNumber = sc?.contract_number ?? po?.contract_number ?? null;
        const contractTitle = sc?.title ?? po?.title ?? null;

        const commitmentLabel = contractNumber
          ? contractTitle
            ? `${contractNumber} — ${contractTitle}`
            : contractNumber
          : contractTitle ?? "Subcontractor Invoice";

        const invoiceLabel = invoice.invoice_number
          ? `Invoice #${invoice.invoice_number}`
          : `Invoice #${invoice.id}`;

        const info = { commitmentLabel, invoiceLabel };
        subcontractorInvoiceTitleCache.set(cacheKey, info);
        setSubcontractorInvoiceInfo(info);
      } catch {
        // Best-effort only
      }
    };

    fetchInfo();
    return () => { isActive = false; };
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
          const project = await apiFetch<Project>(`/api/projects/${projectId}`);
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
        const result = await apiFetch<{
          data?: Project[];
          meta?: { totalPages?: number };
        }>(
          `/api/projects?limit=100&page=${page}&archived=false&phase=Current`,
        );
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
