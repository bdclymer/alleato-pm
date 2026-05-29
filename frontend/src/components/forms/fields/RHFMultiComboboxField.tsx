"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { Control, FieldPath, FieldValues } from "react-hook-form"

import { cn } from "@/lib/utils"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface MultiComboboxOption {
  value: string
  label: string
  keywords?: string[]
}

interface Props<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  options: MultiComboboxOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
}

/**
 * RHF-compatible multi-select combobox. Manages a string[] field value.
 * Selected items appear as dismissable badges; the dropdown stays open for
 * additional selections until the user closes it.
 */
export function RHFMultiComboboxField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  disabled,
}: Props<TFieldValues>) {
  const [open, setOpen] = React.useState(false)

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const selected: string[] = Array.isArray(field.value) ? field.value : []

        const toggle = (value: string) => {
          const next = selected.includes(value)
            ? selected.filter((v) => v !== value)
            : [...selected, value]
          field.onChange(next)
        }

        const remove = (value: string, e: React.MouseEvent) => {
          e.stopPropagation()
          field.onChange(selected.filter((v) => v !== value))
        }

        return (
          <FormItem className="flex flex-col">
            <FormLabel>{label}</FormLabel>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    disabled={disabled}
                    className={cn(
                      "h-auto min-h-11 w-full justify-between",
                      selected.length === 0 && "text-muted-foreground",
                    )}
                  >
                    <div className="flex flex-wrap gap-1">
                      {selected.length === 0 ? (
                        <span>{placeholder}</span>
                      ) : (
                        selected.map((val) => {
                          const opt = options.find((o) => o.value === val)
                          return (
                            <Badge key={val} variant="secondary" className="gap-1">
                              {opt?.label ?? val}
                              <span
                                role="button"
                                tabIndex={0}
                                aria-label={`Remove ${opt?.label ?? val}`}
                                className="cursor-pointer rounded-full outline-none hover:bg-muted focus:ring-1"
                                onClick={(e) => remove(val, e)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault()
                                    field.onChange(selected.filter((v) => v !== val))
                                  }
                                }}
                              >
                                <X className="h-3 w-3" />
                              </span>
                            </Badge>
                          )
                        })
                      )}
                    </div>
                    <ChevronsUpDown className="shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandInput placeholder={searchPlaceholder} />
                  <CommandList className="max-h-72">
                    <CommandEmpty>{emptyMessage}</CommandEmpty>
                    <CommandGroup>
                      {options.map((option) => (
                        <CommandItem
                          key={option.value}
                          value={[
                            option.label,
                            option.value,
                            ...(option.keywords ?? []),
                          ].join(" ")}
                          className="min-h-11"
                          onSelect={() => toggle(option.value)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selected.includes(option.value)
                                ? "opacity-100"
                                : "opacity-0",
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
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
