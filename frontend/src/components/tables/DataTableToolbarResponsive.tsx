"use client";

import * as React from "react";
import { Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableColumnToggle } from "./DataTableColumnToggle";
import { DataTableFilters } from "./DataTableFilters";
import { MobileFilterModal } from "./MobileFilterModal";
import { cn } from "@/lib/utils";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchKey?: string;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  filterOptions?: {
    column: string;
    title: string;
    options: {
      label: string;
      value: string;
      icon?: React.ComponentType<{ className?: string }>;
    }[];
  }[];
}

export function DataTableToolbarResponsive<TData>({
  table,
  searchKey = "name",
  searchPlaceholder = "Filter...",
  filters,
  filterOptions,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const [mobileFilterOpen, setMobileFilterOpen] = React.useState(false);

  const renderFilters = () => {
    if (filters) return filters;

    if (filterOptions) {
      return filterOptions.map((filter) => (
        <DataTableFilters
          key={filter.column}
          column={table.getColumn(filter.column)}
          title={filter.title}
          options={filter.options}
        />
      ));
    }

    return null;
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {/* Search Input - Always visible */}
        <Input
          placeholder={searchPlaceholder}
          value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn(searchKey)?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />

        {/* Desktop Filters */}
        <div className="hidden lg:flex lg:items-center lg:space-x-2">
          {renderFilters()}
          {isFiltered && (
            <Button
              variant="ghost"
              onClick={() => table.resetColumnFilters()}
              className="h-8 px-2 lg:px-4"
            >
              Reset
              <X className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Mobile Filter Button */}
        <div className="flex lg:hidden">
          <MobileFilterModal
            open={mobileFilterOpen}
            onOpenChange={setMobileFilterOpen}
            onReset={() => table.resetColumnFilters()}
            hasActiveFilters={isFiltered}
          >
            {renderFilters()}
          </MobileFilterModal>
        </div>
      </div>

      {/* Column Toggle - Desktop only */}
      <div className="hidden lg:block">
        <DataTableColumnToggle table={table} />
      </div>
    </div>
  );
}
