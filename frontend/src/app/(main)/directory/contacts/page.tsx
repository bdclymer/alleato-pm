"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ProjectPageHeader } from "@/components/layout/ProjectPageHeader";
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
import { ContactFormDialog } from "@/components/domain/contacts/ContactFormDialog";

type Contact = Database["public"]["Tables"]["people"]["Row"];
type Company = Database["public"]["Tables"]["companies"]["Row"];

interface ContactWithCompany extends Contact {
  company?: Company | null;
  auth_user_id?: string | null;
  is_admin?: boolean | null;
}

export default function DirectoryContactsPage() {
  const pathname = usePathname();
  const [contacts, setContacts] = React.useState<ContactWithCompany[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const fetchContacts = React.useCallback(async () => {
    try {
      const supabase = createClient();

      // Fetch people with their auth user and admin status
      const { data: peopleData, error: peopleError } = await supabase
        .from("people")
        .select(
          `
          *,
          company:companies(*)
        `
        )
        .order("last_name", { ascending: true });

      if (peopleError) throw peopleError;

      // For each person, try to get their auth_user_id and admin status
      const contactsWithAuth = await Promise.all(
        (peopleData || []).map(async (person) => {
          // Get auth link
          const { data: authLink } = await supabase
            .from("users_auth")
            .select("auth_user_id")
            .eq("person_id", person.id)
            .maybeSingle();

          // Get admin status if they have an auth account
          let isAdmin = null;
          if (authLink?.auth_user_id) {
            const { data: profile } = await supabase
              .from("user_profiles")
              .select("is_admin")
              .eq("id", authLink.auth_user_id)
              .maybeSingle();
            isAdmin = profile?.is_admin || false;
          }

          return {
            ...person,
            auth_user_id: authLink?.auth_user_id || null,
            is_admin: isAdmin,
          };
        })
      );

      setContacts(contactsWithAuth);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleAddContact = () => {
    setDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    fetchContacts();
  };

  const tableData = React.useMemo(() => {
    return contacts.map((contact) => ({
      id: contact.id,
      full_name:
        `${contact.first_name || ""} ${contact.last_name || ""}`.trim() ||
        "Unnamed Contact",
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email || "",
      phone: contact.phone_business || contact.phone_mobile || "",
      type: contact.person_type || "",
      company: contact.company?.name || "",
      created_at: contact.created_at,
      auth_user_id: contact.auth_user_id,
      is_admin: contact.is_admin,
    }));
  }, [contacts]);

  const tableConfig: GenericTableConfig = {
    columns: [
      {
        id: "full_name",
        label: "Name",
        defaultVisible: true,
        isPrimary: true,
        type: "text",
      },
      {
        id: "email",
        label: "Email",
        defaultVisible: true,
        type: "email",
      },
      {
        id: "type",
        label: "Type",
        defaultVisible: true,
        type: "text",
      },
      {
        id: "company",
        label: "Company",
        defaultVisible: true,
        type: "text",
      },
      {
        id: "phone",
        label: "Phone",
        defaultVisible: true,
        type: "text",
      },
      {
        id: "is_admin",
        label: "Admin Access",
        defaultVisible: true,
        type: "boolean",
      },
      {
        id: "created_at",
        label: "Created",
        defaultVisible: true,
        type: "date",
      },
    ],
    searchFields: ["full_name", "email", "phone", "company"],
    exportFilename: "contacts.csv",
    enableViewSwitcher: false,
    defaultViewMode: "table",
    enableRowSelection: true,
    editConfig: {
      tableName: "people",
      editableFields: ["first_name", "last_name", "email", "phone_business"],
    },
    onDelete: true,
  };

  const tabs = getDirectoryTabs(pathname);

  if (isLoading) {
    return (
      <>
        <ProjectPageHeader
          title="Directory"
          description="Manage companies, clients, contacts, users, and employees across your organization"
          showProjectName={false}
        />
        <PageTabs tabs={tabs} />
        <PageContainer>
          <div className="flex justify-center items-center py-12">
            <div className="text-center space-y-4">
              <Skeleton className="h-12 w-12 rounded-full mx-auto" />
              <Text tone="muted">Loading contacts...</Text>
            </div>
          </div>
        </PageContainer>
      </>
    );
  }

  if (error) {
    return (
      <>
        <ProjectPageHeader
          title="Company Directory"
          description="Manage companies, clients, contacts, users, and employees across your organization"
          showProjectName={false}
        />
        <PageTabs tabs={tabs} />
        <PageContainer>
          <div className="text-center py-12">
            <Text tone="destructive">
              Error loading contacts: {error.message}
            </Text>
          </div>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <ProjectPageHeader
        title="Company Directory: Contacts"
        description="Manage companies, clients, contacts, users, and employees across your organization"
        showProjectName={false}
        actions={
          <Button
            onClick={handleAddContact}
            className="bg-[hsl(var(--procore-orange))] hover:bg-[hsl(var(--procore-orange))]/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Contact
          </Button>
        }
      />
      <PageTabs tabs={tabs} />
      <PageContainer>
        <GenericDataTable data={tableData} config={tableConfig} />
      </PageContainer>

      <ContactFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleDialogSuccess}
      />
    </>
  );
}
