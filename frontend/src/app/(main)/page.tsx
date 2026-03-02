"use client";

import * as React from "react";
import {
  PortfolioFilters,
  ProjectsTable,
} from "@/components/portfolio";
import { PortfolioViewType, StatusFilter, Project } from "@/types/portfolio";
import { useRouter } from "next/navigation";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { PageContainer, ProjectPageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function PortfolioPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] =
    React.useState<StatusFilter>("active");
  const [viewType, setViewType] =
    React.useState<PortfolioViewType>("thumbnails");
  const [phaseFilter, setPhaseFilter] = React.useState<string | null>(
    "Current",
  );
  const [categoryFilter, setCategoryFilter] = React.useState<string | null>(
    null,
  );
  const [clientFilter, setClientFilter] = React.useState<string | null>(null);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);

  const parseProjectsResponse = React.useCallback(
    async (response: Response) => {
      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        try {
          return await response.json();
        } catch (error) {
          return null;
        }
      }

      const fallbackBody = await response.text();
      console.error('Failed to fetch projects:', fallbackBody);
      return null;
    },
    [],
  );

  // Fetch projects from Supabase
  React.useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const baseParams = new URLSearchParams();

        if (searchQuery) baseParams.append("search", searchQuery);
        if (statusFilter === "active") baseParams.append("archived", "false");
        else if (statusFilter === "inactive")
          baseParams.append("archived", "true");

        const allProjectRows: Record<string, unknown>[] = [];
        let page = 1;
        let totalPages = 1;

        while (page <= totalPages) {
          const pagedParams = new URLSearchParams(baseParams);
          pagedParams.set("page", String(page));
          pagedParams.set("limit", "100");

          const response = await fetch(`/api/projects?${pagedParams.toString()}`);
          const result = await parseProjectsResponse(response);

          if (!result || !response.ok) {
            setProjects([]);
            return;
          }

          const pageRows = Array.isArray(result.data) ? result.data : [];
          allProjectRows.push(...pageRows);
          const apiTotalPages =
            typeof result.meta?.totalPages === "number"
              ? result.meta.totalPages
              : 1;
          totalPages = Math.max(apiTotalPages, 1);
          page += 1;
        }

        const toStringValue = (value: unknown, fallback = ""): string => {
          if (typeof value === "string") return value;
          if (typeof value === "number") return String(value);
          return fallback;
        };
        const toNullableString = (value: unknown): string | null =>
          typeof value === "string" ? value : null;
        const toNullableNumber = (value: unknown): number | null =>
          typeof value === "number" ? value : null;

        const mappedProjects: Project[] = allProjectRows.map(
          (p: Record<string, unknown>) => {
            const address = toStringValue(p.address);
            const phase = toStringValue(p.phase);
            const category = toStringValue(p.category);

            return {
              id: toStringValue(p.id, "0"),
              name: toStringValue(p.name, "Untitled Project"),
              jobNumber: toStringValue(p["job number"], toStringValue(p.id, "0")),
              client: toStringValue(p.client),
              startDate: toNullableString(p["start date"]),
              state: toStringValue(p.state),
              phase,
              estRevenue: toNullableNumber(p["est revenue"]),
              estProfit: toNullableNumber(p["est profit"]),
              category,
              // Legacy fields for backward compatibility
              projectNumber: toStringValue(
                p["job number"],
                toStringValue(p.id, "0"),
              ),
              address,
              city: address ? address.split(",")[0] || "" : "",
              zip: "",
              phone: "",
              status: p.archived ? "Inactive" : "Active",
              stage: phase || "Unknown",
              type: category || "General",
              notes: toStringValue(p.summary),
              isFlagged: false,
            };
          },
        );

        setProjects(mappedProjects);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
        // Intentionally swallowed: UI shows empty state on error
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [searchQuery, statusFilter, parseProjectsResponse]);

  // Extract unique phase, category, and client options from projects
  const phaseOptions = React.useMemo(() => {
    const phases = new Set(
      projects.map((p) => p.phase).filter((p): p is string => Boolean(p)),
    );
    return Array.from(phases).sort();
  }, [projects]);

  const categoryOptions = React.useMemo(() => {
    const categories = new Set(
      projects.map((p) => p.category).filter((c): c is string => Boolean(c)),
    );
    return Array.from(categories).sort();
  }, [projects]);

  const clientOptions = React.useMemo(() => {
    const clients = new Set(
      projects.map((p) => p.client).filter((c): c is string => Boolean(c)),
    );
    return Array.from(clients).sort();
  }, [projects]);

  // Filter projects based on phase, category, and client (search and status are handled server-side)
  const filteredProjects = React.useMemo(() => {
    return projects.filter((project) => {
      // Phase filter (case insensitive)
      if (
        phaseFilter &&
        phaseFilter !== "all" &&
        project.phase?.toLowerCase() !== phaseFilter.toLowerCase()
      )
        return false;

      // Category filter
      if (categoryFilter && project.category !== categoryFilter) return false;

      // Client filter
      if (clientFilter && project.client !== clientFilter) return false;

      return true;
    });
  }, [projects, phaseFilter, categoryFilter, clientFilter]);

  const handleExport = (format: "pdf" | "csv") => {
    // Export to CSV
    if (format === "csv") {
      const headers = [
        "Job Number",
        "Project Name",
        "Client",
        "Phase",
        "Category",
        "State",
        "Status",
      ];
      const csvData = filteredProjects.map((project) => [
        project.jobNumber,
        project.name,
        project.client || "",
        project.phase || "",
        project.category || "",
        project.state || "",
        project.status,
      ]);

      const csvContent = [
        headers.join(","),
        ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `portfolio-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }

    // Export to PDF
    else if (format === "pdf") {
      // For PDF, we'll open a print dialog as a simple solution
      // In production, you might want to use a library like jsPDF
      const printWindow = window.open("", "", "width=800,height=600");
      if (printWindow) {
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Portfolio Report</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #333; }
              table { border-collapse: collapse; width: 100%; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; font-weight: bold; }
              tr:nth-child(even) { background-color: #f9f9f9; }
              .header { margin-bottom: 20px; }
              .date { color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Portfolio Report</h1>
              <p class="date">Generated on: ${new Date().toLocaleDateString()}</p>
              <p>Total Projects: ${filteredProjects.length}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Job Number</th>
                  <th>Project Name</th>
                  <th>Client</th>
                  <th>Phase</th>
                  <th>Category</th>
                  <th>State</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${filteredProjects
                  .map(
                    (project) => `
                  <tr>
                    <td>${project.jobNumber}</td>
                    <td>${project.name}</td>
                    <td>${project.client || "-"}</td>
                    <td>${project.phase || "-"}</td>
                    <td>${project.category || "-"}</td>
                    <td>${project.state || "-"}</td>
                    <td>${project.status}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </body>
          </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();

        // Give it time to render then trigger print
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("active");
    setPhaseFilter("Current");
    setCategoryFilter(null);
    setClientFilter(null);
  };

  const handleProjectClick = (project: Project) => {
    router.push(`/${project.id}/home`);
  };

  const handleCreateProject = () => {
    router.push("/create-project");
  };

  return (
    <>
      <ProjectPageHeader
        title="Portfolio"
        description="All projects across your organization"
        actions={
          <Button size="sm" onClick={handleCreateProject}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        }
      />
      <PageContainer maxWidth="full">
        <div className="flex flex-col gap-4">
          <PortfolioFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            viewType={viewType}
            onViewTypeChange={setViewType}
            phaseFilter={phaseFilter}
            onPhaseFilterChange={setPhaseFilter}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            clientFilter={clientFilter}
            onClientFilterChange={setClientFilter}
            phaseOptions={phaseOptions}
            categoryOptions={categoryOptions}
            clientOptions={clientOptions}
            onClearFilters={handleClearFilters}
            onExport={handleExport}
            onCreateProject={handleCreateProject}
          />

          <div className="overflow-hidden bg-background rounded-lg border">
            {loading ? (
              <LoadingSkeleton />
            ) : (
              <ProjectsTable
                data={filteredProjects}
                onProjectClick={handleProjectClick}
                viewType={viewType === "list" ? "list" : "grid"}
              />
            )}
          </div>
        </div>
      </PageContainer>
    </>
  );
}
