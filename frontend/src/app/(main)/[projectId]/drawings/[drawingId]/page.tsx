"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  History,
  Info,
  Link2,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  PenLine,
  Trash2,
  X,
  Check,
  ImageOff,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { PageShell } from "@/components/layout";
import { StatusBadge } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ds";
import { DrawingComments } from "@/components/drawings/DrawingComments";

import { useDrawing, useUpdateDrawing } from "@/hooks/use-drawings";
import { useDrawingRevisions } from "@/hooks/use-drawing-revisions";
import {
  DRAWING_DISCIPLINES,
  DRAWING_TYPES,
} from "@/types/drawings.types";
import type { DrawingRevision } from "@/types/drawings.types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDateSafe(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

// ---------------------------------------------------------------------------
// Field display row
// ---------------------------------------------------------------------------

interface FieldRowProps {
  label: string;
  value: React.ReactNode;
}

function FieldRow({ label, value }: FieldRowProps) {
  return (
    <div className="flex flex-col gap-0.5 py-3 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm text-foreground">{value || "—"}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit form state
// ---------------------------------------------------------------------------

interface EditFormState {
  drawing_number: string;
  title: string;
  discipline: string;
  drawing_type: string;
}

// ---------------------------------------------------------------------------
// Revision table row skeleton
// ---------------------------------------------------------------------------

function RevisionRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
    </TableRow>
  );
}

// ---------------------------------------------------------------------------
// Revision table row
// ---------------------------------------------------------------------------

interface RevisionRowProps {
  revision: DrawingRevision;
  projectId: string;
  drawingId: string;
  onDownload: (revision: DrawingRevision) => void;
}

function RevisionRow({ revision, projectId, drawingId, onDownload }: RevisionRowProps) {
  const router = useRouter();

  return (
    <TableRow className={revision.is_current_revision ? "bg-muted/30" : undefined}>
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground transition-colors h-auto p-0"
          onClick={() =>
            router.push(`/${projectId}/drawings/viewer/${drawingId}`)
          }
          title="View in drawing viewer"
          type="button"
        >
          <Info className="h-4 w-4" />
        </Button>
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground transition-colors h-auto p-0"
          onClick={() => onDownload(revision)}
          title="Download this revision"
          type="button"
        >
          <Download className="h-4 w-4" />
        </Button>
      </TableCell>
      <TableCell className="font-medium text-foreground">
        {revision.revision_number}
        {revision.is_current_revision && (
          <span className="ml-1.5 text-xs text-muted-foreground">(current)</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {revision.drawing_set_id ?? "—"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDateSafe(revision.drawing_date)}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDateSafe(revision.received_date)}
      </TableCell>
      <TableCell>
        <StatusBadge status={revision.status} />
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <MoreHorizontal />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                toast.info("Change drawing number — coming soon")
              }
            >
              Change drawing number
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function DrawingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const drawingId = params.drawingId as string;

  const { data: drawing, isLoading, error } = useDrawing(projectId, drawingId);
  const { data: revisions = [], isLoading: revisionsLoading } =
    useDrawingRevisions(projectId, drawingId);
  const updateDrawing = useUpdateDrawing(projectId);

  const [isEditing, setIsEditing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({
    drawing_number: "",
    title: "",
    discipline: "",
    drawing_type: "",
  });

  // Fetch signed preview URL once drawing is loaded
  useEffect(() => {
    if (!drawing?.current_revision?.file_url) return;
    setPreviewLoading(true);
    fetch(`/api/projects/${projectId}/drawings/${drawingId}/download`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.downloadUrl) setPreviewUrl(data.downloadUrl);
      })
      .catch(() => {})
      .finally(() => setPreviewLoading(false));
  }, [drawing, projectId, drawingId]);

  // Kick off editing mode — pre-fill the form from drawing data
  const handleStartEdit = () => {
    if (!drawing) return;
    setEditForm({
      drawing_number: drawing.drawing_number ?? "",
      title: drawing.title ?? "",
      discipline: drawing.discipline ?? "",
      drawing_type: drawing.drawing_type ?? "",
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => setIsEditing(false);

  const handleSaveEdit = async () => {
    if (!drawing) return;
    try {
      await updateDrawing.mutateAsync({
        drawingId,
        data: {
          drawing_number: editForm.drawing_number || undefined,
          title: editForm.title || undefined,
          discipline: editForm.discipline || undefined,
          drawing_type: editForm.drawing_type || undefined,
        },
      });
      setIsEditing(false);
    } catch {
      // error toast is handled inside useUpdateDrawing
    }
  };

  const handleDownloadCurrent = useCallback(async () => {
    if (!drawing) return;
    try {
      const response = await fetch(
        `/api/projects/${projectId}/drawings/${drawingId}/download`,
      );
      if (!response.ok) throw new Error("Failed to download drawing");
      const data = await response.json();
      if (data.downloadUrl) {
        const a = document.createElement("a");
        a.href = data.downloadUrl;
        a.download = data.fileName ?? `${drawing.drawing_number ?? drawing.title}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("Drawing downloaded successfully");
      }
    } catch {
      toast.error("Failed to download drawing");
    }
  }, [projectId, drawingId, drawing]);

  const handleDownloadRevision = useCallback(
    async (revision: DrawingRevision) => {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/drawings/${drawingId}/download`,
        );
        if (!response.ok) throw new Error("Failed to download revision");
        const data = await response.json();
        if (data.downloadUrl) {
          const a = document.createElement("a");
          a.href = data.downloadUrl;
          a.download = revision.file_name ?? `revision-${revision.revision_number}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          toast.success("Revision downloaded");
        }
      } catch {
        toast.error("Failed to download revision");
      }
    },
    [projectId, drawingId],
  );

  // ---------------------------------------------------------------------------
  // Error / loading / not found states
  // ---------------------------------------------------------------------------

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Drawing Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            {error instanceof Error ? error.message : "An unexpected error occurred — please try again"}
          </p>
          <Button onClick={() => router.push(`/${projectId}/drawings`)}>
            <ArrowLeft />
            Back to Drawings
          </Button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Page skeleton while loading
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <PageShell variant="detail" title="" onBack={() => router.back()}>
        <Skeleton className="h-9 w-full max-w-2xl" />
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
          <Skeleton className="h-80 w-full rounded-lg" />
        </div>
      </PageShell>
    );
  }

  if (!drawing) return null;

  const currentRevision = drawing.current_revision;
  const isPdf =
    currentRevision?.file_type?.toLowerCase().includes("pdf") ||
    currentRevision?.file_url?.toLowerCase().endsWith(".pdf");

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <PageShell
      variant="detail"
      title={drawing.title}
      description={
        drawing.drawing_number
          ? `${drawing.drawing_number}${drawing.discipline ? ` · ${drawing.discipline}` : ""}`
          : undefined
      }
      onBack={() => router.back()}
      statusBadge={
        currentRevision?.status ? (
          <StatusBadge status={currentRevision.status} />
        ) : undefined
      }
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(`/${projectId}/drawings/viewer/${drawingId}`)
            }
          >
            <Eye />
            View
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCurrent}
            disabled={!currentRevision?.file_url}
          >
            <Download />
            Download
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="px-2">
                <MoreHorizontal />
                <span className="sr-only">More actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => toast.info("Email — coming soon")}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => toast.info("Move to Recycle Bin — coming soon")}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Move to Recycle Bin
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    >
        <Tabs defaultValue="general" className="mt-4">
          <TabsList variant="line" className="mb-6 flex-wrap h-auto">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="sketches">Sketches</TabsTrigger>
            <TabsTrigger value="download-log">Download Log</TabsTrigger>
            <TabsTrigger value="revision-related">
              Revision Related Items
            </TabsTrigger>
            <TabsTrigger value="drawing-related">
              Drawing Related Items
            </TabsTrigger>
            <TabsTrigger value="emails">Emails</TabsTrigger>
            <TabsTrigger value="change-history">Change History</TabsTrigger>
            <TabsTrigger value="comments">
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Comments
            </TabsTrigger>
          </TabsList>

          {/* ---------------------------------------------------------------- */}
          {/* GENERAL TAB                                                       */}
          {/* ---------------------------------------------------------------- */}
          <TabsContent value="general">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left column — info + revisions */}
              <div className="lg:col-span-2 space-y-6">
                {/* General Information card */}
                <Card className="shadow-xs">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base">
                      General Information
                    </CardTitle>
                    {!isEditing ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleStartEdit}
                      >
                        <Pencil />
                        Edit
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                          disabled={updateDrawing.isPending}
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={updateDrawing.isPending}
                        >
                          <Check />
                          {updateDrawing.isPending ? "Saving…" : "Save"}
                        </Button>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent>
                    {!isEditing ? (
                      /* View mode */
                      <div>
                        <FieldRow
                          label="Number"
                          value={drawing.drawing_number}
                        />
                        <FieldRow label="Title" value={drawing.title} />
                        <FieldRow
                          label="Discipline"
                          value={drawing.discipline}
                        />
                        <FieldRow
                          label="Type"
                          value={drawing.drawing_type}
                        />
                        <FieldRow label="Obsolete" value="No" />
                      </div>
                    ) : (
                      /* Edit mode */
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="drawing_number">Number</Label>
                          <Input
                            id="drawing_number"
                            value={editForm.drawing_number}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                drawing_number: e.target.value,
                              }))
                            }
                            placeholder="e.g. A-101"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="title">Title</Label>
                          <Input
                            id="title"
                            value={editForm.title}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                title: e.target.value,
                              }))
                            }
                            placeholder="Drawing title"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="discipline">Discipline</Label>
                          <Select
                            value={editForm.discipline}
                            onValueChange={(val) =>
                              setEditForm((f) => ({ ...f, discipline: val }))
                            }
                          >
                            <SelectTrigger id="discipline">
                              <SelectValue placeholder="Select discipline" />
                            </SelectTrigger>
                            <SelectContent>
                              {DRAWING_DISCIPLINES.map((d) => (
                                <SelectItem key={d} value={d}>
                                  {d}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="drawing_type">Type</Label>
                          <Select
                            value={editForm.drawing_type}
                            onValueChange={(val) =>
                              setEditForm((f) => ({
                                ...f,
                                drawing_type: val,
                              }))
                            }
                          >
                            <SelectTrigger id="drawing_type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {DRAWING_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Versions card */}
                <Card className="shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Versions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          <TableHead className="w-10"></TableHead>
                          <TableHead>Revision</TableHead>
                          <TableHead>Set</TableHead>
                          <TableHead>Drawing Date</TableHead>
                          <TableHead>Received Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {revisionsLoading ? (
                          <>
                            <RevisionRowSkeleton />
                            <RevisionRowSkeleton />
                          </>
                        ) : revisions.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="text-center text-muted-foreground text-sm py-8"
                            >
                              No revisions found
                            </TableCell>
                          </TableRow>
                        ) : (
                          revisions.map((rev) => (
                            <RevisionRow
                              key={rev.id}
                              revision={rev}
                              projectId={projectId}
                              drawingId={drawingId}
                              onDownload={handleDownloadRevision}
                            />
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* Right column — preview */}
              <div>
                <Card className="shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Drawing Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {currentRevision?.file_url ? (
                      <div className="space-y-3">
                        {previewLoading ? (
                          <div className="w-full rounded-md border border-border bg-muted flex items-center justify-center" style={{ height: 340 }}>
                            <Skeleton className="h-full w-full rounded-md" />
                          </div>
                        ) : isPdf && previewUrl ? (
                          <iframe
                            src={`${previewUrl}#toolbar=0&navpanes=0`}
                            className="w-full rounded-md border border-border bg-muted"
                            style={{ height: 340 }}
                            title={`Preview of ${drawing.title}`}
                          />
                        ) : !isPdf && previewUrl ? (
                          /* Image preview */
                          <img
                            src={previewUrl}
                            alt={`Preview of ${drawing.title}`}
                            className="w-full rounded-md border border-border object-contain bg-muted"
                            style={{ maxHeight: 340 }}
                          />
                        ) : null}

                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p className="font-medium text-foreground truncate">
                            {currentRevision.file_name}
                          </p>
                          <p>{formatBytes(currentRevision.file_size)}</p>
                        </div>

                        <Button
                          className="w-full"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(
                              `/${projectId}/drawings/viewer/${drawingId}`,
                            )
                          }
                        >
                          <Eye />
                          View Full Drawing
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                          <ImageOff className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          No preview available
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ---------------------------------------------------------------- */}
          {/* SKETCHES TAB                                                      */}
          {/* ---------------------------------------------------------------- */}
          <TabsContent value="sketches">
            <div className="flex justify-end mb-4">
              <Button
                size="sm"
                onClick={() => toast.info("Add Sketch — coming soon")}
              >
                <PenLine />
                Add Sketch
              </Button>
            </div>
            <EmptyState
              icon={<PenLine className="h-6 w-6 text-muted-foreground" />}
              title="No sketches yet"
              description="Sketches and markups on this drawing will appear here."
            />
          </TabsContent>

          {/* ---------------------------------------------------------------- */}
          {/* DOWNLOAD LOG TAB                                                  */}
          {/* ---------------------------------------------------------------- */}
          <TabsContent value="download-log">
            <EmptyState
              icon={<Download className="h-6 w-6 text-muted-foreground" />}
              title="No downloads recorded"
              description="Download activity for this drawing will be logged here."
            />
          </TabsContent>

          {/* ---------------------------------------------------------------- */}
          {/* REVISION RELATED ITEMS TAB                                        */}
          {/* ---------------------------------------------------------------- */}
          <TabsContent value="revision-related">
            <div className="flex justify-end mb-4">
              <Button
                size="sm"
                onClick={() =>
                  toast.info("Link Related Item — coming soon")
                }
              >
                <Link2 className="h-4 w-4 mr-1.5" />
                Link Related Item
              </Button>
            </div>
            <EmptyState
              icon={<Link2 className="h-6 w-6 text-muted-foreground" />}
              title="No revision related items"
              description="RFIs, submittals, and other items linked to this revision will appear here."
            />
          </TabsContent>

          {/* ---------------------------------------------------------------- */}
          {/* DRAWING RELATED ITEMS TAB                                         */}
          {/* ---------------------------------------------------------------- */}
          <TabsContent value="drawing-related">
            <div className="flex justify-end mb-4">
              <Button
                size="sm"
                onClick={() =>
                  toast.info("Link Related Item — coming soon")
                }
              >
                <Link2 className="h-4 w-4 mr-1.5" />
                Link Related Item
              </Button>
            </div>
            <EmptyState
              icon={<FileText className="h-6 w-6 text-muted-foreground" />}
              title="No drawing related items"
              description="Change orders, commitments, and other items linked to this drawing will appear here."
            />
          </TabsContent>

          {/* ---------------------------------------------------------------- */}
          {/* EMAILS TAB                                                        */}
          {/* ---------------------------------------------------------------- */}
          <TabsContent value="emails">
            <div className="flex justify-end mb-4">
              <Button
                size="sm"
                onClick={() => toast.info("Compose Email — coming soon")}
              >
                <Mail />
                Compose Email
              </Button>
            </div>
            <EmptyState
              icon={<Mail className="h-6 w-6 text-muted-foreground" />}
              title="No emails"
              description="Emails sent or received related to this drawing will appear here."
            />
          </TabsContent>

          {/* ---------------------------------------------------------------- */}
          {/* CHANGE HISTORY TAB                                                */}
          {/* ---------------------------------------------------------------- */}
          <TabsContent value="change-history">
            <EmptyState
              icon={<History className="h-6 w-6 text-muted-foreground" />}
              title="No changes recorded"
              description="All edits and status changes to this drawing will be tracked here."
            />
          </TabsContent>

          {/* ---------------------------------------------------------------- */}
          {/* COMMENTS TAB                                                      */}
          {/* ---------------------------------------------------------------- */}
          <TabsContent value="comments">
            <div className="max-w-2xl">
              <DrawingComments drawingId={drawingId} />
            </div>
          </TabsContent>
        </Tabs>
    </PageShell>
  );
}
