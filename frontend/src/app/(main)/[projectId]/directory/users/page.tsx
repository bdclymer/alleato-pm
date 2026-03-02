import { ProjectPageHeader } from "@/components/layout";
"use client";

import * as React from "react";
import { useParams, usePathname } from "next/navigation";
import { UserPlus, Users, Mail, Shield, MoreHorizontal, UserX, RefreshCw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageTabs } from "@/components/layout/PageTabs";
import { Text } from "@/components/ui/text";
import { getProjectDirectoryTabs } from "@/config/directory-tabs";
import { useProjectUsers } from "@/hooks/use-project-users";
import { UserFormDialog } from "@/components/domain/users/UserFormDialog";
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

function UsersTableSkeleton() {
  return (
    <div className="space-y-4">
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

export default function ProjectDirectoryUsersPage() {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.projectId as string;
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editUser, setEditUser] = React.useState<PersonWithDetails | null>(null);

  const { users, isLoading, error, refetch } = useProjectUsers(projectId);

  const handleAddUser = () => {
    setEditUser(null);
    setIsDialogOpen(true);
  };

  const handleEditUser = (user: PersonWithDetails) => {
    setEditUser(user);
    setIsDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    refetch();
  };

  const tabs = getProjectDirectoryTabs(projectId, pathname);

  if (error) {
    return (
      <>
        <ProjectPageHeader
          title="Project Directory - Users"
          description="Manage users for this project"
          actions={
            <Button onClick={handleAddUser} variant="default">
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          }
        />
        <PageTabs tabs={tabs} />
        <PageContainer>
          <Alert variant="destructive">
            <AlertDescription>
              Error loading users: {error.message}
            </AlertDescription>
          </Alert>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <ProjectPageHeader
        title="Project Directory - Users"
        description="Manage users for this project"
        actions={
          <Button onClick={handleAddUser} variant="default">
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        }
      />
      <PageTabs tabs={tabs} />
      <PageContainer>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              {users.length > 0 && (
                <Text as="p" size="sm" tone="muted">
                  <Text as="span" weight="medium">
                    {users.length}
                  </Text>{" "}
                  user{users.length === 1 ? "" : "s"}
                </Text>
              )}
            </div>
          </div>

          <div>
            {isLoading ? (
              <UsersTableSkeleton />
            ) : users.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Users</h3>
                  <h3 className="text-lg font-semibold mb-2">
                    No Authenticated Users
                  </h3>
                  <p className="text-muted-foreground mb-4 max-w-sm">
                    No users have been added to this project yet.
                    Add users to manage your project team.
                  </p>
                  <Button onClick={handleAddUser} variant="default">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add User
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead className="hidden lg:table-cell">Company</TableHead>
                      <TableHead className="hidden lg:table-cell">Permission</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const initials = `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() || "U";
                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center space-x-4">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">
                                  {user.first_name} {user.last_name}
                                </p>
                                {user.job_title && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {user.job_title}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground truncate md:hidden">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {user.email ? (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">{user.email}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="text-sm text-muted-foreground">
                              {user.company?.name || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {user.permission_template ? (
                              <div className="flex items-center gap-1">
                                <Shield className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{user.permission_template.name}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(user.membership)}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Edit User
                                </DropdownMenuItem>
                                {(user.membership?.invite_status === "not_invited" || user.membership?.invite_status === "invited") && (
                                  <DropdownMenuItem>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    {user.membership?.invite_status === "not_invited" ? "Send Invite" : "Resend Invite"}
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
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        projectId={projectId}
        user={editUser ? {
          id: editUser.id,
          first_name: editUser.first_name,
          last_name: editUser.last_name,
          email: editUser.email,
          phone_mobile: editUser.phone_mobile,
          phone_business: editUser.phone_business,
          job_title: editUser.job_title,
          company_id: editUser.company_id,
          membership: editUser.membership ? {
            permission_template_id: editUser.membership.permission_template_id,
          } : undefined,
        } : null}
        onSuccess={handleDialogSuccess}
      />

      {/* Debug Banner */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-0 left-0 right-0 bg-foreground text-background/90 text-xs px-4 py-2 font-mono border-t border-border/20">
          <span className="text-background/60">Tables:</span>{" "}
          <span className="text-blue-400">users_auth</span> →
          <span className="text-green-400">people</span> →
          <span className="text-yellow-400">project_directory_memberships</span>
          <span className="mx-4 text-background/50">|</span>
          <span className="text-background/60">Project:</span>{" "}
          <span className="text-white">{projectId}</span>
          <span className="mx-4 text-background/50">|</span>
          <span className="text-background/60">Results:</span>{" "}
          <span
            className={users.length > 0 ? "text-green-400" : "text-red-400"}
          >
            {isLoading ? "loading..." : `${users.length} users`}
          </span>
          {error && (
            <>
              <span className="mx-4 text-background/50">|</span>
              <span className="text-red-400">
                Error: {(error as Error).message}
              </span>
            </>
          )}
        </div>
      )}
    </>
  );
}
