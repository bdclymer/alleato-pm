"use client";

import * as React from "react";
import { GitCompare, Link as LinkIcon, Plus, Trash2, Upload } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEntityContext } from "./comments-sidebar";

type ArtifactSource = "procore" | "design";

interface CompareArtifact {
  id: string;
  source: ArtifactSource;
  title: string;
  imageUrl: string;
  notes: string;
  createdAt: string;
}

const STORAGE_PREFIX = "procore-compare-references";
const MAX_FILE_BYTES = 8 * 1024 * 1024;

function isCompareArtifactArray(value: unknown): value is CompareArtifact[] {
  if (!Array.isArray(value)) return false;
  return value.every((entry) => {
    if (typeof entry !== "object" || entry === null) return false;
    const record = entry as Record<string, unknown>;
    return (
      typeof record.id === "string" &&
      (record.source === "procore" || record.source === "design") &&
      typeof record.title === "string" &&
      typeof record.imageUrl === "string" &&
      typeof record.notes === "string" &&
      typeof record.createdAt === "string"
    );
  });
}

function isSupportedImageUrl(value: string): boolean {
  if (value.startsWith("data:image/")) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Unable to parse file."));
    };
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

export function ProcoreCompareSidebar() {
  const pathname = usePathname();
  const entityContext = useEntityContext();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [entries, setEntries] = React.useState<CompareArtifact[]>([]);
  const [source, setSource] = React.useState<ArtifactSource>("procore");
  const [title, setTitle] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const storageKey = React.useMemo(() => {
    if (entityContext) {
      return `${STORAGE_PREFIX}:${entityContext.entityType}:${entityContext.entityId}`;
    }
    return `${STORAGE_PREFIX}:path:${pathname}`;
  }, [entityContext, pathname]);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setEntries([]);
        return;
      }
      const parsed: unknown = JSON.parse(raw);
      setEntries(isCompareArtifactArray(parsed) ? parsed : []);
    } catch {
      setEntries([]);
    }
  }, [storageKey]);

  React.useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(entries));
  }, [entries, storageKey]);

  const resetForm = React.useCallback(() => {
    setTitle("");
    setImageUrl("");
    setNotes("");
    setSource("procore");
    setError(null);
  }, []);

  const handleAdd = React.useCallback(() => {
    const cleanUrl = imageUrl.trim();
    if (!cleanUrl || !isSupportedImageUrl(cleanUrl)) {
      setError("Add a valid image URL or upload a screenshot file.");
      return;
    }

    const cleanTitle = title.trim() || "Reference";
    const newEntry: CompareArtifact = {
      id: crypto.randomUUID(),
      source,
      title: cleanTitle,
      imageUrl: cleanUrl,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    setEntries((previous) => [newEntry, ...previous]);
    resetForm();
  }, [imageUrl, notes, resetForm, source, title]);

  const handleRemove = React.useCallback((id: string) => {
    setEntries((previous) => previous.filter((entry) => entry.id !== id));
  }, []);

  const handleFileSelected = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        setError("Only image files are supported.");
        event.target.value = "";
        return;
      }

      if (file.size > MAX_FILE_BYTES) {
        setError("File is too large. Use images under 8MB.");
        event.target.value = "";
        return;
      }

      try {
        const dataUrl = await readFileAsDataUrl(file);
        setImageUrl(dataUrl);
        setError(null);
        if (!title.trim()) {
          const nameWithoutExtension = file.name.replace(/\.[^.]+$/, "");
          setTitle(nameWithoutExtension || "Reference");
        }
      } catch {
        setError("Unable to read uploaded image.");
      } finally {
        event.target.value = "";
      }
    },
    [title],
  );

  const contextLabel = entityContext?.label ?? "Page";

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="relative h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        aria-label="Open Procore comparison references"
        onClick={() => setOpen(true)}
      >
        <GitCompare />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full p-0 sm:max-w-xl flex flex-col"
        >
          <SheetHeader className="border-b border-border/40 px-6 py-4 space-y-0">
            <SheetTitle className="text-base">Reference Compare</SheetTitle>
            <p className="text-xs text-muted-foreground">
              Save Procore screenshots and design references for {contextLabel}.
            </p>
          </SheetHeader>

          <div className="border-b border-border/40 px-6 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="compare-source">Source</Label>
                <Select
                  value={source}
                  onValueChange={(value) => setSource(value as ArtifactSource)}
                >
                  <SelectTrigger id="compare-source">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="procore">Procore Screenshot</SelectItem>
                    <SelectItem value="design">Design Reference</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="compare-title">Title</Label>
                <Input
                  id="compare-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Budget grid, details panel..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="compare-url">Image URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="compare-url"
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  placeholder="https://... or upload a screenshot"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelected}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload />
                  Upload
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="compare-notes">Notes</Label>
              <Textarea
                id="compare-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="What should match? Fields, layout, actions, filters..."
                className="min-h-20"
              />
            </div>

            {error ? <p className="text-xs text-destructive">{error}</p> : null}

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                References are saved per page in your browser.
              </p>
              <Button type="button" size="sm" onClick={handleAdd}>
                <Plus />
                Add Reference
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {entries.length === 0 ? (
              <div className="px-6 py-10 text-center space-y-2">
                <p className="text-sm font-medium">No references yet</p>
                <p className="text-xs text-muted-foreground">
                  Add screenshots from Procore or design comps to compare against this page.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border/40">
                {entries.map((entry) => (
                  <li key={entry.id} className="px-6 py-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {entry.source}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm font-medium truncate">{entry.title}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Remove ${entry.title}`}
                        onClick={() => handleRemove(entry.id)}
                      >
                        <Trash2 />
                      </Button>
                    </div>

                    <a
                      href={entry.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block"
                    >
                      <img
                        src={entry.imageUrl}
                        alt={entry.title}
                        className="w-full max-h-52 rounded-md border border-border/60 object-cover"
                      />
                    </a>

                    <div className="flex items-start justify-between gap-4">
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {entry.notes || "No notes"}
                      </p>
                      <a
                        href={entry.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <LinkIcon className="h-3.5 w-3.5" />
                        Open
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
