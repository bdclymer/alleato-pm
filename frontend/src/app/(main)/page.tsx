"use client";

import * as React from "react";
import {
  PortfolioFilters,
  ProjectsTable,
} from "@/components/portfolio";
import { PortfolioViewType, StatusFilter, Project } from "@/types/portfolio";
import { useRouter } from "next/navigation";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

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
        const params = new URLSearchParams();

        // Add filters to params
        if (searchQuery) params.append("search", searchQuery);
        if (statusFilter === "active") params.append("archived", "false");
        else if (statusFilter === "inactive") params.append("archived", "true");

        const response = await fetch(`/api/projects?${params.toString()}`);
        const result = await parseProjectsResponse(response);

        if (!result) {
          setProjects([]);
          return;
        }

        if (response.ok) {
          // Map Supabase data to our Project interface
          const mappedProjects: Project[] = (result.data || []).map(
            (p: Record<string, unknown>) => ({
              id: String(p.id),
              name: String(p.name || "Untitled Project"),
              jobNumber: String(p["job number"] || p.id),
              client: p.client || "",
              startDate: p["start date"] || null,
              state: p.state || "",
              phase: p.phase || "",
              estRevenue: p["est revenue"] || null,
              estProfit: p["est profit"] || null,
              category: p.category || "",
              // Legacy fields for backward compatibility
              projectNumber: String(p["job number"] || p.id),
              address: p.address || "",
              city:
                p.address && typeof p.address === "string"
                  ? p.address.split(",")[0] || ""
                  : "",
              zip: "",
              phone: "",
              status: p.archived ? "Inactive" : "Active",
              stage: p.phase || "Unknown",
              type: p.category || "General",
              notes: p.summary || "",
              isFlagged: false,
            }),
          );

          setProjects(mappedProjects);
        } else {
          setProjects([]);
        }
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
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden px-6 sm:px-8 lg:px-12 pt-6 pb-8">
        {/* Filters */}
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

        {/* Projects Table */}
        <div className="flex-1 overflow-hidden bg-background rounded-lg shadow-sm">
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
    </div>
  );
}
