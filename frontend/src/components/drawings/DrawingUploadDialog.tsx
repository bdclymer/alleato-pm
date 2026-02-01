"use client";

import * as React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FileUploadField } from "@/components/forms/FileUploadField";

import { useDrawingUpload } from "@/hooks/use-drawing-upload";
import { useDrawingAreas } from "@/hooks/use-drawing-areas";
import {
  drawingUploadSchema,
  DRAWING_DISCIPLINES,
  DRAWING_TYPES,
  type DrawingUploadFormData,
  type DrawingUploadProgress,
} from "@/types/drawings.types";
import { cn } from "@/lib/utils";

interface DrawingUploadDialogProps {
  projectId: string;
  defaultAreaId?: string;
  children?: React.ReactNode;
  onUploadComplete?: () => void;
}

interface FileInfo {
  name: string;
  size: number;
  type: string;
  file: File;
}

export function DrawingUploadDialog({
  projectId,
  defaultAreaId,
  children,
  onUploadComplete,
}: DrawingUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileInfo[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const { areas } = useDrawingAreas(projectId);
  const { uploadDrawing, uploadMultipleDrawings, isUploading, errors, clearErrors } = useDrawingUpload(projectId);

  const form = useForm<DrawingUploadFormData>({
    resolver: zodResolver(drawingUploadSchema),
    defaultValues: {
      drawingNumber: "",
      title: "",
      discipline: undefined,
      drawingType: undefined,
      revisionNumber: "A",
      drawingDate: undefined,
      receivedDate: new Date().toISOString().split('T')[0] + 'T09:00:00.000Z',
      drawingSetId: undefined,
      description: "",
      areaId: defaultAreaId,
    },
  });

  const handleFilesSelected = (files: File[]) => {
    const newFiles = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      file,
    }));

    setSelectedFiles(prev => [...prev, ...newFiles]);

    // Auto-populate drawing number and title from first file if not already set
    if (!form.getValues('drawingNumber') && files.length > 0) {
      const fileName = files[0].name.replace(/\.[^/.]+$/, "");
      form.setValue('drawingNumber', fileName);
      form.setValue('title', fileName);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async (data: DrawingUploadFormData) => {
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one file to upload");
      return;
    }

    clearErrors();

    try {
      if (selectedFiles.length === 1) {
        // Single file upload with detailed metadata
        await uploadDrawing(selectedFiles[0].file, data);
      } else {
        // Multiple file upload with shared metadata
        const fileList = new DataTransfer();
        selectedFiles.forEach(fileInfo => fileList.items.add(fileInfo.file));
        await uploadMultipleDrawings(fileList.files, data);
      }

      toast.success(`Successfully uploaded ${selectedFiles.length} drawing${selectedFiles.length > 1 ? 's' : ''}`);

      // Reset form and close dialog
      form.reset();
      setSelectedFiles([]);
      setUploadProgress({});
      setOpen(false);
      onUploadComplete?.();

    } catch (error) {
      console.error('Upload failed:', error);
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "An unexpected error occurred"
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const flatAreas = React.useMemo(() => {
    const flatten = (areas: typeof areas, depth = 0): Array<{id: string, name: string, depth: number}> => {
      return areas.flatMap(area => [
        { id: area.id, name: area.name, depth },
        ...flatten(area.children || [], depth + 1)
      ]);
    };
    return flatten(areas);
  }, [areas]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload Drawings
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Drawings</DialogTitle>
          <DialogDescription>
            Upload one or more drawing files with metadata. Supported formats: PDF, PNG, JPEG, TIFF.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleUpload)} className="space-y-6">
            {/* File Upload Section */}
            <div className="space-y-4">
              <FileUploadField
                label="Drawing Files"
                accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif"
                multiple
                maxSize={500 * 1024 * 1024} // 500MB
                onFilesSelected={handleFilesSelected}
                hint="Drag and drop files here or click to browse. Maximum 500MB per file."
                required
              />

              {/* Selected Files List */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Selected Files ({selectedFiles.length})</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            {uploadProgress[file.name] ? (
                              <div className="flex items-center gap-2">
                                {uploadProgress[file.name] === 100 ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                ) : (
                                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                                )}
                              </div>
                            ) : (
                              <Upload className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(file.size)}
                              </p>
                              <Badge variant="secondary" className="text-xs">
                                {file.type.split('/')[1]?.toUpperCase()}
                              </Badge>
                            </div>
                            {uploadProgress[file.name] && (
                              <Progress
                                value={uploadProgress[file.name]}
                                className="h-1 mt-1"
                              />
                            )}
                          </div>
                        </div>
                        {!isUploading && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Metadata Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="drawingNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Drawing Number *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="A-101"
                        disabled={isUploading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="revisionNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revision</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="A"
                        disabled={isUploading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="First Floor Plan"
                        disabled={isUploading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discipline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discipline</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isUploading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select discipline" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DRAWING_DISCIPLINES.map((discipline) => (
                          <SelectItem key={discipline} value={discipline}>
                            {discipline}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="drawingType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isUploading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DRAWING_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="areaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Drawing Area</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isUploading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select area" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {flatAreas.map((area) => (
                          <SelectItem key={area.id} value={area.id}>
                            <span
                              style={{ paddingLeft: `${area.depth * 16}px` }}
                              className={cn(area.depth > 0 && "text-muted-foreground")}
                            >
                              {area.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="drawingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Drawing Date</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        disabled={isUploading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Additional notes about this drawing..."
                        rows={3}
                        disabled={isUploading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Error Display */}
            {errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Upload Errors:</span>
                </div>
                <div className="space-y-1">
                  {errors.map((error, index) => (
                    <div key={index} className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                      <strong>{error.fileName}:</strong> {error.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={selectedFiles.length === 0 || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}