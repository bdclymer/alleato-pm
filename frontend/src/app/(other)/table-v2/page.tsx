"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Building2, Plus, ExternalLink } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useInfiniteQuery } from "@/hooks/use-infinite-query";
import { updateCompany, deleteCompany } from "@/app/(other)/actions/table-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyFormDialog } from "@/components/domain/companies/CompanyFormDialog";
import { PageHeader } from "@/components/layout/page-header-unified";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageTabs } from "@/components/layout/PageTabs";
import { Text } from "@/components/ui/text";
import {
  GenericEditableTable,
  type EditableColumn,
} from "@/components/tables/generic-editable-table";
import { getDirectoryTabs } from "@/config/directory-tabs";

interface CompanyData {
  id: string;
  name: string;
  title: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  currency_code: string | null;
  currency_symbol: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export default function DirectoryCompaniesPage() {
  const pathname = usePathname();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingCompany, setEditingCompany] =
    React.useState<CompanyData | null>(null);

  const {
    data,
    count,
    isSuccess,
    isLoading,
    isFetching,
    error,
    hasMore,
    fetchNextPage,
  } = useInfiniteQuery<CompanyData>({
    tableName: "companies",
    columns: "*",
    pageSize: 20,
    trailingQuery: (query) => {
      return query.order("name", { ascending: true });
    },
  });

  const columns: EditableColumn<CompanyData>[] = [
    {
      key: "name",
      header: "Company Name",
      type: "text",
      width: "w-[250px]",
      render: (value) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <Text as="span" weight="medium">
            {value || "Unnamed Company"}
          </Text>
        </div>
      ),
    },
    {
      key: "title",
      header: "Title/Type",
      type: "text",
      render: (value) =>
        value ? (
          <Badge variant="outline">{value}</Badge>
        ) : (
          <Text as="span" tone="muted">
            -
          </Text>
        ),
    },
    {
      key: "address",
      header: "Address",
      type: "text",
      render: (value, row) => {
        if (!value && !row.city && !row.state)
          return (
            <Text as="span" tone="muted">
              -
            </Text>
          );
        const parts = [value, row.city, row.state].filter(Boolean);
        return (
          <Text as="span" size="sm">
            {parts.join(", ")}
          </Text>
        );
      },
    },
    {
      key: "city",
      header: "City",
      type: "text",
    },
    {
      key: "state",
      header: "State",
      type: "text",
      width: "w-[100px]",
    },
    {
      key: "website",
      header: "Website",
      type: "text",
      render: (value) =>
        value ? (
          <a
            href={value.startsWith("http") ? value : `https://${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {
              new URL(value.startsWith("http") ? value : `https://${value}`)
                .hostname
            }
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <Text as="span" tone="muted">
            -
          </Text>
        ),
    },
    {
      key: "currency_code",
      header: "Currency",
      type: "text",
      width: "w-[100px]",
      render: (value, row) =>
        value ? (
          <Text as="span" size="sm">
            {row.currency_symbol || ""}
            {value}
          </Text>
        ) : (
          <Text as="span" tone="muted">
            -
          </Text>
        ),
    },
    {
      key: "notes",
      header: "Notes",
      type: "textarea",
      render: (value) =>
        value ? (
          <Text as="span" size="sm" tone="muted" className="line-clamp-2">
            {value}
          </Text>
        ) : (
          <Text as="span" tone="muted">
            -
          </Text>
        ),
    },
  ];

  const handleAddCompany = () => {
    setEditingCompany(null);
    setDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    window.location.reload();
  };

  const tabs = getDirectoryTabs(pathname);

  if (error) {
    return (
      <>
        <PageHeader
          title="Directory"
          description="Manage companies, clients, contacts, users, and employees across your organization"
          showProjectName={false}
          actions={
            <Button onClick={handleAddCompany} variant="default">
              <Plus />
              Add Company
            </Button>
          }
        />
        <PageTabs tabs={tabs} />
        <PageContainer>
          <div className="text-center py-12">
            <h2 className="text-xl font-bold mb-4">Error Loading Companies</h2>
            <Text tone="destructive">{error.message}</Text>
          </div>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Company Directory"
        description="Manage companies, clients, contacts, users, and employees across your organization"
        showProjectName={false}
        actions={
          <Button onClick={handleAddCompany} variant="default">
            <Plus />
            Add Company
          </Button>
        }
      />
      <PageTabs tabs={tabs} />
      <PageContainer>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              {isSuccess && (
                <Text as="p" size="sm" tone="muted">
                  <Text as="span" weight="medium">
                    {data.length}
                  </Text>{" "}
                  of{" "}
                  <Text as="span" weight="medium">
                    {count}
                  </Text>{" "}
                  companies loaded
                </Text>
              )}
            </div>
          </div>

          <div>
            {isLoading ? (
              <div className="p-8 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 flex-1" />
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : data.length === 0 ? (
              <div className="p-12 text-center">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No companies found
                </h3>
                <Text tone="muted" className="mb-4">
                  Get started by adding your first company.
                </Text>
                <Button onClick={handleAddCompany} variant="default">
                  <Plus />
                  Add Company
                </Button>
              </div>
            ) : (
              <GenericEditableTable
                data={data}
                columns={columns}
                onUpdate={updateCompany as any}
                onDelete={deleteCompany as any}
                className="border-0"
              />
            )}
          </div>

          {isSuccess && hasMore && (
            <div className="text-center">
              <Button
                onClick={fetchNextPage}
                disabled={isFetching}
                variant="outline"
                size="lg"
              >
                {isFetching ? "Loading..." : "Load More Companies"}
              </Button>
            </div>
          )}
        </div>
      </PageContainer>

      <CompanyFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        company={editingCompany}
        onSuccess={handleDialogSuccess}
      />
    </>
  );
}
