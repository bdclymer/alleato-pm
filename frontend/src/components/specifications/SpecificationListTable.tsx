"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
  Download,
  Eye,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { useDeleteSpecification } from "@/hooks/use-specifications";
import type { SpecificationWithRevision } from "@/types/specifications.types";
import { toast } from "sonner";

interface SpecificationListTableProps {
  projectId: string;
  specifications: SpecificationWithRevision[];
  onEdit?: (specification: SpecificationWithRevision) => void;
}

export function SpecificationListTable({
  projectId,
  specifications,
  onEdit,
}: SpecificationListTableProps) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteMutation = useDeleteSpecification(projectId);

  const handleView = (sectionId: number) => {
    router.push(`/${projectId}/specifications/${sectionId}`);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const handleDownload = async (specId: number, revisionId: number) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/specifications/${specId}/revisions/${revisionId}/download`
      );

      if (!response.ok) {
        throw new Error("Failed to generate download URL");
      }

      const { url } = await response.json();
      window.open(url, "_blank");
    } catch (error) {
      toast.error("Failed to download file");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "archived":
        return <Badge variant="secondary">Archived</Badge>;
      case "superseded":
        return <Badge variant="outline">Superseded</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (specifications.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed rounded-lg">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-semibold text-foreground">
          No specifications
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Get started by uploading a new specification document.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Section #</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[120px]">Revision</TableHead>
              <TableHead className="w-[100px]">File Size</TableHead>
              <TableHead className="w-[140px]">Last Updated</TableHead>
              <TableHead className="w-[80px]">Areas</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {specifications.map((spec) => (
              <TableRow
                key={spec.id}
                className="cursor-pointer hover:bg-muted"
                onClick={() => handleView(spec.id)}
              >
                <TableCell className="font-mono font-medium">
                  {spec.section_number}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{spec.title}</span>
                  </div>
                  {spec.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {spec.description}
                    </p>
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(spec.status)}</TableCell>
                <TableCell>
                  {spec.current_revision ? (
                    <span className="text-sm">
                      Rev {spec.current_revision.revision_number}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">No revisions</span>
                  )}
                </TableCell>
                <TableCell>
                  {spec.current_revision && (
                    <span className="text-sm">
                      {formatFileSize(spec.current_revision.file_size)}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(spec.updated_at || spec.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </TableCell>
                <TableCell>
                  {spec.area_count > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {spec.area_count}
                    </Badge>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleView(spec.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      {spec.current_revision && (
                        <DropdownMenuItem
                          onClick={() =>
                            handleDownload(spec.id, spec.current_revision!.id)
                          }
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(spec)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit Metadata
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => setDeleteId(spec.id.toString())}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this specification and all its revisions.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
