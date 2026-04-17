"use client";

import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import type { UploadDrawingFormData } from "@/lib/schemas/drawing-schemas";
import type {
  DrawingUploadProgress,
  DrawingUploadError,
} from "@/types/drawings.types";

interface UploadedDrawingResult {
  drawingId: string;
  revisionId?: string;
}

/**
 * React Query hook for handling drawing file uploads with progress tracking
 */
export function useDrawingUpload(projectId: string) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<DrawingUploadProgress[]>([]);
  const [errors, setErrors] = useState<DrawingUploadError[]>([]);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const validateFile = useCallback((file: File): DrawingUploadError | null => {
    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/tiff",
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        fileName: file.name,
        error: "File type not allowed. Please upload PDF, PNG, JPEG, or TIFF files.",
        code: "INVALID_TYPE",
      };
    }

    const maxSize = 100 * 1024 * 1024; // 100MB — must match drawing-schemas.ts
    if (file.size > maxSize) {
      return {
        fileName: file.name,
        error: "File too large. Maximum size is 100MB.",
        code: "FILE_TOO_LARGE",
      };
    }

    return null;
  }, []);

  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      metadata,
    }: {
      file: File;
      metadata: UploadDrawingFormData;
    }) => {
      const validationError = validateFile(file);
      if (validationError) {
        throw new Error(validationError.error);
      }

      // Update progress
      setProgress((prev) => [
        ...prev,
        {
          fileName: file.name,
          progress: 0,
          status: "uploading",
        },
      ]);

      const fileName = file.name.replace(/\.[^/.]+$/, "");

      const signedUpload = await apiFetch<{ path: string; token: string }>(
        `/api/projects/${projectId}/drawings/upload-url`,
        {
          method: "POST",
          body: JSON.stringify({
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
          }),
        },
      );

      const supabase = createSupabaseClient();
      const { error: directUploadError } = await supabase.storage
        .from("project-files")
        .uploadToSignedUrl(signedUpload.path, signedUpload.token, file, {
          contentType: file.type,
          upsert: false,
        });
      if (directUploadError) {
        throw new Error(`Failed to upload file to storage: ${directUploadError.message}`);
      }

      const result = await apiFetch<{
        id: string;
        current_revision?: { id: string };
      }>(`/api/projects/${projectId}/drawings`, {
        method: "POST",
        body: JSON.stringify({
          drawing_number: metadata.drawing_number || fileName,
          title: metadata.title || fileName,
          discipline: metadata.discipline,
          drawing_type: metadata.drawing_type,
          revision_number: metadata.revision_number || "A",
          drawing_date: metadata.drawing_date,
          received_date: metadata.received_date || new Date().toISOString(),
          drawing_set_id: metadata.drawing_set_id,
          description: metadata.description,
          area_id: metadata.area_id,
          upload_path: signedUpload.path,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
        }),
      });

      // Update progress to completed
      setProgress((prev) =>
        prev.map((p) =>
          p.fileName === file.name
            ? {
                ...p,
                progress: 100,
                status: "completed",
                drawingId: result.id,
                revisionId: result.current_revision?.id,
              }
            : p,
        ),
      );

      return {
        drawingId: result.id,
        revisionId: result.current_revision?.id,
      } satisfies UploadedDrawingResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drawings", projectId],
      });
      toast.success("Drawing uploaded successfully");
    },
    onError: (error: Error, variables) => {
      // Update progress to error
      setProgress((prev) =>
        prev.map((p) =>
          p.fileName === variables.file.name
            ? { ...p, status: "error", error: error.message }
            : p,
        ),
      );

      setErrors((prev) => [
        ...prev,
        {
          fileName: variables.file.name,
          error: error.message,
          code: "SERVER_ERROR",
        },
      ]);

      toast.error("Failed to upload drawing", {
        description: error.message,
      });
    },
  });

  const uploadDrawing = useCallback(
    async (file: File, metadata: UploadDrawingFormData): Promise<UploadedDrawingResult> => {
      return uploadMutation.mutateAsync({ file, metadata });
    },
    [uploadMutation],
  );

  const uploadMultipleDrawings = useCallback(
    async (
      files: FileList,
      metadata: Partial<UploadDrawingFormData>,
    ): Promise<UploadedDrawingResult[]> => {
      const results: UploadedDrawingResult[] = [];

      for (const file of Array.from(files)) {
        try {
          const fileName = file.name.replace(/\.[^/.]+$/, "");
          const drawingMetadata: UploadDrawingFormData = {
            drawing_number: metadata.drawing_number || fileName,
            title: metadata.title || fileName,
            discipline: metadata.discipline,
            drawing_type: metadata.drawing_type,
            revision_number: metadata.revision_number || "A",
            drawing_date: metadata.drawing_date,
            received_date: metadata.received_date || new Date().toISOString(),
            drawing_set_id: metadata.drawing_set_id ?? "",
            description: metadata.description,
            area_id: metadata.area_id,
          };

          const revision = await uploadDrawing(file, drawingMetadata);
          results.push(revision);
        } catch (err) {
          console.error(`Failed to upload ${file.name}:`, err);
        }
      }

      toast.success(`Uploaded ${results.length} of ${files.length} drawings`);
      return results;
    },
    [uploadDrawing],
  );

  return {
    uploadDrawing,
    uploadMultipleDrawings,
    progress,
    isUploading: uploadMutation.isPending,
    errors,
    clearErrors,
  };
}
