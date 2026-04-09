"use client";

import * as React from "react";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, ArrowRight, FolderOpen } from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDrawingSets, useCreateDrawingSet, useUpdateDrawingSet } from "@/hooks/use-drawing-sets";
import { EmptyState } from "@/components/ds";

const tabs = (projectId: string) => [
  { label: "Current Drawings", href: `/${projectId}/drawings`, isActive: false },
  { label: "Drawing Sets", href: `/${projectId}/drawings/sets`, isActive: true },
  { label: "All Sets & Revisions", href: `/${projectId}/drawings/revisions-report`, isActive: false },
  { label: "Recycle Bin", href: `/${projectId}/drawings/recycle-bin`, isActive: false },
];

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DrawingSetsPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId ?? "";
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [showCreateRow, setShowCreateRow] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");

  const { data: sets = [], isLoading } = useDrawingSets(projectId);
  const createSet = useCreateDrawingSet(projectId);
  const updateSet = useUpdateDrawingSet(projectId);

  const filtered = sets.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const startEdit = (set: { id: string; name: string; issued_at: string }) => {
    setEditingId(set.id);
    setEditName(set.name);
    setEditDate(set.issued_at ? set.issued_at.slice(0, 10) : "");
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    await updateSet.mutateAsync({
      setId: id,
      data: {
        name: editName.trim(),
        issued_at: editDate ? new Date(editDate).toISOString() : undefined,
      },
    });
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("Set name is required");
      return;
    }
    await createSet.mutateAsync({
      name: newName.trim(),
      issued_at: newDate ? new Date(newDate).toISOString() : new Date().toISOString(),
    });
    setNewName("");
    setNewDate("");
    setShowCreateRow(false);
  };

  return (
    <PageShell
      variant="table"
      title="Drawing Sets"
      tabs={tabs(projectId)}
      actions={
        <Button size="sm" onClick={() => setShowCreateRow(true)}>
          <Plus />
          New Set
        </Button>
      }
    >
        {/* Search */}
        <div className="mb-4">
          <Input
            placeholder="Search sets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-center">Published</TableHead>
                <TableHead className="text-center">Unpublished</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Create new set inline row */}
              {showCreateRow && (
                <TableRow>
                  <TableCell>
                    <Input
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Set name"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreate();
                        if (e.key === "Escape") setShowCreateRow(false);
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                    />
                  </TableCell>
                  <TableCell colSpan={2} />
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={handleCreate} disabled={createSet.isPending}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowCreateRow(false)}>
                        Cancel
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 && !showCreateRow ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12">
                    <EmptyState
                      icon={<FolderOpen className="h-8 w-8 text-muted-foreground" />}
                      title="No drawing sets"
                      description="Create a set to group drawings issued together."
                      action={{
                        label: "New Set",
                        onClick: () => setShowCreateRow(true),
                      }}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((set) => (
                  <TableRow
                    key={set.id}
                    className="cursor-pointer"
                    onClick={() => {
                      if (editingId !== set.id) startEdit(set);
                    }}
                  >
                    <TableCell>
                      {editingId === set.id ? (
                        <Input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(set.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                        />
                      ) : (
                        <span className="font-medium">{set.name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === set.id ? (
                        <Input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(set.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                        />
                      ) : (
                        formatDate(set.issued_at)
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {(set as { revisionCount?: number }).revisionCount ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">0</Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {editingId === set.id ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() => saveEdit(set.id)}
                            disabled={updateSet.isPending}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            router.push(`/${projectId}/drawings?set=${set.id}`)
                          }
                        >
                          View
                          <ArrowRight />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
    </PageShell>
  );
}
