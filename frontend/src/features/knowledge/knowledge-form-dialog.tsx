"use client";

import * as React from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateKnowledgeArticle,
  useUpdateKnowledgeArticle,
  KNOWLEDGE_CATEGORIES,
  type KnowledgeArticle,
  type KnowledgeApprovalStatus,
  type KnowledgeCategory,
  type KnowledgeVisibility,
} from "@/hooks/use-company-knowledge";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const knowledgeFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  category: z.string().min(1, "Category is required"),
  source: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  approval_status: z.enum(["draft", "approved", "archived"]).default("approved"),
  visibility: z.enum(["internal", "admin_only", "client_visible"]).default("internal"),
  ai_searchable: z.boolean().default(true),
});

type KnowledgeFormValues = z.infer<typeof knowledgeFormSchema>;

function buildDefaults(
  article: KnowledgeArticle | undefined,
): KnowledgeFormValues {
  return {
    title: article?.title ?? "",
    content: article?.content ?? "",
    category: article?.category ?? "general",
    source: article?.source ?? null,
    tags: article?.tags ?? [],
    approval_status: article?.approval_status ?? "approved",
    visibility: article?.visibility ?? "internal",
    ai_searchable: article?.ai_searchable ?? true,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface KnowledgeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article?: KnowledgeArticle;
}

export function KnowledgeFormDialog({
  open,
  onOpenChange,
  article,
}: KnowledgeFormDialogProps) {
  const isEditing = Boolean(article);
  const createMutation = useCreateKnowledgeArticle();
  const updateMutation = useUpdateKnowledgeArticle();
  const [tagInput, setTagInput] = React.useState("");

  const form = useForm<KnowledgeFormValues>({
    resolver: zodResolver(knowledgeFormSchema) as Resolver<KnowledgeFormValues>,
    defaultValues: buildDefaults(article),
  });

  React.useEffect(() => {
    if (open) {
      form.reset(buildDefaults(article));
      setTagInput("");
    }
  }, [open, article, form]);

  async function onSubmit(values: KnowledgeFormValues) {
    const payload = {
      title: values.title,
      content: values.content,
      category: values.category as KnowledgeCategory,
      source: values.source || undefined,
      tags: values.tags,
      approval_status: values.approval_status as KnowledgeApprovalStatus,
      visibility: values.visibility as KnowledgeVisibility,
      ai_searchable: values.ai_searchable,
    };

    if (isEditing && article) {
      await updateMutation.mutateAsync({ id: article.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onOpenChange(false);
  }

  function addTag() {
    const tag = tagInput.trim().toLowerCase();
    if (!tag) return;
    const current = form.getValues("tags");
    if (!current.includes(tag)) {
      form.setValue("tags", [...current, tag]);
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    const current = form.getValues("tags");
    form.setValue(
      "tags",
      current.filter((t) => t !== tag),
    );
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-dvh overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Knowledge Entry" : "Add Knowledge Entry"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., ASRS Sprinkler Systems — Height Cost Impact"
                      {...field}
                    />
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
                  <FormLabel>Category *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {KNOWLEDGE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <span>{cat.label}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {cat.description}
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
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the knowledge, insight, or lesson learned..."
                      rows={8}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Sprinkler Pricing Review Meeting — Mar 13"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value || null)
                      }
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="approval_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Approval</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select approval status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visibility</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select visibility" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="internal">Internal</SelectItem>
                        <SelectItem value="admin_only">Admin only</SelectItem>
                        <SelectItem value="client_visible">Client visible</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="ai_searchable"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 rounded-md border border-border/50 px-3 py-2">
                  <div>
                    <FormLabel>Available to Ask Alleato</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Approved entries can be used by AI search when this is on.
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Tags */}
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add tag and press Enter"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addTag}
                        disabled={!tagInput.trim()}
                      >
                        Add
                      </Button>
                    </div>
                    {field.value.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {field.value.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="gap-1 pr-1"
                          >
                            {tag}
                            <Button
                              type="button"
                              onClick={() => removeTag(tag)}
                              variant="ghost"
                              size="icon"
                              className="ml-0.5 h-5 w-5 rounded-full hover:bg-muted-foreground/20"
                              aria-label={`Remove ${tag} tag`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? isEditing
                    ? "Updating…"
                    : "Creating…"
                  : isEditing
                    ? "Update"
                    : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
