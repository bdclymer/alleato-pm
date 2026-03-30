"use client";

import * as React from "react";
import { useState } from "react";
import { useParams } from "next/navigation";

import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

import {
  SpecificationUploadDialog,
  SpecificationListTable,
  SpecificationEditModal,
} from "@/components/specifications";
import { useSpecifications } from "@/hooks/use-specifications";
import { useSpecificationAreas } from "@/hooks/use-specification-areas";
import type { SpecificationWithRevision } from "@/types/specifications.types";

interface SpecArea {
  id: number;
  name: string;
}

type StatusFilter = "all" | "active" | "archived" | "superseded";

export default function ProjectSpecificationsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [editingSpec, setEditingSpec] = useState<SpecificationWithRevision | null>(null);

  const { data: areas } = useSpecificationAreas(projectId);

  const { data, isLoading } = useSpecifications(projectId, {
    search: search || undefined,
    status: statusFilter === "all" ? undefined : (statusFilter as "active" | "archived" | "superseded"),
    area_id: areaFilter === "all" ? undefined : parseInt(areaFilter),
    page,
    page_size: 25,
  });

  const specifications = data?.specifications || [];
  const totalCount = data?.total_count || 0;
  const totalPages = Math.ceil(totalCount / 25);

  return (
    <PageShell
      variant="table"
      title="Specifications"
      description="Manage project specifications and revisions"
      actions={
        <SpecificationUploadDialog projectId={projectId}>
          <Button size="sm">Upload Specification</Button>
        </SpecificationUploadDialog>
      }
    >
      <div className="space-y-4">
        {/* Toolbar — search + filters inline, no Card wrapper */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Input
              placeholder="Search by section number or title..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pr-4"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value: StatusFilter) => {
              setStatusFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="superseded">Superseded</SelectItem>
            </SelectContent>
          </Select>

          {areas && areas.length > 0 && (
            <Select
              value={areaFilter}
              onValueChange={(value) => {
                setAreaFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All areas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All areas</SelectItem>
                {(areas as SpecArea[]).map((area) => (
                  <SelectItem key={area.id} value={area.id.toString()}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {!isLoading && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {totalCount} specification{totalCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Specifications Table */}
        <SpecificationListTable
          projectId={projectId}
          specifications={specifications}
          onEdit={setEditingSpec}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      <SpecificationEditModal
        projectId={projectId}
        specification={editingSpec}
        open={!!editingSpec}
        onOpenChange={(open) => !open && setEditingSpec(null)}
      />
    </PageShell>
  );
}
