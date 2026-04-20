import { Plus, Users2 } from "lucide-react";
import { EmptyState } from "@/components/ds";
import { Button } from "@/components/ui/button";

interface EmptyDistributionGroupsProps {
  onAddGroup?: () => void;
  hasFilters?: boolean;
  onClearFilters?: () => void;
}

export function EmptyDistributionGroups({
  onAddGroup,
  hasFilters,
  onClearFilters,
}: EmptyDistributionGroupsProps) {
  if (hasFilters) {
    return (
      <EmptyState
        icon={<Users2 />}
        title="No groups found"
        description="No distribution groups match your current filters. Try adjusting your search or filter criteria."
        action={
          onClearFilters ? (
            <Button size="sm" variant="outline" onClick={onClearFilters}>
              <Plus />
              Clear Filters
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <EmptyState
      icon={<Users2 />}
      title="No distribution groups yet"
      description="Create distribution groups to organize and communicate with team members more efficiently."
      action={
        onAddGroup ? (
          <Button size="sm" variant="outline" onClick={onAddGroup}>
            <Plus />
            Create Group
          </Button>
        ) : undefined
      }
    />
  );
}
