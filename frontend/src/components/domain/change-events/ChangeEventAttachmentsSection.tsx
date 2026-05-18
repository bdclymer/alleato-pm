"use client";

import { useState, useEffect, useCallback } from "react";
import { Upload, X, FileText, Download, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Text } from "@/components/ds/text";
import { cn } from "@/lib/utils";
import { ApiError, apiFetch } from "@/lib/api-client";
import { handleFormError } from "@/lib/handle-form-error";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";

type ChangeEventAttachment = {
  id: string;
  fileName: string | null;
  filePath: string | null;
  fileSize: number | null;
  mimeType: string | null;
  uploadedAt: string;
  downloadUrl: string | null;
};

type AttachmentsResponse = {
  data?: ChangeEventAttachment[];
};

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
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch attachments
  const fetchAttachments = useCallback(async () => {
    try {
      const data = await apiFetch<AttachmentsResponse | ChangeEventAttachment[]>(
        `/api/projects/${projectId}/change-events/${changeEventId}/attachments`
      );
      setAttachments(Array.isArray(data) ? data : data.data ?? []);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setAttachments([]);
        return;
      }
      console.error("Failed to load change event attachments", error);
      toast.error("Attachments could not be loaded. Try refreshing the page.");
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
      await Promise.all(
        files.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);

          return apiFetch(
            `/api/projects/${projectId}/change-events/${changeEventId}/attachments`,
            {
              method: "POST",
              body: formData,
            }
          );
        }),
      );
      toast.success(`${files.length} file(s) uploaded successfully`);

      // Refresh attachments list
      await fetchAttachments();
    } catch (error) {
      handleFormError(error, { entity: "attachment", action: "create" });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file delete
  const handleDelete = async (attachmentId: string) => {
    setDeletingIds((prev) => new Set(prev).add(attachmentId));
    setDeleteId(null);

    try {
      await apiFetch(
        `/api/projects/${projectId}/change-events/${changeEventId}/attachments/${attachmentId}`,
        {
          method: "DELETE",
        }
      );

      toast.success("Attachment deleted successfully");

      // Remove from local state
      setAttachments((prev) => prev.filter((att) => att.id !== attachmentId));
    } catch (error) {
      handleFormError(error, { entity: "attachment", action: "delete" });
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
      const downloadUrl = attachment.downloadUrl ?? attachment.filePath;
      if (!downloadUrl) {
        throw new Error("Attachment has no download URL");
      }
      window.open(downloadUrl, "_blank");
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

  const formatFileSize = (bytes: number | null) => {
    if (bytes == null) return "Unknown size";
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
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <Text variant="muted" size="sm">Uploading files...</Text>
            </div>
          ) : (
            <>
              <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
              <Text className="mt-4" size="sm" weight="medium">
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
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-20 ml-auto" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
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
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <Text className="truncate" size="sm" weight="medium">
                        {attachment.fileName ?? "Attachment"}
                      </Text>
                      <Text variant="muted" size="xs">
                        {formatFileSize(attachment.fileSize)} •{" "}
                        Uploaded {formatDate(attachment.uploadedAt)}
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
                      <Download />
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(attachment.id)}
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

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete attachment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this attachment? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
