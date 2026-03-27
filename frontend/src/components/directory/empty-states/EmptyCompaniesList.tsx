import { Building2 } from "lucide-react";
import { EmptyState } from "@/components/ds";

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
          onClearFilters
            ? { label: "Clear Filters", onClick: onClearFilters }
            : undefined
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
        onAddCompany
          ? { label: "Add Company", onClick: onAddCompany }
          : undefined
      }
    />
  );
}
