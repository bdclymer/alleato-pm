import { Users2 } from "lucide-react";
import { EmptyState } from "@/components/ds";

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
          onClearFilters
            ? { label: "Clear Filters", onClick: onClearFilters }
            : undefined
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
        onAddGroup
          ? { label: "Create Group", onClick: onAddGroup }
          : undefined
      }
    />
  );
}
