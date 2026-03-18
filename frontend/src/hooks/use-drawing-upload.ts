"use client";

import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { UploadDrawingFormData } from "@/lib/schemas/drawing-schemas";
import type {
  DrawingRevision,
  DrawingUploadProgress,
  DrawingUploadError,
} from "@/types/drawings.types";

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

    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return {
        fileName: file.name,
        error: "File too large. Maximum size is 500MB.",
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
      const formData = new FormData();
      formData.append("file", file);
      formData.append("drawing_number", metadata.drawing_number || fileName);
      formData.append("title", metadata.title || fileName);
      if (metadata.discipline) formData.append("discipline", metadata.discipline);
      if (metadata.drawing_type) formData.append("drawing_type", metadata.drawing_type);
      formData.append("revision_number", metadata.revision_number || "A");
      if (metadata.drawing_date) formData.append("drawing_date", metadata.drawing_date);
      formData.append("received_date", metadata.received_date || new Date().toISOString());
      if (metadata.drawing_set_id) formData.append("drawing_set_id", metadata.drawing_set_id);
      if (metadata.description) formData.append("description", metadata.description);
      if (metadata.area_id) formData.append("area_id", metadata.area_id);

      const response = await fetch(
        `/api/projects/${projectId}/drawings`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload drawing");
      }

      const result = await response.json();

      // Update progress to completed
      setProgress((prev) =>
        prev.map((p) =>
          p.fileName === file.name
            ? {
                ...p,
                progress: 100,
                status: "completed",
                drawingId: result.drawing_id,
                revisionId: result.id,
              }
            : p,
        ),
      );

      return result;
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
    async (file: File, metadata: UploadDrawingFormData): Promise<DrawingRevision> => {
      return uploadMutation.mutateAsync({ file, metadata });
    },
    [uploadMutation],
  );

  const uploadMultipleDrawings = useCallback(
    async (
      files: FileList,
      metadata: Partial<UploadDrawingFormData>,
    ): Promise<DrawingRevision[]> => {
      const results: DrawingRevision[] = [];

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
