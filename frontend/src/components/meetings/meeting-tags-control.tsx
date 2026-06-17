"use client";

import * as React from "react";
import { Tag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/unified-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/ds/tag-input";
import { apiFetch } from "@/lib/api-client";

/** Categories already in use across meetings — offered as quick-fill suggestions. */
const CATEGORY_SUGGESTIONS = [
  "Internal",
  "Weekly Exec",
  "Weekly Ops",
  "Ops Update",
  "Interview",
  "Job Planner",
];

/**
 * Parse the `tags` column into a clean string list.
 *
 * Historic rows store tags three different ways: a Postgres array literal
 * (`{a,"b c"}`), a JSON array (`["a","b"]`), or `[]`/`{}` for empty. Newer
 * user edits write a plain comma-separated string. Handle all of them.
 */
function parseTags(raw: string | null | undefined): string[] {
  const trimmed = raw?.trim();
  if (!trimmed || trimmed === "[]" || trimmed === "{}") return [];

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((t) => String(t).trim()).filter(Boolean);
      }
    } catch {
      // fall through to other formats
    }
  }

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const inner = trimmed.slice(1, -1);
    if (!inner.trim()) return [];
    const result: string[] = [];
    const pattern = /"([^"]*)"|([^,]+)/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(inner)) !== null) {
      const value = (match[1] ?? match[2] ?? "").trim();
      if (value) result.push(value);
    }
    return result;
  }

  return trimmed
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function serializeTags(tags: string[]): string | null {
  const cleaned = tags.map((t) => t.trim()).filter(Boolean);
  return cleaned.length ? cleaned.join(", ") : null;
}

interface MeetingTagsControlProps {
  meetingId: string;
  meetingTitle: string;
  initialCategory: string | null;
  initialTags: string | null;
}

export function MeetingTagsControl({
  meetingId,
  meetingTitle,
  initialCategory,
  initialTags,
}: MeetingTagsControlProps) {
  const [category, setCategory] = React.useState(initialCategory ?? "");
  const [tags, setTags] = React.useState<string[]>(() => parseTags(initialTags));

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [draftCategory, setDraftCategory] = React.useState(category);
  const [draftTags, setDraftTags] = React.useState<string[]>(tags);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    setCategory(initialCategory ?? "");
    setTags(parseTags(initialTags));
  }, [meetingId, initialCategory, initialTags]);

  function openDialog() {
    setDraftCategory(category);
    setDraftTags(tags);
    setDialogOpen(true);
  }

  async function handleSave() {
    const nextCategory = draftCategory.trim();
    setIsSaving(true);
    try {
      await apiFetch(`/api/documents/${meetingId}/assign-project`, {
        method: "PATCH",
        body: JSON.stringify({
          category: nextCategory || null,
          tags: serializeTags(draftTags),
        }),
      });
      setCategory(nextCategory);
      setTags(draftTags.map((t) => t.trim()).filter(Boolean));
      setDialogOpen(false);
      toast.success("Meeting tags updated");
    } catch {
      toast.error("Failed to update tags");
    } finally {
      setIsSaving(false);
    }
  }

  const hasAny = Boolean(category) || tags.length > 0;
  const TAG_LIMIT = 4;
  const visibleTags = tags.slice(0, TAG_LIMIT);
  const hiddenTagCount = tags.length - visibleTags.length;

  return (
    <>
      {hasAny ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={openDialog}
          aria-label="Edit category and tags"
          className="inline-flex h-auto flex-wrap items-center gap-1.5 whitespace-normal px-0 py-0 hover:bg-transparent"
        >
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          {category ? (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {category}
            </span>
          ) : null}
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {hiddenTagCount > 0 ? (
            <span className="inline-flex items-center text-xs font-medium text-muted-foreground/70">
              +{hiddenTagCount}
            </span>
          ) : null}
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="inline-flex h-auto items-center gap-2 px-0 text-xs font-medium text-muted-foreground/60 transition-colors hover:text-muted-foreground"
          onClick={openDialog}
        >
          <Tag className="h-3.5 w-3.5" />
          Add category or tag
        </Button>
      )}

      <Modal open={dialogOpen} onOpenChange={setDialogOpen}>
        <ModalContent size="md">
          <ModalHeader>
            <ModalTitle>Category & tags</ModalTitle>
            <ModalDescription>{meetingTitle}</ModalDescription>
          </ModalHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label htmlFor="meeting-category">Category</Label>
              <Input
                id="meeting-category"
                value={draftCategory}
                onChange={(event) => setDraftCategory(event.target.value)}
                placeholder="e.g. Weekly Ops"
                maxLength={100}
                disabled={isSaving}
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {CATEGORY_SUGGESTIONS.map((suggestion) => (
                  <Button
                    key={suggestion}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDraftCategory(suggestion)}
                    disabled={isSaving}
                    className={`inline-flex h-auto items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      draftCategory === suggestion
                        ? "bg-primary/10 text-primary hover:bg-primary/10"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <TagInput
                value={draftTags}
                onChange={setDraftTags}
                placeholder="Add tag..."
                disabled={isSaving}
              />
            </div>
          </div>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
