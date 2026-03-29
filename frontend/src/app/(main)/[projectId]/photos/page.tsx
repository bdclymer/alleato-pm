"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Camera,
  Search,
  Star,
  StarOff,
  Trash2,
  X,
  Upload,
} from "lucide-react";

import { PageShell } from "@/components/layout";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  EmptyState,
} from "@/components/ds";
import { usePhotos, useUpdatePhoto, useDeletePhoto } from "@/hooks/use-photos";
import type { PhotoSummary } from "@/hooks/use-photos";
import { PhotoUploadDialog } from "@/features/photos/photo-upload-dialog";
import {
  ALBUM_OPTIONS,
  formatFileSize,
  formatPhotoDate,
} from "@/features/photos/photos-grid-config";

export default function ProjectPhotosPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = parseInt(params.projectId, 10);

  const [search, setSearch] = useState("");
  const [album, setAlbum] = useState("__all__");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoSummary | null>(null);

  const albumFilter = album === "__all__" ? undefined : album;
  const { data: photos, isLoading } = usePhotos(projectId, albumFilter);
  const deletePhoto = useDeletePhoto(projectId);

  const filteredPhotos = (photos ?? []).filter((photo) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      photo.title.toLowerCase().includes(q) ||
      photo.description?.toLowerCase().includes(q) ||
      photo.file_name.toLowerCase().includes(q)
    );
  });

  const handleDelete = useCallback(
    (photoId: number) => {
      deletePhoto.mutate(photoId);
      setLightboxPhoto(null);
    },
    [deletePhoto],
  );

  return (
    <PageShell
      variant="dashboard"
      title="Photos"
      actions={
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload className="mr-1.5 size-4" />
          Upload Photo
        </Button>
      }
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search photos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 size-6 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>

        <Select value={album} onValueChange={setAlbum}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Albums" />
          </SelectTrigger>
          <SelectContent>
            {ALBUM_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-video w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredPhotos.length === 0 && (
        <EmptyState
          icon={<Camera />}
          title="No photos yet"
          description={
            search || albumFilter
              ? "No photos match your current filters. Try adjusting your search or album selection."
              : "Upload project photos to document progress, inspections, and more."
          }
          action={
            !search && !albumFilter
              ? {
                  label: "Upload Photo",
                  onClick: () => setUploadOpen(true),
                }
              : undefined
          }
        />
      )}

      {/* Photo grid */}
      {!isLoading && filteredPhotos.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPhotos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              projectId={projectId}
              onClick={() => setLightboxPhoto(photo)}
            />
          ))}
        </div>
      )}

      {/* Upload dialog */}
      <PhotoUploadDialog
        projectId={projectId}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
      />

      {/* Lightbox / detail modal */}
      {lightboxPhoto && (
        <PhotoLightbox
          photo={lightboxPhoto}
          projectId={projectId}
          onClose={() => setLightboxPhoto(null)}
          onDelete={handleDelete}
        />
      )}
    </PageShell>
  );
}

// ─── Photo Card ──────────────────────────────────────────────────────────────

function PhotoCard({
  photo,
  projectId,
  onClick,
}: {
  photo: PhotoSummary;
  projectId: number;
  onClick: () => void;
}) {
  const updatePhoto = useUpdatePhoto(projectId, photo.id);

  const toggleStar = (e: React.MouseEvent) => {
    e.stopPropagation();
    updatePhoto.mutate({ starred: !photo.starred });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="group relative cursor-pointer overflow-hidden rounded-lg bg-muted text-left transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video">
        <img
          src={photo.file_url}
          alt={photo.title}
          className="size-full object-cover"
          loading="lazy"
        />

        {/* Star button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleStar}
          className="absolute right-2 top-2 size-8 rounded-full bg-background/80 opacity-0 transition-opacity group-hover:opacity-100"
        >
          {photo.starred ? (
            <Star className="size-4 fill-current text-primary" />
          ) : (
            <StarOff className="size-4 text-muted-foreground" />
          )}
        </Button>

        {/* Gradient overlay with title */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/80 to-transparent px-3 pb-2 pt-6">
          <p className="truncate text-sm font-medium text-foreground">
            {photo.title}
          </p>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs text-muted-foreground">
          {formatPhotoDate(photo.date_taken ?? photo.created_at)}
        </span>
        <div className="flex items-center gap-1.5">
          {photo.album && (
            <Badge variant="secondary" className="text-xs">
              {photo.album}
            </Badge>
          )}
          {photo.file_size ? (
            <span className="text-xs text-muted-foreground">
              {formatFileSize(photo.file_size)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Lightbox ────────────────────────────────────────────────────────────────

function PhotoLightbox({
  photo,
  projectId,
  onClose,
  onDelete,
}: {
  photo: PhotoSummary;
  projectId: number;
  onClose: () => void;
  onDelete: (id: number) => void;
}) {
  const updatePhoto = useUpdatePhoto(projectId, photo.id);

  const toggleStar = () => {
    updatePhoto.mutate({ starred: !photo.starred });
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>{photo.title}</DialogTitle>
        </DialogHeader>

        {/* Image */}
        <div className="relative bg-muted">
          <img
            src={photo.file_url}
            alt={photo.title}
            className="max-h-[60vh] w-full object-contain"
          />
        </div>

        {/* Details */}
        <div className="space-y-3 px-6 pb-6">
          {photo.description && (
            <p className="text-sm text-muted-foreground">{photo.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {photo.album && (
              <Badge variant="secondary">{photo.album}</Badge>
            )}
            {photo.location && <span>{photo.location}</span>}
            {photo.trade && <span>{photo.trade}</span>}
            {photo.file_size ? (
              <span>{formatFileSize(photo.file_size)}</span>
            ) : null}
            {photo.date_taken && (
              <span>{formatPhotoDate(photo.date_taken)}</span>
            )}
            {photo.width && photo.height && (
              <span>
                {photo.width} x {photo.height}
              </span>
            )}
          </div>

          {photo.tags && photo.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {photo.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={toggleStar}>
              {photo.starred ? (
                <>
                  <Star className="mr-1.5 size-4 fill-current text-yellow-500" />
                  Starred
                </>
              ) : (
                <>
                  <StarOff className="mr-1.5 size-4" />
                  Star
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(photo.id)}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-1.5 size-4" />
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
