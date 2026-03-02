"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, FileText, File, FileImage, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

// File type icons mapping
const FILE_TYPE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  jpg: FileImage,
  jpeg: FileImage,
  png: FileImage,
  dwg: File,
};

// File upload status
type UploadStatus = "uploading" | "complete" | "error";

// Uploaded file metadata
export interface UploadedFileMetadata {
  path: string;
  size: number;
  mime_type: string;
  file_name: string;
}

// File with upload progress
interface FileWithProgress {
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
  metadata?: UploadedFileMetadata;
}

interface FileUploadZoneProps {
  projectId: number;
  changeOrderId?: string;
  onUploadComplete?: (metadata: UploadedFileMetadata[]) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  className?: string;
  disabled?: boolean;
}

const DEFAULT_MAX_FILES = 10;
const DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50MB

const ACCEPTED_FILE_TYPES = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/vnd.dwg": [".dwg"],
  "application/acad": [".dwg"],
  "application/x-dwg": [".dwg"],
};

const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.dwg";

export function FileUploadZone({
  projectId,
  changeOrderId,
  onUploadComplete,
  maxFiles = DEFAULT_MAX_FILES,
  maxSize = DEFAULT_MAX_SIZE,
  className,
  disabled = false,
}: FileUploadZoneProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get file extension
  const getFileExtension = (filename: string) => {
    return filename.split(".").pop()?.toLowerCase() || "";
  };

  // Get file type icon
  const getFileIcon = (filename: string) => {
    const ext = getFileExtension(filename);
    const Icon = FILE_TYPE_ICONS[ext] || FileText;
    return Icon;
  };

  // Validate file
  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(maxSize)})`;
    }

    // Check file type
    const ext = getFileExtension(file.name);
    const acceptedExtensions = ACCEPTED_EXTENSIONS.split(",").map((e) => e.replace(".", ""));
    if (!acceptedExtensions.includes(ext)) {
      return `File type .${ext} is not supported. Accepted formats: ${ACCEPTED_EXTENSIONS}`;
    }

    return null;
  };

  // Upload single file to Supabase storage
  const uploadFileToStorage = async (
    file: File,
    onProgress: (progress: number) => void
  ): Promise<UploadedFileMetadata> => {
    try {
      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `projects/${projectId}/change-orders/${changeOrderId || "temp"}/${timestamp}-${sanitizedFileName}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from("project-files")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Simulate progress (Supabase doesn't provide upload progress)
      onProgress(100);

      // Return file metadata
      return {
        path: data.path,
        size: file.size,
        mime_type: file.type,
        file_name: file.name,
      };
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  // Handle file selection
  const handleFiles = useCallback(
    async (selectedFiles: File[]) => {
      if (disabled || isUploading) return;

      // Check max files limit
      const remainingSlots = maxFiles - files.length;
      if (selectedFiles.length > remainingSlots) {
        toast.error(`Maximum ${maxFiles} files allowed. You can upload ${remainingSlots} more file(s).`);
        return;
      }

      // Validate files
      const validFiles: File[] = [];
      for (const file of selectedFiles) {
        const error = validateFile(file);
        if (error) {
          toast.error(error);
        } else {
          validFiles.push(file);
        }
      }

      if (validFiles.length === 0) return;

      // Add files to state with initial status
      const newFiles: FileWithProgress[] = validFiles.map((file) => ({
        file,
        status: "uploading" as UploadStatus,
        progress: 0,
      }));

      setFiles((prev) => [...prev, ...newFiles]);
      setIsUploading(true);

      // Upload files
      const uploadedMetadata: UploadedFileMetadata[] = [];

      for (let i = 0; i < newFiles.length; i++) {
        const fileWithProgress = newFiles[i];

        try {
          const metadata = await uploadFileToStorage(fileWithProgress.file, (progress) => {
            setFiles((prev) =>
              prev.map((f) =>
                f.file === fileWithProgress.file ? { ...f, progress } : f
              )
            );
          });

          // Mark as complete
          setFiles((prev) =>
            prev.map((f) =>
              f.file === fileWithProgress.file
                ? { ...f, status: "complete", progress: 100, metadata }
                : f
            )
          );

          uploadedMetadata.push(metadata);
        } catch (error) {
          // Mark as error
          setFiles((prev) =>
            prev.map((f) =>
              f.file === fileWithProgress.file
                ? {
                    ...f,
                    status: "error",
                    error: error instanceof Error ? error.message : "Upload failed",
                  }
                : f
            )
          );
        }
      }

      setIsUploading(false);

      // Notify parent component
      if (uploadedMetadata.length > 0) {
        toast.success(`${uploadedMetadata.length} file(s) uploaded successfully`);
        onUploadComplete?.(uploadedMetadata);
      }
    },
    [disabled, isUploading, maxFiles, files.length, projectId, changeOrderId, onUploadComplete, maxSize, supabase]
  );

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isUploading) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  };

  // Remove file
  const handleRemoveFile = (fileToRemove: FileWithProgress) => {
    setFiles((prev) => prev.filter((f) => f.file !== fileToRemove.file));
  };

  // Click to browse
  const handleBrowseClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drag and drop area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        className={cn(
          "relative rounded-lg border-2 border-dashed p-8 text-center transition-all cursor-pointer",
          isDragging && "border-primary bg-primary/5 scale-[1.02]",
          (disabled || isUploading) && "opacity-50 cursor-not-allowed",
          !isDragging && !disabled && !isUploading && "hover:border-muted-foreground/50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          multiple
          onChange={handleFileInputChange}
          disabled={disabled || isUploading}
          className="sr-only"
        />

        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <Text size="sm" weight="medium" className="mb-1">
          {isDragging ? "Drop files here" : "Drag & drop files here, or click to browse"}
        </Text>
        <Text variant="muted" size="xs">
          Max {formatFileSize(maxSize)} per file • Up to {maxFiles} files
        </Text>
        <Text variant="muted" size="xs" className="mt-1">
          Supported: PDF, DOC/DOCX, XLS/XLSX, JPG, PNG, DWG
        </Text>
      </div>

      {/* Uploaded files list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fileWithProgress, index) => {
            const Icon = getFileIcon(fileWithProgress.file.name);
            const showProgress =
              fileWithProgress.status === "uploading" && fileWithProgress.progress < 100;

            return (
              <div
                key={`${fileWithProgress.file.name}-${index}`}
                className={cn(
                  "flex items-center gap-4 rounded-lg border p-4 transition-all",
                  fileWithProgress.status === "error" && "border-destructive bg-destructive/5",
                  fileWithProgress.status === "complete" && "border-green-500/30 bg-green-500/5"
                )}
              >
                {/* File icon */}
                <Icon
                  className={cn(
                    "h-8 w-8 flex-shrink-0",
                    fileWithProgress.status === "error" && "text-destructive",
                    fileWithProgress.status === "complete" && "text-green-600",
                    fileWithProgress.status === "uploading" && "text-muted-foreground"
                  )}
                />

                {/* File info */}
                <div className="min-w-0 flex-1">
                  <Text size="sm" weight="medium" className="truncate">
                    {fileWithProgress.file.name}
                  </Text>
                  <div className="flex items-center gap-2">
                    <Text variant="muted" size="xs">
                      {formatFileSize(fileWithProgress.file.size)}
                    </Text>
                    {fileWithProgress.status === "uploading" && (
                      <Text variant="muted" size="xs">
                        • Uploading...
                      </Text>
                    )}
                    {fileWithProgress.status === "complete" && (
                      <Text size="xs" className="text-green-600">
                        • Uploaded
                      </Text>
                    )}
                    {fileWithProgress.status === "error" && (
                      <Text size="xs" className="text-destructive">
                        • {fileWithProgress.error || "Upload failed"}
                      </Text>
                    )}
                  </div>

                  {/* Progress bar */}
                  {showProgress && (
                    <Progress value={fileWithProgress.progress} className="mt-2 h-1" />
                  )}
                </div>

                {/* Delete button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(fileWithProgress);
                  }}
                  disabled={fileWithProgress.status === "uploading"}
                  className="flex-shrink-0"
                >
                  {fileWithProgress.status === "uploading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
