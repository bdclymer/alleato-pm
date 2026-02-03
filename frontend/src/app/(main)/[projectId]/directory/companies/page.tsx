"use client";

import * as React from "react";
import { useParams, usePathname } from "next/navigation";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";
import { useProjectCompanies } from "@/hooks/use-project-companies";
import { PageHeader } from "@/components/layout/page-header-unified";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageTabs } from "@/components/layout/PageTabs";
import { getProjectDirectoryTabs } from "@/config/directory-tabs";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, Building2, Users, Users2, Upload } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const config: GenericTableConfig = {
  searchFields: ["company.name", "business_phone", "email_address"],
  exportFilename: "companies-export.csv",
  editConfig: {
    tableName: "project_companies",
    editableFields: [
      "business_phone",
      "email_address",
      "company_type",
      "status"
    ],
  },
  columns: [
    {
      id: "company.name",
      label: "Company Name",
      defaultVisible: true,
      type: "text",
      isPrimary: true,
    },
    {
      id: "company_type",
      label: "Type",
      defaultVisible: true,
      renderConfig: {
        type: "badge",
        variantMap: {
          "YOUR_COMPANY": "default",
          "VENDOR": "outline",
          "SUBCONTRACTOR": "secondary",
          "SUPPLIER": "outline",
          "CONNECTED_COMPANY": "outline",
        },
        defaultVariant: "outline",
      },
    },
    {
      id: "status",
      label: "Status",
      defaultVisible: true,
      renderConfig: {
        type: "badge",
        variantMap: {
          "ACTIVE": "default",
          "INACTIVE": "destructive",
        },
        defaultVariant: "outline",
      },
    },
    {
      id: "business_phone",
      label: "Phone",
      defaultVisible: true,
      type: "text",
    },
    {
      id: "email_address",
      label: "Email",
      defaultVisible: true,
      type: "text",
    },
    {
      id: "company.address",
      label: "Address",
      defaultVisible: false,
      type: "text",
    },
    {
      id: "company.city",
      label: "City",
      defaultVisible: false,
      type: "text",
    },
    {
      id: "company.state",
      label: "State",
      defaultVisible: false,
      type: "text",
    },
    {
      id: "company.website",
      label: "Website",
      defaultVisible: false,
      type: "text",
    },
    {
      id: "user_count",
      label: "Users",
      defaultVisible: true,
      type: "text",
    },
    {
      id: "created_at",
      label: "Added",
      defaultVisible: false,
      type: "date",
    },
  ],
  filters: [
    {
      id: "company_type",
      label: "Type",
      field: "company_type",
      options: [
        { value: "YOUR_COMPANY", label: "Your Company" },
        { value: "VENDOR", label: "Vendor" },
        { value: "SUBCONTRACTOR", label: "Subcontractor" },
        { value: "SUPPLIER", label: "Supplier" },
        { value: "CONNECTED_COMPANY", label: "Connected Company" },
      ],
    },
    {
      id: "status",
      label: "Status",
      field: "status",
      options: [
        { value: "ACTIVE", label: "Active" },
        { value: "INACTIVE", label: "Inactive" },
      ],
    },
  ],
  enableViewSwitcher: true,
  enableRowSelection: true,
  enableSorting: true,
};

export default function ProjectDirectoryCompaniesPage() {
  // Page loaded
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.projectId as string;

  const {
    companies,
    pagination,
    isLoading,
    error,
  } = useProjectCompanies(projectId, {
    page: 1,
    per_page: 50,
    sort: "company.name",
    status: "ACTIVE",
  });

  const handleAddUser = () => {
    // TODO: Open add user modal
  };

  const handleAddCompany = () => {
    // TODO: Open add company modal
  };

  const handleAddDistributionGroup = () => {
    // TODO: Open add distribution group modal
  };

  const handleBulkAddFromDirectory = () => {
    // TODO: Open bulk add from company directory modal
  };

  const tabs = getProjectDirectoryTabs(projectId, pathname);

  if (error) {
    return (
      <>
        <PageHeader
          title="Project Directory"
          description="Manage companies and team members for this project"
          actions={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default">
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleAddUser}>
                  <Users className="mr-2 h-4 w-4" />
                  Add User
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleAddCompany}>
                  <Building2 className="mr-2 h-4 w-4" />
                  Add Company
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleAddDistributionGroup}>
                  <Users2 className="mr-2 h-4 w-4" />
                  Add Distribution Group
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBulkAddFromDirectory}>
                  <Upload className="mr-2 h-4 w-4" />
                  Bulk Add from Company Directory
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />
        <PageTabs tabs={tabs} />
        <PageContainer>
          <div className="text-center py-12">
            <h2 className="text-xl font-bold mb-4">Error Loading Companies</h2>
            <p className="text-red-600">{error.message}</p>
          </div>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Project Directory"
        description="Manage companies and team members for this project"
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default">
                <Plus className="mr-2 h-4 w-4" />
                Add
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleAddUser}>
                <Users className="mr-2 h-4 w-4" />
                Add User
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddCompany}>
                <Building2 className="mr-2 h-4 w-4" />
                Add Company
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddDistributionGroup}>
                <Users2 className="mr-2 h-4 w-4" />
                Add Distribution Group
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleBulkAddFromDirectory}>
                <Upload className="mr-2 h-4 w-4" />
                Bulk Add from Company Directory
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      <PageTabs tabs={tabs} />
      <PageContainer>
        <GenericDataTable
          data={(companies || []) as any[]}
          config={config}
        />
      </PageContainer>
    </>
  );
}