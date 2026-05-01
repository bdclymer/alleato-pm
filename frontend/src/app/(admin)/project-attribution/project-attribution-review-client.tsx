"use client";

import * as React from "react";
import { Check, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

import { SectionRuleHeading } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api-client";

type ReviewCandidate = {
  id: string;
  source_document_id: string;
  candidate_project_id: number | null;
  candidate_project_name: string | null;
  confidence: number | null;
  attribution_method: string | null;
  evidence_terms: string[] | null;
  reasoning: string | null;
  status: string;
  created_at: string | null;
  document: {
    id: string;
    title: string | null;
    source: string | null;
    category: string | null;
    type: string | null;
    project_id: number | null;
    project: string | null;
    date: string | null;
    created_at: string | null;
    summary: string | null;
  } | null;
};

function formatConfidence(value: number | null) {
  if (value == null) return "Unknown";
  return `${Math.round(value * 100)}%`;
}

function formatDate(value: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function ProjectAttributionReviewClient() {
  const [candidates, setCandidates] = React.useState<ReviewCandidate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const loadCandidates = React.useCallback(async () => {
    setLoading(true);
    try {
      const json = await apiFetch<{ candidates?: ReviewCandidate[] }>(
        "/api/admin/project-attribution-candidates?status=pending_review&limit=200",
        { cache: "no-store" },
      );
      setCandidates(json.candidates ?? []);
    } catch (error) {
      toast.error("Failed to load attribution candidates", {
        description: error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  const reviewCandidate = React.useCallback(
    async (candidateId: string, action: "approve" | "reject") => {
      setBusyId(candidateId);
      try {
        await apiFetch("/api/admin/project-attribution-candidates", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ candidateId, action }),
        });
        setCandidates((prev) => prev.filter((candidate) => candidate.id !== candidateId));
        toast.success(action === "approve" ? "Project assigned" : "Candidate rejected");
      } catch (error) {
        toast.error("Review action failed", {
          description: error instanceof Error ? error.message : "Unexpected error",
        });
      } finally {
        setBusyId(null);
      }
    },
    [],
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <SectionRuleHeading label="Pending candidates" className="mb-0 pb-0" />
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? "Loading candidates"
              : `${candidates.length.toLocaleString()} candidates awaiting review`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadCandidates()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>Candidate project</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead className="w-32 text-right">Review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                  Loading attribution candidates
                </TableCell>
              </TableRow>
            ) : candidates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                  No pending project attribution candidates
                </TableCell>
              </TableRow>
            ) : (
              candidates.map((candidate) => {
                const document = candidate.document;
                const disabled = busyId === candidate.id;
                return (
                  <TableRow key={candidate.id}>
                    <TableCell className="max-w-sm align-top">
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">
                          {document?.title ?? candidate.source_document_id}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{document?.source ?? "Unknown source"}</span>
                          <span>{document?.category ?? document?.type ?? "Uncategorized"}</span>
                          <span>{formatDate(document?.date ?? document?.created_at ?? null)}</span>
                          {document?.project && <Badge variant="outline">Current: {document.project}</Badge>}
                        </div>
                        {document?.summary && (
                          <p className="line-clamp-2 text-xs text-muted-foreground">{document.summary}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="font-medium text-foreground">
                        {candidate.candidate_project_name ?? "Unknown project"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Project ID {candidate.candidate_project_id ?? "missing"}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs align-top">
                      <div className="mb-2 flex flex-wrap gap-1">
                        {(candidate.evidence_terms ?? []).slice(0, 5).map((term) => (
                          <Badge key={term} variant="secondary">
                            {term}
                          </Badge>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {candidate.reasoning ?? candidate.attribution_method ?? "No reasoning recorded"}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant="outline">{formatConfidence(candidate.confidence)}</Badge>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={disabled}
                          aria-label="Reject candidate"
                          onClick={() => void reviewCandidate(candidate.id, "reject")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          disabled={disabled}
                          aria-label="Approve candidate"
                          onClick={() => void reviewCandidate(candidate.id, "approve")}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

    </section>
  );
}
