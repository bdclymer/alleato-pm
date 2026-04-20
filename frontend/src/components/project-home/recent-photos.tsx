"use client";

import * as React from "react";
import { Camera, Calendar, User, Download, Maximize2 } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface ProjectPhoto {
  id: string;
  url: string;
  thumbnailUrl?: string;
  title: string;
  description?: string;
  dateTaken: Date;
  uploadedBy: string;
  tags?: string[];
  location?: string;
}

interface RecentPhotosProps {
  projectId: string;
}

export function RecentPhotos({ projectId }: RecentPhotosProps) {
  const [selectedPhoto, setSelectedPhoto] = React.useState<ProjectPhoto | null>(
    null,
  );

  // Mock data - in production this would come from Supabase storage
  const mockPhotos: ProjectPhoto[] = [
    {
      id: "1",
      url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=300&h=200&fit=crop",
      title: "Foundation Pour - West Wing",
      description:
        "Concrete foundation being poured for the west wing of the building",
      dateTaken: new Date("2024-03-18"),
      uploadedBy: "John Smith",
      tags: ["foundation", "concrete", "west-wing"],
      location: "West Wing - Grid A-5",
    },
    {
      id: "2",
      url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=300&h=200&fit=crop",
      title: "Steel Frame Installation",
      description: "Steel beams being installed on the second floor",
      dateTaken: new Date("2024-03-17"),
      uploadedBy: "Jane Doe",
      tags: ["steel", "framing", "structural"],
      location: "Level 2 - Grid B-3",
    },
    {
      id: "3",
      url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=300&h=200&fit=crop",
      title: "Site Overview - March Update",
      description:
        "Aerial view of the construction site showing overall progress",
      dateTaken: new Date("2024-03-16"),
      uploadedBy: "Mike Johnson",
      tags: ["aerial", "overview", "progress"],
      location: "Full Site",
    },
    {
      id: "4",
      url: "https://images.unsplash.com/photo-1581094794329-c8112c4e5190",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1581094794329-c8112c4e5190?w=300&h=200&fit=crop",
      title: "MEP Rough-In Progress",
      description:
        "Mechanical, electrical, and plumbing installation in progress",
      dateTaken: new Date("2024-03-15"),
      uploadedBy: "Sarah Wilson",
      tags: ["MEP", "electrical", "plumbing"],
      location: "Level 1 - North Side",
    },
    {
      id: "5",
      url: "https://images.unsplash.com/photo-1486175060817-5663aacc6655",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1486175060817-5663aacc6655?w=300&h=200&fit=crop",
      title: "Safety Inspection Documentation",
      description:
        "Weekly safety inspection showing compliance with regulations",
      dateTaken: new Date("2024-03-14"),
      uploadedBy: "Tom Brown",
      tags: ["safety", "inspection", "compliance"],
      location: "Main Entrance",
    },
    {
      id: "6",
      url: "https://images.unsplash.com/photo-1574482620811-1aa16ffe3c82",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1574482620811-1aa16ffe3c82?w=300&h=200&fit=crop",
      title: "Material Delivery",
      description: "Steel beam delivery for phase 2 construction",
      dateTaken: new Date("2024-03-13"),
      uploadedBy: "Lisa Chen",
      tags: ["delivery", "materials", "steel"],
      location: "Storage Area A",
    },
  ];

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
        {mockPhotos.map((photo) => (
          <Dialog key={photo.id}>
            <DialogTrigger asChild>
              <div
                className="group relative cursor-pointer overflow-hidden rounded-lg border border-border hover:border-border transition-all"
                onClick={() => setSelectedPhoto(photo)}
              >
                {/* Photo Thumbnail */}
                <div className="aspect-[4/3] relative bg-muted">
                  <Image
                    src={photo.thumbnailUrl || photo.url}
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
                      <span>{format(photo.dateTaken, "MMM d")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span className="truncate">{photo.uploadedBy}</span>
                    </div>
                  </div>
                  {photo.location && (
                    <p className="text-xs text-foreground truncate">
                      📍 {photo.location}
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
                      src={selectedPhoto.url}
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
                          {format(selectedPhoto.dateTaken, "MMM d, yyyy")}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Uploaded By</p>
                        <p className="font-medium">
                          {selectedPhoto.uploadedBy}
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
        ))}
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
