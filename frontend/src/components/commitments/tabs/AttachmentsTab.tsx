"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { Download, FileText, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ds/text";
import { cn } from "@/lib/utils";

type Attachment = {
  id: string;
  fileName: string;
  url: string;
  uploadedAt?: string;
};

interface AttachmentsTabProps {
  commitmentId: string;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const AttachmentsTab = memo(function AttachmentsTab({ commitmentId }: AttachmentsTabProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const fetchAttachments = useCallback(async () => {
    try {
      const response = await fetch(`/api/commitments/${commitmentId}/attachments`);
      if (response.ok) {
        const data = await response.json();
        setAttachments(data.data ?? data ?? []);
      } else if (response.status === 404) {
        setAttachments([]);
      } else {
        throw new Error("Failed to load attachments");
      }
    } catch {
      toast.error("Failed to load attachments");
    } finally {
      setIsLoading(false);
    }
  }, [commitmentId]);

  useEffect(() => {
    void fetchAttachments();
  }, [fetchAttachments]);

  const handleUpload = async (files: File[]) => {
    if (!files.length) return;
    setIsUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(`/api/commitments/${commitmentId}/attachments`, {
          method: "POST",
          body: formData,
        });
        if (!response.ok) throw new Error("Failed to upload files");
      }
      toast.success(`${files.length} file(s) uploaded successfully`);
      await fetchAttachments();
    } catch {
      toast.error("Failed to upload files");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!window.confirm("Are you sure you want to delete this attachment?")) return;

    setDeletingIds((prev) => new Set(prev).add(attachmentId));
    try {
      const response = await fetch(
        `/api/commitments/${commitmentId}/attachments/${attachmentId}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("Failed to delete attachment");
      toast.success("Attachment deleted");
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch {
      toast.error("Failed to delete attachment");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(attachmentId);
        return next;
      });
    }
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: handleUpload,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "image/vnd.dwg": [".dwg"],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
    disabled: isUploading,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Text size="sm" variant="muted">
          {attachments.length > 0
            ? `${attachments.length} attachment${attachments.length === 1 ? "" : "s"}`
            : "No attachments"}
        </Text>
        <Button type="button" size="sm" variant="outline" onClick={open} disabled={isUploading}>
          <Upload className="mr-1.5 h-4 w-4" />
          Upload File
        </Button>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
          isUploading && "cursor-not-allowed opacity-50",
        )}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <Text size="sm" variant="muted">Uploading…</Text>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            <Text size="sm" weight="medium" className="mt-2">
              {isDragActive ? "Drop files here" : "Drag & drop or click to browse"}
            </Text>
            <Text size="xs" variant="muted" className="mt-1">
              Max 10 MB · PDF, JPG, PNG, XLSX, DOCX, DWG
            </Text>
          </>
        )}
      </div>

      {/* Attachment list */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : attachments.length > 0 ? (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const isDeleting = deletingIds.has(attachment.id);
            return (
              <div
                key={attachment.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-border p-3 transition-opacity",
                  isDeleting && "opacity-50",
                )}
              >
                <FileText className="h-7 w-7 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <Text size="sm" weight="medium" className="truncate">
                    {attachment.fileName}
                  </Text>
                  {attachment.uploadedAt && (
                    <Text size="xs" variant="muted">
                      Uploaded {formatDate(attachment.uploadedAt)}
                    </Text>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => attachment.url && window.open(attachment.url, "_blank")}
                    disabled={isDeleting}
                    aria-label="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(attachment.id)}
                    disabled={isDeleting}
                    aria-label="Delete"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
});

AttachmentsTab.displayName = "AttachmentsTab";
