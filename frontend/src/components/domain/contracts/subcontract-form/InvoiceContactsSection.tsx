"use client";

import * as React from "react";
import { Check, ChevronsUpDown, HelpCircle, UserPlus, X } from "lucide-react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  vendorCompanyId?: string | null;
  refetchContacts?: () => Promise<void>;
}

export function InvoiceContactsSection({
  isSubmitting,
  invoiceContactOptions,
  isLoadingContacts,
  vendorId,
  vendorCompanyId,
  refetchContacts,
}: InvoiceContactsSectionProps) {
  const { control, setValue, getValues } = useFormContext<CreateSubcontractInput>();
  const contractCompanyId = useWatch({ control, name: "contractCompanyId" });
  const selectedContactIds = useWatch({ control, name: "invoiceContactIds" }) || [];
  const [open, setOpen] = React.useState(false);
  const [extraLabels, setExtraLabels] = React.useState<Record<string, string>>({});

  // Resolve labels for selected contacts that aren't in the current vendor's options
  // (e.g. contacts saved before the contract company changed).
  React.useEffect(() => {
    const optionIds = new Set(invoiceContactOptions.map((o) => o.value));
    const missing = selectedContactIds.filter(
      (id: string) => !optionIds.has(id) && !extraLabels[id],
    );
    if (missing.length === 0) return;
    const supabase = createClient();
    void supabase
      .from("people")
      .select("id, first_name, last_name, email")
      .in("id", missing)
      .then(({ data }) => {
        if (!data) return;
        setExtraLabels((prev) => {
          const next = { ...prev };
          for (const person of data as Array<{ id: string; first_name: string | null; last_name: string | null; email: string | null }>) {
            const name = `${person.first_name || ""} ${person.last_name || ""}`.trim();
            next[person.id] = name || person.email || "Unknown contact";
          }
          return next;
        });
      });
  }, [selectedContactIds, invoiceContactOptions, extraLabels]);
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [newContact, setNewContact] = React.useState({
    first_name: "",
    last_name: "",
    email: "",
    job_title: "",
  });

  const handleAddContact = async () => {
    const vendorCompanyLinkId = vendorCompanyId || vendorId;
    if (!vendorCompanyLinkId || !newContact.first_name) return;
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
          status: "active",
          company_id: vendorCompanyId || null,
        })
        .select("id")
        .single();

      if (error) throw new Error(error.message);

      if (data?.id) {
        const { error: linkError } = await supabase
          .from("vendor_contacts")
          .insert({ company_id: vendorCompanyLinkId, person_id: data.id });
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
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground">Invoice Contacts</h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-sm">
              This person will be added to the contract and will be the point of contact and signer for subcontractor invoices.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div>
        {(
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
              const selectedItems = value
                .map((v: string) => ({
                  id: v,
                  label:
                    invoiceContactOptions.find((o) => o.value === v)?.label ||
                    extraLabels[v] ||
                    "…",
                }));
              const removeContact = (id: string) =>
                field.onChange(value.filter((v: string) => v !== id));

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
                          {...(value.length === 0 && { "data-placeholder-style": "" })}
                        >
                          <div className="flex flex-wrap gap-1">
                            {value.length > 0
                              ? selectedItems.map((item) => (
                                  <Badge key={item.id} variant="secondary" className="mr-1 gap-1 pr-1">
                                    {item.label}
                                    <span
                                      role="button"
                                      tabIndex={0}
                                      aria-label={`Remove ${item.label}`}
                                      className="flex h-4 w-4 items-center justify-center rounded-sm hover:bg-muted-foreground/20"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        removeContact(item.id);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          removeContact(item.id);
                                        }
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </span>
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
      {/* contractCompanyId watched but no longer gates rendering */}
    </section>
  );
}
