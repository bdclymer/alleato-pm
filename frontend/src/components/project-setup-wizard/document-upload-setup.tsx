"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  File,
  FileText,
  Image,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import { StepComponentProps } from "./project-setup-wizard";
import type { Database } from "@/types/database.types";

interface UploadedDocument {
  id: string;
  project_id: number;
  title: string;
  file_id: string;
  url: string;
  content: string;
  metadata: {
    fileName: string;
    fileType: string;
    fileSize: number;
    category: string;
  };
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
  documentId?: string;
}

const documentCategories = {
  plans: { label: "Plans & Drawings", icon: FileText, color: "blue" },
  specs: { label: "Specifications", icon: FileText, color: "green" },
  contracts: { label: "Contracts", icon: File, color: "purple" },
  permits: { label: "Permits", icon: File, color: "orange" },
  photos: { label: "Photos", icon: Image, color: "pink" },
  other: { label: "Other", icon: File, color: "gray" },
};

export function DocumentUploadSetup({
  projectId,
  onNext,
  onSkip,
}: StepComponentProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<
    UploadedDocument[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError(null);

      // Add files to uploading list
      const newFiles: UploadingFile[] = acceptedFiles.map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        progress: 0,
        status: "uploading" as const,
      }));

      setUploadingFiles((prev) => [...prev, ...newFiles]);

      // Upload each file
      for (const uploadFile of newFiles) {
        try {
          // Determine category based on file type/name
          let category = "other";
          const fileName = uploadFile.file.name.toLowerCase();
          if (fileName.includes("plan") || fileName.includes("drawing")) {
            category = "plans";
          } else if (fileName.includes("spec")) {
            category = "specs";
          } else if (fileName.includes("contract")) {
            category = "contracts";
          } else if (fileName.includes("permit")) {
            category = "permits";
          } else if (uploadFile.file.type.startsWith("image/")) {
            category = "photos";
          }

          // Create file path
          const fileExt = uploadFile.file.name.split(".").pop();
          const filePath = `projects/${projectId}/documents/${uploadFile.id}.${fileExt}`;

          // Upload to Supabase Storage
          const { error: uploadError, data } = await supabase.storage
            .from("documents")
            .upload(filePath, uploadFile.file);

          if (uploadError) {
            throw new Error(
              `Storage upload failed: ${uploadError.message || JSON.stringify(uploadError)}`,
            );
          }

          // Get public URL
          const {
            data: { publicUrl },
          } = supabase.storage.from("documents").getPublicUrl(filePath);

          // Create document record
          const { data: document, error: dbError } = await supabase
            .from("documents")
            .insert({
              project_id: parseInt(projectId),
              title: uploadFile.file.name,
              file_id: uploadFile.id,
              url: publicUrl,
              content: "", // Empty content for file uploads
              metadata: {
                fileName: uploadFile.file.name,
                fileType: uploadFile.file.type || "application/octet-stream",
                fileSize: uploadFile.file.size,
                category,
              },
            })
            .select()
            .single();

          if (dbError) {
            throw new Error(
              `Database insert failed: ${dbError.message || JSON.stringify(dbError)}`,
            );
          }

          // Update file status
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id
                ? { ...f, status: "success" as const, documentId: document.id }
                : f,
            ),
          );

          setUploadedDocuments((prev) => [...prev, document as unknown as UploadedDocument]);
        } catch (err) {
          let errorMessage = "Upload failed";

          // Handle Supabase errors which have a message property
          if (err && typeof err === "object" && "message" in err) {
            errorMessage = String(err.message);
          } else if (err instanceof Error) {
            errorMessage = err.message;
          } else if (typeof err === "string") {
            errorMessage = err;
          }

          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id
                ? {
                    ...f,
                    status: "error" as const,
                    error: errorMessage,
                  }
                : f,
            ),
          );
        }
      }
    },
    [projectId, supabase],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
      "application/vnd.ms-excel": [".xls", ".xlsx"],
      "application/msword": [".doc", ".docx"],
      "text/plain": [".txt"],
      "application/zip": [".zip"],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const removeFile = (fileId: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const deleteDocument = async (documentId: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", documentId);

      if (error) throw error;

      setUploadedDocuments((prev) => prev.filter((d) => d.id !== documentId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete document",
      );
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ["B", "KB", "MB", "GB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  const totalFiles = uploadingFiles.length + uploadedDocuments.length;
  const successfulUploads =
    uploadingFiles.filter((f) => f.status === "success").length +
    uploadedDocuments.length;

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <p className="text-muted-foreground">
          Upload important project documents like plans, specifications,
          contracts, and permits. You can add more documents anytime after
          setup.
        </p>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors duration-200
            ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-lg font-medium">Drop the files here...</p>
          ) : (
            <>
              <p className="text-lg font-medium mb-1">
                Drag & drop files here, or click to select
              </p>
              <p className="text-sm text-muted-foreground">
                PDF, Images, Word, Excel (Max 50MB per file)
              </p>
            </>
          )}
        </div>

        {/* Uploading Files */}
        {uploadingFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Uploading Files</h4>
            {uploadingFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-4 p-4 rounded-lg border bg-card"
              >
                <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {file.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.file.size)}
                  </p>
                  {file.status === "uploading" && (
                    <Progress value={file.progress} className="h-1 mt-1" />
                  )}
                  {file.error && (
                    <p className="text-xs text-destructive mt-1">
                      {file.error}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {file.status === "uploading" && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {file.status === "success" && (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                  {file.status === "error" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Uploaded Documents */}
        {uploadedDocuments.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Uploaded Documents</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploadedDocuments.map((doc) => {
                  const category =
                    documentCategories[
                      doc.metadata.category as keyof typeof documentCategories
                    ] || documentCategories.other;
                  const Icon = category.icon;

                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{doc.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{category.label}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatFileSize(doc.metadata.fileSize || 0)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteDocument(doc.id)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onSkip} disabled={loading}>
          Skip for now
        </Button>
        <Button
          onClick={onNext}
          disabled={
            loading || uploadingFiles.some((f) => f.status === "uploading")
          }
        >
          {uploadingFiles.some((f) => f.status === "uploading")
            ? "Uploading..."
            : "Continue"}
        </Button>
      </div>
    </div>
  );
}
