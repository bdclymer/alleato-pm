"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { ExpandingSearch } from "@/components/ds";
import { EmptyState } from "@/components/ds";
import { useAddLinkedDrawing } from "@/hooks/use-submittals";
import { apiFetch } from "@/lib/api-client";
import { appToast as toast } from "@/lib/toast/app-toast";
import { FileText } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";

interface Drawing {
  id: string;
  drawing_number: string;
  title: string;
  discipline: string | null;
  revision: string | null;
}

interface DrawingsListResponse {
  drawings: Drawing[];
  total: number;
}

interface Props {
  projectId: number;
  submittalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DrawingPickerDialog({ projectId, submittalId, open, onOpenChange }: Props) {
  const [search, setSearch] = useState("");
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addMutation = useAddLinkedDrawing(projectId, submittalId);

  const fetchDrawings = useCallback(async (q: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      params.set("page_size", "50");
      const res = await apiFetch<DrawingsListResponse>(
        `/api/projects/${projectId}/drawings?${params.toString()}`
      );
      setDrawings(res.drawings ?? []);
    } catch {
      setDrawings([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Load drawings when dialog opens; reset state on close
  useEffect(() => {
    if (open) {
      setSearch("");
      fetchDrawings("");
    }
  }, [open, fetchDrawings]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchDrawings(value);
    }, 300);
  }

  async function handleLink(drawing: Drawing) {
    setLinkingId(drawing.id);
    try {
      const result = await addMutation.mutateAsync({ drawingId: drawing.id });
      if ("alreadyLinked" in result && result.alreadyLinked) {
        toast.info(`${drawing.drawing_number} is already linked`);
      } else {
        toast.success(`${drawing.drawing_number} linked`);
      }
      onOpenChange(false);
    } catch {
      toast.error("Failed to link drawing");
    } finally {
      setLinkingId(null);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="xl">
        <ModalHeader>
          <ModalTitle>Link a Drawing</ModalTitle>
        </ModalHeader>

        <div className="space-y-4">
          <ExpandingSearch
            value={search}
            onChange={handleSearchChange}
            placeholder="Search drawings..."
            defaultExpanded
          />

          <div className="max-h-80 overflow-y-auto space-y-1">
            {isLoading ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-12 rounded-md bg-muted animate-pulse" />
                ))}
              </div>
            ) : drawings.length === 0 ? (
              <EmptyState
                icon={<FileText />}
                title="No drawings found"
                description={
                  search
                    ? `No drawings match "${search}"`
                    : "No drawings in this project"
                }
              />
            ) : (
              drawings.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {d.drawing_number} — {d.title}
                    </p>
                    {d.discipline && (
                      <p className="text-xs text-muted-foreground">{d.discipline}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleLink(d)}
                    disabled={linkingId === d.id}
                    className="ml-3 shrink-0"
                  >
                    {linkingId === d.id ? "Linking..." : "Link"}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
