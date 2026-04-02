"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { VendorOption } from "./types";

interface VendorComboboxProps {
  value: string;
  onChange: (value: string) => void;
  vendors: VendorOption[];
  onAddCompany: () => void;
}

export function VendorCombobox({
  value,
  onChange,
  vendors,
  onAddCompany,
}: VendorComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const vendorListId = React.useId();
  const selected = vendors.find((v) => v.id === value);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return vendors;
    const q = search.toLowerCase();
    return vendors.filter(
      (v) =>
        v.vendor_name.toLowerCase().includes(q) ||
        v.company?.toLowerCase().includes(q),
    );
  }, [vendors, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls={vendorListId}
          aria-label="Select vendor"
          className={cn(
            "flex h-9 w-full items-center justify-between px-3 py-2 text-sm font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          <span className="truncate text-left">
            {selected ? selected.vendor_name : "Select vendor..."}
          </span>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start" sideOffset={0}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search vendors..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList id={vendorListId} className="max-h-[200px]">
            <CommandEmpty>No vendors found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((vendor) => (
                <CommandItem
                  key={vendor.id}
                  value={vendor.id}
                  onSelect={() => {
                    onChange(vendor.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === vendor.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {vendor.vendor_name}
                  {vendor.company && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({vendor.company})
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  onAddCompany();
                }}
                className="cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4 text-primary" />
                <span className="font-medium text-primary">
                  Add Company to Directory
                </span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
