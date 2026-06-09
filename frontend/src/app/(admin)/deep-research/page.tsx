"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BookOpen, FileText, RefreshCw, Search } from "lucide-react";

import { Button, EmptyState, Input, StatusBadge } from "@/components/ds";
import { PageShell } from "@/components/layout";
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

function buildArchiveUrl(project?: WikiArchiveProject | null): string {
  const params = new URLSearchParams({ limit: "100" });
  if (project) {
    params.set("userId", project.userId);
    params.set("topicSlug", project.topicSlug);
    params.set("sessionId", project.sessionId);
  }
  return `/api/admin/deep-research/archive?${params.toString()}`;
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
  const [error, setError] = React.useState<string | null>(null);

  const loadArchive = React.useCallback(async (project?: WikiArchiveProject | null) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch<WikiArchiveResponse>(buildArchiveUrl(project));
      setProjects(response.projects);
      setSelectedProject(response.selectedProject ?? project ?? null);
      setArtifacts(response.artifacts);
      setSelectedArtifactPath(response.artifacts[0]?.path ?? null);
    } catch (loadError) {
      console.error("Failed to load Deep Agents research archive", loadError);
      setError(loadError instanceof Error ? loadError.message : "Deep Agents research archive could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const userId = searchParams?.get("userId");
    const topicSlug = searchParams?.get("topicSlug");
    const sessionId = searchParams?.get("sessionId");
    if (userId && topicSlug && sessionId) {
      void loadArchive({
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
      return;
    }
    void loadArchive(null);
  }, [loadArchive, searchParams]);

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

  function selectProject(project: WikiArchiveProject) {
    const params = new URLSearchParams({
      userId: project.userId,
      topicSlug: project.topicSlug,
      sessionId: project.sessionId,
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    void loadArchive(project);
  }

  return (
    <PageShell
      variant="dashboard"
      title="Deep Research Archive"
      description="Browse prior Deep Agents LLM wiki research projects, saved source files, durable answers, and change logs."
      actions={
        <Button variant="outline" onClick={() => void loadArchive(selectedProject)} disabled={isLoading}>
          <RefreshCw className={cn("mr-2 size-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      }
    >
      <div className="grid gap-8 xl:grid-cols-[minmax(320px,420px)_1fr]">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Research projects</h2>
              <p className="text-sm text-muted-foreground">{projects.length} archived wiki workspaces</p>
            </div>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search topics, sessions, and summaries"
              className="pl-9"
            />
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="divide-y divide-border/60 overflow-hidden rounded-md border border-border/70">
            {filteredProjects.map((project) => {
              const isSelected = selectedProject?.topicSlug === project.topicSlug && selectedProject?.sessionId === project.sessionId;
              return (
                <Button
                  key={`${project.userId}:${project.topicSlug}:${project.sessionId}`}
                  type="button"
                  variant="ghost"
                  onClick={() => selectProject(project)}
                  className={cn(
                    "h-auto w-full flex-col items-stretch gap-2 rounded-none px-4 py-3 text-left whitespace-normal hover:bg-muted/40",
                    isSelected && "bg-muted/60",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{project.topic}</p>
                      <p className="text-xs text-muted-foreground">Updated {formatDateTime(project.updatedAt)}</p>
                    </div>
                    <StatusBadge status={project.sourceCount > 0 ? "active" : "draft"} />
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {project.logSummary ?? "No change-log summary has been recorded yet."}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{project.markdownCount} wiki pages</span>
                    <span>{project.sourceCount} sources</span>
                    <span>{project.sessionId}</span>
                  </div>
                </Button>
              );
            })}
            {!isLoading && filteredProjects.length === 0 ? (
              <EmptyState
                icon={<BookOpen />}
                title="No archived research found"
                description="Run an LLM wiki workflow first, then refresh this archive to browse saved projects."
              />
            ) : null}
          </div>
        </section>

        <section className="space-y-6">
          {selectedProject ? (
            <>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-semibold text-foreground">{selectedProject.title}</h2>
                  <StatusBadge status="active" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedProject.artifactCount} files saved in {selectedProject.wikiPath || "the selected backend workspace"}
                </p>
              </div>

              <div className="grid gap-6 lg:grid-cols-[minmax(220px,280px)_1fr]">
                <div className="divide-y divide-border/60 overflow-hidden rounded-md border border-border/70">
                  {artifacts.map((artifact) => {
                    const isSelected = selectedArtifact?.path === artifact.path;
                    return (
                      <Button
                        key={artifact.path}
                        type="button"
                        variant="ghost"
                        onClick={() => setSelectedArtifactPath(artifact.path)}
                        className={cn(
                          "h-auto w-full items-start justify-start gap-3 rounded-none px-3 py-3 text-left whitespace-normal hover:bg-muted/40",
                          isSelected && "bg-muted/60",
                        )}
                      >
                        <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{artifact.path}</span>
                          <span className="text-xs text-muted-foreground">
                            {artifactLabel(artifact.kind)} - {formatBytes(artifact.bytes)}
                          </span>
                        </span>
                      </Button>
                    );
                  })}
                  {!isLoading && artifacts.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">
                      Select a research project to load its saved files.
                    </div>
                  ) : null}
                </div>

                <div className="min-h-96 overflow-hidden rounded-md border border-border/70">
                  <div className="flex items-center justify-between gap-4 border-b border-border/70 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{selectedArtifact?.path ?? "No file selected"}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedArtifact ? `${artifactLabel(selectedArtifact.kind)} - ${formatBytes(selectedArtifact.bytes)}` : "Choose a file to preview"}
                      </p>
                    </div>
                  </div>
                  <pre className="max-h-96 overflow-auto whitespace-pre-wrap p-4 text-sm leading-6 text-foreground">
                    {previewText(selectedArtifact?.content)}
                  </pre>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              icon={<BookOpen />}
              title="Select a research project"
              description="Choose an archived Deep Agents wiki workspace to inspect its saved sources, wiki pages, and durable query answers."
            />
          )}
        </section>
      </div>
    </PageShell>
  );
}
