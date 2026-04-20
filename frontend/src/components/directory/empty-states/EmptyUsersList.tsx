import { Plus, Users } from "lucide-react";
import { EmptyState } from "@/components/ds";
import { Button } from "@/components/ui/button";

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
      icon={<Users />}
      title="No users yet"
      description="Get started by adding your first user to the project directory."
      action={
        onAddUser ? (
          <Button size="sm" variant="outline" onClick={onAddUser}>
            <Plus />
            Add User
          </Button>
        ) : undefined
      }
    />
  );
}
