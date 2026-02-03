"use client";

import * as React from "react";
import { useParams, usePathname } from "next/navigation";
import { UserPlus, Users, Mail, Phone, Building2, MoreHorizontal, UserX, Eye, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header-unified";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageTabs } from "@/components/layout/PageTabs";
import { Text } from "@/components/ui/text";
import { useProjectUsers } from "@/hooks/use-project-users";
import { UserFormDialog } from "@/components/domain/users/UserFormDialog";
import { ProjectContactFormDialog } from "@/components/domain/contacts/ProjectContactFormDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import type { PersonWithDetails } from "@/services/directoryService";
import type { TabConfig } from "@/components/templates/data-table-page";

function DirectoryTableSkeleton() {
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

function getStatusBadge(membership: PersonWithDetails["membership"]) {
  const status = membership?.status || "inactive";
  const inviteStatus = membership?.invite_status;

  if (status === "inactive") {
    return <Badge variant="secondary">Inactive</Badge>;
  }
  if (inviteStatus === "not_invited") {
    return <Badge variant="outline">Not Invited</Badge>;
  }
  if (inviteStatus === "invited") {
    return <Badge variant="outline">Invite Sent</Badge>;
  }
  return <Badge variant="default">Active</Badge>;
}

function getUserTypeBadge(personType: string | null) {
  if (personType === "employee") {
    return <Badge variant="default">User</Badge>;
  }
  return <Badge variant="secondary">Contact</Badge>;
}

export default function ProjectDirectoryAllPage() {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.projectId as string;
  const [isUserDialogOpen, setIsUserDialogOpen] = React.useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = React.useState(false);
  const [editPerson, setEditPerson] = React.useState<PersonWithDetails | null>(null);

  // Fetch both users and contacts
  const { users: allUsers, isLoading: usersLoading, error: usersError, refetch: refetchUsers } = useProjectUsers(projectId);
  const { users: contacts, isLoading: contactsLoading, error: contactsError, refetch: refetchContacts } = useProjectUsers(projectId, { type: "contact" });

  // Combine users and contacts
  const allPeople = React.useMemo(() => {
    return [...allUsers, ...contacts].sort((a, b) => {
      const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
      const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [allUsers, contacts]);

  const isLoading = usersLoading || contactsLoading;
  const error = usersError || contactsError;

  const handleAddUser = () => {
    setEditPerson(null);
    setIsUserDialogOpen(true);
  };

  const handleAddContact = () => {
    setEditPerson(null);
    setIsContactDialogOpen(true);
  };

  const handleEditPerson = (person: PersonWithDetails) => {
    setEditPerson(person);
    if (person.person_type === "employee") {
      setIsUserDialogOpen(true);
    } else {
      setIsContactDialogOpen(true);
    }
  };

  const handleDialogSuccess = () => {
    refetchUsers();
    refetchContacts();
  };

  // Custom tabs for the unified view
  const tabs: TabConfig[] = [
    {
      label: "All",
      href: `/${projectId}/directory/all`,
      isActive: pathname === `/${projectId}/directory/all`,
    },
    {
      label: "Companies",
      href: `/${projectId}/directory/companies`,
      isActive: pathname === `/${projectId}/directory/companies`,
    },
    {
      label: "Distribution Groups",
      href: `/${projectId}/directory/groups`,
      isActive: pathname === `/${projectId}/directory/groups`,
    },
  ];

  if (error) {
    return (
      <>
        <PageHeader
          title="Directory"
          description="Manage all people in this project"
          actions={
            <div className="flex gap-2">
              <Button onClick={handleAddContact} variant="secondary">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Contact
              </Button>
              <Button onClick={handleAddUser} variant="default">
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </div>
          }
        />
        <PageTabs tabs={tabs} />
        <PageContainer>
          <Alert variant="destructive">
            <AlertDescription>
              Error loading directory: {error.message}
            </AlertDescription>
          </Alert>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Directory"
        description="Manage all people in this project"
        actions={
          <div className="flex gap-2">
            <Button onClick={handleAddContact} variant="secondary">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
            <Button onClick={handleAddUser} variant="default">
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        }
      />
      <PageTabs tabs={tabs} />
      <PageContainer>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              {allPeople.length > 0 && (
                <Text as="p" size="sm" tone="muted">
                  <Text as="span" weight="medium">
                    {allPeople.length}
                  </Text>{" "}
                  {allPeople.length === 1 ? "person" : "people"} ({allUsers.length} user{allUsers.length === 1 ? "" : "s"}, {contacts.length} contact{contacts.length === 1 ? "" : "s"})
                </Text>
              )}
            </div>
          </div>

          <div>
            {isLoading ? (
              <DirectoryTableSkeleton />
            ) : allPeople.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No People</h3>
                  <p className="text-muted-foreground mb-4 max-w-sm">
                    No users or contacts have been added to this project yet.
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={handleAddContact} variant="secondary">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Contact
                    </Button>
                    <Button onClick={handleAddUser} variant="default">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add User
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead className="hidden lg:table-cell">Company</TableHead>
                      <TableHead className="hidden lg:table-cell">Permission</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allPeople.map((person) => {
                      const initials = `${person.first_name?.[0] || ""}${person.last_name?.[0] || ""}`.toUpperCase() || "U";
                      const isUser = person.person_type === "employee";

                      return (
                        <TableRow key={person.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className={isUser ? "bg-primary/10 text-primary" : "bg-secondary/50 text-secondary-foreground"}>
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">
                                  {person.first_name} {person.last_name}
                                </p>
                                {person.job_title && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {person.job_title}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground truncate md:hidden">
                                  {person.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getUserTypeBadge(person.person_type)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {person.email ? (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">{person.email}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="text-sm text-muted-foreground">
                              {person.company?.name || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {person.permission_template ? (
                              <div className="flex items-center gap-1">
                                <Shield className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{person.permission_template.name}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(person.membership)}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditPerson(person)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Edit {isUser ? "User" : "Contact"}
                                </DropdownMenuItem>
                                {isUser && (person.membership?.invite_status === "not_invited" || person.membership?.invite_status === "invited") && (
                                  <DropdownMenuItem>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    {person.membership?.invite_status === "not_invited" ? "Send Invite" : "Resend Invite"}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">
                                  <UserX className="mr-2 h-4 w-4" />
                                  Remove from Project
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </PageContainer>

      <UserFormDialog
        open={isUserDialogOpen}
        onOpenChange={setIsUserDialogOpen}
        projectId={projectId}
        user={editPerson && editPerson.person_type === "employee" ? {
          id: editPerson.id,
          first_name: editPerson.first_name,
          last_name: editPerson.last_name,
          email: editPerson.email,
          phone_mobile: editPerson.phone_mobile,
          phone_business: editPerson.phone_business,
          job_title: editPerson.job_title,
          company_id: editPerson.company_id,
          membership: editPerson.membership ? {
            permission_template_id: editPerson.membership.permission_template_id,
          } : undefined,
        } : null}
        onSuccess={handleDialogSuccess}
      />

      <ProjectContactFormDialog
        open={isContactDialogOpen}
        onOpenChange={setIsContactDialogOpen}
        projectId={projectId}
        onSuccess={handleDialogSuccess}
      />
    </>
  );
}