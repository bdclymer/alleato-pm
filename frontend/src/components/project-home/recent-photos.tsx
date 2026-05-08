"use client";

import * as React from "react";
import { Camera, Calendar, User, Download, Maximize2, MapPin } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ds";
import { usePhotos, type PhotoSummary } from "@/hooks/use-photos";

interface RecentPhotosProps {
  projectId: string;
}

export function RecentPhotos({ projectId }: RecentPhotosProps) {
  const numericProjectId = Number(projectId);
  const photosQuery = usePhotos(numericProjectId);
  const photos = React.useMemo(
    () => (photosQuery.data ?? []).slice(0, 6),
    [photosQuery.data],
  );
  const [selectedPhoto, setSelectedPhoto] = React.useState<PhotoSummary | null>(
    null,
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground">
          Visual documentation of project progress
        </p>
        <Button size="sm" className="gap-2">
          <Camera />
          Upload Photos
        </Button>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {photosQuery.isLoading ? (
          <p className="col-span-full text-sm text-muted-foreground">
            Loading photos...
          </p>
        ) : photosQuery.error ? (
          <EmptyState
            className="col-span-full"
            icon={<Camera />}
            title="Photos could not be loaded"
            description={photosQuery.error.message}
          />
        ) : photos.length === 0 ? (
          <EmptyState
            className="col-span-full"
            icon={<Camera />}
            title="No recent photos"
            description="Uploaded project photos will appear here."
          />
        ) : (
          photos.map((photo) => (
          <Dialog key={photo.id}>
            <DialogTrigger asChild>
              <div
                className="group relative cursor-pointer overflow-hidden rounded-lg border border-border hover:border-border transition-all"
                onClick={() => setSelectedPhoto(photo)}
              >
                {/* Photo Thumbnail */}
                <div className="aspect-[4/3] relative bg-muted">
                  <Image
                    src={photo.file_url}
                    alt={photo.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Photo Info */}
                <div className="p-4 space-y-1">
                  {/* eslint-disable-next-line design-system/no-raw-heading */}
                  <h4 className="text-sm font-medium text-foreground line-clamp-1">
                    {photo.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {photo.date_taken
                          ? format(new Date(photo.date_taken), "MMM d")
                          : "No date"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span className="truncate">
                        {photo.uploaded_by ?? "Unknown"}
                      </span>
                    </div>
                  </div>
                  {photo.location && (
                    <p className="flex items-center gap-1 text-xs text-foreground truncate">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{photo.location}</span>
                    </p>
                  )}
                </div>
              </div>
            </DialogTrigger>

            {/* Full Photo Dialog */}
            <DialogContent className="max-w-4xl">
              {selectedPhoto && (
                <div className="space-y-4">
                  {/* Full Image */}
                  <div className="relative aspect-[16/10] bg-muted rounded-lg overflow-hidden">
                    <Image
                      src={selectedPhoto.file_url}
                      alt={selectedPhoto.title}
                      fill
                      className="object-contain"
                      sizes="(max-width: 1200px) 100vw, 1200px"
                    />
                  </div>

                  {/* Photo Details */}
                  <div className="space-y-4">
                    <div>
                      {/* eslint-disable-next-line design-system/no-raw-heading */}
                      <h3 className="text-lg font-semibold text-foreground">
                        {selectedPhoto.title}
                      </h3>
                      {selectedPhoto.description && (
                        <p className="text-sm text-foreground mt-1">
                          {selectedPhoto.description}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Date Taken</p>
                        <p className="font-medium">
                          {selectedPhoto.date_taken
                            ? format(new Date(selectedPhoto.date_taken), "MMM d, yyyy")
                            : "Not recorded"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Uploaded By</p>
                        <p className="font-medium">
                          {selectedPhoto.uploaded_by ?? "Unknown"}
                        </p>
                      </div>
                      {selectedPhoto.location && (
                        <div>
                          <p className="text-muted-foreground">Location</p>
                          <p className="font-medium">
                            {selectedPhoto.location}
                          </p>
                        </div>
                      )}
                      <div className="flex items-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 w-full"
                        >
                          <Download />
                          Download
                        </Button>
                      </div>
                    </div>

                    {selectedPhoto.tags && selectedPhoto.tags.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Tags</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedPhoto.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 text-xs bg-muted text-foreground rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
          ))
        )}
      </div>

      {/* View All Link */}
      <div className="text-center pt-2">
        <Link
          href={`/${projectId}/photos`}
          className="text-sm text-link hover:text-link-hover hover:underline"
        >
          View all photos →
        </Link>
      </div>
    </div>
  );
}
