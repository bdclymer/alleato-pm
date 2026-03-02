import { PageContainer, ProjectPageHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getProjectInfo } from "@/lib/supabase/project-fetcher";
import type { FileObject } from "@supabase/storage-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PHOTOS_BUCKET = "photos";

interface ProjectPhoto {
  name: string;
  url: string;
  size: number;
  updatedAt: string | null;
  mimeType: string | null;
}

function formatFileSize(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function formatDateString(timestamp: string | null) {
  if (!timestamp) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

function isImage(entry: FileObject) {
  const mimeType = entry.metadata?.mimetype;
  if (mimeType?.startsWith("image/")) return true;
  return /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(entry.name);
}

async function loadPhotoEntries(
  supabase: Awaited<ReturnType<typeof getProjectInfo>>["supabase"],
  projectId: number,
): Promise<{ photos: ProjectPhoto[]; error?: string }> {
  const folderPath = `projects/${projectId}/photos`;

  const { data: storageEntries, error: storageError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .list(folderPath, {
      limit: 60,
      sortBy: { column: "updated_at", order: "desc" },
    });

  if (storageError || !storageEntries?.length) {
    return { photos: [], error: storageError?.message };
  }

  const photoEntries = storageEntries.filter(
    (entry): entry is FileObject => Boolean(entry.id) && isImage(entry),
  );

  const photos = await Promise.all(
    photoEntries.map(async (entry) => {
      const path = `${folderPath}/${entry.name}`;
      const signedUrlResponse = await supabase.storage
        .from(PHOTOS_BUCKET)
        .createSignedUrl(path, 60 * 60);

      const publicUrlResponse = supabase.storage
        .from(PHOTOS_BUCKET)
        .getPublicUrl(path);

      const url =
        signedUrlResponse.data?.signedUrl ?? publicUrlResponse.data.publicUrl;

      return {
        name: entry.name,
        url,
        size: Number(entry.metadata?.size ?? 0),
        updatedAt: entry.updated_at ?? entry.created_at ?? null,
        mimeType: entry.metadata?.mimetype ?? null,
      };
    }),
  );

  return { photos: photos.filter((photo) => Boolean(photo.url)) };
}

export default async function ProjectPhotosPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project, numericProjectId, supabase } =
    await getProjectInfo(projectId);

  const { photos, error } = await loadPhotoEntries(
    supabase,
    numericProjectId,
  );
  const totalSize = photos.reduce((sum, photo) => sum + photo.size, 0);
  const folderPath = `projects/${numericProjectId}/photos`;

  return (
    <>
      <ProjectPageHeader
        title="Photos"
        description="Project photo documentation pulled directly from Supabase Storage"
      />
      <PageContainer maxWidth="full">
        <div className="space-y-4">
          <Card
            className="border-muted-foreground/20 bg-gradient-to-br from-muted/60 via-background to-background"
            data-testid="photo-summary"
          >
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Storage bucket</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{PHOTOS_BUCKET}</Badge>
                  <code className="rounded bg-muted px-2 py-1 text-xs">
                    {folderPath}
                  </code>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="rounded-lg bg-muted px-4 py-2">
                  <div className="text-muted-foreground">Images</div>
                  <div className="text-lg font-semibold">{photos.length}</div>
                </div>
                <div className="rounded-lg bg-muted px-4 py-2">
                  <div className="text-muted-foreground">Total size</div>
                  <div className="text-lg font-semibold">
                    {formatFileSize(totalSize)}
                  </div>
                </div>
              </div>
              {error ? (
                <div className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
                  Unable to read from Supabase storage: {error}
                </div>
              ) : null}
            </div>
          </Card>

          {photos.length === 0 ? (
            <Card className="p-6" data-testid="photos-empty">
              {error ? (
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-foreground">
                    Unable to load photos
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Supabase returned an error while reading{" "}
                    <code>{folderPath}</code>: {error}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-foreground">
                    No photos found for this project
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Upload images to the <code>{folderPath}</code> folder in the
                    Supabase <strong>photos</strong> bucket to see them here.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    New uploads appear automatically once they are stored in
                    Supabase.
                  </p>
                </div>
              )}
            </Card>
          ) : (
            <div
              className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
              data-testid="photo-grid"
            >
              {photos.map((photo) => (
                <Card
                  key={photo.name}
                  className="overflow-hidden border-muted-foreground/20"
                  data-testid="photo-card"
                >
                  <div className="relative aspect-video bg-muted">
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4">
                      <p className="truncate text-sm font-medium text-white">
                        {photo.name}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1 p-4 text-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>{photo.mimeType ?? "image"}</span>
                      <span>{formatFileSize(photo.size)}</span>
                    </div>
                    <div className="text-muted-foreground">
                      {formatDateString(photo.updatedAt)}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    </>
  );
}
