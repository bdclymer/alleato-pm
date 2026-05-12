"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
} from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUpdateDocument, type ProjectDocument } from "@/hooks/use-documents";

// =============================================================================
// Schema
// =============================================================================

const editDocumentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable().optional(),
  folder: z.string().nullable().optional(),
  version: z.number().int().min(1).nullable().optional(),
  status: z.enum(["Draft", "Published", "Superseded", "Archived"]),
  category: z.string().nullable().optional(),
  is_private: z.boolean().nullable().optional(),
});

type EditDocumentFormValues = z.infer<typeof editDocumentSchema>;

// =============================================================================
// Constants
// =============================================================================

const STATUS_OPTIONS = [
  { value: "Draft", label: "Draft" },
  { value: "Published", label: "Published" },
  { value: "Superseded", label: "Superseded" },
  { value: "Archived", label: "Archived" },
] as const;

const CATEGORY_OPTIONS = [
  { value: "General", label: "General" },
  { value: "Financial", label: "Financial" },
  { value: "Legal", label: "Legal" },
  { value: "Technical", label: "Technical" },
  { value: "Administrative", label: "Administrative" },
  { value: "Safety", label: "Safety" },
  { value: "Environmental", label: "Environmental" },
  { value: "Design", label: "Design" },
];

// =============================================================================
// Component
// =============================================================================

interface DocumentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: ProjectDocument | null;
  projectId: number;
}

export function DocumentEditDialog({
  open,
  onOpenChange,
  document,
  projectId,
}: DocumentEditDialogProps) {
  const updateDocument = useUpdateDocument(
    projectId,
    document ? String(document.id) : "",
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<EditDocumentFormValues, unknown, EditDocumentFormValues>({
    resolver: zodResolver(editDocumentSchema),
    defaultValues: {
      title: "",
      description: null,
      folder: null,
      version: 1,
      status: "Draft",
      category: null,
      is_private: false,
    },
  });

  // Populate form when document changes
  React.useEffect(() => {
    if (document) {
      reset({
        title: document.title,
        description: document.description,
        folder: document.folder,
        version: document.version ?? 1,
        status: document.status,
        category: document.category,
        is_private: document.is_private ?? false,
      });
    }
  }, [document, reset]);

  const isPrivate = watch("is_private");
  const status = watch("status");
  const category = watch("category");

  const onSubmit = async (values: EditDocumentFormValues) => {
    if (!document) return;
    await updateDocument.mutateAsync(values);
    onOpenChange(false);
  };

  const handleClose = () => {
    if (!updateDocument.isPending) {
      onOpenChange(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent className="max-w-lg">
        <ModalHeader>
          <ModalTitle>Edit Document</ModalTitle>
        </ModalHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="doc-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="doc-title"
              {...register("title")}
              placeholder="Document title"
              disabled={updateDocument.isPending}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="doc-description">Description</Label>
            <Textarea
              id="doc-description"
              {...register("description")}
              placeholder="Optional description"
              rows={3}
              disabled={updateDocument.isPending}
            />
          </div>

          {/* Folder */}
          <div className="space-y-1.5">
            <Label htmlFor="doc-folder">Folder</Label>
            <Input
              id="doc-folder"
              {...register("folder")}
              placeholder="e.g. Contracts / Legal"
              disabled={updateDocument.isPending}
            />
          </div>

          {/* Status + Version row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) =>
                  setValue("status", v as EditDocumentFormValues["status"], {
                    shouldDirty: true,
                  })
                }
                disabled={updateDocument.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-version">Version</Label>
              <Input
                id="doc-version"
                type="number"
                min={1}
                {...register("version", { valueAsNumber: true })}
                disabled={updateDocument.isPending}
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={category ?? ""}
              onValueChange={(v) =>
                setValue("category", v || null, { shouldDirty: true })
              }
              disabled={updateDocument.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Private toggle */}
          <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Private document</p>
              <p className="text-xs text-muted-foreground">
                Restrict visibility to project admins
              </p>
            </div>
            <Switch
              checked={isPrivate ?? false}
              onCheckedChange={(checked) =>
                setValue("is_private", checked, { shouldDirty: true })
              }
              disabled={updateDocument.isPending}
            />
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={updateDocument.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateDocument.isPending || !isDirty}
            >
              {updateDocument.isPending ? "Saving..." : "Save changes"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
