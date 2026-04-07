"use client";

import * as React from "react";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { CreateSubcontractInput } from "@/lib/schemas/create-subcontract-schema";

interface InvoiceContactsSectionProps {
  isSubmitting: boolean;
  invoiceContactOptions: Array<{ value: string; label: string }>;
  isLoadingContacts: boolean;
  vendorId?: string | null;
  refetchContacts?: () => Promise<void>;
}

export function InvoiceContactsSection({
  isSubmitting,
  invoiceContactOptions,
  isLoadingContacts,
  vendorId,
  refetchContacts,
}: InvoiceContactsSectionProps) {
  const { control, setValue, getValues } = useFormContext<CreateSubcontractInput>();
  const contractCompanyId = useWatch({ control, name: "contractCompanyId" });
  const [open, setOpen] = React.useState(false);
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [newContact, setNewContact] = React.useState({
    first_name: "",
    last_name: "",
    email: "",
    job_title: "",
  });

  const handleAddContact = async () => {
    if (!vendorId || !newContact.first_name) return;
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("people")
        .insert({
          first_name: newContact.first_name,
          last_name: newContact.last_name || null,
          email: newContact.email || null,
          job_title: newContact.job_title || null,
          person_type: "contact",
        })
        .select("id")
        .single();

      if (error) throw new Error(error.message);

      if (data?.id) {
        const { error: linkError } = await supabase
          .from("vendor_contacts")
          .insert({ vendor_id: vendorId, person_id: data.id });
        if (linkError) throw new Error(linkError.message);
      }

      await refetchContacts?.();

      if (data?.id) {
        const current = getValues("invoiceContactIds") || [];
        setValue("invoiceContactIds", [...current, data.id]);
      }

      setShowAddDialog(false);
      setNewContact({ first_name: "", last_name: "", email: "", job_title: "" });
    } catch (err) {
      console.error("Failed to add contact:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Invoice Contacts</h2>
      <div>
        {!contractCompanyId ? (
          <p className="text-sm text-muted-foreground">
            Select a vendor above to enable invoice contacts.
          </p>
        ) : (
          <Controller
            name="invoiceContactIds"
            control={control}
            render={({ field }) => {
              const value = field.value || [];
              const handleSelect = (optionValue: string) => {
                const next = value.includes(optionValue)
                  ? value.filter((v: string) => v !== optionValue)
                  : [...value, optionValue];
                field.onChange(next);
              };
              const selectedLabels = value
                .map((v: string) => invoiceContactOptions.find((o) => o.value === v)?.label)
                .filter(Boolean);

              return (
                <>
                  <FormItem className="flex flex-col">
                    <FormLabel>Invoice Contacts</FormLabel>
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
                          disabled={isSubmitting || isLoadingContacts}
                        >
                          <div className="flex flex-wrap gap-1">
                            {value.length > 0
                              ? selectedLabels.map((label: string) => (
                                  <Badge key={label} variant="secondary" className="mr-1">
                                    {label}
                                  </Badge>
                                ))
                              : isLoadingContacts
                                ? "Loading contacts..."
                                : invoiceContactOptions.length === 0
                                  ? "No contacts found — add one below"
                                  : "Select contacts who can submit invoices..."}
                          </div>
                          <ChevronsUpDown className="shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
                        <Command>
                          <CommandInput placeholder="Search contacts..." />
                          <CommandList className="max-h-72">
                            <CommandEmpty>No contacts found.</CommandEmpty>
                            <CommandGroup>
                              {invoiceContactOptions.map((option) => (
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
                            {vendorId && (
                              <>
                                <CommandSeparator />
                                <CommandGroup>
                                  <CommandItem
                                    className="min-h-11"
                                    onSelect={() => {
                                      setOpen(false);
                                      setShowAddDialog(true);
                                    }}
                                  >
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Add contact to vendor
                                  </CommandItem>
                                </CommandGroup>
                              </>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>

                  <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Contact to Vendor</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="contact-first-name">
                              First name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="contact-first-name"
                              value={newContact.first_name}
                              onChange={(e) =>
                                setNewContact((p) => ({ ...p, first_name: e.target.value }))
                              }
                              placeholder="Jane"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="contact-last-name">Last name</Label>
                            <Input
                              id="contact-last-name"
                              value={newContact.last_name}
                              onChange={(e) =>
                                setNewContact((p) => ({ ...p, last_name: e.target.value }))
                              }
                              placeholder="Smith"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="contact-email">Email</Label>
                          <Input
                            id="contact-email"
                            type="email"
                            value={newContact.email}
                            onChange={(e) =>
                              setNewContact((p) => ({ ...p, email: e.target.value }))
                            }
                            placeholder="jane@example.com"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="contact-job-title">Job title</Label>
                          <Input
                            id="contact-job-title"
                            value={newContact.job_title}
                            onChange={(e) =>
                              setNewContact((p) => ({ ...p, job_title: e.target.value }))
                            }
                            placeholder="Project Manager"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowAddDialog(false)}
                          disabled={isSaving}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleAddContact}
                          disabled={!newContact.first_name || isSaving}
                        >
                          {isSaving ? "Adding..." : "Add contact"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              );
            }}
          />
        )}
      </div>
    </section>
  );
}
