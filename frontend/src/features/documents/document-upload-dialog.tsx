"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileUp, Upload } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { useCreateDocument } from "@/hooks/use-documents";

// =============================================================================
// Schema
// =============================================================================

const documentUploadSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  folder: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(["Draft", "Published", "Superseded", "Archived"]).default("Draft"),
  is_private: z.boolean().default(false),
});

type DocumentUploadFormValues = z.infer<typeof documentUploadSchema>;

// =============================================================================
// Props
// =============================================================================

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  defaultFolder?: string;
}

// =============================================================================
// Component
// =============================================================================

export function DocumentUploadDialog({
  open,
  onOpenChange,
  projectId,
  defaultFolder,
}: DocumentUploadDialogProps) {
  const createDocument = useCreateDocument(projectId);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isDraggingFile, setIsDraggingFile] = React.useState(false);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<
    z.input<typeof documentUploadSchema>,
    any,
    DocumentUploadFormValues
  >({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: {
      title: "",
      description: "",
      folder: defaultFolder ?? "Root",
      category: "",
      status: "Draft",
      is_private: false,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        title: "",
        description: "",
        folder: defaultFolder ?? "Root",
        category: "",
        status: "Draft",
        is_private: false,
      });
      setSelectedFile(null);
      setIsDraggingFile(false);
      setFileError(null);
    }
  }, [open, defaultFolder, form]);

  const selectFile = React.useCallback(
    (file: File) => {
      setSelectedFile(file);
      setFileError(null);
      if (!form.getValues("title")) {
        form.setValue("title", file.name.replace(/\.[^.]+$/, ""));
      }
    },
    [form],
  );

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      selectFile(file);
    }
  };

  const handleFileDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDraggingFile(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      selectFile(file);
    }
  };

  const handleSubmit = async (values: DocumentUploadFormValues) => {
    if (!selectedFile) {
      setFileError("Select a file before uploading.");
      return;
    }

    const formData = new FormData();
    formData.set("file", selectedFile);
    formData.set("title", values.title);
    formData.set("description", values.description || "");
    formData.set("folder", values.folder || "Root");
    formData.set("category", values.category || "");
    formData.set("status", values.status);
    formData.set("is_private", String(values.is_private));

    await createDocument.mutateAsync(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Add a new document to this project. Fill in the details and select a
            file to upload.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* File Upload Area */}
            <label
              htmlFor="document-file-input"
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDraggingFile(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDraggingFile(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDraggingFile(false);
              }}
              onDrop={handleFileDrop}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors hover:bg-muted/50",
                isDraggingFile && "border-primary bg-primary/10",
              )}
            >
              {selectedFile ? (
                <>
                  <FileUp className="h-8 w-8 text-primary" />
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    Drop a file here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, DOC, XLS, IMG, or any file type
                  </p>
                </>
              )}
            </label>
            {fileError ? (
              <p className="text-sm font-medium text-destructive">
                {fileError}
              </p>
            ) : null}
            <Input
              id="document-file-input"
              ref={fileInputRef}
              type="file"
              className="sr-only"
              onChange={handleFileSelect}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Document title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="folder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Folder</FormLabel>
                    <FormControl>
                      <Input placeholder="Root" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="General">General</SelectItem>
                        <SelectItem value="Financial">Financial</SelectItem>
                        <SelectItem value="Legal">Legal</SelectItem>
                        <SelectItem value="Technical">Technical</SelectItem>
                        <SelectItem value="Administrative">
                          Administrative
                        </SelectItem>
                        <SelectItem value="Safety">Safety</SelectItem>
                        <SelectItem value="Environmental">
                          Environmental
                        </SelectItem>
                        <SelectItem value="Design">Design</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Published">Published</SelectItem>
                      <SelectItem value="Superseded">Superseded</SelectItem>
                      <SelectItem value="Archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_private"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="is_private">Private Document</Label>
                    <p className="text-xs text-muted-foreground">
                      Only visible to admins and the uploader
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      id="is_private"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createDocument.isPending}
              >
                {createDocument.isPending ? "Uploading..." : "Upload Document"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
