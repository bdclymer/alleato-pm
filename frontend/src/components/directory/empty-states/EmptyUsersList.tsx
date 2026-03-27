import { Users } from "lucide-react";
import { EmptyState } from "@/components/ds";

interface EmptyUsersListProps {
  onAddUser?: () => void;
  hasFilters?: boolean;
  onClearFilters?: () => void;
}

export function EmptyUsersList({
  onAddUser,
  hasFilters,
  onClearFilters,
}: EmptyUsersListProps) {
  if (hasFilters) {
    return (
      <EmptyState
        icon={<Users />}
        title="No users found"
        description="No users match your current filters. Try adjusting your search or filter criteria."
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
      icon={<Users />}
      title="No users yet"
      description="Get started by adding your first user to the project directory."
      action={
        onAddUser
          ? { label: "Add User", onClick: onAddUser }
          : undefined
      }
    />
  );
}
