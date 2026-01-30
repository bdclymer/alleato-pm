"use client";

import { useState, useEffect, useCallback } from "react";
import { Upload, X, FileText, Download, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import type { Database } from "@/types/database.types";

type ChangeEventAttachment = Database["public"]["Tables"]["change_event_attachments"]["Row"];

interface ChangeEventAttachmentsSectionProps {
  changeEventId: string;
  projectId: number;
}

export function ChangeEventAttachmentsSection({
  changeEventId,
  projectId,
}: ChangeEventAttachmentsSectionProps) {
  const [attachments, setAttachments] = useState<ChangeEventAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Fetch attachments
  const fetchAttachments = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/change-events/${changeEventId}/attachments`
      );

      if (response.ok) {
        const data = await response.json();
        setAttachments(data.data || data || []);
      } else if (response.status === 404) {
        setAttachments([]);
      } else {
        throw new Error("Failed to load attachments");
      }
    } catch (error) {
      toast.error("Failed to load attachments");
    } finally {
      setIsLoading(false);
    }
  }, [changeEventId, projectId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  // Handle file upload
  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(
        `/api/projects/${projectId}/change-events/${changeEventId}/attachments`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to upload files");
      }

      await response.json();
      toast.success(`${files.length} file(s) uploaded successfully`);

      // Refresh attachments list
      await fetchAttachments();
    } catch (error) {
      toast.error("Failed to upload files");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file delete
  const handleDelete = async (attachmentId: string) => {
    if (!window.confirm("Are you sure you want to delete this attachment?")) {
      return;
    }

    setDeletingIds((prev) => new Set(prev).add(attachmentId));

    try {
      const response = await fetch(
        `/api/projects/${projectId}/change-events/${changeEventId}/attachments/${attachmentId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete attachment");
      }

      toast.success("Attachment deleted successfully");

      // Remove from local state
      setAttachments((prev) => prev.filter((att) => att.id !== attachmentId));
    } catch (error) {
      toast.error("Failed to delete attachment");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(attachmentId);
        return next;
      });
    }
  };

  // Handle file download
  const handleDownload = async (attachment: ChangeEventAttachment) => {
    try {
      // Open file in new tab (Supabase storage URLs are public)
      window.open(attachment.file_path, "_blank");
    } catch (error) {
      toast.error("Failed to download file");
    }
  };

  // React Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleUpload,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "image/vnd.dwg": [".dwg"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
    disabled: isUploading,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attachments</CardTitle>
        <CardDescription>
          Upload supporting documents for this change event
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={cn(
            "relative rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer",
            isDragActive && "border-primary bg-primary/5",
            isUploading && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <Text variant="muted" size="sm">Uploading files...</Text>
            </div>
          ) : (
            <>
              <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
              <Text className="mt-3" size="sm" weight="medium">
                {isDragActive
                  ? "Drop files here"
                  : "Drag & drop files here, or click to browse"}
              </Text>
              <Text className="mt-1" variant="muted" size="xs">
                Max 10MB per file. Supported formats: PDF, JPG, PNG, XLSX, DOCX, DWG
              </Text>
            </>
          )}
        </div>

        {/* Attachments List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : attachments.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No attachments yet. Upload files to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {attachments.map((attachment) => {
              const isDeleting = deletingIds.has(attachment.id);

              return (
                <div
                  key={attachment.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-4 transition-opacity",
                    isDeleting && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <Text className="truncate" size="sm" weight="medium">
                        {attachment.file_name}
                      </Text>
                      <Text variant="muted" size="xs">
                        {formatFileSize(attachment.file_size)} •{" "}
                        Uploaded {formatDate(attachment.uploaded_at)}
                      </Text>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(attachment)}
                      disabled={isDeleting}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(attachment.id)}
                      disabled={isDeleting}
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
        )}
      </CardContent>
    </Card>
  );
}
