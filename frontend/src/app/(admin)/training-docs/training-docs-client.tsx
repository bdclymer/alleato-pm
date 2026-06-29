"use client";

import * as React from "react";
import {
  BookOpen,
  ExternalLink,
  FileImage,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";

import { EmptyState, StatusText } from "@/components/ds";
import { InfoAlert } from "@/components/ds/InfoAlert";
import { ExpandableSearch } from "@/components/tables/unified/table-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  TRAINING_DOC_AUDIENCES,
  TRAINING_DOC_DEFAULT_COLLECTION,
  TRAINING_DOC_STATUSES,
  normalizeTrainingDocSlug,
} from "@/lib/training-docs/constants";
import type {
  TrainingDocAsset,
  TrainingDocWithAssets,
} from "@/lib/training-docs/types";
import { cn } from "@/lib/utils";
import {
  useCreateTrainingDoc,
  useDeleteTrainingDoc,
  useDeleteTrainingDocAsset,
  usePublishTrainingDoc,
  useTrainingDocs,
  useUpdateTrainingDoc,
  useUpdateTrainingDocAsset,
  useUploadTrainingDocAsset,
} from "@/hooks/use-training-docs";

type DocFormState = {
  title: string;
  slug: string;
  summary: string;
  audience: "internal" | "client" | "subcontractor" | "admin";
  status: "draft" | "in_review" | "approved" | "published" | "archived";
  source_route: string;
  review_notes: string;
  target_collection: string;
  body_markdown: string;
};

type AssetDraftState = Record<
  string,
  {
    caption: string;
    alt_text: string;
    step_order: string;
  }
>;

const DEFAULT_BODY = [
  "## Purpose",
  "",
  "Explain when to use this workflow.",
  "",
  "## Steps",
  "",
  "1. Step one.",
  "",
  "## Field Definitions",
  "",
  "- Add dropdown and field explanations here.",
  "",
  "## Reports and Exports",
  "",
  "- Add reporting/export details here.",
].join("\n");

function toFormState(doc: TrainingDocWithAssets): DocFormState {
  return {
    title: doc.title,
    slug: doc.slug,
    summary: doc.summary ?? "",
    audience: doc.audience,
    status: doc.status,
    source_route: doc.source_route ?? "",
    review_notes: doc.review_notes ?? "",
    target_collection: doc.target_collection,
    body_markdown: doc.body_markdown,
  };
}

function toAssetDrafts(assets: TrainingDocAsset[]): AssetDraftState {
  return Object.fromEntries(
    assets.map((asset) => [
      asset.id,
      {
        caption: asset.caption ?? "",
        alt_text: asset.alt_text ?? "",
        step_order: String(asset.step_order),
      },
    ]),
  );
}

export function TrainingDocsClient() {
  const { data: docs = [], isLoading } = useTrainingDocs();
  const createDoc = useCreateTrainingDoc();
  const updateDoc = useUpdateTrainingDoc();
  const deleteDoc = useDeleteTrainingDoc();
  const uploadAsset = useUploadTrainingDocAsset();
  const updateAsset = useUpdateTrainingDocAsset();
  const deleteAsset = useDeleteTrainingDocAsset();
  const publishDoc = usePublishTrainingDoc();

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [form, setForm] = React.useState<DocFormState | null>(null);
  const [assetDrafts, setAssetDrafts] = React.useState<AssetDraftState>({});

  const visibleDocs = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return docs;
    return docs.filter((doc) => {
      const haystack = [
        doc.title,
        doc.slug,
        doc.summary ?? "",
        doc.source_route ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [docs, search]);

  const selectedDoc = React.useMemo(() => {
    if (selectedId) {
      return docs.find((doc) => doc.id === selectedId) ?? null;
    }
    return visibleDocs[0] ?? docs[0] ?? null;
  }, [docs, selectedId, visibleDocs]);

  React.useEffect(() => {
    if (!selectedDoc) {
      setForm(null);
      setAssetDrafts({});
      return;
    }

    setSelectedId(selectedDoc.id);
    setForm(toFormState(selectedDoc));
    setAssetDrafts(toAssetDrafts(selectedDoc.assets));
  }, [selectedDoc?.id]);

  const isDirty =
    selectedDoc && form
      ? JSON.stringify(form) !== JSON.stringify(toFormState(selectedDoc))
      : false;

  async function handleCreateDoc() {
    const result = await createDoc.mutateAsync({
      title: "Untitled training doc",
      slug: "untitled-training-doc",
      body_markdown: DEFAULT_BODY,
      audience: "internal",
      status: "draft",
      target_collection: TRAINING_DOC_DEFAULT_COLLECTION,
    });
    const doc = (result as { doc: TrainingDocWithAssets }).doc;
    setSelectedId(doc.id);
  }

  async function handleSave() {
    if (!selectedDoc || !form) return;
    await updateDoc.mutateAsync({
      id: selectedDoc.id,
      ...form,
      slug: normalizeTrainingDocSlug(form.slug, form.title),
    });
  }

  async function handleDelete() {
    if (!selectedDoc) return;
    const confirmed = window.confirm(
      `Delete "${selectedDoc.title}" and its screenshots?`,
    );
    if (!confirmed) return;
    await deleteDoc.mutateAsync(selectedDoc.id);
    setSelectedId(null);
  }

  async function handlePublish() {
    if (!selectedDoc || !form) return;
    if (isDirty) {
      await handleSave();
    }
    await publishDoc.mutateAsync(selectedDoc.id);
  }

  async function handleUploadFile(event: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedDoc) return;
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadAsset.mutateAsync({ docId: selectedDoc.id, file });
    event.target.value = "";
  }

  async function handleSaveAsset(assetId: string) {
    const draft = assetDrafts[assetId];
    if (!draft) return;
    await updateAsset.mutateAsync({
      assetId,
      caption: draft.caption.trim() || null,
      alt_text: draft.alt_text.trim() || null,
      step_order: Number.parseInt(draft.step_order || "0", 10) || 0,
    });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-80 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading training docs...
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Drafts</h2>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <ExpandableSearch
            value={search}
            onChange={setSearch}
            placeholder="Search docs"
            className="w-full max-w-sm"
          />
          <Button
            size="sm"
            onClick={handleCreateDoc}
            disabled={createDoc.isPending}
          >
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>

        {visibleDocs.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-5 w-5" />}
            title="No training docs yet"
            description="Create the first SOP draft and publish it to the docs site."
          />
        ) : (
          <div className="border-y">
            {visibleDocs.map((doc) => (
              <Button
                key={doc.id}
                type="button"
                onClick={() => setSelectedId(doc.id)}
                variant="ghost"
                className={cn(
                  "h-auto w-full justify-start rounded-none px-0 py-4 text-left hover:bg-transparent",
                  doc.id === selectedDoc?.id && "bg-muted/50",
                )}
              >
                <div className="flex w-full flex-wrap items-start justify-between gap-3 px-4">
                  <div className="min-w-0 space-y-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {doc.title}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {doc.summary?.trim() || doc.slug}
                    </div>
                  </div>
                  <div className="space-y-1 text-right text-xs">
                    <StatusText status={doc.status.replace("_", " ")} />
                    <div className="text-muted-foreground">
                      {doc.assets.length} image
                      {doc.assets.length === 1 ? "" : "s"}
                      {" · "}
                      {doc.last_published_at ? "Published" : "Draft only"}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-8">
        {!selectedDoc || !form ? (
          <EmptyState
            icon={<BookOpen className="h-5 w-5" />}
            title="Select a training doc"
            description="Choose a draft from the list or create a new SOP to start editing."
          />
        ) : (
          <>
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-foreground">
                    Editor
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={handleDelete}
                    disabled={deleteDoc.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSave}
                    disabled={!isDirty || updateDoc.isPending}
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                  <Button
                    onClick={handlePublish}
                    disabled={publishDoc.isPending}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Publish to Docs
                  </Button>
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <div className="font-medium text-foreground">
                  {selectedDoc.title}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
                  <StatusText status={selectedDoc.status.replace("_", " ")} />
                  <span>
                    {selectedDoc.assets.length} image
                    {selectedDoc.assets.length === 1 ? "" : "s"}
                  </span>
                  {selectedDoc.published_doc_path ? (
                    <span className="font-mono text-xs text-foreground">
                      {selectedDoc.published_doc_path}
                    </span>
                  ) : (
                    <span>Not published yet</span>
                  )}
                </div>
              </div>

              {selectedDoc.last_publish_error ? (
                <InfoAlert variant="error">
                  Last publish error: {selectedDoc.last_publish_error}
                </InfoAlert>
              ) : null}
            </section>

            <section className="space-y-4">
              <h3 className="text-base font-semibold text-foreground">
                Document
              </h3>

              <Field label="Title">
                <Input
                  value={form.title}
                  onChange={(event) =>
                    setForm(
                      (current) =>
                        current && { ...current, title: event.target.value },
                    )
                  }
                />
              </Field>
              <Field label="Slug">
                <Input
                  value={form.slug}
                  onChange={(event) =>
                    setForm(
                      (current) =>
                        current && { ...current, slug: event.target.value },
                    )
                  }
                />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Audience">
                  <Select
                    value={form.audience}
                    onValueChange={(value) =>
                      setForm((current) =>
                        current
                          ? {
                              ...current,
                              audience: value as DocFormState["audience"],
                            }
                          : current,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRAINING_DOC_AUDIENCES.map((audience) => (
                        <SelectItem key={audience} value={audience}>
                          {audience}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Status">
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      setForm((current) =>
                        current
                          ? {
                              ...current,
                              status: value as DocFormState["status"],
                            }
                          : current,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRAINING_DOC_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Source Route">
                <Input
                  value={form.source_route}
                  onChange={(event) =>
                    setForm(
                      (current) =>
                        current && {
                          ...current,
                          source_route: event.target.value,
                        },
                    )
                  }
                  placeholder="/[projectId]/change-events"
                />
              </Field>
              <Field label="Target Collection">
                <Input
                  value={form.target_collection}
                  onChange={(event) =>
                    setForm(
                      (current) =>
                        current && {
                          ...current,
                          target_collection: event.target.value,
                        },
                    )
                  }
                />
              </Field>
            </section>

            <section className="space-y-4">
              <h3 className="text-base font-semibold text-foreground">
                Content
              </h3>

              <Field label="Summary">
                <Textarea
                  value={form.summary}
                  onChange={(event) =>
                    setForm(
                      (current) =>
                        current && { ...current, summary: event.target.value },
                    )
                  }
                  className="min-h-20"
                />
              </Field>
              <Field label="Review Notes">
                <Textarea
                  value={form.review_notes}
                  onChange={(event) =>
                    setForm(
                      (current) =>
                        current && {
                          ...current,
                          review_notes: event.target.value,
                        },
                    )
                  }
                  className="min-h-20"
                />
              </Field>
              <Field label="Article Markdown">
                <Textarea
                  value={form.body_markdown}
                  onChange={(event) =>
                    setForm(
                      (current) =>
                        current && {
                          ...current,
                          body_markdown: event.target.value,
                        },
                    )
                  }
                  rows={24}
                  className="font-mono text-sm"
                />
              </Field>
            </section>

            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-foreground">
                  Screenshots
                </h3>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                  <span className="inline-flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted/50">
                    <Upload className="h-4 w-4" />
                    Upload image
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadFile}
                  />
                </label>
              </div>

              {selectedDoc.assets.length === 0 ? (
                <EmptyState
                  icon={<FileImage className="h-5 w-5" />}
                  title="No screenshots yet"
                  description="Upload screenshots now or later. Publish still works without them, but screenshot-backed SOPs are the target workflow."
                />
              ) : (
                <div className="space-y-6">
                  {selectedDoc.assets
                    .slice()
                    .sort((left, right) => left.step_order - right.step_order)
                    .map((asset) => {
                      const draft = assetDrafts[asset.id] ?? {
                        caption: asset.caption ?? "",
                        alt_text: asset.alt_text ?? "",
                        step_order: String(asset.step_order),
                      };

                      return (
                        <div
                          key={asset.id}
                          className="space-y-4 border-t pt-4 first:border-t-0 first:pt-0"
                        >
                          <div className="overflow-hidden rounded-md border bg-muted/20 max-w-sm">
                            {asset.signed_url ? (
                              <img
                                src={asset.signed_url}
                                alt={asset.alt_text ?? asset.file_name}
                                className="h-48 w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
                                Preview unavailable
                              </div>
                            )}
                          </div>

                          <div className="space-y-3 max-w-3xl">
                            <div className="grid gap-3 md:grid-cols-[7rem_minmax(0,1fr)]">
                              <Field label="Order">
                                <Input
                                  value={draft.step_order}
                                  onChange={(event) =>
                                    setAssetDrafts((current) => ({
                                      ...current,
                                      [asset.id]: {
                                        ...draft,
                                        step_order: event.target.value,
                                      },
                                    }))
                                  }
                                />
                              </Field>
                              <Field label="Caption">
                                <Input
                                  value={draft.caption}
                                  onChange={(event) =>
                                    setAssetDrafts((current) => ({
                                      ...current,
                                      [asset.id]: {
                                        ...draft,
                                        caption: event.target.value,
                                      },
                                    }))
                                  }
                                />
                              </Field>
                            </div>

                            <Field label="Alt Text">
                              <Input
                                value={draft.alt_text}
                                onChange={(event) =>
                                  setAssetDrafts((current) => ({
                                    ...current,
                                    [asset.id]: {
                                      ...draft,
                                      alt_text: event.target.value,
                                    },
                                  }))
                                }
                              />
                            </Field>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSaveAsset(asset.id)}
                                disabled={updateAsset.isPending}
                              >
                                Save screenshot details
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteAsset.mutate(asset.id)}
                                disabled={deleteAsset.isPending}
                              >
                                Delete screenshot
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <div className="text-sm font-medium text-foreground">{label}</div>
      {children}
    </label>
  );
}
