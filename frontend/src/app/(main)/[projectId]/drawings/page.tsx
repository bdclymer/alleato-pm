"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageContainer , ProjectPageHeader } from "@/components/layout";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  FileUp,
  Filter,
  Layers,
  Search,
} from "lucide-react";
import { DrawingLogTable } from "@/components/drawings/DrawingLogTable";
import { DrawingUploadDialog } from "@/components/drawings/DrawingUploadDialog";
import { useDrawings, useDeleteDrawing } from "@/hooks/use-drawings";
import { useDrawingAreas } from "@/hooks/use-drawing-areas";
import { DRAWING_DISCIPLINES } from "@/types/drawings.types";
import type { DrawingLogTableRow } from "@/types/drawings.types";
import type { DrawingFilters } from "@/services/DrawingService";

export default function ProjectDrawingsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [filters, setFilters] = useState<DrawingFilters>({
    page: 1,
    page_size: 50,
  });

  // Fetch data using real hooks
  const { data: drawingsData, isLoading } = useDrawings(projectId, filters);
  const { data: areas = [] } = useDrawingAreas(projectId);
  const deleteDrawing = useDeleteDrawing(projectId);

  const drawings: DrawingLogTableRow[] = drawingsData?.drawings || [];

  const handleClearFilters = () => {
    setFilters({
      page: 1,
      page_size: 50,
    });
  };

  const handleDeleteDrawing = async (drawingId: string) => {
    await deleteDrawing.mutateAsync(drawingId);
  };

  return (
    <>
      <ProjectPageHeader
        title="Drawings"
        description="Manage construction drawings with revision tracking"
        actions={
          <div className="flex items-center gap-2">
            <DrawingUploadDialog projectId={projectId}>
              <Button variant="outline" size="sm" className="gap-2">
                <FileUp className="h-4 w-4" />
                Upload Drawings
              </Button>
            </DrawingUploadDialog>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href={`/${projectId}/drawings/board`}>
                <Layers className="h-4 w-4" />
                Board View
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Reports
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Reports</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Drawing Log</DropdownMenuItem>
                <DropdownMenuItem>Download Log</DropdownMenuItem>
                <DropdownMenuItem>Open Items</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Export PDF</DropdownMenuItem>
                <DropdownMenuItem>Export CSV</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />
      <PageContainer>
        <div className="space-y-6">
          {/* Drawing Areas Sidebar + Main Content */}
          <div className="grid gap-4 lg:grid-cols-[220px,1fr]">
            {/* Drawing Areas Sidebar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1 pb-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Drawing Areas
                </h3>
              </div>
              {areas.length === 0 && !isLoading && (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  No areas created yet
                </div>
              )}
              {areas.map((area) => {
                const isActive = filters.area_id === area.id;
                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        area_id: isActive ? undefined : area.id,
                        page: 1,
                      }))
                    }
                    className={`w-full rounded-md border px-4 py-2 text-left text-sm transition hover:border-primary ${
                      isActive
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background"
                    }`}
                    aria-pressed={isActive}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{area.name}</span>
                      <Badge
                        variant={isActive ? "default" : "outline"}
                        className="text-xs ml-2 shrink-0"
                      >
                        {area.drawing_count || 0}
                      </Badge>
                    </div>
                    {area.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {area.description}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Main Content */}
            <div className="space-y-4">
              {/* Filters */}
              <div className="rounded-lg border bg-card">
                <div className="flex flex-col gap-2 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-1 items-center gap-2">
                    <div className="relative w-full lg:max-w-sm">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search drawings by number or title"
                        value={filters.search || ""}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            search: e.target.value,
                            page: 1,
                          }))
                        }
                        className="pl-9 h-9"
                        aria-label="Search drawings"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFilters}
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={filters.discipline || "all"}
                      onValueChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          discipline: value === "all" ? undefined : value,
                          page: 1,
                        }))
                      }
                    >
                      <SelectTrigger
                        className="w-[160px] h-9"
                        aria-label="Discipline filter"
                      >
                        <SelectValue placeholder="Discipline" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All disciplines</SelectItem>
                        {DRAWING_DISCIPLINES.map((discipline) => (
                          <SelectItem key={discipline} value={discipline}>
                            {discipline}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={filters.status || "all"}
                      onValueChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          status:
                            value === "all"
                              ? undefined
                              : (value as any),
                          page: 1,
                        }))
                      }
                    >
                      <SelectTrigger
                        className="w-[140px] h-9"
                        aria-label="Status filter"
                      >
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="superseded">Superseded</SelectItem>
                        <SelectItem value="void">Void</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Table */}
              <DrawingLogTable
                data={drawings}
                projectId={projectId}
                isLoading={isLoading}
                onDeleteDrawing={handleDeleteDrawing}
              />
            </div>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
