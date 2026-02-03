"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/layout/page-header-unified";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageTabs } from "@/components/layout/PageTabs";
import { Text } from "@/components/ui/text";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getDirectoryTabs } from "@/config/directory-tabs";
import type { Database } from "@/types/database.types";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";

type Company = Database["public"]["Tables"]["companies"]["Row"];
type ProjectCompany = Database["public"]["Tables"]["project_companies"]["Row"];
type Person = Database["public"]["Tables"]["people"]["Row"];

interface ClientWithDetails extends ProjectCompany {
  company: Company | null;
  primary_contact: Person | null;
}

export default function DirectoryClientsPage() {
  const pathname = usePathname();
  const [clients, setClients] = React.useState<ClientWithDetails[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchClients = React.useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("project_companies")
        .select(
          `
          *,
          company:companies(*),
          primary_contact:people!project_companies_primary_contact_id_fkey(*)
        `,
        )
        .eq("company_type", "client")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleAddClient = () => {
    // TODO: Open add client dialog
    // Add client functionality pending implementation
  };

  const tableData = React.useMemo(() => {
    return clients.map((client) => ({
      id: client.id,
      name: client.company?.name || "Unnamed Client",
      email: client.email_address || "",
      phone: client.business_phone || "",
      address: client.company?.address || "",
      city: client.company?.city || "",
      state: client.company?.state || "",
      primary_contact: client.primary_contact
        ? `${client.primary_contact.first_name || ""} ${client.primary_contact.last_name || ""}`.trim()
        : "",
      primary_contact_email: client.primary_contact?.email || "",
      status: client.status || "active",
      created_at: client.created_at,
    }));
  }, [clients]);

  const tableConfig: GenericTableConfig = {
    columns: [
      {
        id: "name",
        label: "Client Name",
        defaultVisible: true,
        isPrimary: true,
        type: "text",
      },
      {
        id: "primary_contact",
        label: "Primary Contact",
        defaultVisible: true,
        type: "text",
      },
      {
        id: "email",
        label: "Email",
        defaultVisible: true,
        type: "email",
      },
      {
        id: "phone",
        label: "Phone",
        defaultVisible: true,
        type: "text",
      },
      {
        id: "city",
        label: "City",
        defaultVisible: true,
        type: "text",
      },
      {
        id: "state",
        label: "State",
        defaultVisible: true,
        type: "text",
      },
      {
        id: "status",
        label: "Status",
        defaultVisible: true,
        type: "badge",
      },
      {
        id: "created_at",
        label: "Created",
        defaultVisible: true,
        type: "date",
      },
    ],
    searchFields: ["name", "primary_contact", "email", "city"],
    exportFilename: "clients.csv",
    enableViewSwitcher: false,
    defaultViewMode: "table",
    enableRowSelection: true,
    editConfig: {
      tableName: "project_companies",
      editableFields: ["email_address", "business_phone", "status"],
    },
    onDelete: true,
  };

  const tabs = getDirectoryTabs(pathname);

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Directory"
          description="Manage companies, clients, contacts, users, and employees across your organization"
          showProjectName={false}
        />
        <PageTabs tabs={tabs} />
        <PageContainer>
          <div className="flex justify-center items-center py-12">
            <div className="text-center space-y-4">
              <Skeleton className="h-12 w-12 rounded-full mx-auto" />
              <Text tone="muted">Loading clients...</Text>
            </div>
          </div>
        </PageContainer>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader
          title="Directory"
          description="Manage companies, clients, contacts, users, and employees across your organization"
          showProjectName={false}
        />
        <PageTabs tabs={tabs} />
        <PageContainer>
          <div className="text-center py-12">
            <Text tone="destructive">
              Error loading clients: {error.message}
            </Text>
          </div>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Company Directory: Clients"
        description="Manage companies, clients, contacts, users, and employees across your organization"
        showProjectName={false}
        actions={
          <Button
            onClick={handleAddClient}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Client
          </Button>
        }
      />
      <PageTabs tabs={tabs} />
      <PageContainer>
        <GenericDataTable data={tableData} config={tableConfig} />
      </PageContainer>
    </>
  );
}
