"use client";

import { useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getGravatarUrlClient } from "@/lib/gravatar";

interface ProfileImageUploadProps {
  currentImage?: string;
  userEmail: string;
  userName: string;
  onUploadComplete?: (url: string) => void;
}

type AvatarApiError = {
  error?: string;
  code?: string;
  hint?: string;
  details?: string;
};

export function ProfileImageUpload({
  currentImage,
  userEmail,
  userName,
  onUploadComplete,
}: ProfileImageUploadProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [apiError, setApiError] = useState<AvatarApiError | null>(null);

  const initials =
    userName
      ?.split(" ")
      ?.map((word) => word[0])
      ?.join("")
      ?.toUpperCase()
      ?.slice(0, 2) || "??";

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setSelectedFile(file);
    setApiError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        avatarUrl?: string;
        code?: string;
        hint?: string;
        details?: string;
      };

      if (!response.ok) {
        setApiError(payload);
        throw new Error(payload.error || "Failed to upload image");
      }

      const publicUrl = payload.avatarUrl;
      if (!publicUrl) {
        throw new Error("Upload succeeded but no image URL was returned");
      }

      toast.success("Profile image updated successfully");
      setApiError(null);
      onUploadComplete?.(publicUrl);
      setOpen(false);
      setPreviewUrl(null);
      setSelectedFile(null);

      // Refresh the page to show new avatar
      window.location.reload();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to upload image. Please try again.";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    try {
      const response = await fetch("/api/profile/avatar", {
        method: "DELETE",
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        hint?: string;
        details?: string;
      };

      if (!response.ok) {
        setApiError(payload);
        throw new Error(payload.error || "Failed to remove image");
      }

      toast.success("Profile image removed");
      setApiError(null);
      onUploadComplete?.("");
      setOpen(false);
      window.location.reload();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to remove image";
      toast.error(message);
    }
  };

  const displayImage =
    previewUrl || currentImage || getGravatarUrlClient(userEmail);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Update photo
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update profile photo</DialogTitle>
            <DialogDescription>
              Upload a new profile photo or remove your current one. Accepted
              formats: JPG, PNG, GIF (max 5MB)
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4">
            <Avatar className="h-32 w-32">
              <AvatarImage src={displayImage} alt={userName} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("file-input")?.click()}
                disabled={uploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                Choose file
              </Button>
              {currentImage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemove}
                  disabled={uploading}
                >
                  <X className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>

            <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedFile.name}
              </p>
            )}
          </div>

          {apiError?.error ? (
            <Alert variant="destructive">
              <AlertTitle>{apiError.error}</AlertTitle>
              <AlertDescription className="space-y-1">
                {apiError.hint ? <p>{apiError.hint}</p> : null}
                {apiError.details ? <p className="break-words">{apiError.details}</p> : null}
                {apiError.code ? <p className="font-mono text-xs">Code: {apiError.code}</p> : null}
              </AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setPreviewUrl(null);
                setSelectedFile(null);
                setApiError(null);
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
