"use client";

import * as React from "react";
import { CheckCircle2, FileText, Trash2, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export interface AttachmentUploadItem {
  id: string;
  name: string;
  sizeBytes?: number | null;
  uploadedAtLabel?: string | null;
  downloadUrl?: string;
}

type QueueStatus = "queued" | "uploading" | "completed" | "failed";

interface QueueItem {
  id: string;
  file: File;
  status: QueueStatus;
  error?: string;
}

export interface AttachmentUploadPanelProps {
  files: AttachmentUploadItem[];
  onUploadFile: (file: File) => Promise<void>;
  onRemoveFile?: (fileId: string) => Promise<void> | void;
  title?: string;
  description?: string;
  headerVariant?: "default" | "muted";
  maxFileSizeMb?: number;
  className?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

/** Formats byte count into a compact KB/MB size label. */
function formatFileSize(sizeBytes?: number | null): string {
  if (!sizeBytes || sizeBytes <= 0) return "Size: —";
  const kb = sizeBytes / 1024;
  if (kb < 1024) return `Size: ${Math.round(kb)}kb`;
  return `Size: ${(kb / 1024).toFixed(1)}mb`;
}

/** Creates a stable local queue id for upload list rendering and updates. */
function createQueueId(file: File): string {
  return `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Maps queue status to progress value for upload-state visuals. */
function statusProgress(status: QueueStatus): number {
  if (status === "queued") return 8;
  if (status === "uploading") return 45;
  if (status === "completed") return 100;
  return 100;
}

/** Reusable DS attachment upload panel with dropzone, queue, and file list. */
export function AttachmentUploadPanel({
  files,
  onUploadFile,
  onRemoveFile,
  title = "Upload and attach file",
  description = "Attachments will be a part of this project.",
  headerVariant = "default",
  maxFileSizeMb = 25,
  className,
  emptyTitle = "No attachments yet",
  emptyDescription = "Upload and attach files to share with your team.",
}: AttachmentUploadPanelProps) {
  const [queue, setQueue] = React.useState<QueueItem[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isAttaching, setIsAttaching] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const uploadCount = queue.filter((item) => item.status === "uploading").length;

  /** Adds selected files to the local upload queue with size validation. */
  const queueFiles = React.useCallback(
    (selectedFiles: File[]) => {
      if (selectedFiles.length === 0) return;
      const maxBytes = maxFileSizeMb * 1024 * 1024;
      const nextItems = selectedFiles.map<QueueItem>((file) => {
        const tooLarge = file.size > maxBytes;
        return {
          id: createQueueId(file),
          file,
          status: tooLarge ? "failed" : "queued",
          error: tooLarge ? `Max file size is ${maxFileSizeMb} MB` : undefined,
        };
      });
      setQueue((current) => [...nextItems, ...current]);
    },
    [maxFileSizeMb],
  );

  /** Handles hidden file-input change and queues selected files. */
  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    queueFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  /** Handles drag-over state for dropzone feedback. */
  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }

  /** Handles drag-leave state reset for dropzone feedback. */
  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }

  /** Handles dropped files and queues them for attach. */
  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const droppedFiles = Array.from(event.dataTransfer.files ?? []);
    queueFiles(droppedFiles);
  }

  /** Removes one queued file from the local upload queue. */
  function removeQueuedItem(queueId: string) {
    setQueue((current) => current.filter((item) => item.id !== queueId));
  }

  /** Clears staged queue entries without touching already attached files. */
  function discardQueue() {
    setQueue([]);
  }

  /** Uploads queued files sequentially and updates queue status per file. */
  async function attachQueuedFiles() {
    const pending = queue.filter((item) => item.status === "queued");
    if (pending.length === 0) return;

    setIsAttaching(true);
    try {
      for (const item of pending) {
        setQueue((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? { ...entry, status: "uploading", error: undefined }
              : entry,
          ),
        );
        try {
          await onUploadFile(item.file);
          setQueue((current) =>
            current.map((entry) =>
              entry.id === item.id ? { ...entry, status: "completed" } : entry,
            ),
          );
        } catch (error) {
          const message =
            error instanceof Error && error.message
              ? error.message
              : "Upload failed";
          setQueue((current) =>
            current.map((entry) =>
              entry.id === item.id
                ? { ...entry, status: "failed", error: message }
                : entry,
            ),
          );
        }
      }
    } finally {
      setIsAttaching(false);
    }
  }

  return (
    <div className={cn("space-y-4 rounded-lg bg-muted/50 p-5", className)}>
      <div className="space-y-1">
        <h3
          className={cn(
            "text-foreground",
            headerVariant === "muted"
              ? "text-sm font-medium text-muted-foreground"
              : "text-base font-semibold",
          )}
        >
          {title}
        </h3>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>

      <div
        role="button"
        tabIndex={0}
        className={cn(
          "rounded-xl border border-dashed p-8 text-center transition-colors",
          isDragging ? "border-primary/60 bg-primary/5" : "border-border bg-background/70",
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          onChange={handleInputChange}
        />
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted">
          <UploadCloud className="h-5 w-5 text-primary" />
        </div>
        <p className="text-base text-foreground">
          <span className="font-medium text-primary">Click to Upload</span> or drag and drop
        </p>
        <p className="mt-1 text-sm text-muted-foreground">(Max. File size: {maxFileSizeMb} MB)</p>
      </div>

      {queue.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">
            {uploadCount > 0
              ? `${uploadCount} file${uploadCount === 1 ? "" : "s"} uploading...`
              : `${queue.length} file${queue.length === 1 ? "" : "s"} selected`}
          </p>
          <div className="space-y-2">
            {queue.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-background px-3 py-2.5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded bg-muted">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.status === "uploading"
                            ? "Uploading"
                            : item.status === "completed"
                              ? "Upload completed"
                              : item.status === "failed"
                                ? "Upload failed"
                                : "Ready to upload"}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">{item.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(item.file.size)}
                          {item.error ? ` · ${item.error}` : ""}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => removeQueuedItem(item.id)}
                        aria-label="Remove queued file"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <Progress value={statusProgress(item.status)} className="h-2 flex-1" />
                      <span className="text-xs font-medium text-foreground">
                        {item.status === "completed"
                          ? "100%"
                          : item.status === "uploading"
                            ? "45%"
                            : item.status === "failed"
                              ? "0%"
                              : "Ready"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {files.length === 0 ? (
          <div className="rounded-lg border border-border bg-background px-4 py-6 text-center">
            <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
          </div>
        ) : (
          files.map((file) => (
            <div key={file.id} className="rounded-lg border border-border bg-background px-3 py-2.5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded bg-muted">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {file.downloadUrl ? (
                        <a
                          href={file.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate text-sm font-medium text-foreground hover:underline"
                        >
                          {file.name}
                        </a>
                      ) : (
                        <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.sizeBytes)}
                        {file.uploadedAtLabel ? ` · Uploaded: ${file.uploadedAtLabel}` : ""}
                      </p>
                    </div>
                    {onRemoveFile ? (
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => void onRemoveFile(file.id)}
                        aria-label="Remove attachment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-status-success" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={discardQueue} disabled={isAttaching}>
          Discard
        </Button>
        <Button
          type="button"
          onClick={attachQueuedFiles}
          disabled={isAttaching || queue.filter((item) => item.status === "queued").length === 0}
        >
          {isAttaching ? "Attaching..." : "Attach files"}
        </Button>
      </div>
    </div>
  );
}
