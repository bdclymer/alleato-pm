"use client";
import { ProjectPageHeader } from "@/components/layout";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  PlayCircle,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Database,
  Brain,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/PageContainer";
import { apiFetch } from "@/lib/api-client";
import {
  UnifiedTablePage,
  type TableColumn,
  type ViewMode,
} from "@/components/tables/unified";

interface Document {
  id: string;
  fireflies_id: string;
  title: string;
  status: string;
  type: string;
  source: string;
  date: string;
  created_at: string;
  pipeline_stage: string;
  attempt_count: number;
  last_attempt_at: string;
  error_message: string | null;
}

interface PhaseCount {
  phase: string;
  ready: number;
  stage: string;
}

const statusConfig = {
  raw_ingested: {
    label: "Raw Ingested",
    color: "bg-muted text-foreground",
    icon: FileText,
  },
  segmented: {
    label: "Segmented",
    color: "bg-info/10 text-info",
    icon: Database,
  },
  embedded: {
    label: "Embedded",
    color: "bg-muted text-foreground",
    icon: Brain,
  },
  complete: {
    label: "Complete",
    color: "bg-success/10 text-success",
    icon: CheckCircle,
  },
  error: {
    label: "Error",
    color: "bg-destructive/10 text-destructive",
    icon: AlertCircle,
  },
  pending: {
    label: "Pending",
    color: "bg-warning/10 text-warning",
    icon: Clock,
  },
};

const phaseIconClass: Record<string, string> = {
  parse: "text-primary",
  embed: "text-muted-foreground",
  extract: "text-success",
};

const phaseConfig = {
  parse: {
    label: "Parse Documents",
    description: "Segment documents into semantic chunks",
    icon: Database,
  },
  embed: {
    label: "Generate Embeddings",
    description: "Create vector embeddings for search",
    icon: Brain,
  },
  extract: {
    label: "Extract Insights",
    description: "Extract decisions, risks, and opportunities",
    icon: Sparkles,
  },
};

export default function DocumentPipelinePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [phaseCounts, setPhaseCounts] = useState<PhaseCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentView, setCurrentView] = useState<ViewMode>("table");

  const fetchDocuments = async () => {
    try {
      setLoadError(null);
      const data = await apiFetch<{ documents: Document[] }>(
        "/api/documents/status",
      );
      setDocuments(data.documents);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Document status could not be loaded.";
      setLoadError(new Error(message));
      toast.error("Could not load document status", {
        description: message,
      });
    }
  };

  const fetchPhaseCounts = async () => {
    try {
      const data = await apiFetch<{ phaseCounts: PhaseCount[] }>(
        "/api/documents/trigger-pipeline",
      );
      setPhaseCounts(data.phaseCounts);
    } catch (error) {
      toast.error("Could not load pipeline phase counts", {
        description:
          error instanceof Error
            ? error.message
            : "The pipeline phase summary could not be loaded.",
      });
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchDocuments(), fetchPhaseCounts()]);
    setLoading(false);
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success("Document status updated");
  };

  const triggerPhase = async (phase: string) => {
    setTriggering(phase);

    // Show immediate feedback
    toast.loading(
      `Triggering ${phaseConfig[phase as keyof typeof phaseConfig]?.label || phase}...`,
      {
        id: `trigger-${phase}`,
      },
    );

    try {
      const data = await apiFetch<{ message?: string }>(
        "/api/documents/trigger-pipeline",
        {
          method: "POST",
          body: JSON.stringify({ phase }),
        },
      );

      toast.success(data.message || "Pipeline triggered successfully", {
        id: `trigger-${phase}`, // Replaces the loading toast
      });
      // Refresh data to show updated status
      await loadData();
    } catch (error) {
      toast.error("Could not trigger pipeline phase", {
        id: `trigger-${phase}`, // Replaces the loading toast
        description:
          error instanceof Error
            ? error.message
            : "The pipeline endpoint did not accept the request.",
      });
    } finally {
      setTriggering(null);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusBadge = (status: string, pipelineStage: string) => {
    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPhaseCount = (phase: string) => {
    return phaseCounts.find((pc) => pc.phase === phase)?.ready || 0;
  };

  const documentColumns = useMemo<TableColumn<Document>[]>(
    () => [
      {
        id: "title",
        label: "Title",
        alwaysVisible: true,
        sortable: true,
        render: (doc) => (
          <div className="min-w-0">
            <div
              className="truncate text-sm font-medium text-foreground"
              title={doc.title}
            >
              {doc.title}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {doc.fireflies_id}
            </div>
          </div>
        ),
        sortValue: (doc) => doc.title,
        csvValue: (doc) => doc.title,
        width: 280,
      },
      {
        id: "type",
        label: "Type",
        sortable: true,
        render: (doc) => <Badge variant="outline">{doc.type}</Badge>,
        sortValue: (doc) => doc.type,
        csvValue: (doc) => doc.type,
        width: 120,
      },
      {
        id: "status",
        label: "Status",
        sortable: true,
        render: (doc) => getStatusBadge(doc.status, doc.pipeline_stage),
        sortValue: (doc) => doc.status,
        csvValue: (doc) => doc.status,
        width: 150,
      },
      {
        id: "pipeline_stage",
        label: "Pipeline Stage",
        sortable: true,
        render: (doc) => (
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            {doc.pipeline_stage}
          </code>
        ),
        sortValue: (doc) => doc.pipeline_stage,
        csvValue: (doc) => doc.pipeline_stage,
        width: 150,
      },
      {
        id: "attempt_count",
        label: "Attempts",
        sortable: true,
        render: (doc) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {doc.attempt_count}
          </span>
        ),
        sortValue: (doc) => doc.attempt_count,
        csvValue: (doc) => String(doc.attempt_count),
        width: 100,
      },
      {
        id: "last_updated",
        label: "Last Updated",
        sortable: true,
        render: (doc) => (
          <span className="text-sm text-muted-foreground">
            {doc.last_attempt_at
              ? format(new Date(doc.last_attempt_at), "MMM d, h:mm a")
              : format(new Date(doc.created_at), "MMM d, h:mm a")}
          </span>
        ),
        sortValue: (doc) =>
          new Date(doc.last_attempt_at || doc.created_at).getTime(),
        csvValue: (doc) =>
          doc.last_attempt_at
            ? format(new Date(doc.last_attempt_at), "yyyy-MM-dd HH:mm")
            : format(new Date(doc.created_at), "yyyy-MM-dd HH:mm"),
        width: 150,
      },
      {
        id: "error",
        label: "Error",
        render: (doc) =>
          doc.error_message ? (
            <div
              className="flex min-w-0 items-center gap-1 text-destructive"
              title={doc.error_message}
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="truncate text-xs">{doc.error_message}</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          ),
        csvValue: (doc) => doc.error_message ?? "",
        width: 220,
      },
    ],
    [],
  );

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return documents;
    return documents.filter((doc) =>
      [
        doc.title,
        doc.fireflies_id,
        doc.status,
        doc.type,
        doc.source,
        doc.pipeline_stage,
        doc.error_message,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [documents, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <ProjectPageHeader
        title="Document Pipeline"
        description="Monitor and manage document processing pipeline"
        actions={
          <Button
            onClick={refreshData}
            variant="outline"
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={refreshing ? "animate-spin" : undefined} />
            Refresh
          </Button>
        }
      />
      <PageContainer>
        {/* Pipeline Phase Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(phaseConfig).map(([phase, config]) => {
            const Icon = config.icon;
            const count = getPhaseCount(phase);
            const isProcessing = triggering === phase;
            return (
              <Card
                key={phase}
                className={isProcessing ? "ring-2 ring-primary/50" : ""}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon
                        className={`h-5 w-5 ${phaseIconClass[phase] ?? "text-muted-foreground"} ${isProcessing ? "animate-pulse" : ""}`}
                      />
                      <CardTitle className="text-lg">{config.label}</CardTitle>
                    </div>
                    {isProcessing ? (
                      <Badge variant="default" className="bg-primary">
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Processing
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{count} ready</Badge>
                    )}
                  </div>
                  <CardDescription className="text-sm">
                    {config.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    variant={count > 0 ? "default" : "secondary"}
                    disabled={count === 0 || triggering !== null}
                    onClick={() => triggerPhase(phase)}
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <PlayCircle />
                        Trigger {config.label}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <UnifiedTablePage
          header={{
            title: "Document Status",
            description:
              "Monitor document processing state and pipeline errors.",
            variant: "compact",
          }}
          toolbar={{
            totalItems: documents.length,
            filteredItems: filteredDocuments.length,
            searchValue: search,
            onSearchChange: setSearch,
            searchPlaceholder: "Search documents...",
            currentView,
            onViewChange: (view) => {
              if (view === "table") setCurrentView(view);
            },
            enabledViews: ["table"],
          }}
          data={{
            items: filteredDocuments,
            isLoading: loading,
            error: loadError,
          }}
          table={{
            columns: documentColumns,
            getRowId: (doc) => doc.id,
            density: "compact",
            stickyHeader: true,
          }}
          features={{
            enableViews: false,
            enableColumnToggle: true,
            enableExport: true,
            enablePagination: true,
            enableBulkDelete: false,
            enableRowSelection: false,
          }}
          layout={{
            containerPadding: false,
            toolbarInlineWithHeader: true,
            minWidth: 980,
          }}
          emptyState={{
            title: "No documents found",
            description: "Documents will appear here after ingestion starts.",
            filteredDescription: "No documents match your search.",
            isFiltered: Boolean(search),
          }}
        />
      </PageContainer>
    </>
  );
}
