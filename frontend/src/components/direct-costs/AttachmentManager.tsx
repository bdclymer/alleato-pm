"use client";

import { useCallback, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  File,
  FileText,
  Image,
  Paperclip,
  Trash2,
  Upload,
  X,
} from "lucide-react";

interface AttachmentRow {
  id: string;
  file_name: string | null;
  url: string | null;
  uploaded_at: string | null;
  attached_to_id: string | null;
  attached_to_table: string | null;
}

interface AttachmentManagerProps {
  attachments: AttachmentRow[];
  onUpload: (files: File[]) => Promise<void>;
  onDelete: (attachmentId: string) => Promise<void>;
  maxFileSize?: number;
  allowedTypes?: string[];
  isUploading?: boolean;
  uploadProgress?: number;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const units = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${units[i]}`;
}

function getFileIcon(fileName: string | null) {
  if (!fileName) return File;

  const extension = fileName.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "svg", "webp", "heic"].includes(extension || "")) {
    return Image;
  }
  if (extension === "pdf") {
    return FileText;
  }
  return File;
}

function isValidFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.some((type) => {
    if (type.endsWith("/*")) {
      const baseType = type.split("/")[0];
      return file.type.startsWith(`${baseType}/`);
    }
    return file.type === type;
  });
}

export function AttachmentManager({
  attachments = [],
  onUpload,
  onDelete,
  maxFileSize = 25 * 1024 * 1024,
  allowedTypes = [
    "image/*",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  isUploading = false,
  uploadProgress = 0,
}: AttachmentManagerProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList) => {
      const selectedFiles = Array.from(files);
      const validFiles: File[] = [];
      const validationErrors: string[] = [];

      setError(null);

      for (const file of selectedFiles) {
        if (file.size > maxFileSize) {
          validationErrors.push(`${file.name}: exceeds ${formatFileSize(maxFileSize)}`);
          continue;
        }

        if (!isValidFileType(file, allowedTypes)) {
          validationErrors.push(`${file.name}: file type not supported`);
          continue;
        }

        validFiles.push(file);
      }

      if (validationErrors.length > 0) {
        setError(validationErrors.join("; "));
      }

      if (validFiles.length === 0) return;

      const queued = validFiles.map((file) => ({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        progress: 12,
        status: "uploading" as const,
      }));

      setUploadingFiles((prev) => [...queued, ...prev]);

      try {
        await onUpload(validFiles);
        setUploadingFiles((prev) =>
          prev.map((item) =>
            queued.some((queuedItem) => queuedItem.id === item.id)
              ? { ...item, progress: 100, status: "success" as const }
              : item,
          ),
        );

        setTimeout(() => {
          setUploadingFiles((prev) =>
            prev.filter((item) => !queued.some((queuedItem) => queuedItem.id === item.id)),
          );
        }, 1200);
      } catch (uploadError) {
        const message =
          uploadError instanceof Error ? uploadError.message : "Upload failed";
        setError(message);
        setUploadingFiles((prev) =>
          prev.map((item) =>
            queued.some((queuedItem) => queuedItem.id === item.id)
              ? { ...item, status: "error" as const, error: message, progress: 100 }
              : item,
          ),
        );
      }
    },
    [allowedTypes, maxFileSize, onUpload],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      if (event.dataTransfer.files?.length) {
        void handleFiles(event.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "rounded-xl border border-dashed p-5 transition-colors",
          "bg-muted/20 hover:bg-muted/30",
          isDragging ? "border-primary bg-primary/5" : "border-border",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="rounded-lg border border-border bg-background p-3">
            <Paperclip className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Drag and drop files here
            </p>
            <p className="text-xs text-muted-foreground">
              Max file size {formatFileSize(maxFileSize)}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4" />
            Choose Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={allowedTypes.join(",")}
            onChange={(event) => {
              if (event.target.files) {
                void handleFiles(event.target.files);
              }
              event.target.value = "";
            }}
            className="hidden"
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isUploading && uploadProgress > 0 && (
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Uploading files...</p>
            <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
          </div>
          <Progress value={uploadProgress} className="h-1.5" />
        </div>
      )}

      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Upload Queue ({uploadingFiles.length})
          </p>
          {uploadingFiles.map((uploadingFile) => {
            const Icon = getFileIcon(uploadingFile.file.name);
            return (
              <div
                key={uploadingFile.id}
                className="rounded-lg border border-border bg-background p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-md border border-border bg-muted/40 p-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {uploadingFile.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(uploadingFile.file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {uploadingFile.status === "success" && (
                      <CheckCircle2 className="h-4 w-4 text-status-success" />
                    )}
                    {uploadingFile.status === "error" && (
                      <AlertCircle className="h-4 w-4 text-status-error" />
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        setUploadingFiles((prev) =>
                          prev.filter((item) => item.id !== uploadingFile.id),
                        )
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {uploadingFile.status === "uploading" && (
                  <Progress value={uploadingFile.progress} className="mt-3 h-1.5" />
                )}
                {uploadingFile.error && (
                  <p className="mt-2 text-xs text-status-error">{uploadingFile.error}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          Attachments ({attachments.length})
        </p>
        {attachments.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted/15 px-3 py-4 text-sm text-muted-foreground">
            No files attached yet.
          </div>
        ) : (
          attachments.map((attachment) => {
            const Icon = getFileIcon(attachment.file_name);
            return (
              <div
                key={attachment.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background p-3"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="rounded-md border border-border bg-muted/40 p-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {attachment.file_name || "Unnamed file"}
                    </p>
                    {attachment.uploaded_at && (
                      <p className="text-xs text-muted-foreground">
                        Uploaded {new Date(attachment.uploaded_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {attachment.url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => window.open(attachment.url || "", "_blank")}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-status-error hover:text-status-error"
                    onClick={() => onDelete(attachment.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
