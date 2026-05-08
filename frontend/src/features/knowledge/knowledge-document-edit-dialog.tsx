"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/unified-modal";
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
import {
  useUpdateKnowledgeDocument,
  type KnowledgeDocument,
} from "@/hooks/use-knowledge-documents";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  tags: z.string(),
  status: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface KnowledgeDocumentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: KnowledgeDocument | null;
}

export function KnowledgeDocumentEditDialog({
  open,
  onOpenChange,
  document: doc,
}: KnowledgeDocumentEditDialogProps) {
  const updateMutation = useUpdateKnowledgeDocument();

  const form = useForm<FormValues, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: doc?.title ?? doc?.file_name ?? "",
      tags: doc?.tags ?? "",
      status: doc?.status ?? "uploaded",
    },
  });

  React.useEffect(() => {
    if (open && doc) {
      form.reset({
        title: doc.title ?? doc.file_name ?? "",
        tags: doc.tags ?? "",
        status: doc.status ?? "uploaded",
      });
    }
  }, [open, doc, form]);

  async function onSubmit(values: FormValues) {
    if (!doc) return;
    await updateMutation.mutateAsync({
      id: doc.id,
      title: values.title,
      tags: values.tags,
      status: values.status,
    });
    onOpenChange(false);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="sm:max-w-md">
        <ModalHeader>
          <ModalTitle>Edit Knowledge Source</ModalTitle>
        </ModalHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Document title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Comma-separated tags (e.g. sprinklers, budget)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="uploaded">Uploaded</SelectItem>
                      <SelectItem value="extracted">Extracted</SelectItem>
                      <SelectItem value="embedded">Embedded</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <ModalFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </ModalFooter>
          </form>
        </Form>
      </ModalContent>
    </Modal>
  );
}
