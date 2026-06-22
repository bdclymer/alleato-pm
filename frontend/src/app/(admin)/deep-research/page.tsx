"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";

import {
  Button,
  EmptyState,
  ErrorState,
} from "@/components/ds";
import { PageShell } from "@/components/layout";
import { ExpandableSearch } from "@/components/tables/unified/table-toolbar";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type WikiArchiveProject = {
  userId: string;
  topic: string;
  topicSlug: string;
  sessionId: string;
  wikiPath: string;
  title: string;
  updatedAt: string;
  artifactCount: number;
  markdownCount: number;
  sourceCount: number;
  logSummary: string | null;
};

type WikiArtifact = {
  path: string;
  kind: "markdown" | "source" | "log" | "other";
  bytes: number;
  content?: string | null;
};

type WikiArchiveResponse = {
  projects: WikiArchiveProject[];
  selectedProject: WikiArchiveProject | null;
  artifacts: WikiArtifact[];
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function artifactLabel(kind: WikiArtifact["kind"]): string {
  if (kind === "source") return "Source";
  if (kind === "log") return "Log";
  if (kind === "markdown") return "Wiki";
  return "Other";
}

function previewText(content: string | null | undefined): string {
  if (!content?.trim()) return "No text preview is available for this artifact.";
  return content;
}

export default function DeepResearchArchivePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [projects, setProjects] = React.useState<WikiArchiveProject[]>([]);
  const [selectedProject, setSelectedProject] = React.useState<WikiArchiveProject | null>(null);
  const [artifacts, setArtifacts] = React.useState<WikiArtifact[]>([]);
  const [selectedArtifactPath, setSelectedArtifactPath] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isArtifactLoading, setIsArtifactLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [artifactError, setArtifactError] = React.useState<string | null>(null);

  // Load the full project list without filtering so the workspace list stays stable.
  const loadProjects = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch<WikiArchiveResponse>("/api/admin/deep-research/archive?limit=100");
      setProjects(response.projects);
    } catch (err) {
      console.error("Failed to load Deep Research archive", err);
      setError(err instanceof Error ? err.message : `Archive load failed: ${JSON.stringify(err)}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Loads artifacts for a specific project without touching the project list
  const loadArtifacts = React.useCallback(async (project: WikiArchiveProject) => {
    const params = new URLSearchParams({
      userId: project.userId,
      topicSlug: project.topicSlug,
      sessionId: project.sessionId,
      limit: "1",
    });
    setIsArtifactLoading(true);
    setArtifactError(null);
    setSelectedProject(project);
    try {
      const response = await apiFetch<WikiArchiveResponse>(`/api/admin/deep-research/archive?${params.toString()}`);
      setSelectedProject(response.selectedProject ?? project);
      setArtifacts(response.artifacts);
      setSelectedArtifactPath(response.artifacts[0]?.path ?? null);
    } catch (err) {
      console.error("Failed to load project artifacts", err);
      setArtifacts([]);
      setSelectedArtifactPath(null);
      setArtifactError(err instanceof Error ? err.message : `Artifact load failed: ${JSON.stringify(err)}`);
    } finally {
      setIsArtifactLoading(false);
    }
  }, []);

  // Load projects once on initial mount
  React.useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  // Load artifacts when URL params change (e.g. project selection or deep-linked URL)
  React.useEffect(() => {
    const userId = searchParams?.get("userId");
    const topicSlug = searchParams?.get("topicSlug");
    const sessionId = searchParams?.get("sessionId");
    if (userId && topicSlug && sessionId) {
      void loadArtifacts({
        userId,
        topicSlug,
        sessionId,
        topic: topicSlug.replace(/-/g, " "),
        title: topicSlug.replace(/-/g, " "),
        wikiPath: "",
        updatedAt: new Date(0).toISOString(),
        artifactCount: 0,
        markdownCount: 0,
        sourceCount: 0,
        logSummary: null,
      });
    } else {
      setSelectedProject(null);
      setArtifacts([]);
      setSelectedArtifactPath(null);
    }
  }, [searchParams, loadArtifacts]);

  const filteredProjects = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return projects;
    return projects.filter((project) => {
      return [project.topic, project.title, project.sessionId, project.logSummary ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [projects, query]);

  const selectedArtifact = artifacts.find((artifact) => artifact.path === selectedArtifactPath) ?? artifacts[0] ?? null;

  // Update URL only; the searchParams effect handles loading artifacts.
  function selectProject(project: WikiArchiveProject) {
    const params = new URLSearchParams({
      userId: project.userId,
      topicSlug: project.topicSlug,
      sessionId: project.sessionId,
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <PageShell
      variant="detailWide"
      title="Deep Research Archive"
      actions={
        <Button variant="outline" onClick={() => void loadProjects()} disabled={isLoading}>
          <RefreshCw className={cn("mr-2 size-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      }
    >
      <div className="grid gap-8 lg:grid-cols-3">
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Workspaces</h2>
              <p className="text-sm text-muted-foreground">{filteredProjects.length} archived runs</p>
            </div>
            <ExpandableSearch
              value={query}
              onChange={setQuery}
              placeholder="Search workspaces..."
              ariaLabel="Search archived research workspaces"
            />
          </div>

          {error ? (
            <ErrorState title="Couldn't load the archive" description={error} />
          ) : null}

          <div className="divide-y divide-border overflow-hidden border-y border-border">
            {filteredProjects.map((project) => {
              const isSelected = selectedProject?.topicSlug === project.topicSlug && selectedProject?.sessionId === project.sessionId;
              return (
                <Button
                  key={`${project.userId}:${project.topicSlug}:${project.sessionId}`}
                  type="button"
                  variant="ghost"
                  onClick={() => selectProject(project)}
                  className={cn(
                    "h-auto min-h-16 w-full flex-col items-start justify-start gap-2 rounded-none px-1 py-3 text-left whitespace-normal transition-colors hover:bg-muted/50",
                    isSelected && "bg-muted/60",
                  )}
                >
                  <span className="block truncate text-sm font-medium text-foreground">{project.topic}</span>
                  <span className="line-clamp-2 text-sm leading-5 text-muted-foreground">
                    {project.logSummary ?? `Updated ${formatDateTime(project.updatedAt)}`}
                  </span>
                  <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{project.markdownCount} wiki</span>
                    <span>{project.sourceCount} sources</span>
                    <span>{formatDateTime(project.updatedAt)}</span>
                  </span>
                </Button>
              );
            })}
            {!isLoading && filteredProjects.length === 0 ? (
              <EmptyState
                title="No archived research found"
                description="Run an LLM wiki workflow, then refresh this archive."
              />
            ) : null}
          </div>
        </section>

        <section className="space-y-6 lg:col-span-2">
          {selectedProject ? (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <h2 className="truncate text-lg font-semibold text-foreground">{selectedProject.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedProject.artifactCount} files, session {selectedProject.sessionId}
                  </p>
                </div>
                {artifactError ? (
                  <Button variant="outline" size="sm" onClick={() => void loadArtifacts(selectedProject)} disabled={isArtifactLoading}>
                    Retry
                  </Button>
                ) : null}
              </div>

              {artifactError ? (
                <ErrorState
                  title="Couldn't load files"
                  description={artifactError}
                  onRetry={() => void loadArtifacts(selectedProject)}
                  className="border-y border-border py-10"
                />
              ) : null}

              <div className="grid gap-6 xl:grid-cols-3">
                <div className="divide-y divide-border overflow-hidden border-y border-border">
                  {isArtifactLoading ? (
                    <div className="px-1 py-3 text-sm text-muted-foreground">Loading files...</div>
                  ) : null}
                  {artifacts.map((artifact) => {
                    const isSelected = selectedArtifact?.path === artifact.path;
                    return (
                      <Button
                        key={artifact.path}
                        type="button"
                        variant="ghost"
                        onClick={() => setSelectedArtifactPath(artifact.path)}
                        className={cn(
                          "h-auto min-h-14 w-full flex-col items-start justify-start gap-1 rounded-none px-1 py-3 text-left whitespace-normal transition-colors hover:bg-muted/50",
                          isSelected && "bg-muted/60",
                        )}
                      >
                        <span className="block w-full truncate text-sm font-medium text-foreground">{artifact.path}</span>
                        <span className="text-xs text-muted-foreground">
                          {artifactLabel(artifact.kind)} - {formatBytes(artifact.bytes)}
                        </span>
                      </Button>
                    );
                  })}
                  {!isArtifactLoading && artifacts.length === 0 && !artifactError ? (
                    <div className="p-4 text-sm text-muted-foreground">No saved files in this workspace.</div>
                  ) : null}
                </div>

                <div className="min-h-96 overflow-hidden border-y border-border xl:col-span-2">
                  <div className="flex items-center justify-between gap-4 border-b border-border px-1 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{selectedArtifact?.path ?? "No file selected"}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedArtifact ? `${artifactLabel(selectedArtifact.kind)} - ${formatBytes(selectedArtifact.bytes)}` : "Choose a file to preview"}
                      </p>
                    </div>
                  </div>
                  <pre className="max-h-96 overflow-auto whitespace-pre-wrap px-1 py-4 text-sm leading-6 text-foreground">
                    {previewText(selectedArtifact?.content)}
                  </pre>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              title="No workspace selected"
              description="Choose a workspace to inspect saved sources, wiki pages, and logs."
            />
          )}
        </section>
      </div>
    </PageShell>
  );
}
