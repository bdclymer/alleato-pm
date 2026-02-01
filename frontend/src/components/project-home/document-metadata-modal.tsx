"use client";

import * as React from "react";
import { ExternalLink, FileText, Calendar, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database.types";

type DocumentMetadata =
  Database["public"]["Tables"]["document_metadata"]["Row"];

interface DocumentMetadataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  projectId: string;
}

function formatDate(date: string | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return "-";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export function DocumentMetadataModal({
  open,
  onOpenChange,
  title,
  projectId,
}: DocumentMetadataModalProps) {
  const [documents, setDocuments] = React.useState<DocumentMetadata[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchDocuments() {
      if (!open) return;

      setIsLoading(true);
      setError(null);

      try {
        const supabase = createClient();

        let query = supabase
          .from("document_metadata")
          .select("*")
          .order("date", { ascending: false });

        // Filter by project if projectId is a number
        const projectIdNum = parseInt(projectId, 10);
        if (!isNaN(projectIdNum)) {
          query = query.eq("project_id", projectIdNum);
        }

        const { data, error: fetchError } = await query.limit(50);

        if (fetchError) {
          throw fetchError;
        }

        setDocuments(data || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load documents",
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchDocuments();
  }, [open, projectId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Documents and metadata from Supabase
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Loading documents...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
              <p>{error}</p>
            </div>
          )}

          {!isLoading && !error && documents.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No documents found</p>
            </div>
          )}

          {!isLoading && !error && documents.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Date
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Duration
                    </div>
                  </TableHead>
                  <TableHead className="w-[80px]">Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {doc.title || "Untitled"}
                    </TableCell>
                    <TableCell>{formatDate(doc.date)}</TableCell>
                    <TableCell>
                      {formatDuration(doc.duration_minutes)}
                    </TableCell>
                    <TableCell>
                      {(doc.url || doc.fireflies_link) && (
                        <a
                          href={doc.url || doc.fireflies_link || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-link hover:text-link-hover"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {!isLoading && documents.length > 0 && (
          <div className="pt-4 border-t text-sm text-muted-foreground">
            Showing {documents.length} document
            {documents.length !== 1 ? "s" : ""}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
