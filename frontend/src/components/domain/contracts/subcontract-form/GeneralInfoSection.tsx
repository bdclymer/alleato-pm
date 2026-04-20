"use client";

import * as React from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Search } from "lucide-react";
import {
  type CreateSubcontractInput,
  CommitmentStatusValues,
} from "@/lib/schemas/create-subcontract-schema";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { VendorOption } from "./types";
import { SectionRuleHeading } from "@/components/layout/spacing";

interface GeneralInfoSectionProps {
  isSubmitting: boolean;
  vendorOptions: VendorOption[];
  isLoadingVendors: boolean;
}

export function GeneralInfoSection({
  isSubmitting,
  vendorOptions,
  isLoadingVendors,
}: GeneralInfoSectionProps) {
  const {
    register,
    setValue,
    control,
    formState: { errors },
  } = useFormContext<CreateSubcontractInput>();

  const [openContractCompanyPopover, setOpenContractCompanyPopover] =
    React.useState(false);

  const statusValue = useWatch({ control, name: "status" });
  const executedValue = useWatch({ control, name: "executed" });
  const contractCompanyId = useWatch({ control, name: "contractCompanyId" });

  const selectedVendor = React.useMemo(
    () => vendorOptions.find((option) => option.value === contractCompanyId),
    [vendorOptions, contractCompanyId],
  );

  return (
    <section className="space-y-6 border-b border-border/70 pb-8">
      <SectionRuleHeading label="General Information" />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            {...register("title")}
            disabled={isSubmitting}
          />
          {errors.title && (
            <p className="text-sm text-destructive">
              {errors.title.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contractNumber">
            Contract # <span className="text-destructive">*</span>
          </Label>
          <Input
            id="contractNumber"
            {...register("contractNumber")}
            disabled={isSubmitting}
          />
          {errors.contractNumber && (
            <p className="text-sm text-destructive">
              {errors.contractNumber.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contractCompanyId">
            Contract Company <span className="text-destructive">*</span>
          </Label>
          <Popover
            open={openContractCompanyPopover}
            onOpenChange={setOpenContractCompanyPopover}
          >
            <PopoverTrigger asChild>
              <Button
                id="contractCompanyId"
                type="button"
                variant="outline"
                role="combobox"
                className={cn(
                  "w-full justify-between text-left font-normal",
                  !selectedVendor && "text-muted-foreground"
                )}
                disabled={isSubmitting || isLoadingVendors}
              >
                <span className="truncate">
                  {isLoadingVendors ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading companies...
                    </span>
                  ) : (
                    selectedVendor?.label || "Select contract company"
                  )}
                </span>
                <Search className="shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
              <Command>
                <CommandInput placeholder="Type to search companies..." />
                <CommandList>
                  <CommandEmpty>
                    {isLoadingVendors
                      ? "Loading companies..."
                      : "No companies found."}
                  </CommandEmpty>
                  <CommandGroup>
                    {vendorOptions.map((option) => (
                      <CommandItem
                        key={option.value}
                        value={option.label}
                        onSelect={() => {
                          setValue("contractCompanyId", option.value, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          setOpenContractCompanyPopover(false);
                        }}
                      >
                        {option.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {errors.contractCompanyId && (
            <p className="text-sm text-destructive">
              {errors.contractCompanyId.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">
            Status <span className="text-destructive">*</span>
          </Label>
          <Select
            value={statusValue}
            onValueChange={(value) =>
              setValue(
                "status",
                value as (typeof CommitmentStatusValues)[number],
              )
            }
            disabled={isSubmitting}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CommitmentStatusValues.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.status && (
            <p className="text-sm text-destructive">
              {errors.status.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
        <div>
          <Label htmlFor="defaultRetainagePercent">Default Retainage</Label>
          <InputGroup>
            <InputGroupInput
              id="defaultRetainagePercent"
              type="number"
              step="0.01"
              min="0"
              max="100"
              {...register("defaultRetainagePercent", {
                valueAsNumber: true,
              })}
              disabled={isSubmitting}
              className="text-right"
              placeholder=""
            />
            <InputGroupAddon align="inline-end">%</InputGroupAddon>
          </InputGroup>
          {errors.defaultRetainagePercent && (
            <p className="text-sm text-destructive">
              {errors.defaultRetainagePercent.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="executed" className="block">
            Executed
          </Label>
          <div className="flex items-center space-x-2 h-9">
            <Checkbox
              id="executed"
              checked={executedValue}
              onCheckedChange={(checked) =>
                setValue("executed", checked as boolean)
              }
              disabled={isSubmitting}
            />
            <Label
              htmlFor="executed"
              className="text-sm font-normal cursor-pointer"
            >
              Mark as Executed
            </Label>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Textarea
              id="description"
              value={field.value || ""}
              onChange={(e) => field.onChange(e.target.value)}
              disabled={isSubmitting}
              placeholder="Enter detailed contract description..."
              rows={3}
            />
          )}
        />
      </div>
    </section>
  );
}
