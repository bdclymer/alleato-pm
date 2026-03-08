"use client";

import * as React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload, X, FileText } from "lucide-react";

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
  FormDescription,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import { useCreateSpecification } from "@/hooks/use-specifications";
import { useSpecificationAreas } from "@/hooks/use-specification-areas";
import {
  uploadSpecificationSchema,
  type UploadSpecificationFormData,
} from "@/lib/schemas/specification-schemas";

interface SpecificationUploadDialogProps {
  projectId: string;
  children?: React.ReactNode;
  onUploadComplete?: () => void;
}

export function SpecificationUploadDialog({
  projectId,
  children,
  onUploadComplete,
}: SpecificationUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: areas } = useSpecificationAreas(projectId);
  const createMutation = useCreateSpecification(projectId);

  const form = useForm<UploadSpecificationFormData>({
    resolver: zodResolver(uploadSpecificationSchema),
    reValidateMode: "onBlur",
    defaultValues: {
      section_number: "",
      title: "",
      description: "",
      notes: "",
      area_ids: [],
      subscriber_ids: [],
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > 50 * 1024 * 1024) {
      form.setError("file", {
        type: "manual",
        message: "File must be under 50MB",
      });
      return;
    }

    setSelectedFile(file);
    form.setValue("file", file);
    form.clearErrors("file");

    // Create preview URL (will show PDF icon, not actual preview)
    // CRITICAL: URL.createObjectURL creates memory leak if not revoked
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const removeFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    form.setValue("file", undefined as any);
  };

  const handleSubmit = async (data: UploadSpecificationFormData) => {
    try {
      await createMutation.mutateAsync(data);

      // Cleanup
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      form.reset();
      setSelectedFile(null);
      setPreviewUrl(null);
      setOpen(false);
      onUploadComplete?.();
    } catch (error) {
      // Error already handled by mutation
      console.error("Upload failed:", error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload Specification
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Specification</DialogTitle>
          <DialogDescription>
            Upload a specification document with metadata. Max file size is 50MB.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* File Upload */}
            <FormField
              control={form.control}
              name="file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>File *</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      {!selectedFile ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                          <input
                            type="file"
                            accept="*/*"
                            onChange={handleFileChange}
                            className="hidden"
                            id="file-upload"
                          />
                          <label
                            htmlFor="file-upload"
                            className="cursor-pointer flex flex-col items-center space-y-2"
                          >
                            <Upload className="h-12 w-12 text-gray-400" />
                            <div className="text-sm text-gray-600">
                              <span className="font-medium text-blue-600 hover:text-blue-500">
                                Click to upload
                              </span>{" "}
                              or drag and drop
                            </div>
                            <p className="text-xs text-gray-500">
                              Any file type (max 50MB)
                            </p>
                          </label>
                        </div>
                      ) : (
                        <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <FileText className="h-8 w-8 text-red-500" />
                            <div>
                              <p className="text-sm font-medium">{selectedFile.name}</p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(selectedFile.size)}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={removeFile}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Section Number */}
            <FormField
              control={form.control}
              name="section_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Section Number *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="03 30 00"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    CSI format with numbers and spaces only (e.g., "03 30 00")
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Cast-in-Place Concrete"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the specification..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Areas */}
            {areas && areas.length > 0 && (
              <FormField
                control={form.control}
                name="area_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Areas</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        {areas.map((area) => (
                          <label
                            key={area.id}
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              value={area.id}
                              checked={field.value?.includes(area.id) || false}
                              onChange={(e) => {
                                const currentValue = field.value || [];
                                if (e.target.checked) {
                                  field.onChange([...currentValue, area.id]);
                                } else {
                                  field.onChange(
                                    currentValue.filter((id) => id !== area.id)
                                  );
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm">{area.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {area.section_count} specs
                            </Badge>
                          </label>
                        ))}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Assign this specification to one or more areas
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Upload notes or comments..."
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || !selectedFile}
              >
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Upload Specification
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
