"use client";

import { useState, useEffect } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { PageHeader } from "@/components/layout/page-header-unified";

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
    color: "bg-purple-100 text-purple-800",
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

const phaseConfig = {
  parse: {
    label: "Parse Documents",
    description: "Segment documents into semantic chunks",
    icon: Database,
    color: "blue",
  },
  embed: {
    label: "Generate Embeddings",
    description: "Create vector embeddings for search",
    icon: Brain,
    color: "purple",
  },
  extract: {
    label: "Extract Insights",
    description: "Extract decisions, risks, and opportunities",
    icon: Sparkles,
    color: "green",
  },
};

export default function DocumentPipelinePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [phaseCounts, setPhaseCounts] = useState<PhaseCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [triggering, setTriggering] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      const response = await fetch("/api/documents/status");
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents);
      } else {
        toast.error("Failed to fetch documents");
      }
    } catch (error) {
      toast.error("Failed to fetch documents");
    }
  };

  const fetchPhaseCounts = async () => {
    try {
      const response = await fetch("/api/documents/trigger-pipeline");
      if (response.ok) {
        const data = await response.json();
        setPhaseCounts(data.phaseCounts);
      }
    } catch (error) {

      console.error("Failed to process pipeline data:", error);

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
      const response = await fetch("/api/documents/trigger-pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Pipeline triggered successfully", {
          id: `trigger-${phase}`, // Replaces the loading toast
        });
        // Refresh data to show updated status
        await loadData();
      } else {
        toast.error(data.error || "Failed to trigger pipeline", {
          id: `trigger-${phase}`, // Replaces the loading toast
        });
      }
    } catch (error) {
      toast.error("Failed to trigger pipeline phase", {
        id: `trigger-${phase}`, // Replaces the loading toast
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Document Pipeline Management"
        description="Monitor and manage document processing pipeline"
        actions={
          <Button
            onClick={refreshData}
            variant="outline"
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        }
      />

      {/* Pipeline Phase Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(phaseConfig).map(([phase, config]) => {
          const Icon = config.icon;
          const count = getPhaseCount(phase);
          const isProcessing = triggering === phase;
          return (
            <Card
              key={phase}
              className={
                isProcessing ? "ring-2 ring-blue-500 ring-opacity-50" : ""
              }
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon
                      className={`h-5 w-5 text-${config.color}-600 ${isProcessing ? "animate-pulse" : ""}`}
                    />
                    <CardTitle className="text-lg">{config.label}</CardTitle>
                  </div>
                  {isProcessing ? (
                    <Badge variant="default" className="bg-blue-500">
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
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Trigger {config.label}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Document Status</CardTitle>
          <CardDescription>
            {documents.length} documents in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pipeline Stage</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      <div className="max-w-xs truncate" title={doc.title}>
                        {doc.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {doc.fireflies_id}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.type}</Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(doc.status, doc.pipeline_stage)}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {doc.pipeline_stage}
                      </code>
                    </TableCell>
                    <TableCell>{doc.attempt_count}</TableCell>
                    <TableCell className="text-sm text-foreground">
                      {doc.last_attempt_at
                        ? format(new Date(doc.last_attempt_at), "MMM d, h:mm a")
                        : format(new Date(doc.created_at), "MMM d, h:mm a")}
                    </TableCell>
                    <TableCell>
                      {doc.error_message && (
                        <div
                          className="flex items-center gap-1 text-destructive"
                          title={doc.error_message}
                        >
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-xs truncate max-w-[200px]">
                            {doc.error_message}
                          </span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {documents.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-8"
                    >
                      No documents found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Status Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pipeline Status Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(statusConfig).map(([status, config]) => {
              const Icon = config.icon;
              return (
                <div key={status} className="flex items-center gap-2">
                  <Badge className={`${config.color} gap-1`}>
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                  <span className="text-sm text-foreground">
                    {status === "raw_ingested" && "→ Ready for parsing"}
                    {status === "segmented" && "→ Ready for embedding"}
                    {status === "embedded" && "→ Ready for extraction"}
                    {status === "complete" && "→ Fully processed"}
                    {status === "error" && "→ Needs attention"}
                    {status === "pending" && "→ Waiting to start"}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
