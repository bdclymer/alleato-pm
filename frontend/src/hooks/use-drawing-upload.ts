"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type {
  DrawingUploadFormData,
  DrawingRevision,
  DrawingUploadProgress,
  DrawingUploadError,
  UseDrawingUploadReturn,
} from "@/types/drawings.types";

const supabase = createClient();

/**
 * Custom hook for handling drawing file uploads with progress tracking
 */
export function useDrawingUpload(projectId: string): UseDrawingUploadReturn {
  const [progress, setProgress] = useState<DrawingUploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<DrawingUploadError[]>([]);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const validateFile = useCallback((file: File): DrawingUploadError | null => {
    const allowedTypes = [
      'application/pdf',
      'image/png', 
      'image/jpeg',
      'image/tiff',
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        fileName: file.name,
        error: `File type not allowed. Please upload PDF, PNG, JPEG, or TIFF files.`,
        code: 'INVALID_TYPE'
      };
    }

    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return {
        fileName: file.name,
        error: `File too large. Maximum size is 500MB.`,
        code: 'FILE_TOO_LARGE'
      };
    }

    return null;
  }, []);

  const uploadDrawing = useCallback(async (
    file: File, 
    metadata: DrawingUploadFormData
  ): Promise<DrawingRevision> => {
    const validationError = validateFile(file);
    if (validationError) {
      throw new Error(validationError.error);
    }

    try {
      // Create drawing record first
      const drawingData = {
        project_id: parseInt(projectId),
        area_id: metadata.areaId || null,
        drawing_number: metadata.drawingNumber,
        title: metadata.title,
        discipline: metadata.discipline || null,
        drawing_type: metadata.drawingType || null,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      };

      const { data: drawing, error: drawingError } = await supabase
        .from('drawings')
        .insert(drawingData)
        .select('*')
        .single();

      if (drawingError) throw drawingError;

      // Upload file
      const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `drawings/projects/${projectId}/${drawing.id}/${Date.now()}_${fileName}`;

      const { data: storageData, error: storageError } = await supabase.storage
        .from('drawings')
        .upload(storagePath, file);

      if (storageError) throw storageError;

      // Create revision record
      const revisionData = {
        drawing_id: drawing.id,
        revision_number: metadata.revisionNumber || 'A',
        drawing_set_id: metadata.drawingSetId || null,
        drawing_date: metadata.drawingDate || null,
        received_date: metadata.receivedDate,
        status: 'under_review' as const,
        file_url: storageData.path,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        is_current_revision: true,
        description: metadata.description || null,
        uploaded_by: (await supabase.auth.getUser()).data.user?.id,
      };

      const { data: revision, error: revisionError } = await supabase
        .from('drawing_revisions')
        .insert(revisionData)
        .select('*')
        .single();

      if (revisionError) throw revisionError;

      toast.success("Drawing uploaded successfully");
      return revision as DrawingRevision;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      toast.error("Upload failed", { description: errorMessage });
      throw new Error(errorMessage);
    }
  }, [projectId, validateFile]);

  const uploadMultipleDrawings = useCallback(async (
    files: FileList, 
    metadata: Partial<DrawingUploadFormData>
  ): Promise<DrawingRevision[]> => {
    setIsUploading(true);
    const results: DrawingRevision[] = [];

    try {
      for (const file of Array.from(files)) {
        try {
          const fileName = file.name.replace(/\.[^/.]+$/, "");
          const drawingMetadata: DrawingUploadFormData = {
            drawingNumber: metadata.drawingNumber || fileName,
            title: metadata.title || fileName,
            discipline: metadata.discipline,
            drawingType: metadata.drawingType,
            revisionNumber: metadata.revisionNumber || 'A',
            drawingDate: metadata.drawingDate,
            receivedDate: metadata.receivedDate || new Date().toISOString(),
            drawingSetId: metadata.drawingSetId,
            description: metadata.description,
            areaId: metadata.areaId,
          };

          const revision = await uploadDrawing(file, drawingMetadata);
          results.push(revision);
        } catch (err) {
          console.error(`Failed to upload ${file.name}:`, err);
        }
      }

      toast.success(`Uploaded ${results.length} of ${files.length} drawings`);
      return results;

    } finally {
      setIsUploading(false);
    }
  }, [uploadDrawing]);

  return {
    uploadDrawing,
    uploadMultipleDrawings,
    progress,
    isUploading,
    errors,
    clearErrors,
  };
}
