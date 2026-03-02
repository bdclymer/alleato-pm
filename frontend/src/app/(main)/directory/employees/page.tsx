import { ProjectPageHeader } from "@/components/layout";
"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Mail, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageTabs } from "@/components/layout/PageTabs";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { getDirectoryTabs } from "@/config/directory-tabs";
import type { Database } from "@/types/database.types";

type Employee = Database["public"]["Tables"]["people"]["Row"];

export default function DirectoryEmployeesPage() {
  const pathname = usePathname();
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("people")
          .select("*")
          .eq("person_type", "user")
          .order("last_name", { ascending: true });

        if (error) throw error;
        setEmployees(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const columns: ColumnDef<Employee>[] = React.useMemo(
    () => [
      {
        accessorKey: "first_name",
        header: "Name",
        cell: ({ row }) => {
          const firstName = row.getValue("first_name") as string | null;
          const lastName = row.original.last_name;
          const fullName =
            [firstName, lastName].filter(Boolean).join(" ") ||
            "Unnamed Employee";
          const initials = [firstName?.[0], lastName?.[0]]
            .filter(Boolean)
            .join("");

          return (
            <div className="flex items-center gap-4">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-secondary text-secondary-foreground">
                  {initials || "E"}
                </AvatarFallback>
              </Avatar>
              <Text as="span" weight="medium" size="sm">
                {fullName}
              </Text>
            </div>
          );
        },
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => {
          const email = row.getValue("email") as string | null;
          return email ? (
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <Text as="span" size="sm" tone="muted">
                {email}
              </Text>
            </div>
          ) : (
            <Text as="span" tone="muted">
              -
            </Text>
          );
        },
      },
      {
        accessorKey: "phone_business",
        header: "Phone",
        cell: ({ row }) => {
          const phone = (row.getValue("phone_business") as string | null) || row.original.phone_mobile;
          return phone ? (
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <Text as="span" size="sm" tone="muted">
                {phone}
              </Text>
            </div>
          ) : (
            <Text as="span" tone="muted">
              -
            </Text>
          );
        },
      },
      {
        accessorKey: "job_title",
        header: "Job Title",
        cell: ({ row }) => {
          const title = row.getValue("job_title") as string | null;
          return title ? (
            <Badge variant="outline">{title}</Badge>
          ) : (
            <Text as="span" tone="muted">
              -
            </Text>
          );
        },
      },
      {
        accessorKey: "department",
        header: "Department",
        cell: ({ row }) => {
          const dept = row.getValue("department") as string | null;
          return dept ? (
            <Text as="span" size="sm">
              {dept}
            </Text>
          ) : (
            <Text as="span" tone="muted">
              -
            </Text>
          );
        },
      },
      {
        accessorKey: "start_date",
        header: "Start Date",
        cell: ({ row }) => {
          const date = row.getValue("start_date") as string | null;
          if (!date)
            return (
              <Text as="span" tone="muted">
                -
              </Text>
            );
          return (
            <Text as="span" size="sm" tone="muted">
              {new Date(date).toLocaleDateString()}
            </Text>
          );
        },
      },
    ],
    [],
  );

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
              <Text tone="muted">Loading employees...</Text>
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
          title="Directory"
          description="Manage companies, clients, contacts, users, and employees across your organization"
          showProjectName={false}
        />
        <PageTabs tabs={tabs} />
        <PageContainer>
          <div className="text-center py-12">
            <Text tone="destructive">
              Error loading employees: {error.message}
            </Text>
          </div>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <ProjectPageHeader
        title="Directory"
        description="Manage companies, clients, contacts, users, and employees across your organization"
        showProjectName={false}
      />
      <PageTabs tabs={tabs} />
      <PageContainer>
        <DataTable
          columns={columns}
          data={employees}
          searchKey="first_name"
          searchPlaceholder="Search employees..."
        />
      </PageContainer>
    </>
  );
}
