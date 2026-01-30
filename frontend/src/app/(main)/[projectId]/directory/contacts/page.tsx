"use client";

import * as React from "react";
import { useParams, usePathname } from "next/navigation";
import { UserPlus, Users, Mail, Phone, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectPageHeader } from "@/components/layout/ProjectPageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageTabs } from "@/components/layout/PageTabs";
import { Text } from "@/components/ui/text";
import { getProjectDirectoryTabs } from "@/config/directory-tabs";
import { useContacts, type Contact } from "@/hooks/use-contacts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

function ContactsTableSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-3 w-[150px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ContactsTable({ contacts }: { contacts: Contact[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Department</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => {
            const fullName = [contact.first_name, contact.last_name]
              .filter(Boolean)
              .join(" ") || "Unnamed";

            return (
              <TableRow key={contact.id}>
                <TableCell className="font-medium">{fullName}</TableCell>
                <TableCell>
                  {contact.email ? (
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex items-center gap-1 text-brand hover:underline"
                    >
                      <Mail className="h-3 w-3" />
                      {contact.email}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {(contact.phone_business || contact.phone_mobile) ? (
                    <a
                      href={`tel:${contact.phone_business || contact.phone_mobile}`}
                      className="flex items-center gap-1 text-brand hover:underline"
                    >
                      <Phone className="h-3 w-3" />
                      {contact.phone_business || contact.phone_mobile}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>{contact.job_title || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  {contact.business_unit ? (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      {contact.business_unit}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default function ProjectDirectoryContactsPage() {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.projectId as string;

  const { contacts, isLoading, error, refetch } = useContacts({ projectId });

  const handleAddContact = () => {
    // TODO: Open add contact modal
  };

  const tabs = getProjectDirectoryTabs(projectId, pathname);

  if (error) {
    return (
      <>
        <ProjectPageHeader
          title="Directory"
          description="Manage contacts for this project"
          actions={
            <Button onClick={handleAddContact} className="bg-brand hover:bg-brand/90">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          }
        />
        <PageTabs tabs={tabs} />
        <PageContainer>
          <Alert variant="destructive">
            <AlertDescription>
              Error loading contacts: {error.message}
            </AlertDescription>
          </Alert>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <ProjectPageHeader
        title="Directory"
        description="Manage contacts for this project"
        actions={
          <Button onClick={handleAddContact} className="bg-brand hover:bg-brand/90">
            <UserPlus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        }
      />
      <PageTabs tabs={tabs} />
      <PageContainer>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              {contacts.length > 0 && (
                <Text as="p" size="sm" tone="muted">
                  <Text as="span" weight="medium">
                    {contacts.length}
                  </Text>{" "}
                  contact{contacts.length === 1 ? "" : "s"}
                </Text>
              )}
            </div>
          </div>

          <div>
            {isLoading ? (
              <ContactsTableSkeleton />
            ) : contacts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Contacts</h3>
                  <p className="text-muted-foreground mb-4 max-w-sm">
                    No contacts have been added yet. Add contacts to manage your
                    project team and stakeholders.
                  </p>
                  <Button onClick={handleAddContact} className="bg-brand hover:bg-brand/90">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Contact
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <ContactsTable contacts={contacts} />
            )}
          </div>
        </div>
      </PageContainer>
    </>
  );
}
