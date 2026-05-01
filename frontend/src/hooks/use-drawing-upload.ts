"use client";

import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { getDrawingUploadFallbackIdentity } from "@/lib/drawings/drawing-identity";
import type { UploadDrawingFormData } from "@/lib/schemas/drawing-schemas";
import { getDrawingUploadFileError } from "@/lib/drawings/upload-constraints";
import type {
  DrawingUploadProgress,
  DrawingUploadError,
} from "@/types/drawings.types";

interface UploadedDrawingResult {
  fileName: string;
  drawingId: string;
  revisionId?: string;
}

export class DrawingUploadBatchError extends Error {
  constructor(
    readonly results: UploadedDrawingResult[],
    readonly failures: DrawingUploadError[],
  ) {
    super(`Uploaded ${results.length} of ${results.length + failures.length} drawings`);
    this.name = "DrawingUploadBatchError";
  }
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

  const clearUploadState = useCallback(() => {
    setProgress([]);
    setErrors([]);
  }, []);

  const validateFile = useCallback((file: File): DrawingUploadError | null => {
    const error = getDrawingUploadFileError(file);
    if (error) {
      return {
        fileName: file.name,
        error,
        code: error.includes("too large") ? "FILE_TOO_LARGE" : "INVALID_TYPE",
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

      const fallbackIdentity = getDrawingUploadFallbackIdentity(file.name);

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

      setProgress((prev) =>
        prev.map((p) =>
          p.fileName === file.name ? { ...p, progress: 70, status: "processing" } : p,
        ),
      );

      const result = await apiFetch<{
        id: string;
        current_revision?: { id: string };
      }>(`/api/projects/${projectId}/drawings`, {
        method: "POST",
        body: JSON.stringify({
          drawing_number: metadata.drawing_number || fallbackIdentity.drawingNumber,
          title: metadata.title || fallbackIdentity.title,
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
        fileName: file.name,
        drawingId: result.id,
        revisionId: result.current_revision?.id,
      } satisfies UploadedDrawingResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drawings", projectId],
      });
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
      const failures: DrawingUploadError[] = [];

      for (const file of Array.from(files)) {
        try {
          const fallbackIdentity = getDrawingUploadFallbackIdentity(file.name);
          const drawingMetadata: UploadDrawingFormData = {
            drawing_number: metadata.drawing_number || fallbackIdentity.drawingNumber,
            title: metadata.title || fallbackIdentity.title,
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
          failures.push({
            fileName: file.name,
            error: err instanceof Error ? err.message : "An unexpected error occurred",
            code: "SERVER_ERROR",
          });
        }
      }

      if (failures.length > 0) {
        throw new DrawingUploadBatchError(results, failures);
      }

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
    clearUploadState,
  };
}
