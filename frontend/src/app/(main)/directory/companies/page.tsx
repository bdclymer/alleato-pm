"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";
import { useAllCompanies } from "@/hooks/use-all-companies";
import { ProjectPageHeader } from "@/components/layout/ProjectPageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageTabs } from "@/components/layout/PageTabs";
import { getDirectoryTabs } from "@/config/directory-tabs";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, Building2, Upload, FileSpreadsheet } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const config: GenericTableConfig = {
  searchFields: ["name", "website", "address", "city"],
  exportFilename: "all-companies-export.csv",
  editConfig: {
    tableName: "companies",
    editableFields: [
      "name",
      "address",
      "city",
      "state",
      "website",
      "title",
      "notes"
    ],
  },
  columns: [
    {
      id: "name",
      label: "Company Name",
      defaultVisible: true,
      type: "text",
      isPrimary: true,
    },
    {
      id: "title",
      label: "Title/Role",
      defaultVisible: true,
      type: "text",
    },
    {
      id: "website",
      label: "Website",
      defaultVisible: true,
      type: "text",
    },
    {
      id: "address",
      label: "Address",
      defaultVisible: false,
      type: "text",
    },
    {
      id: "city",
      label: "City",
      defaultVisible: false,
      type: "text",
    },
    {
      id: "state",
      label: "State",
      defaultVisible: false,
      type: "text",
    },
    {
      id: "notes",
      label: "Notes",
      defaultVisible: false,
      type: "text",
    },
    {
      id: "created_at",
      label: "Date Added",
      defaultVisible: false,
      type: "date",
    },
    {
      id: "updated_at",
      label: "Last Updated",
      defaultVisible: false,
      type: "date",
    },
  ],
  filters: [],
  enableViewSwitcher: true,
  enableRowSelection: true,
  enableSorting: true,
  rowClickPath: "/directory/companies/{id}",
};

export default function GlobalCompanyDirectoryPage() {
  const pathname = usePathname();
  const {
    companies,
    pagination,
    isLoading,
    error,
  } = useAllCompanies({
    page: 1,
    per_page: 50,
    sort: "name",
    status: "all",
  });

  const handleAddCompany = () => {
    // TODO: Implement add company dialog
  };

  const handleImportCompanies = () => {
    // TODO: Implement CSV import
  };

  const handleBulkOperations = () => {
    // TODO: Implement bulk operations
  };

  const tabs = getDirectoryTabs(pathname);

  if (error) {
    return (
      <>
        <ProjectPageHeader
          title="Company Directory"
          description="Manage companies, clients, contacts, users, and employees across your organization"
          showProjectName={false}
          actions={
            <Button variant="default" disabled>
              <Plus className="mr-2 h-4 w-4" />
              Add Company
            </Button>
          }
        />
        <PageTabs tabs={tabs} />
        <PageContainer>
          <div className="text-center py-12">
            <h2 className="text-xl font-bold mb-4">Error Loading Companies</h2>
            <p className="text-red-600">{error.message}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please try refreshing the page or contact support if the problem persists.
            </p>
          </div>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <ProjectPageHeader
        title="Company Directory: Companies"
        description="Manage companies, clients, contacts, users, and employees across your organization"
        showProjectName={false}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="default"
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleAddCompany}>
                <Building2 className="mr-2 h-4 w-4" />
                Add New Company
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleImportCompanies}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Import from CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleBulkOperations}>
                <Upload className="mr-2 h-4 w-4" />
                Bulk Operations
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      <PageTabs tabs={tabs} />
      <PageContainer>
        {isLoading ? (
          <div>Loading companies...</div>
        ) : (
          <GenericDataTable
            data={(companies || []) as any[]}
            config={config}
          />
        )}
      </PageContainer>
    </>
  );
}