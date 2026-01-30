"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  Users,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { ProjectPageHeader } from "@/components/layout/ProjectPageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageTabs } from "@/components/layout/PageTabs";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/tables/DataTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getDirectoryTabs } from "@/config/directory-tabs";
import {
  useDistributionGroups,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
} from "@/hooks/use-distribution-groups";
import type { DistributionGroupWithMembers } from "@/services/distributionGroupService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DistributionGroupsPage() {
  const pathname = usePathname();
  const [projectId, setProjectId] = React.useState("1");

  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [editingGroup, setEditingGroup] =
    React.useState<DistributionGroupWithMembers | null>(null);
  const [deletingGroup, setDeletingGroup] =
    React.useState<DistributionGroupWithMembers | null>(null);
  const [newGroupName, setNewGroupName] = React.useState("");
  const [newGroupDescription, setNewGroupDescription] = React.useState("");

  const { groups, isLoading, error, refetch } =
    useDistributionGroups(projectId);
  const createMutation = useCreateGroup(projectId);
  const updateMutation = useUpdateGroup(projectId);
  const deleteMutation = useDeleteGroup(projectId);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    await createMutation.mutateAsync({
      name: newGroupName.trim(),
      description: newGroupDescription.trim() || undefined,
    });

    setNewGroupName("");
    setNewGroupDescription("");
    setIsAddDialogOpen(false);
    refetch();
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup || !newGroupName.trim()) return;

    await updateMutation.mutateAsync({
      groupId: editingGroup.id,
      data: {
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
      },
    });

    setNewGroupName("");
    setNewGroupDescription("");
    setEditingGroup(null);
    refetch();
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroup) return;

    await deleteMutation.mutateAsync(deletingGroup.id);
    setDeletingGroup(null);
    refetch();
  };

  const openEditDialog = (group: DistributionGroupWithMembers) => {
    setNewGroupName(group.name);
    setNewGroupDescription(group.description || "");
    setEditingGroup(group);
  };

  const columns: ColumnDef<DistributionGroupWithMembers>[] = [
    {
      accessorKey: "name",
      header: "Group Name",
      cell: ({ row }) => {
        const group = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <Text as="span" weight="medium">
              {group.name}
            </Text>
          </div>
        );
      },
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => {
        const group = row.original;
        return (
          <Text as="span" size="sm" tone="muted">
            {group.description || "-"}
          </Text>
        );
      },
    },
    {
      accessorKey: "member_count",
      header: "Members",
      cell: ({ row }) => {
        const group = row.original;
        return (
          <Badge variant="outline">
            {group.member_count || 0} member
            {(group.member_count || 0) !== 1 ? "s" : ""}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const group = row.original;
        return (
          <Badge variant={group.status === "active" ? "active" : "inactive"}>
            {group.status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => {
        const group = row.original;
        if (!group.created_at)
          return (
            <Text as="span" tone="muted">
              -
            </Text>
          );
        return (
          <Text as="span" size="sm" tone="muted">
            {new Date(group.created_at).toLocaleDateString()}
          </Text>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const group = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditDialog(group)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Group
              </DropdownMenuItem>
              <DropdownMenuItem>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Members
              </DropdownMenuItem>
              <DropdownMenuItem>
                <UserMinus className="mr-2 h-4 w-4" />
                Manage Members
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeletingGroup(group)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

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
              <Text tone="muted">Loading distribution groups...</Text>
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
              Error loading groups: {error.message}
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
        <div className="space-y-6">
          {/* Project Selector and Actions Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Text as="span" size="sm" weight="medium">
                  Project:
                </Text>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Goodwill Bart</SelectItem>
                    {/* TODO: Load projects dynamically from API */}
                  </SelectContent>
                </Select>
              </div>
              <Text as="p" size="sm" tone="muted">
                <Text as="span" weight="medium">
                  {groups.length}
                </Text>{" "}
                distribution group{groups.length !== 1 ? "s" : ""}
              </Text>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Distribution Group
            </Button>
          </div>

          {/* Groups Table */}
          {groups.length === 0 ? (
            <div className="p-12 text-center border border-dashed rounded-lg">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No distribution groups found
              </h3>
              <Text tone="muted" className="mb-4">
                Create distribution groups to easily send communications to
                multiple users at once.
              </Text>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Distribution Group
              </Button>
            </div>
          ) : (
            <div className="bg-card rounded-lg shadow border border-border">
              <DataTable
                columns={columns}
                data={groups}
                searchKey="name"
                searchPlaceholder="Search groups..."
              />
            </div>
          )}
        </div>
      </PageContainer>

      {/* Add Group Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Distribution Group</DialogTitle>
            <DialogDescription>
              Create a new distribution group for mass communication.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name *</Label>
              <Input
                id="name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter group name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="Enter description (optional)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog
        open={!!editingGroup}
        onOpenChange={(open) => !open && setEditingGroup(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Distribution Group</DialogTitle>
            <DialogDescription>
              Update the group name and description.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Group Name *</Label>
              <Input
                id="edit-name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter group name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="Enter description (optional)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGroup(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateGroup}
              disabled={!newGroupName.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingGroup}
        onOpenChange={(open) => !open && setDeletingGroup(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Distribution Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingGroup?.name}"? This
              action cannot be undone. All members will be removed from this
              group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Group"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
