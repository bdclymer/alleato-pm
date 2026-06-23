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
} from "@/components/ds";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CompanyEditDialog } from "@/components/directory/CompanyEditDialog";
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

interface MeetingItem {
  id: string;
  title: string | null;
  date: string | null;
  status: string | null;
  category: string | null;
  participants: string | null;
  project_id: number | null;
  project_name: string | null;
  project_number: string | null;
  created_at: string | null;
}

interface CompanyDetailsResponse {
  company: Company;
  contacts: Contact[];
  projects: CompanyProjectItem[];
  invoices: InvoiceItem[];
  meetings: MeetingItem[];
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
      <span className="text-sm font-medium text-foreground">{value}</span>
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
  const [editCompanyOpen, setEditCompanyOpen] = React.useState(false);
  const [addContactOpen, setAddContactOpen] = React.useState(false);

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

  const company = data?.company ?? null;
  const contacts = data?.contacts ?? [];
  const projects = data?.projects ?? [];
  const invoices = data?.invoices ?? [];
  const meetings = data?.meetings ?? [];
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
                  <DropdownMenuItem onSelect={() => setEditCompanyOpen(true)}>
                    Edit company
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setAddContactOpen(true)}>
                    <UserPlus className="mr-2 h-3.5 w-3.5" />
                    Add contact
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/directory/companies/${companyId}`}>
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
                <FactRow label="Status" value={company.status || "—"} />
                <FactRow label="Type" value={company.type || "—"} />
                <FactRow label="ERP Vendor ID" value={company.acumatica_vendor_id || "—"} />
                <FactRow label="License Number" value={company.license_number || "—"} />
                <FactRow label="Email" value={company.contact_email || "—"} />
                <FactRow label="Phone" value={company.contact_phone || "—"} />
                <FactRow
                  label="Website"
                  value={
                    websiteUrl ? (
                      <a
                        href={websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                      >
                        <span className="truncate">{company.website}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
                <FactRow
                  label="Address"
                  value={company.address || "—"}
                />
                <FactRow label="Location" value={location || "—"} />
              </section>

              <section className="space-y-3">
                <DsSectionHeader
                  title={`Contacts (${contacts.length})`}
                  action={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setAddContactOpen(true)}
                    >
                      <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                      Add contact
                    </Button>
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
                        onClick={() => setAddContactOpen(true)}
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

              <section className="space-y-3">
                <DsSectionHeader title={`Meetings (${meetings.length})`} />
                {meetings.length === 0 ? (
                  <DsEmptyState
                    title="No meetings"
                    description="No meetings recorded for this company's projects."
                  />
                ) : (
                  <DsDataTable<MeetingItem>
                    rows={meetings.slice(0, 10)}
                    columns={[
                      {
                        key: "meeting",
                        header: "Meeting",
                        primary: true,
                        render: (meeting) => (
                          <Link
                            href={`/${meeting.project_id}/meetings/${meeting.id}`}
                            className="font-medium text-foreground underline-offset-4 hover:underline"
                          >
                            {meeting.title || "Untitled meeting"}
                          </Link>
                        ),
                      },
                      {
                        key: "project",
                        header: "Project",
                        render: (meeting) => meeting.project_name || "—",
                      },
                      {
                        key: "date",
                        header: "Date",
                        align: "right",
                        render: (meeting) => formatDate(meeting.date),
                      },
                    ]}
                  />
                )}
              </section>
            </>
          )}
        </div>

        {company && (
          <CompanyEditDialog
            open={editCompanyOpen}
            onOpenChange={setEditCompanyOpen}
            company={company}
            projectId={projectId}
            onSuccess={() => {
              void loadDetails();
            }}
          />
        )}

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
