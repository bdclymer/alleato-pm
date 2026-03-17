"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { RowActions } from "../RowActions";
import {
  type TableConfig,
  type TableName,
  getRowTitle,
  getRowSubtitle,
  getRowImage,
} from "@/lib/table-registry";

interface GalleryViewProps {
  table: TableName;
  config: TableConfig;
  rows: Record<string, unknown>[];
}

export function GalleryView({ table, config, rows }: GalleryViewProps) {
  const router = useRouter();
  const pk = config.primaryKey;

  const handleRowClick = (rowId: string | number) => {
    router.push(`/admin/tables/${table}/${rowId}`);
  };

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">No data found</p>
        <p className="text-sm text-muted-foreground">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {rows.map((row) => {
        const rowId = row[pk] as string | number;
        const title = getRowTitle(table, row);
        const subtitle = getRowSubtitle(table, row);
        const imageUrl = getRowImage(table, row);

        return (
          <div
            key={rowId}
            className="group relative rounded-lg border bg-card overflow-hidden cursor-pointer transition-all hover:border-border/80"
            onClick={() => handleRowClick(rowId)}
          >
            {/* Cover Image */}
            <div className="aspect-[4/3] relative bg-muted">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                  <span className="text-3xl font-bold text-primary/30">
                    {getInitials(title)}
                  </span>
                </div>
              )}
              {/* Hover overlay with actions */}
              <div
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-2"
                onClick={(e) => e.stopPropagation()}
              >
                <RowActions
                  table={table}
                  rowId={rowId}
                  rowTitle={title}
                  config={config}
                />
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-medium truncate">{title}</h3>
              {subtitle && (
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getInitials(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + (words[1]?.[0] ?? "")).toUpperCase();
}
