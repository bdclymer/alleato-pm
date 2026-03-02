"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Grid3x3,
  List,
  Image as ImageIcon,
  Download,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Photo {
  id: string;
  title: string;
  location: string;
  takenBy: string;
  takenAt: string;
  tags: string[];
  thumbnail: string;
}

const mockPhotos: Photo[] = [
  {
    id: "1",
    title: "Foundation Pour - North Side",
    location: "North Foundation",
    takenBy: "John Smith",
    takenAt: "2025-12-10",
    tags: ["foundation", "concrete"],
    thumbnail: "https://via.placeholder.com/300x200?text=Foundation+Pour",
  },
  {
    id: "2",
    title: "Second Floor Framing Progress",
    location: "Floor 2",
    takenBy: "Jane Doe",
    takenAt: "2025-12-09",
    tags: ["framing", "progress"],
    thumbnail: "https://via.placeholder.com/300x200?text=Framing+Progress",
  },
  {
    id: "3",
    title: "HVAC Ductwork Installation",
    location: "Floor 1 - Mechanical Room",
    takenBy: "Mike Johnson",
    takenAt: "2025-12-08",
    tags: ["hvac", "mep"],
    thumbnail: "https://via.placeholder.com/300x200?text=HVAC+Installation",
  },
  {
    id: "4",
    title: "Electrical Rough-In Complete",
    location: "Floor 2",
    takenBy: "Sarah Wilson",
    takenAt: "2025-12-07",
    tags: ["electrical", "mep"],
    thumbnail: "https://via.placeholder.com/300x200?text=Electrical+Work",
  },
];

export default function PhotosPage() {
  const [photos, setPhotos] = React.useState<Photo[]>(mockPhotos);
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Photos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Project photo documentation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-background border rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "bg-muted" : ""}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "bg-muted" : ""}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Upload Photos
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-background rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Total Photos
              </div>
              <div className="text-2xl font-bold text-foreground mt-1">
                {photos.length}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">This Week</div>
              <div className="text-2xl font-bold text-foreground mt-1">
                {
                  photos.filter(
                    (p) =>
                      new Date(p.takenAt) >
                      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                  ).length
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="bg-background rounded-lg border overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="aspect-video bg-muted flex items-center justify-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
              </div>
              <div className="p-4">
                <h3 className="font-medium text-foreground truncate">
                  {photo.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{photo.location}</p>
                <div className="flex items-center gap-2 mt-2">
                  {photo.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                  <span>{photo.takenBy}</span>
                  <span>{new Date(photo.takenAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-background rounded-lg border overflow-hidden">
          <div className="divide-y">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="p-4 hover:bg-muted flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{photo.title}</h3>
                    <p className="text-sm text-muted-foreground">{photo.location}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {photo.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm text-muted-foreground">
                    <div>{photo.takenBy}</div>
                    <div>{new Date(photo.takenAt).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
