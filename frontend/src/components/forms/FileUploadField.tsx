"use client";

import * as React from "react";
import { Upload, X, FileText } from "lucide-react";
import { FormField } from "./FormField";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FileInfo {
  name: string;
  size: number;
  type: string;
  url?: string;
}

interface FileUploadFieldProps {
  label: React.ReactNode;
  value?: FileInfo[];
  onChange?: (files: FileInfo[]) => void;
  onFilesSelected?: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number; // in bytes
  error?: string;
  hint?: string;
  required?: boolean;
  fullWidth?: boolean;
  className?: string;
  disabled?: boolean;
  variant?: "default" | "minimal";
  showMetaText?: boolean;
  dropzoneTestId?: string;
  inputTestId?: string;
  fileListTestId?: string;
}

export function FileUploadField({
  label,
  value = [],
  onChange,
  onFilesSelected,
  accept,
  multiple = false,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB
  error,
  hint,
  required = false,
  fullWidth = false,
  className,
  disabled = false,
  variant = "default",
  showMetaText = true,
  dropzoneTestId,
  inputTestId,
  fileListTestId,
}: FileUploadFieldProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = React.useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter((file) => {
      if (maxSize && file.size > maxSize) {
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      onFilesSelected?.(validFiles);
    }

    const newFiles: FileInfo[] = validFiles.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
    }));

    if (multiple) {
      const updatedFiles = [...value, ...newFiles].slice(0, maxFiles);
      onChange?.(updatedFiles);
    } else {
      onChange?.(newFiles.slice(0, 1));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = value.filter((_, i) => i !== index);
    onChange?.(newFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const isMinimal = variant === "minimal";

  return (
    <FormField
      label={label}
      error={error}
      hint={hint}
      required={required}
      fullWidth={fullWidth}
    >
      <div className={cn(isMinimal ? "space-y-2.5" : "space-y-4")}>
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            isMinimal
              ? "relative rounded-md border border-dashed px-4 py-3 text-left"
              : "relative rounded-lg border-2 border-dashed p-6 text-center",
            dragActive && "border-primary bg-primary/5",
            error && "border-destructive",
            disabled && "opacity-50 cursor-not-allowed",
            className,
          )}
          data-testid={dropzoneTestId}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleFileInput}
            disabled={disabled}
            className="sr-only"
            data-testid={inputTestId}
          />
          {isMinimal ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-foreground">Drop files here or choose from your computer.</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
              >
                Choose Files
              </Button>
            </div>
          ) : (
            <>
              <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-foreground">
                Drag and drop files here, or{" "}
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 font-semibold"
                  onClick={() => inputRef.current?.click()}
                  disabled={disabled}
                >
                  browse
                </Button>
              </p>
              {showMetaText ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {accept && `Accepted formats: ${accept}`}
                  {maxSize && ` • Max size: ${formatFileSize(maxSize)}`}
                </p>
              ) : null}
            </>
          )}
        </div>

        {isMinimal && showMetaText ? (
          <p className="text-xs text-muted-foreground">
            {accept && `Accepted formats: ${accept}`}
            {maxSize && ` • Max size: ${formatFileSize(maxSize)}`}
          </p>
        ) : null}

        {value.length > 0 && (
          <ul className={cn(isMinimal ? "space-y-1.5" : "space-y-2")} data-testid={fileListTestId}>
            {value.map((file, index) => (
              <li
                key={index}
                className={cn(
                  "flex items-center justify-between",
                  isMinimal ? "px-3 py-1.5" : "p-4",
                )}
              >
                <div className={cn("flex items-center", isMinimal ? "gap-2" : "gap-4")}>
                  <FileText className={cn("text-primary", isMinimal ? "h-4 w-4" : "h-8 w-8")} />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => removeFile(index)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </FormField>
  );
}
