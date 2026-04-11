"use client";

import * as React from "react";
import { useState } from "react";
import { useParams } from "next/navigation";
import { RotateCcw, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { PageShell } from "@/components/layout";
import { EmptyState } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useDeletedDrawings,
  useRestoreDrawing,
  usePermanentDeleteDrawing,
} from "@/hooks/use-drawings";

const tabs = (projectId: string) => [
  { label: "Current Drawings", href: `/${projectId}/drawings`, isActive: false },
  { label: "Drawing Sets", href: `/${projectId}/drawings/sets`, isActive: false },
  { label: "All Sets & Revisions", href: `/${projectId}/drawings/revisions-report`, isActive: false },
  { label: "Recycle Bin", href: `/${projectId}/drawings/recycle-bin`, isActive: true },
];

export default function DrawingRecycleBinPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId ?? "";

  const { data: deletedDrawings = [], isLoading } = useDeletedDrawings(projectId);
  const restoreDrawing = useRestoreDrawing(projectId);
  const permanentDelete = usePermanentDeleteDrawing(projectId);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  return (
    <PageShell
      variant="table"
      title="Drawings"
      description="View, manage, and upload all of your drawings from the Drawings log."
      tabs={tabs(projectId)}
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded animate-pulse" />
          ))}
        </div>
      ) : deletedDrawings.length === 0 ? (
        <EmptyState
          icon={<Trash2 className="h-8 w-8 text-muted-foreground" />}
          title="Recycle Bin is empty"
          description="Deleted drawings will appear here and can be restored."
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Drawing #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Discipline</TableHead>
                <TableHead>Deleted</TableHead>
                <TableHead className="w-[180px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deletedDrawings.map((drawing: Record<string, unknown>) => (
                <TableRow key={drawing.id as string} className="opacity-70">
                  <TableCell className="font-medium">
                    {drawing.drawing_number as string}
                  </TableCell>
                  <TableCell>{(drawing.title as string) || "Untitled"}</TableCell>
                  <TableCell>
                    {drawing.discipline ? (
                      <Badge variant="outline">{drawing.discipline as string}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {drawing.deleted_at
                      ? formatDistanceToNow(new Date(drawing.deleted_at as string), {
                          addSuffix: true,
                        })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          restoreDrawing.mutate(drawing.id as string)
                        }
                        disabled={restoreDrawing.isPending}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Restore
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          setDeleteTarget({
                            id: drawing.id as string,
                            title:
                              (drawing.drawing_number as string) ||
                              (drawing.title as string) ||
                              "this drawing",
                          })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete Forever
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete drawing?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deleteTarget?.title}&rdquo;
              and all associated revisions and files. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  permanentDelete.mutate(deleteTarget.id, {
                    onSettled: () => setDeleteTarget(null),
                  });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={permanentDelete.isPending}
            >
              {permanentDelete.isPending ? "Deleting…" : "Delete Forever"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
