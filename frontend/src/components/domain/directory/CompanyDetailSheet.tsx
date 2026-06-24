"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink, MoreVertical, UserPlus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Badge,
  Button,
  DataTable as DsDataTable,
  EmptyState as DsEmptyState,
  ErrorState,
  SectionHeader as DsSectionHeader,
  Skeleton,
  InlineEditField,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ds";
import { createClient } from "@/lib/supabase/client";
import { updateContact } from "@/app/(main)/actions/table-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ContactFormSheet } from "@/components/domain/contacts/ContactFormSheet";
import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { appToast as toast } from "@/lib/toast/app-toast";
import type { Database } from "@/types/database.types";

type Company = Database["public"]["Tables"]["companies"]["Row"];
type Contact = Database["public"]["Tables"]["people"]["Row"];

interface CompanyProjectItem {
  id: number;
  name: string | null;
  project_number: string | null;
  state: string | null;
  archived: boolean;
  company_status: string | null;
  company_type: string | null;
}

interface InvoiceItem {
  id: number;
  invoice_number: string | null;
  status: string | null;
  prime_contract_id: string | null;
  contract_number: string | null;
  contract_title: string | null;
  project_id: number | null;
  project_name: string | null;
  project_number: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string | null;
  updated_at: string;
}

interface CompanyDetailsResponse {
  company: Company;
  contacts: Contact[];
  projects: CompanyProjectItem[];
  invoices: InvoiceItem[];
}

function statusVariant(
  status?: string | null,
): "default" | "secondary" | "outline" | "destructive" {
  if (!status) return "outline";
  const n = status.toLowerCase();
  if (n === "active" || n === "approved" || n === "paid") return "default";
  if (n === "draft" || n === "pending" || n === "submitted") return "secondary";
  if (n === "inactive" || n === "void" || n === "rejected") return "destructive";
  return "outline";
}

function FactRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

export function CompanyDetailSheet({
  companyId,
  open,
  onOpenChange,
  projectId,
}: {
  companyId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}) {
  const [data, setData] = React.useState<CompanyDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [settingPrimaryContactId, setSettingPrimaryContactId] = React.useState<string | null>(null);
  const [addContactOpen, setAddContactOpen] = React.useState(false);
  const [addContactPopoverOpen, setAddContactPopoverOpen] = React.useState(false);
  const [existingPeople, setExistingPeople] = React.useState<
    Array<{ id: string; first_name: string | null; last_name: string | null; email: string | null }>
  >([]);
  const [loadingPeople, setLoadingPeople] = React.useState(false);

  const loadDetails = React.useCallback(async (cancelledRef?: { current: boolean }) => {
    if (!companyId) return;
    setIsLoading(true);
    setError(null);
    setData(null);
    try {
      const payload = await apiFetch<CompanyDetailsResponse>(
        `/api/directory/companies/${companyId}/details`,
        { cache: "no-store" },
      );
      if (cancelledRef?.current) return;
      setData(payload);
    } catch (err: unknown) {
      if (cancelledRef?.current) return;
      setError(err instanceof Error ? err.message : "Failed to load company");
    } finally {
      if (cancelledRef?.current) return;
      setIsLoading(false);
    }
  }, [companyId]);

  React.useEffect(() => {
    if (!open || !companyId) return;
    let cancelled = false;
    void loadDetails({
      get current() {
        return cancelled;
      },
    });
    return () => {
      cancelled = true;
    };
  }, [open, companyId, loadDetails]);

  const saveCompanyField = React.useCallback(
    async (patch: Record<string, string>) => {
      if (!companyId) return;
      const updated = await apiFetch<Company>(
        `/api/directory/companies/${companyId}`,
        {
          method: "PATCH",
          body: JSON.stringify(patch),
        },
      );
      setData((prev) =>
        prev ? { ...prev, company: { ...prev.company, ...updated } } : prev,
      );
    },
    [companyId],
  );

  async function handleSetPrimaryContact(contactId: string) {
    if (!companyId) return;
    setSettingPrimaryContactId(contactId);
    try {
      await apiFetch(`/api/directory/companies/${companyId}`, {
        method: "PATCH",
        body: JSON.stringify({ primary_contact_id: contactId }),
      });
      toast.success("Primary contact updated");
      await loadDetails();
    } catch (err) {
      toast.error("Failed to update primary contact");
    } finally {
      setSettingPrimaryContactId(null);
    }
  }

  React.useEffect(() => {
    if (!addContactPopoverOpen || !companyId) return;
    setLoadingPeople(true);
    const supabase = createClient();
    supabase
      .from("people")
      .select("id, first_name, last_name, email")
      .or(`company_id.is.null,company_id.neq.${companyId}`)
      .order("first_name")
      .limit(200)
      .then(({ data: rows }) => {
        setExistingPeople(
          (rows ?? []).map((p) => ({
            id: p.id,
            first_name: p.first_name ?? null,
            last_name: p.last_name ?? null,
            email: p.email ?? null,
          })),
        );
        setLoadingPeople(false);
      });
  }, [addContactPopoverOpen, companyId]);

  const handleAddExistingContact = async (person: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  }) => {
    setAddContactPopoverOpen(false);
    try {
      await updateContact(person.id, { company_id: companyId! });
      const name =
        [person.first_name, person.last_name].filter(Boolean).join(" ") ||
        person.email ||
        "Contact";
      toast.success(`${name} added to company`);
      await loadDetails();
    } catch {
      toast.error("Failed to add contact");
    }
  };

  const company = data?.company ?? null;
  const contacts = data?.contacts ?? [];
  const projects = data?.projects ?? [];
  const invoices = data?.invoices ?? [];
  const effectivePrimaryContactId = company?.primary_contact_id ?? contacts[0]?.id ?? null;
  const websiteUrl = company?.website
    ? company.website.startsWith("http")
      ? company.website
      : `https://${company.website}`
    : null;
  const location = [company?.city, company?.state].filter(Boolean).join(", ");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto md:w-full md:max-w-3xl lg:w-full lg:max-w-4xl xl:max-w-5xl">
        <SheetHeader className="border-b border-border/40">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <SheetTitle className="truncate text-xl tracking-tight">
                {company?.name ?? (isLoading ? "Loading…" : "Company")}
              </SheetTitle>
              {location && (
                <p className="truncate text-xs text-muted-foreground">{location}</p>
              )}
            </div>
            {companyId && company && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    aria-label="Company actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onSelect={() => setAddContactPopoverOpen(true)}>
                    <UserPlus className="mr-2 h-3.5 w-3.5" />
                    Add contact
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/directory/companies/${companyId}`}>
                      <ExternalLink className="mr-2 h-3.5 w-3.5" />
                      View full profile
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </SheetHeader>

        <div className="px-8 pb-8 space-y-8">
          {isLoading && (
            <div className="space-y-4 pt-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          )}

          {error && !isLoading && (
            <div className="pt-4">
              <ErrorState error={error} />
            </div>
          )}

          {company && !isLoading && (
            <>
              <section className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                <FactRow
                  label="Status"
                  value={
                    <InlineEditField
                      label="Status"
                      value={company.status ?? ""}
                      placeholder="Add status"
                      onSave={(next) => saveCompanyField({ status: next })}
                    />
                  }
                />
                <FactRow
                  label="Type"
                  value={
                    <InlineEditField
                      label="Type"
                      value={company.type ?? ""}
                      placeholder="Add type"
                      onSave={(next) => saveCompanyField({ type: next })}
                    />
                  }
                />
                <FactRow
                  label="ERP Vendor ID"
                  value={
                    <InlineEditField
                      label="ERP Vendor ID"
                      value={company.acumatica_vendor_id ?? ""}
                      placeholder="Add vendor ID"
                      onSave={(next) =>
                        saveCompanyField({ acumatica_vendor_id: next })
                      }
                    />
                  }
                />
                <FactRow
                  label="License Number"
                  value={
                    <InlineEditField
                      label="License Number"
                      value={company.license_number ?? ""}
                      placeholder="Add license number"
                      onSave={(next) =>
                        saveCompanyField({ license_number: next })
                      }
                    />
                  }
                />
                <FactRow
                  label="Email"
                  value={
                    <InlineEditField
                      label="Email"
                      value={company.contact_email ?? ""}
                      placeholder="Add email"
                      onSave={(next) =>
                        saveCompanyField({ contact_email: next })
                      }
                    />
                  }
                />
                <FactRow
                  label="Phone"
                  value={
                    <InlineEditField
                      label="Phone"
                      value={company.contact_phone ?? ""}
                      placeholder="Add phone"
                      onSave={(next) =>
                        saveCompanyField({ contact_phone: next })
                      }
                    />
                  }
                />
                <FactRow
                  label="Website"
                  value={
                    <InlineEditField
                      label="Website"
                      value={company.website ?? ""}
                      placeholder="Add website"
                      display={
                        websiteUrl ? (
                          <a
                            href={websiteUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                          >
                            <span className="truncate">{company.website}</span>
                            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                          </a>
                        ) : undefined
                      }
                      onSave={(next) => saveCompanyField({ website: next })}
                    />
                  }
                />
                <FactRow
                  label="Address"
                  value={
                    <InlineEditField
                      label="Address"
                      value={company.address ?? ""}
                      placeholder="Add address"
                      onSave={(next) => saveCompanyField({ address: next })}
                    />
                  }
                />
                <FactRow
                  label="City"
                  value={
                    <InlineEditField
                      label="City"
                      value={company.city ?? ""}
                      placeholder="Add city"
                      onSave={(next) => saveCompanyField({ city: next })}
                    />
                  }
                />
                <FactRow
                  label="State"
                  value={
                    <InlineEditField
                      label="State"
                      value={company.state ?? ""}
                      placeholder="Add state"
                      onSave={(next) => saveCompanyField({ state: next })}
                    />
                  }
                />
                <FactRow
                  label="Postal Code"
                  value={
                    <InlineEditField
                      label="Postal Code"
                      value={company.zip_code ?? ""}
                      placeholder="Add postal code"
                      onSave={(next) => saveCompanyField({ zip_code: next })}
                    />
                  }
                />
                <FactRow
                  label="Country"
                  value={
                    <InlineEditField
                      label="Country"
                      value={company.country ?? ""}
                      placeholder="Add country"
                      onSave={(next) => saveCompanyField({ country: next })}
                    />
                  }
                />
                <FactRow
                  label="Legal Name"
                  value={
                    <InlineEditField
                      label="Legal Name"
                      value={company.legal_name ?? ""}
                      placeholder="Add legal name"
                      onSave={(next) => saveCompanyField({ legal_name: next })}
                    />
                  }
                />
                <FactRow
                  label="Display Name"
                  value={
                    <InlineEditField
                      label="Display Name"
                      value={company.title ?? ""}
                      placeholder="Add display name"
                      onSave={(next) => saveCompanyField({ title: next })}
                    />
                  }
                />
                <FactRow
                  label="Tax ID"
                  value={
                    <InlineEditField
                      label="Tax ID"
                      value={company.tax_id ?? ""}
                      placeholder="Add tax ID"
                      onSave={(next) => saveCompanyField({ tax_id: next })}
                    />
                  }
                />
              </section>

              <section className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Notes</span>
                <div className="text-sm text-foreground">
                  <InlineEditField
                    label="Notes"
                    type="textarea"
                    value={company.notes ?? ""}
                    placeholder="Add notes"
                    onSave={(next) => saveCompanyField({ notes: next })}
                  />
                </div>
              </section>

              <section className="space-y-3">
                <DsSectionHeader
                  title={`Contacts (${contacts.length})`}
                  action={
                    <Popover
                      open={addContactPopoverOpen}
                      onOpenChange={setAddContactPopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                          Add contact
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0" align="end">
                        <Command>
                          <CommandInput placeholder="Search existing contacts..." />
                          <CommandList className="max-h-56">
                            <CommandEmpty>
                              {loadingPeople
                                ? "Loading..."
                                : "No existing contacts found."}
                            </CommandEmpty>
                            {existingPeople.length > 0 && (
                              <CommandGroup heading="Add existing contact">
                                {existingPeople.map((person) => {
                                  const name =
                                    [person.first_name, person.last_name]
                                      .filter(Boolean)
                                      .join(" ") ||
                                    person.email ||
                                    "Unnamed";
                                  return (
                                    <CommandItem
                                      key={person.id}
                                      value={`${person.first_name ?? ""} ${person.last_name ?? ""} ${person.email ?? ""}`}
                                      onSelect={() =>
                                        void handleAddExistingContact(person)
                                      }
                                    >
                                      <div className="flex min-w-0 flex-col">
                                        <span className="truncate text-sm">
                                          {name}
                                        </span>
                                        {person.email && (
                                          <span className="truncate text-xs text-muted-foreground">
                                            {person.email}
                                          </span>
                                        )}
                                      </div>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                        <div className="border-t border-border/60 p-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-sm"
                            onClick={() => {
                              setAddContactPopoverOpen(false);
                              setAddContactOpen(true);
                            }}
                          >
                            <UserPlus className="mr-2 h-4 w-4 shrink-0" />
                            Create new contact
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  }
                />
                {contacts.length === 0 ? (
                  <DsEmptyState
                    title="No contacts"
                    description="No contacts associated with this company."
                    action={
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAddContactPopoverOpen(true)}
                      >
                        <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                        Add contact
                      </Button>
                    }
                  />
                ) : (
                  <ul className="divide-y divide-border/60">
                    {contacts.map((contact) => {
                      const isPrimary = contact.id === effectivePrimaryContactId;
                      return (
                        <li key={contact.id} className="flex min-w-0 items-center justify-between gap-4 py-2">
                          <div className="min-w-0">
                            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                              <Link
                                href={`/directory/contacts/${contact.id}`}
                                className="truncate text-sm font-medium text-foreground underline-offset-4 hover:underline"
                              >
                                {contact.first_name} {contact.last_name}
                              </Link>
                              {contact.email && (
                                <span className="truncate text-xs text-muted-foreground">
                                  {contact.email}
                                </span>
                              )}
                              {isPrimary && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0 shrink-0"
                                >
                                  Primary
                                </Badge>
                              )}
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              {contact.job_title || "No title"}
                            </p>
                          </div>
                          {!isPrimary && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 shrink-0 text-xs text-muted-foreground"
                              disabled={settingPrimaryContactId === contact.id}
                              onClick={() => void handleSetPrimaryContact(contact.id)}
                            >
                              {settingPrimaryContactId === contact.id ? "Saving..." : "Set primary"}
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="space-y-3">
                <DsSectionHeader title={`Projects (${projects.length})`} />
                {projects.length === 0 ? (
                  <DsEmptyState
                    title="No projects"
                    description="This company is not associated with any projects."
                  />
                ) : (
                  <DsDataTable<CompanyProjectItem>
                    rows={projects}
                    columns={[
                      {
                        key: "project",
                        header: "Project",
                        primary: true,
                        render: (project) => (
                          <Link
                            href={`/${project.id}/home`}
                            className="font-medium text-foreground underline-offset-4 hover:underline"
                          >
                            {project.name || `Project ${project.id}`}
                          </Link>
                        ),
                      },
                      {
                        key: "status",
                        header: "Status",
                        render: (project) => (
                          <Badge variant={statusVariant(project.company_status)}>
                            {project.company_status || "Unknown"}
                          </Badge>
                        ),
                      },
                      {
                        key: "number",
                        header: "Number",
                        render: (project) => (
                          <span className="font-mono text-xs">
                            #{project.project_number || "-"}
                          </span>
                        ),
                      },
                    ]}
                  />
                )}
              </section>

              <section className="space-y-3">
                <DsSectionHeader title={`Invoices (${invoices.length})`} />
                {invoices.length === 0 ? (
                  <DsEmptyState
                    title="No invoices"
                    description="No invoices for this company's projects."
                  />
                ) : (
                  <DsDataTable<InvoiceItem>
                    rows={invoices.slice(0, 10)}
                    columns={[
                      {
                        key: "invoice",
                        header: "Invoice",
                        primary: true,
                        render: (invoice) =>
                          invoice.invoice_number || `Invoice ${invoice.id}`,
                      },
                      {
                        key: "status",
                        header: "Status",
                        render: (invoice) => (
                          <Badge variant={statusVariant(invoice.status)}>
                            {invoice.status || "Unknown"}
                          </Badge>
                        ),
                      },
                      {
                        key: "project",
                        header: "Project",
                        render: (invoice) =>
                          invoice.project_name || invoice.project_number || "—",
                      },
                      {
                        key: "period",
                        header: "Period",
                        align: "right",
                        render: (invoice) =>
                          invoice.period_end ? formatDate(invoice.period_end) : "—",
                      },
                    ]}
                  />
                )}
              </section>

            </>
          )}
        </div>

        <ContactFormSheet
          open={addContactOpen}
          onOpenChange={setAddContactOpen}
          defaultCompanyId={companyId ?? undefined}
          onSuccess={() => {
            void loadDetails();
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
