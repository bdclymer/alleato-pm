"use client";

import { type DistributionGroupWithMembers } from "@/services/distributionGroupService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ResponsiveDistributionGroupsTableProps {
  groups: DistributionGroupWithMembers[];
  onEdit?: (group: DistributionGroupWithMembers) => void;
  onDelete?: (group: DistributionGroupWithMembers) => void;
  onViewDetails?: (group: DistributionGroupWithMembers) => void;
  onManageMembers?: (group: DistributionGroupWithMembers) => void;
}

export function ResponsiveDistributionGroupsTable({
  groups,
  onEdit,
  onDelete,
  onViewDetails,
  onManageMembers,
}: ResponsiveDistributionGroupsTableProps) {
  return (
    <div className="space-y-3">
      {/* Desktop View - Hidden on mobile */}
      <div className="hidden md:block">
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left text-sm font-medium">
                  Group Name
                </th>
                <th className="p-3 text-left text-sm font-medium">
                  Description
                </th>
                <th className="p-3 text-left text-sm font-medium">Members</th>
                <th className="p-3 text-left text-sm font-medium">Status</th>
                <th className="p-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr
                  key={group.id}
                  className="border-b last:border-0 hover:bg-muted/50"
                >
                  <td className="p-3">
                    <div className="font-medium">{group.name}</div>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {group.description || "-"}
                  </td>
                  <td className="p-3">
                    <Badge variant="secondary">
                      {group.members?.length || 0} members
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge
                      variant={
                        group.status === "active" ? "default" : "secondary"
                      }
                    >
                      {group.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onViewDetails && (
                          <DropdownMenuItem
                            onClick={() => onViewDetails(group)}
                          >
                            View Details
                          </DropdownMenuItem>
                        )}
                        {onManageMembers && (
                          <DropdownMenuItem
                            onClick={() => onManageMembers(group)}
                          >
                            Manage Members
                          </DropdownMenuItem>
                        )}
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(group)}>
                            Edit
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem onClick={() => onDelete(group)}>
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile View - Card layout */}
      <div className="md:hidden space-y-3">
        {groups.map((group) => (
          <div key={group.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium">{group.name}</h3>
                {group.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {group.description}
                  </p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onViewDetails && (
                    <DropdownMenuItem onClick={() => onViewDetails(group)}>
                      View Details
                    </DropdownMenuItem>
                  )}
                  {onManageMembers && (
                    <DropdownMenuItem onClick={() => onManageMembers(group)}>
                      Manage Members
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(group)}>
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem onClick={() => onDelete(group)}>
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Badge variant="secondary">
                {group.members?.length || 0} members
              </Badge>
              <Badge
                variant={group.status === "active" ? "default" : "secondary"}
              >
                {group.status === "active" ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
