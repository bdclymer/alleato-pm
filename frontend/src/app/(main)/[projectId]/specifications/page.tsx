"use client";

import * as React from "react";
import { useState } from "react";
import { useParams } from "next/navigation";
import { Search } from "lucide-react";

import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/layout/page-header-unified";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

import {
  SpecificationUploadDialog,
  SpecificationListTable,
  SpecificationEditModal,
} from "@/components/specifications";
import { useSpecifications } from "@/hooks/use-specifications";
import { useSpecificationAreas } from "@/hooks/use-specification-areas";
import type { SpecificationWithRevision } from "@/types/specifications.types";

export default function ProjectSpecificationsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived" | "superseded">("all");
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
    <>
      <PageHeader
        title="Specifications"
        description="Manage project specifications and revisions"
        actions={
          <SpecificationUploadDialog projectId={projectId}>
            <Button>Upload Specification</Button>
          </SpecificationUploadDialog>
        }
      />
      <PageContainer>
        <div className="space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by section number or title..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(value: "all" | "active" | "archived" | "superseded") => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="superseded">Superseded</SelectItem>
                </SelectContent>
              </Select>

              {/* Area Filter */}
              {areas && areas.length > 0 && (
                <Select
                  value={areaFilter}
                  onValueChange={(value) => {
                    setAreaFilter(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All areas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All areas</SelectItem>
                    {areas?.map((area: any) => (
                      <SelectItem key={area.id} value={area.id.toString()}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Results Summary */}
            {!isLoading && (
              <div className="mt-4 text-sm text-muted-foreground">
                Showing {specifications.length} of {totalCount} specification
                {totalCount !== 1 ? "s" : ""}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Specifications Table */}
        <SpecificationListTable
          projectId={projectId}
          specifications={specifications}
          onEdit={setEditingSpec}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2">
            <Button
              variant="outline"
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
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <SpecificationEditModal
        projectId={projectId}
        specification={editingSpec}
        open={!!editingSpec}
        onOpenChange={(open) => !open && setEditingSpec(null)}
      />
      </PageContainer>
    </>
  );
}
