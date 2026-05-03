"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";

import { AttachmentListItem } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ds/text";
import { ApiError, apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";

type Attachment = {
  id: string;
  fileName: string;
  url: string;
  uploadedAt?: string;
};

interface AttachmentsTabProps {
  commitmentId: string;
}


export const AttachmentsTab = memo(function AttachmentsTab({ commitmentId }: AttachmentsTabProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const fetchAttachments = useCallback(async () => {
    try {
      const data = await apiFetch<Attachment[] | { data?: Attachment[] }>(
        `/api/commitments/${commitmentId}/attachments`,
      );
      setAttachments(Array.isArray(data) ? data : data.data ?? []);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setAttachments([]);
        return;
      }
      toast.error(error instanceof Error ? error.message : "Failed to load attachments");
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
        await apiFetch(`/api/commitments/${commitmentId}/attachments`, {
          method: "POST",
          body: formData,
        });
      }
      toast.success(`${files.length} file(s) uploaded successfully`);
      await fetchAttachments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload files");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!window.confirm("Are you sure you want to delete this attachment?")) return;

    setDeletingIds((prev) => new Set(prev).add(attachmentId));
    try {
      await apiFetch(`/api/commitments/${commitmentId}/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      toast.success("Attachment deleted");
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete attachment");
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
        <Button type="button" size="sm" onClick={open} disabled={isUploading}>
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
        <Input {...getInputProps()} className="hidden" />
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <Text size="sm" variant="muted">Uploading…</Text>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            <Text size="sm" weight="medium" className="mt-2">
              {isDragActive ? "Drop files here" : (
                <>Drag & drop or <span className="text-primary underline underline-offset-2">click to browse</span></>
              )}
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
              <AttachmentListItem
                key={attachment.id}
                name={attachment.fileName}
                meta={attachment.uploadedAt ? `Uploaded ${formatDate(attachment.uploadedAt)}` : null}
                onDownload={
                  attachment.url ? () => window.open(attachment.url, "_blank") : undefined
                }
                onRemove={() => handleDelete(attachment.id)}
                isBusy={isDeleting}
                className={cn(isDeleting && "opacity-50")}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
});

AttachmentsTab.displayName = "AttachmentsTab";
