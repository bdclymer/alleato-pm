"use client";

import * as React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, AlertCircle, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Badge } from "@/components/ui/badge";
import { FileUploadField } from "@/components/forms/FileUploadField";

import { useDrawingUpload } from "@/hooks/use-drawing-upload";
import { useDrawingSets } from "@/hooks/use-drawing-sets";
import { useUploadRevision } from "@/hooks/use-drawings";
import {
  uploadDrawingFormSchema,
  type UploadDrawingFormData,
} from "@/lib/schemas/drawing-schemas";
import {
  DRAWING_DISCIPLINES,
  DRAWING_TYPES,
  type DrawingArea,
} from "@/types/drawings.types";
import { useDrawingAreas } from "@/hooks/use-drawing-areas";
import { cn } from "@/lib/utils";

interface DrawingUploadDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAreaId?: string;
  onUploadComplete?: () => void;
  /** Files pre-populated from drag-and-drop on the page */
  initialFiles?: File[];
}

interface FileInfo {
  name: string;
  size: number;
  type: string;
  file: File;
}

interface DuplicateDrawing {
  id: string;
  drawing_number: string;
  title: string;
}

export function DrawingUploadDialog({
  projectId,
  open,
  onOpenChange,
  onUploadComplete,
  initialFiles,
}: DrawingUploadDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileInfo[]>([]);

  // When initialFiles are provided (from drag-and-drop), populate selectedFiles
  React.useEffect(() => {
    if (initialFiles && initialFiles.length > 0 && open) {
      const mapped = initialFiles.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        file,
      }));
      setSelectedFiles(mapped);
    }
  }, [initialFiles, open]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [duplicateDrawing, setDuplicateDrawing] = useState<DuplicateDrawing | null>(null);
  const [isUploadingRevision, setIsUploadingRevision] = useState(false);

  const { data: sets = [] } = useDrawingSets(projectId);
  const { data: areas = [] } = useDrawingAreas(projectId);
  const { uploadMultipleDrawings, isUploading, errors, clearErrors } = useDrawingUpload(projectId);
  const uploadRevision = useUploadRevision(projectId);

  const form = useForm<UploadDrawingFormData>({
    resolver: zodResolver(uploadDrawingFormSchema),
    reValidateMode: "onBlur",
    defaultValues: {
      drawing_set_id: "",
      drawing_date: "",
      received_date: "",
    },
  });

  const handleFilesSelected = (files: File[]) => {
    const newFiles = files.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      file,
    }));
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const resolveSetId = async (rawSetId: string): Promise<string | null> => {
    if (rawSetId !== "__new__") return rawSetId;
    if (!newSetName.trim()) {
      toast.error("Please enter a name for the new drawing set");
      return null;
    }
    const res = await fetch(`/api/projects/${projectId}/drawings/sets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSetName.trim(), issued_at: new Date().toISOString() }),
    });
    if (!res.ok) {
      toast.error("Failed to create drawing set");
      return null;
    }
    const newSet = await res.json();
    return newSet.id as string;
  };

  const handleUpload = async (data: UploadDrawingFormData) => {
    if (selectedFiles.length === 0) {
      toast.error("You must attach a file");
      return;
    }

    clearErrors();
    setDuplicateDrawing(null);

    try {
      const setId = await resolveSetId(data.drawing_set_id);
      if (setId === null) return;

      const uploadData = { ...data, drawing_set_id: setId };

      if (selectedFiles.length === 1) {
        // Build FormData manually so we can inspect a 409 before the hook swallows it
        const file = selectedFiles[0].file;
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        const fd = new FormData();
        fd.append("file", file);
        fd.append("drawing_number", uploadData.drawing_number || fileName);
        fd.append("title", uploadData.title || fileName);
        if (uploadData.discipline) fd.append("discipline", uploadData.discipline);
        if (uploadData.drawing_type) fd.append("drawing_type", uploadData.drawing_type);
        fd.append("revision_number", uploadData.revision_number || "A");
        if (uploadData.drawing_date) fd.append("drawing_date", uploadData.drawing_date);
        fd.append("received_date", uploadData.received_date || new Date().toISOString());
        if (uploadData.drawing_set_id) fd.append("drawing_set_id", uploadData.drawing_set_id);
        if (uploadData.description) fd.append("description", uploadData.description);
        if (uploadData.area_id) fd.append("area_id", uploadData.area_id);

        const res = await fetch(`/api/projects/${projectId}/drawings`, {
          method: "POST",
          body: fd,
        });

        if (res.status === 409) {
          const body = await res.json();
          setDuplicateDrawing(body.existing_drawing ?? null);
          return;
        }

        if (!res.ok) {
          const body = await res.json();
          toast.error("Upload failed", { description: body.error || "An unexpected error occurred" });
          return;
        }
      } else {
        const fileList = new DataTransfer();
        selectedFiles.forEach((fileInfo) => fileList.items.add(fileInfo.file));
        await uploadMultipleDrawings(fileList.files, uploadData);
      }

      toast.success(
        `Successfully uploaded ${selectedFiles.length} drawing${selectedFiles.length > 1 ? "s" : ""}`
      );

      handleClose();
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Upload failed", {
        description:
          error instanceof Error ? error.message : "An unexpected error occurred",
      });
    }
  };

  const handleUploadAsRevision = async () => {
    if (!duplicateDrawing || selectedFiles.length === 0) return;

    const data = form.getValues();
    setIsUploadingRevision(true);

    try {
      const setId = await resolveSetId(data.drawing_set_id);
      if (setId === null) {
        setIsUploadingRevision(false);
        return;
      }

      const file = selectedFiles[0].file;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("revision_number", data.revision_number || "A");
      fd.append("received_date", data.received_date || new Date().toISOString());
      if (data.drawing_date) fd.append("drawing_date", data.drawing_date);
      if (setId) fd.append("drawing_set_id", setId);
      if (data.description) fd.append("description", data.description);

      await uploadRevision.mutateAsync({ drawingId: duplicateDrawing.id, formData: fd });

      toast.success("New revision uploaded successfully");
      handleClose();
    } catch (error) {
      toast.error("Failed to upload revision", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setIsUploadingRevision(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedFiles([]);
    setShowAdvanced(false);
    setDuplicateDrawing(null);
    onOpenChange(false);
    onUploadComplete?.();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const flatAreas = React.useMemo(() => {
    const flatten = (
      areasList: DrawingArea[],
      depth = 0
    ): Array<{ id: string; name: string; depth: number }> => {
      return areasList.flatMap((area: DrawingArea) => [
        { id: area.id, name: area.name, depth },
        ...flatten(area.children || [], depth + 1),
      ]);
    };
    return flatten(areas);
  }, [areas]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Drawings</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleUpload)} className="space-y-6">
            {/* File Upload */}
            <FileUploadField
              label=""
              accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif"
              multiple
              maxSize={500 * 1024 * 1024}
              onFilesSelected={handleFilesSelected}
              hint="or Drag & Drop"
              required
            />

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {file.type.split("/")[1]?.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {!isUploading && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="text-muted-foreground"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Drawing Set */}
            <FormField
              control={form.control}
              name="drawing_set_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Drawing Set <span className="text-destructive">*</span>
                  </FormLabel>
                  <p className="text-sm text-muted-foreground -mt-1">
                    Group and label drawings into a collection as they are issued to keep them organized.
                  </p>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isUploading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select or Create set" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sets.map((set) => (
                        <SelectItem key={set.id} value={set.id}>
                          {set.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="__new__">+ Create new set...</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* New set name input when "Create new set" is selected */}
            {form.watch("drawing_set_id") === "__new__" && (
              <FormItem>
                <FormLabel>New Set Name</FormLabel>
                <Input
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  placeholder="e.g. IFC Set 01 - 2024"
                  disabled={isUploading}
                />
              </FormItem>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="drawing_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Drawing Date</FormLabel>
                    <p className="text-sm text-muted-foreground -mt-1">
                      Enter the date the drawing was authored.
                    </p>
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
                name="received_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Received Date</FormLabel>
                    <p className="text-sm text-muted-foreground -mt-1">
                      Enter the date the drawings were received from the design team.
                    </p>
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
            </div>

            {/* Advanced Options */}
            <div className="border-t pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary px-0"
              >
                {showAdvanced ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Advanced Options
              </Button>

              {showAdvanced && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="drawing_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Drawing Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="A-101" disabled={isUploading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="revision_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Revision</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="A" disabled={isUploading} />
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
                        <FormLabel>Title</FormLabel>
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
                            {DRAWING_DISCIPLINES.map((d) => (
                              <SelectItem key={d} value={d}>
                                {d}
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
                    name="drawing_type"
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
                            {DRAWING_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
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
                    name="area_id"
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
              )}
            </div>

            {/* Duplicate drawing warning */}
            {duplicateDrawing && (
              <div className="rounded-md bg-muted p-3 text-sm space-y-2">
                <p className="font-medium text-foreground">Drawing already exists</p>
                <p className="text-muted-foreground">
                  Drawing{" "}
                  <span className="font-mono">{duplicateDrawing.drawing_number}</span>{" "}
                  — {duplicateDrawing.title}
                </p>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isUploadingRevision}
                    onClick={handleUploadAsRevision}
                  >
                    {isUploadingRevision ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      "Upload as New Revision"
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isUploadingRevision}
                    onClick={() => setDuplicateDrawing(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Errors */}
            {errors.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Upload Errors:</span>
                </div>
                {errors.map((error, index) => (
                  <div
                    key={index}
                    className="text-sm text-destructive bg-destructive/10 p-2 rounded"
                  >
                    <strong>{error.fileName}:</strong> {error.error}
                  </div>
                ))}
              </div>
            )}

            {/* Validation hint */}
            {selectedFiles.length === 0 && form.formState.isSubmitted && (
              <p className="text-sm text-destructive">You must attach a file</p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-xs text-muted-foreground">* Required fields</p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  disabled={isUploading || isUploadingRevision}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUploading || isUploadingRevision}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Process"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
