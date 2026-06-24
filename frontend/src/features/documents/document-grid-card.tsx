"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {
  Calendar,
  File,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Mail,
  MoreVertical,
  Presentation,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/format";
import type { PipelineDoc } from "@/features/documents/documents-table-config";
import {
  pipelineDocInlineHref,
  pipelineDocPreviewKind,
} from "@/features/documents/pipeline-doc-preview";

// SSR-safe react-pdf (matches pdf-preview.tsx). Worker is served locally.
const PdfDocument = dynamic(
  async () => {
    const mod = await import("react-pdf");
    mod.pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    return mod.Document;
  },
  { ssr: false },
);
const PdfPage = dynamic(async () => (await import("react-pdf")).Page, {
  ssr: false,
});

export type MoveTarget = { label: string; category: string };

const SPREADSHEET_EXT = new Set(["xls", "xlsx", "csv"]);
const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"]);
const SLIDES_EXT = new Set(["ppt", "pptx", "key"]);

function extensionOf(item: PipelineDoc): string {
  return (
    (item.title ?? item.file_path ?? "")
      .toLowerCase()
      .match(/\.([a-z0-9]+)(?:$|\?)/)?.[1] ?? ""
  );
}

function typeIcon(item: PipelineDoc): LucideIcon {
  if (item.type === "email") return Mail;
  if (item.type === "meeting") return Calendar;
  const ext = extensionOf(item);
  if (SPREADSHEET_EXT.has(ext)) return FileSpreadsheet;
  if (SLIDES_EXT.has(ext)) return Presentation;
  if (IMAGE_EXT.has(ext)) return ImageIcon;
  if (ext === "pdf") return FileText;
  if (ext === "doc" || ext === "docx") return FileText;
  return File;
}

function humanizeCategory(value: string | null): string | null {
  if (!value) return null;
  const spaced = value.replace(/_/g, " ").trim();
  if (!spaced) return null;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Lazily render the first page of a PDF once the card scrolls into view. */
function PdfThumb({ src, fallback }: { src: string; fallback: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="flex h-full w-full items-start justify-center overflow-hidden [&_canvas]:!h-auto [&_canvas]:!w-full"
    >
      {inView && !failed ? (
        <PdfDocument
          file={src}
          loading={fallback}
          error={fallback}
          onLoadError={() => setFailed(true)}
          onSourceError={() => setFailed(true)}
        >
          <PdfPage
            pageNumber={1}
            width={480}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            loading={fallback}
          />
        </PdfDocument>
      ) : (
        fallback
      )}
    </div>
  );
}

function Thumbnail({ item }: { item: PipelineDoc }) {
  const Icon = typeIcon(item);
  const iconTile = (
    <div className="flex h-full w-full items-center justify-center">
      <Icon className="h-9 w-9 text-muted-foreground" aria-hidden />
    </div>
  );

  const kind =
    item.type === "email" || item.type === "meeting"
      ? "tile"
      : pipelineDocPreviewKind(item);
  const src = pipelineDocInlineHref(item);

  if (kind === "image") {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }
  if (kind === "pdf") {
    return <PdfThumb src={src} fallback={iconTile} />;
  }
  return iconTile;
}

export function DocumentGridCard({
  item,
  onView,
  onMove,
  moveTargets,
}: {
  item: PipelineDoc;
  onView: (item: PipelineDoc) => void;
  onMove: (item: PipelineDoc, category: string, label: string) => void;
  moveTargets: MoveTarget[];
}) {
  const dateValue = item.created_at ?? item.date;
  const meta = [
    humanizeCategory(item.category),
    dateValue ? formatDate(dateValue) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="group relative">
      <Button
        type="button"
        variant="ghost"
        data-testid="document-card"
        onClick={() => onView(item)}
        className="flex h-auto w-full min-w-0 flex-col items-stretch gap-0 overflow-hidden rounded-lg border border-border p-0 text-left hover:border-border hover:bg-transparent"
      >
        <span className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden border-b border-border bg-muted/40">
          <Thumbnail item={item} />
        </span>
        <span className="flex min-w-0 items-center gap-2 p-2.5">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {item.title || "Untitled document"}
            </span>
            {meta ? (
              <span className="block truncate text-xs text-muted-foreground">
                {meta}
              </span>
            ) : null}
          </span>
        </span>
      </Button>
      <div className="absolute right-2 top-2 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Document actions"
              className="h-7 w-7 bg-background shadow-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuLabel>Move to</DropdownMenuLabel>
            {moveTargets.map((t) => (
              <DropdownMenuItem
                key={t.category}
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(item, t.category, t.label);
                }}
              >
                {t.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
