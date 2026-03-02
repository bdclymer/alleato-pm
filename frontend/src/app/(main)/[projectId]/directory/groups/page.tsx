import { ProjectPageHeader } from "@/components/layout";
"use client";

import * as React from "react";
import { useParams, usePathname } from "next/navigation";
import { Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageTabs } from "@/components/layout/PageTabs";
import { Text } from "@/components/ui/text";
import { ResponsiveDistributionGroupsTable } from "@/components/directory/responsive/ResponsiveDistributionGroupsTable";
import { DistributionGroupListSkeleton } from "@/components/directory/skeletons/DistributionGroupListSkeleton";
import { EmptyDistributionGroups } from "@/components/directory/empty-states/EmptyDistributionGroups";
import { getProjectDirectoryTabs } from "@/config/directory-tabs";
import { useDistributionGroups } from "@/hooks/use-distribution-groups";

export default function ProjectDirectoryGroupsPage() {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.projectId as string;

  const { groups, isLoading, error } = useDistributionGroups(
    projectId,
    true,
    "active",
  );

  const handleAddGroup = () => {
    // TODO: Open add group modal
    };

  const handleEditGroup = (group: unknown) => {
    // TODO: Open edit group modal
    };

  const handleDeleteGroup = async (group: unknown) => {
    // TODO: Implement delete group
    };

  const handleManageMembers = (group: unknown) => {
    // TODO: Open manage members modal
    };

  const tabs = getProjectDirectoryTabs(projectId, pathname);

  if (error) {
    return (
      <>
        <ProjectPageHeader
          title="Directory"
          description="Manage companies and team members for this project"
          actions={
            <Button onClick={handleAddGroup} variant="default">
              <Users2 className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          }
        />
        <PageTabs tabs={tabs} />
        <PageContainer>
          <div className="text-center py-12">
            <h2 className="text-xl font-bold mb-4">Error Loading Groups</h2>
            <Text tone="destructive">{error.message}</Text>
          </div>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <ProjectPageHeader
        title="Directory"
        description="Manage companies and team members for this project"
        actions={
          <Button onClick={handleAddGroup} variant="default">
            <Users2 className="mr-2 h-4 w-4" />
            Create Group
          </Button>
        }
      />
      <PageTabs tabs={tabs} />
      <PageContainer>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              {groups.length > 0 && (
                <Text as="p" size="sm" tone="muted">
                  <Text as="span" weight="medium">
                    {groups.length}
                  </Text>{" "}
                  distribution groups
                </Text>
              )}
            </div>
          </div>

          <div>
            {isLoading ? (
              <DistributionGroupListSkeleton count={5} />
            ) : groups.length === 0 ? (
              <EmptyDistributionGroups onAddGroup={handleAddGroup} />
            ) : (
              <ResponsiveDistributionGroupsTable
                groups={groups}
                onEdit={handleEditGroup}
                onDelete={handleDeleteGroup}
                onManageMembers={handleManageMembers}
              />
            )}
          </div>
        </div>
      </PageContainer>
    </>
  );
}
