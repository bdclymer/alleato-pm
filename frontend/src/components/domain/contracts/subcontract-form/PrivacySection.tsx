"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { CreateSubcontractInput } from "@/lib/schemas/create-subcontract-schema";
import { SectionRuleHeading } from "@/components/layout/spacing";

interface PrivacySectionProps {
  isSubmitting: boolean;
  userOptions: Array<{ value: string; label: string }>;
  isLoadingUsers: boolean;
}

export function PrivacySection({
  isSubmitting,
  userOptions,
  isLoadingUsers,
}: PrivacySectionProps) {
  const { control } = useFormContext<CreateSubcontractInput>();
  const privacyIsPrivate = useWatch({ control, name: "privacy.isPrivate" }) ?? true;
  const selectedUserIds: string[] = useWatch({ control, name: "privacy.nonAdminUserIds" }) ?? [];
  const [open, setOpen] = React.useState(false);

  const selectedLabels = selectedUserIds
    .map((id) => userOptions.find((u) => u.value === id)?.label)
    .filter(Boolean) as string[];

  return (
    <section className="space-y-4">
      <SectionRuleHeading label="Contract Privacy" />
      <div className="space-y-4">
        <Controller
          name="privacy.isPrivate"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Checkbox
                id="privacy-is-private"
                checked={field.value ?? true}
                onCheckedChange={(checked) => field.onChange(!!checked)}
                disabled={isSubmitting}
              />
              <Label htmlFor="privacy-is-private" className="text-sm font-normal cursor-pointer">
                Private - Make this visible only to administrators and the following users.
              </Label>
            </div>
          )}
        />

        {privacyIsPrivate && (
          <>
            <div className="space-y-2">
              <Label>Access for Non-Admin Users</Label>
              <Controller
                name="privacy.nonAdminUserIds"
                control={control}
                render={({ field }) => {
                  const value: string[] = field.value ?? [];
                  const handleSelect = (optionValue: string) => {
                    const next = value.includes(optionValue)
                      ? value.filter((v) => v !== optionValue)
                      : [...value, optionValue];
                    field.onChange(next);
                  };

                  return (
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={open}
                          className={cn(
                            "h-11 w-full justify-between",
                            value.length === 0 && "text-muted-foreground",
                          )}
                          disabled={isSubmitting || isLoadingUsers}
                        >
                          <div className="flex flex-wrap gap-1">
                            {value.length > 0
                              ? selectedLabels.map((label) => (
                                  <Badge key={label} variant="secondary" className="mr-1">
                                    {label}
                                  </Badge>
                                ))
                              : isLoadingUsers
                                ? "Loading users..."
                                : "Select users who can access this contract..."}
                          </div>
                          <ChevronsUpDown className="shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
                        <Command>
                          <CommandInput placeholder="Search users..." />
                          <CommandList className="max-h-72">
                            <CommandEmpty>No users found.</CommandEmpty>
                            <CommandGroup>
                              {userOptions.map((option) => (
                                <CommandItem
                                  key={option.value}
                                  value={[option.label, option.value].join(" ")}
                                  className="min-h-11"
                                  onSelect={() => handleSelect(option.value)}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      value.includes(option.value) ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  {option.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  );
                }}
              />
            </div>

            <Controller
              name="privacy.allowNonAdminViewSovItems"
              control={control}
              render={({ field }) => (
            <div className="flex items-start gap-2 leading-none">
              <Checkbox
                id="privacy-allow-sov"
                checked={field.value ?? false}
                onCheckedChange={(checked) => field.onChange(!!checked)}
                disabled={isSubmitting}
              />
              <Label htmlFor="privacy-allow-sov" className="text-sm leading-none font-normal cursor-pointer">
                Allow these non-admin users to view the SOV items
              </Label>
            </div>
              )}
            />
          </>
        )}
      </div>
    </section>
  );
}
