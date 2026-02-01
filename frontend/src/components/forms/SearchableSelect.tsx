"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SearchableSelectProps {
  label?: string;
  options: SearchableSelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  triggerClassName?: string;
  addButton?: React.ReactNode;
  onCreateNew?: () => void;
  createNewLabel?: string;
  triggerTestId?: string;
  optionTestIdPrefix?: string;
  searchInputTestId?: string;
}

export function SearchableSelect({
  label,
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search",
  emptyMessage = "No results found.",
  disabled = false,
  required = false,
  className,
  triggerClassName,
  addButton,
  onCreateNew,
  createNewLabel = "+ Create New",
  triggerTestId,
  optionTestIdPrefix,
  searchInputTestId,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        opt.description?.toLowerCase().includes(query),
    );
  }, [options, searchQuery]);

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <div className="flex gap-2 min-w-0">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "flex-1 justify-between font-normal min-w-0",
                !value && "text-muted-foreground",
                triggerClassName,
              )}
              disabled={disabled}
              data-testid={triggerTestId}
            >
              <span className="truncate">
                {selectedOption?.label || placeholder}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-0"
            align="start"
          >
            <div className="flex flex-col">
              {/* Search Input */}
              <div className="flex items-center border-b px-3 py-2">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  data-testid={searchInputTestId}
                />
              </div>

              {/* Options List */}
              <div className="max-h-[300px] overflow-y-auto">
                {filteredOptions.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {emptyMessage}
                  </div>
                ) : (
                  filteredOptions.map((option) => (
                    <div
                      key={option.value}
                      className={cn(
                        "relative flex cursor-pointer select-none items-center px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
                        value === option.value && "bg-accent",
                      )}
                      onClick={() => handleSelect(option.value)}
                      data-testid={
                        optionTestIdPrefix
                          ? `${optionTestIdPrefix}-${option.value}`
                          : undefined
                      }
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.value ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="truncate">{option.label}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Create New Button */}
              {onCreateNew && (
                <div className="border-t p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-sm font-normal text-primary hover:text-primary hover:bg-primary/10"
                    onClick={() => {
                      setOpen(false);
                      onCreateNew();
                    }}
                  >
                    {createNewLabel}
                  </Button>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
        {addButton && <div className="flex-shrink-0">{addButton}</div>}
      </div>
    </div>
  );
}
