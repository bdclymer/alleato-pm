/**
 * DocumentsInfiniteDemoPage (Annotated)
 *
 * How to control WHICH Supabase table is displayed:
 *
 * 1) Change TABLE_NAME
 * 2) Update the TableRow interface to match the table schema
 * 3) Update the trailingQuery (order + filters) to use real columns
 * 4) Ensure the UI only references existing columns
 *
 * Notes:
 * - STATUS filter has been removed.
 * - Filters included: Type + Category only.
 */

"use client";

import { useCallback, useState } from "react";
import {
  useInfiniteQuery,
  type SupabaseQueryHandler,
} from "@/hooks/use-infinite-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow, format } from "date-fns";
import { PageHeader } from "@/components/design-system";

import { FileText, Clock, Tag, Users, Calendar, Filter } from "lucide-react";

const TABLE_NAME = "document_metadata" as const;

interface TableRow {
  id: string;
  title: string | null;
  url: string | null;
  created_at: string | null;

  type: string | null;
  category: string | null;

  tags: string | null;
  description: string | null;
  date: string | null;
  duration_minutes: number | null;
  participants: string | null;

  access_level: string | null;
  project: string | null;
  employee: string | null;
  status: string | null;
}

export default function DocumentsInfiniteDemoPage() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const trailingQuery = useCallback<SupabaseQueryHandler<typeof TABLE_NAME>>(
    (query) => {
      // Order by date DESC, then by id DESC to avoid pagination overlap with duplicate dates
      let filteredQuery = query
        .order("date", { ascending: false })
        .order("id", { ascending: false });

      if (typeFilter !== "all") {
        filteredQuery = filteredQuery.eq("type", typeFilter);
      }

      if (categoryFilter !== "all") {
        filteredQuery = filteredQuery.eq("category", categoryFilter);
      }

      return filteredQuery;
    },
    [typeFilter, categoryFilter],
  );

  const {
    data,
    count,
    isSuccess,
    isLoading,
    isFetching,
    error,
    hasMore,
    fetchNextPage,
  } = useInfiniteQuery({
    tableName: TABLE_NAME,
    columns: "*",
    pageSize: 12,
    trailingQuery,
  });

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">
              Error Loading Records
            </CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800";
      case "archived":
        return "bg-muted text-foreground";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const _getTypeIcon = (type: string | null) => {
    switch (type?.toLowerCase()) {
      case "meeting":
        return <Users className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      case "transcript":
        return <Clock className="h-4 w-4" />;
      default:
        return <Tag className="h-4 w-4" />;
    }
  };

  const safeFormatDate = (value: string | null, fmt: string) => {
    if (!value) return null;
    const ms = Date.parse(value);
    if (Number.isNaN(ms)) return null;
    return format(new Date(ms), fmt);
  };

  const safeDistanceToNow = (value: string | null) => {
    if (!value) return null;
    const ms = Date.parse(value);
    if (Number.isNaN(ms)) return null;
    return formatDistanceToNow(new Date(ms));
  };

  const title = "Projects";
  const description = "Browse all projects with infinite scroll";

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <PageHeader title={title} description={description} />
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>

        {/* TYPE FILTER */}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Document Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="meeting">Meeting</SelectItem>
            <SelectItem value="document">Document</SelectItem>
            <SelectItem value="transcript">Transcript</SelectItem>
            <SelectItem value="report">Report</SelectItem>
          </SelectContent>
        </Select>

        {/* CATEGORY FILTER — UPDATED OPTIONS */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Ops Update">Ops Update</SelectItem>
            <SelectItem value="Weekly Exec">Weekly Exec</SelectItem>
            <SelectItem value="Weekly Ops">Weekly Ops</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && !data.length ? (
          <>
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-4" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            {data.map((row: any) => {
              const createdLabel = safeDistanceToNow(row.created_at);
              const displayDate = safeFormatDate(row.date, "MMM d, yyyy");

              return (
                <Card className="rounded-sm" key={row.id}>
                  <CardHeader>
                    <CardTitle className="text-sm text-brand">
                      {row.title || "Untitled Document"}
                    </CardTitle>
                    {displayDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-3 w-3" />
                        <span>{displayDate}</span>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {row.status && (
                        <Badge
                          variant="outline"
                          className={getStatusColor(row.status)}
                        >
                          {row.status}
                        </Badge>
                      )}
                      {row.category && (
                        <Badge variant="secondary">{row.category}</Badge>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {createdLabel
                        ? `Created ${createdLabel} ago`
                        : "Created date unavailable"}
                      {row.employee && <span> • By {row.employee}</span>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
      </div>

      {isSuccess && (
        <div className="mt-8 text-center">
          <div className="text-sm text-muted-foreground mb-4">
            Showing {data.length} of {count} records
            {(typeFilter !== "all" || categoryFilter !== "all") &&
              " (filtered)"}
          </div>

          {hasMore && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                debug: data={data.length} count={String(count)} hasMore=
                {String(hasMore)} isFetching={String(isFetching)}
              </div>

              <Button
                onClick={() => {
                  fetchNextPage();
                }}
                disabled={isFetching}
                variant="outline"
              >
                {isFetching ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
