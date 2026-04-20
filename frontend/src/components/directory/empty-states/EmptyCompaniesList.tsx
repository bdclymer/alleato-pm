import { Building2, Plus } from "lucide-react";
import { EmptyState } from "@/components/ds";
import { Button } from "@/components/ui/button";

interface EmptyCompaniesListProps {
  onAddCompany?: () => void;
  hasFilters?: boolean;
  onClearFilters?: () => void;
}

export function EmptyCompaniesList({
  onAddCompany,
  hasFilters,
  onClearFilters,
}: EmptyCompaniesListProps) {
  if (hasFilters) {
    return (
      <EmptyState
        icon={<Building2 />}
        title="No companies found"
        description="No companies match your current filters. Try adjusting your search or filter criteria."
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
      icon={<Building2 />}
      title="No companies yet"
      description="Get started by adding your first company to the project directory."
      action={
        onAddCompany ? (
          <Button size="sm" variant="outline" onClick={onAddCompany}>
            <Plus />
            Add Company
          </Button>
        ) : undefined
      }
    />
  );
}
