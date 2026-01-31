"use client";

import * as React from "react";
import { useParams, usePathname } from "next/navigation";
import { UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectPageHeader } from "@/components/layout/ProjectPageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageTabs } from "@/components/layout/PageTabs";
import { Text } from "@/components/ui/text";
import { ResponsiveAuthUsersTable } from "@/components/directory/responsive/ResponsiveAuthUsersTable";
import { UserListSkeleton } from "@/components/directory/skeletons/UserListSkeleton";
import { getProjectDirectoryTabs } from "@/config/directory-tabs";
import { useAuthUsers, type AuthUser } from "@/hooks/use-auth-users";
import { UserFormDialog } from "@/components/directory/UserFormDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ProjectDirectoryUsersPage() {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.projectId as string;
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const { users, isLoading, error, refetch } = useAuthUsers(projectId);

  const handleAddUser = () => {
    setIsDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    refetch();
  };

  const handleEditUser = (_user: AuthUser) => {
    // TODO: Open edit user modal with auth user data
  };

  const handleDeactivateUser = async (_user: AuthUser) => {
    // TODO: Implement deactivate auth user
  };

  const handleResendInvite = async (_user: AuthUser) => {
    // TODO: Implement resend invite for auth user
  };

  const tabs = getProjectDirectoryTabs(projectId, pathname);

  if (error) {
    return (
      <>
        <ProjectPageHeader
          title="Directory"
          description="Manage authenticated users for this project"
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
        title="Directory"
        description="Manage authenticated users for this project"
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
                  authenticated user{users.length === 1 ? "" : "s"}
                </Text>
              )}
            </div>
          </div>

          <div>
            {isLoading ? (
              <UserListSkeleton count={5} />
            ) : users.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Authenticated Users
                  </h3>
                  <p className="text-muted-foreground mb-4 max-w-sm">
                    No users with authenticated accounts found for this project.
                    Users need to sign up and be added to the project directory.
                  </p>
                  <Button onClick={handleAddUser} variant="default">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add User
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <ResponsiveAuthUsersTable
                users={users}
                onEdit={handleEditUser}
                onDeactivate={handleDeactivateUser}
                onResendInvite={handleResendInvite}
              />
            )}
          </div>
        </div>
      </PageContainer>

      <UserFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        projectId={projectId}
        onSuccess={handleDialogSuccess}
      />

      {/* Debug Banner */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 text-zinc-300 text-xs px-4 py-2 font-mono border-t border-zinc-700">
          <span className="text-zinc-500">Tables:</span>{" "}
          <span className="text-blue-400">users_auth</span> →
          <span className="text-green-400">people</span> →
          <span className="text-yellow-400">project_directory_memberships</span>
          <span className="mx-3 text-zinc-600">|</span>
          <span className="text-zinc-500">Project:</span>{" "}
          <span className="text-white">{projectId}</span>
          <span className="mx-3 text-zinc-600">|</span>
          <span className="text-zinc-500">Results:</span>{" "}
          <span
            className={users.length > 0 ? "text-green-400" : "text-red-400"}
          >
            {isLoading ? "loading..." : `${users.length} users`}
          </span>
          {error && (
            <>
              <span className="mx-3 text-zinc-600">|</span>
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
