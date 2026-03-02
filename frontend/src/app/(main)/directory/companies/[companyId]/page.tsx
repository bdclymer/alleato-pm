"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Check, ChevronsUpDown, FileText, FolderOpen, Pencil, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { createContact, updateContact } from "@/app/(other)/actions/table-actions";
import { PageContainer, ProjectPageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Database } from "@/types/database.types";

type Company = Database["public"]["Tables"]["companies"]["Row"];
type Contact = Database["public"]["Tables"]["people"]["Row"];

type ProjectOption = {
  id: number;
  name: string | null;
  project_number: string | null;
};

type ExistingContactOption = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  company_id: string | null;
};

interface CompanyProjectItem {
  id: number;
  name: string | null;
  project_number: string | null;
  state: string | null;
  archived: boolean;
  company_status: string | null;
  company_type: string | null;
}

interface CommitmentItem {
  id: string;
  type: "subcontract" | "purchase_order";
  project_id: number | null;
  project_name: string | null;
  project_number: string | null;
  contract_number: string | null;
  title: string | null;
  status: string | null;
  contract_date: string | null;
  total_sov_amount: number | null;
  total_billed_to_date: number | null;
  total_amount_remaining: number | null;
  updated_at: string | null;
}

interface InvoiceItem {
  id: number;
  invoice_number: string | null;
  status: string | null;
  contract_id: number;
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
  commitments: CommitmentItem[];
  invoices: InvoiceItem[];
  summary: {
    contact_count: number;
    project_count: number;
    commitment_count: number;
    invoice_count: number;
  };
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function formatCurrency(value: number | null | undefined): string {
  const amount = typeof value === "number" ? value : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function statusVariant(status?: string | null): "default" | "secondary" | "outline" | "destructive" {
  if (!status) return "outline";
  const normalized = status.toLowerCase();
  if (normalized === "active" || normalized === "approved" || normalized === "paid") return "default";
  if (normalized === "draft" || normalized === "pending" || normalized === "submitted") return "secondary";
  if (normalized === "inactive" || normalized === "void" || normalized === "rejected") return "destructive";
  return "outline";
}

function isOpenInvoice(status: string | null | undefined): boolean {
  const normalized = (status || "").toLowerCase();
  if (!normalized) return true;
  return !["paid", "approved", "void", "rejected"].includes(normalized);
}

function CompactStatRow({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-muted-foreground">{icon}</span>
        <span>{title}</span>
      </div>
      <span className="text-base font-semibold text-foreground">{value}</span>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

export default function CompanyDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.companyId as string;

  const [data, setData] = React.useState<CompanyDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [invoiceFilter, setInvoiceFilter] = React.useState<"all" | "open">("all");

  const [editOpen, setEditOpen] = React.useState(false);
  const [isSavingCompany, setIsSavingCompany] = React.useState(false);
  const [companyForm, setCompanyForm] = React.useState({
    name: "",
    address: "",
    city: "",
    state: "",
    website: "",
    status: "ACTIVE",
  });

  const [addContactOpen, setAddContactOpen] = React.useState(false);
  const [contactMode, setContactMode] = React.useState<"existing" | "new">("existing");
  const [isSavingContact, setIsSavingContact] = React.useState(false);
  const [availableContacts, setAvailableContacts] = React.useState<ExistingContactOption[]>([]);
  const [contactComboboxOpen, setContactComboboxOpen] = React.useState(false);
  const [contactQuery, setContactQuery] = React.useState("");
  const [selectedExistingContactId, setSelectedExistingContactId] = React.useState<string>("");
  const [newContactForm, setNewContactForm] = React.useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_business: "",
    job_title: "",
  });
  const [editContactOpen, setEditContactOpen] = React.useState(false);
  const [editingContactId, setEditingContactId] = React.useState<string>("");
  const [isUpdatingContact, setIsUpdatingContact] = React.useState(false);
  const [editContactForm, setEditContactForm] = React.useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_business: "",
    job_title: "",
  });

  const [addToProjectOpen, setAddToProjectOpen] = React.useState(false);
  const [projects, setProjects] = React.useState<ProjectOption[]>([]);
  const [projectComboboxOpen, setProjectComboboxOpen] = React.useState(false);
  const [projectQuery, setProjectQuery] = React.useState("");
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>("");
  const [confirmProjectAccessImpact, setConfirmProjectAccessImpact] = React.useState(false);
  const [isAddingToProject, setIsAddingToProject] = React.useState(false);

  const loadDetails = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/directory/companies/${companyId}/details`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; message?: string }
          | null;
        throw new Error(payload?.message || payload?.error || "Failed to fetch company details");
      }

      const payload = (await response.json()) as CompanyDetailsResponse;
      setData(payload);
      setCompanyForm({
        name: payload.company.name || "",
        address: payload.company.address || "",
        city: payload.company.city || "",
        state: payload.company.state || "",
        website: payload.company.website || "",
        status: payload.company.status || "ACTIVE",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch company details");
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  React.useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const loadAvailableContacts = React.useCallback(async () => {
    if (!data?.company.id) return;
    const supabase = createClient();
    const { data: people, error: peopleError } = await supabase
      .from("people")
      .select("id, first_name, last_name, email, company_id")
      .eq("person_type", "contact")
      .order("last_name", { ascending: true })
      .limit(200);

    if (peopleError) {
      toast.error("Failed to load contacts");
      return;
    }

    const options = (people || []).filter((person) => person.company_id !== data.company.id);
    setAvailableContacts(options as ExistingContactOption[]);
  }, [data?.company.id]);

  const loadProjects = React.useCallback(async () => {
    const response = await fetch("/api/projects?limit=200&archived=false", {
      cache: "no-store",
    });

    if (!response.ok) {
      toast.error("Failed to load projects");
      return;
    }

    const payload = (await response.json()) as { data: ProjectOption[] };
    setProjects(payload.data || []);
  }, []);

  async function handleSaveCompany() {
    if (!data?.company.id || !companyForm.name.trim()) {
      toast.error("Company name is required");
      return;
    }

    try {
      setIsSavingCompany(true);
      const response = await fetch(`/api/directory/companies/${data.company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: companyForm.name.trim(),
          address: companyForm.address || null,
          city: companyForm.city || null,
          state: companyForm.state || null,
          website: companyForm.website || null,
          status: companyForm.status || "ACTIVE",
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
        throw new Error(payload?.message || payload?.error || "Failed to update company");
      }

      toast.success("Company updated");
      setEditOpen(false);
      await loadDetails();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update company");
    } finally {
      setIsSavingCompany(false);
    }
  }

  async function handleAddExistingContact() {
    if (!selectedExistingContactId || !data?.company.id) {
      toast.error("Select a contact first");
      return;
    }

    try {
      setIsSavingContact(true);
      const result = await updateContact(selectedExistingContactId, {
        company_id: data.company.id,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      toast.success("Contact added to company");
      setAddContactOpen(false);
      setSelectedExistingContactId("");
      await loadDetails();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add contact");
    } finally {
      setIsSavingContact(false);
    }
  }

  async function handleCreateNewContact() {
    if (!data?.company.id) return;
    if (!newContactForm.first_name.trim() || !newContactForm.last_name.trim()) {
      toast.error("First and last name are required");
      return;
    }

    try {
      setIsSavingContact(true);
      const result = await createContact({
        first_name: newContactForm.first_name.trim(),
        last_name: newContactForm.last_name.trim(),
        email: newContactForm.email.trim() || null,
        phone_business: newContactForm.phone_business.trim() || null,
        job_title: newContactForm.job_title.trim() || null,
        company_id: data.company.id,
        status: "active",
      });

      if (result.error) {
        throw new Error(result.error);
      }

      toast.success("Contact created and linked to company");
      setAddContactOpen(false);
      setNewContactForm({ first_name: "", last_name: "", email: "", phone_business: "", job_title: "" });
      await loadDetails();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create contact");
    } finally {
      setIsSavingContact(false);
    }
  }

  function openEditContact(contact: Contact) {
    setEditingContactId(contact.id);
    setEditContactForm({
      first_name: contact.first_name || "",
      last_name: contact.last_name || "",
      email: contact.email || "",
      phone_business: contact.phone_business || contact.phone_mobile || "",
      job_title: contact.job_title || "",
    });
    setEditContactOpen(true);
  }

  async function handleUpdateContact() {
    if (!editingContactId) return;
    if (!editContactForm.first_name.trim() || !editContactForm.last_name.trim()) {
      toast.error("First and last name are required");
      return;
    }

    try {
      setIsUpdatingContact(true);
      const result = await updateContact(editingContactId, {
        first_name: editContactForm.first_name.trim(),
        last_name: editContactForm.last_name.trim(),
        email: editContactForm.email.trim() || null,
        phone_business: editContactForm.phone_business.trim() || null,
        job_title: editContactForm.job_title.trim() || null,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      toast.success("Contact updated");
      setEditContactOpen(false);
      setEditingContactId("");
      await loadDetails();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update contact");
    } finally {
      setIsUpdatingContact(false);
    }
  }

  async function handleAddCompanyToProject() {
    if (!data?.company.id || !selectedProjectId) {
      toast.error("Select a project first");
      return;
    }
    if (!confirmProjectAccessImpact) {
      toast.error("Confirm the access impact before continuing");
      return;
    }

    try {
      setIsAddingToProject(true);
      const response = await fetch(`/api/directory/companies/${data.company.id}/add-to-project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: Number(selectedProjectId) }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
        throw new Error(payload?.message || payload?.error || "Failed to add company to project");
      }

      toast.success("Company added to project");
      setAddToProjectOpen(false);
      setSelectedProjectId("");
      setConfirmProjectAccessImpact(false);
      await loadDetails();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add company to project");
    } finally {
      setIsAddingToProject(false);
    }
  }

  if (isLoading) {
    return (
      <>
        <ProjectPageHeader title="Company Details" description="Loading company information..." />
        <PageContainer padding={false} className="px-4 sm:px-6 lg:px-8 pt-2 sm:pt-3 pb-6 sm:pb-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-56 w-full" />
              <Skeleton className="h-56 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </PageContainer>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <ProjectPageHeader title="Company Details" description="Unable to load company details" />
        <PageContainer padding={false} className="px-4 sm:px-6 lg:px-8 pt-2 sm:pt-3 pb-6 sm:pb-8">
          <section className="space-y-4">
            <SectionHeader title="Request failed" description="The company detail endpoint returned an error." />
            <div className="rounded-md border border-border px-4 py-5">
              <p className="text-sm text-destructive">{error || "Company not found"}</p>
              <div className="mt-4">
                <Button variant="outline" onClick={() => router.push("/directory/companies")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Companies
                </Button>
              </div>
            </div>
          </section>
        </PageContainer>
      </>
    );
  }

  const { company, contacts, projects: associatedProjects, commitments, invoices, summary } = data;
  const companyLocation = [company.city, company.state].filter(Boolean).join(", ");
  const filteredInvoices = invoiceFilter === "open" ? invoices.filter((item) => isOpenInvoice(item.status)) : invoices;
  const filteredAvailableContacts = (() => {
    const query = contactQuery.trim().toLowerCase();
    if (!query) return availableContacts;
    return availableContacts.filter((contact) => {
      const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
      const email = (contact.email || "").toLowerCase();
      return fullName.includes(query) || email.includes(query);
    });
  })();
  const filteredProjects = (() => {
    const query = projectQuery.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) => {
      const name = (project.name || "").toLowerCase();
      const number = (project.project_number || "").toLowerCase();
      return name.includes(query) || number.includes(query);
    });
  })();

  return (
    <>
      <ProjectPageHeader
        title={company.name}
        description={companyLocation || company.website || "Company details"}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push("/directory/companies")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Company
            </Button>
          </div>
        }
      />

      <PageContainer padding={false} className="px-4 sm:px-6 lg:px-8 pt-2 sm:pt-3 pb-6 sm:pb-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-8">
            <section className="space-y-4 border-b border-border pb-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <SectionHeader title="Contacts" description="People linked to this company." />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    setAddContactOpen(true);
                    setContactMode("existing");
                    setContactQuery("");
                    setContactComboboxOpen(false);
                    await loadAvailableContacts();
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Contact
                </Button>
              </div>
              {contacts.length === 0 ? (
                <EmptyState message="No contacts associated with this company." />
              ) : (
                <div className="max-w-3xl">
                  <ul className="divide-y divide-border">
                    {contacts.map((contact) => (
                      <li key={contact.id}>
                        <button
                          type="button"
                          onClick={() => openEditContact(contact)}
                          className="grid w-full grid-cols-1 gap-1 py-3 text-left transition-colors hover:bg-muted/30 md:grid-cols-[minmax(0,1fr)_minmax(220px,1fr)_180px]"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {contact.first_name} {contact.last_name}
                            </p>
                            <p className="truncate text-sm text-muted-foreground">
                              {contact.job_title || "No job title"}
                            </p>
                          </div>
                          <p className="truncate text-sm text-muted-foreground">
                            {contact.email || "No email"}
                          </p>
                          <p className="truncate text-sm text-muted-foreground md:text-right">
                            {contact.phone_business || contact.phone_mobile || "No phone"}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="space-y-4 border-b border-border pb-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <SectionHeader title="Projects" description="Projects where this company is involved." />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    setAddToProjectOpen(true);
                    setProjectQuery("");
                    setProjectComboboxOpen(false);
                    await loadProjects();
                  }}
                >
                  Add to Project
                </Button>
              </div>
              {associatedProjects.length === 0 ? (
                <EmptyState message="No projects associated with this company." />
              ) : (
                <div className="overflow-hidden rounded-md border border-border">
                  <ul className="divide-y divide-border">
                    {associatedProjects.map((project) => (
                      <li key={project.id} className="space-y-2 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{project.name || `Project ${project.id}`}</p>
                          <Badge variant={statusVariant(project.company_status)}>
                            {project.company_status || "Unknown"}
                          </Badge>
                          {project.archived ? <Badge variant="outline">Archived</Badge> : null}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          #{project.project_number || "-"} • {project.state || "No status"}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="space-y-4 border-b border-border pb-8">
              <SectionHeader
                title="Commitments"
                description="Contracts and purchase orders tied to this company."
              />
              {commitments.length === 0 ? (
                <EmptyState message="No commitments found for this company." />
              ) : (
                <div className="overflow-hidden rounded-md border border-border">
                  <ul className="divide-y divide-border">
                    {commitments.map((commitment) => (
                      <li key={`${commitment.type}-${commitment.id}`} className="space-y-2 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {commitment.contract_number || "Unnumbered"}
                            {commitment.title ? ` • ${commitment.title}` : ""}
                          </p>
                          <Badge variant="outline">
                            {commitment.type === "subcontract" ? "Subcontract" : "Purchase Order"}
                          </Badge>
                          <Badge variant={statusVariant(commitment.status)}>
                            {commitment.status || "Unknown"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {commitment.project_name || "Unknown project"} ({commitment.project_number || "-"})
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Contract: {formatCurrency(commitment.total_sov_amount)} • Billed: {formatCurrency(commitment.total_billed_to_date)} • Remaining: {formatCurrency(commitment.total_amount_remaining)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="space-y-4 pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <SectionHeader title="Invoices" description="Invoice activity across associated projects." />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={invoiceFilter === "open" ? "default" : "outline"}
                    onClick={() => setInvoiceFilter("open")}
                  >
                    Open only
                  </Button>
                  <Button
                    size="sm"
                    variant={invoiceFilter === "all" ? "default" : "outline"}
                    onClick={() => setInvoiceFilter("all")}
                  >
                    All
                  </Button>
                </div>
              </div>
              {filteredInvoices.length === 0 ? (
                <EmptyState
                  message={
                    invoiceFilter === "open"
                      ? "No open invoices found for associated projects."
                      : "No invoices found for associated projects."
                  }
                />
              ) : (
                <div className="overflow-hidden rounded-md border border-border">
                  <ul className="divide-y divide-border">
                    {filteredInvoices.map((invoice) => (
                      <li key={invoice.id} className="space-y-2 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{invoice.invoice_number || `Invoice ${invoice.id}`}</p>
                          <Badge variant={statusVariant(invoice.status)}>{invoice.status || "Unknown"}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Contract {invoice.contract_number || invoice.contract_id}: {invoice.contract_title || "Untitled"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.project_name || "Unknown project"} ({invoice.project_number || "-"}) • {formatDate(invoice.period_start)} to {formatDate(invoice.period_end)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-4 lg:self-start">
            <section className="space-y-4">
              <SectionHeader title="Overview" description="Core company profile and contact information." />
              <div className="rounded-md border border-border p-4">
                <dl className="space-y-4">
                  <DetailField
                    label="Status"
                    value={<Badge variant={statusVariant(company.status)}>{company.status || "Unknown"}</Badge>}
                  />
                  <DetailField label="Type" value={company.type || "-"} />
                  <DetailField label="Address" value={company.address || "-"} />
                  <DetailField
                    label="Website"
                    value={
                      company.website ? (
                        <a
                          className="text-primary underline-offset-4 hover:underline"
                          href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {company.website}
                        </a>
                      ) : (
                        "-"
                      )
                    }
                  />
                </dl>
              </div>
            </section>

            <section className="space-y-4">
              <SectionHeader title="Summary" description="Record counts." />
              <div className="rounded-md border border-border px-4 py-2">
                <CompactStatRow title="Contacts" value={summary.contact_count} icon={<Users className="h-4 w-4" />} />
                <div className="border-t border-border" />
                <CompactStatRow title="Projects" value={summary.project_count} icon={<FolderOpen className="h-4 w-4" />} />
                <div className="border-t border-border" />
                <CompactStatRow title="Commitments" value={summary.commitment_count} icon={<FileText className="h-4 w-4" />} />
                <div className="border-t border-border" />
                <CompactStatRow title="Invoices" value={summary.invoice_count} icon={<Calendar className="h-4 w-4" />} />
              </div>
            </section>
          </aside>
        </div>
      </PageContainer>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>Update company profile details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-company-name">Name</Label>
              <Input
                id="edit-company-name"
                value={companyForm.name}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-company-address">Address</Label>
              <Input
                id="edit-company-address"
                value={companyForm.address}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="edit-company-city">City</Label>
                <Input
                  id="edit-company-city"
                  value={companyForm.city}
                  onChange={(e) => setCompanyForm((prev) => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-company-state">State</Label>
                <Input
                  id="edit-company-state"
                  value={companyForm.state}
                  onChange={(e) => setCompanyForm((prev) => ({ ...prev, state: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-company-website">Website</Label>
              <Input
                id="edit-company-website"
                value={companyForm.website}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, website: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={companyForm.status} onValueChange={(value) => setCompanyForm((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isSavingCompany}>
              Cancel
            </Button>
            <Button onClick={handleSaveCompany} disabled={isSavingCompany}>
              {isSavingCompany ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addContactOpen} onOpenChange={setAddContactOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>
              Add an existing contact to this company or create a new one.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={contactMode} onValueChange={(value) => setContactMode(value as "existing" | "new")}>
            <TabsList className="w-full">
              <TabsTrigger value="existing" className="flex-1">Existing Contact</TabsTrigger>
              <TabsTrigger value="new" className="flex-1">Create New</TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="space-y-4 pt-2">
              <div className="grid gap-2">
                <Label>Contact</Label>
                <Popover
                  open={contactComboboxOpen}
                  onOpenChange={(open) => {
                    setContactComboboxOpen(open);
                    if (!open) setContactQuery("");
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={contactComboboxOpen}
                      className="w-full justify-between"
                    >
                      {selectedExistingContactId
                        ? (() => {
                            const selected = availableContacts.find((item) => item.id === selectedExistingContactId);
                            if (!selected) return "Select contact";
                            return `${selected.first_name} ${selected.last_name}${selected.email ? ` • ${selected.email}` : ""}`;
                          })()
                        : "Select contact"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Type a name or email..."
                        value={contactQuery}
                        onValueChange={setContactQuery}
                      />
                      <CommandList>
                        <CommandEmpty>No matching contacts.</CommandEmpty>
                        <CommandGroup>
                          {filteredAvailableContacts.map((contact) => (
                            <CommandItem
                              key={contact.id}
                              value={contact.id}
                              onSelect={() => {
                                setSelectedExistingContactId(contact.id);
                                setContactComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedExistingContactId === contact.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              {contact.first_name} {contact.last_name}
                              {contact.email ? ` • ${contact.email}` : ""}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddContactOpen(false)} disabled={isSavingContact}>
                  Cancel
                </Button>
                <Button onClick={handleAddExistingContact} disabled={isSavingContact}>
                  {isSavingContact ? "Adding..." : "Add Contact"}
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="new" className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="new-contact-first">First Name</Label>
                  <Input
                    id="new-contact-first"
                    value={newContactForm.first_name}
                    onChange={(e) => setNewContactForm((prev) => ({ ...prev, first_name: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-contact-last">Last Name</Label>
                  <Input
                    id="new-contact-last"
                    value={newContactForm.last_name}
                    onChange={(e) => setNewContactForm((prev) => ({ ...prev, last_name: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-contact-email">Email</Label>
                <Input
                  id="new-contact-email"
                  type="email"
                  value={newContactForm.email}
                  onChange={(e) => setNewContactForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-contact-phone">Phone</Label>
                <Input
                  id="new-contact-phone"
                  value={newContactForm.phone_business}
                  onChange={(e) => setNewContactForm((prev) => ({ ...prev, phone_business: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-contact-title">Job Title</Label>
                <Input
                  id="new-contact-title"
                  value={newContactForm.job_title}
                  onChange={(e) => setNewContactForm((prev) => ({ ...prev, job_title: e.target.value }))}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddContactOpen(false)} disabled={isSavingContact}>
                  Cancel
                </Button>
                <Button onClick={handleCreateNewContact} disabled={isSavingContact}>
                  {isSavingContact ? "Creating..." : "Create Contact"}
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={editContactOpen} onOpenChange={setEditContactOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>Update this company contact information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="edit-contact-first">First Name</Label>
                <Input
                  id="edit-contact-first"
                  value={editContactForm.first_name}
                  onChange={(e) => setEditContactForm((prev) => ({ ...prev, first_name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-contact-last">Last Name</Label>
                <Input
                  id="edit-contact-last"
                  value={editContactForm.last_name}
                  onChange={(e) => setEditContactForm((prev) => ({ ...prev, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-contact-email">Email</Label>
              <Input
                id="edit-contact-email"
                type="email"
                value={editContactForm.email}
                onChange={(e) => setEditContactForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-contact-phone">Phone</Label>
              <Input
                id="edit-contact-phone"
                value={editContactForm.phone_business}
                onChange={(e) => setEditContactForm((prev) => ({ ...prev, phone_business: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-contact-title">Job Title</Label>
              <Input
                id="edit-contact-title"
                value={editContactForm.job_title}
                onChange={(e) => setEditContactForm((prev) => ({ ...prev, job_title: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditContactOpen(false);
                setEditingContactId("");
              }}
              disabled={isUpdatingContact}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateContact} disabled={isUpdatingContact}>
              {isUpdatingContact ? "Saving..." : "Save Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addToProjectOpen} onOpenChange={setAddToProjectOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Company to Project</DialogTitle>
            <DialogDescription>
              Assign this company to a project and grant directory visibility.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Project</Label>
              <Popover
                open={projectComboboxOpen}
                onOpenChange={(open) => {
                  setProjectComboboxOpen(open);
                  if (!open) setProjectQuery("");
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={projectComboboxOpen}
                    className="w-full justify-between"
                  >
                    {selectedProjectId
                      ? (() => {
                          const selected = projects.find((item) => String(item.id) === selectedProjectId);
                          if (!selected) return "Select project";
                          return `${selected.project_number ? `${selected.project_number} • ` : ""}${selected.name || `Project ${selected.id}`}`;
                        })()
                      : "Select project"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Type project number or name..."
                      value={projectQuery}
                      onValueChange={setProjectQuery}
                    />
                    <CommandList>
                      <CommandEmpty>No matching projects.</CommandEmpty>
                      <CommandGroup>
                        {filteredProjects.map((project) => (
                          <CommandItem
                            key={project.id}
                            value={String(project.id)}
                            onSelect={() => {
                              setSelectedProjectId(String(project.id));
                              setProjectComboboxOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedProjectId === String(project.id) ? "opacity-100" : "opacity-0",
                              )}
                            />
                            {project.project_number ? `${project.project_number} • ` : ""}
                            {project.name || `Project ${project.id}`}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              Adding this company to a project may allow contacts from this company to access project directory information based on project membership and permissions.
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="confirm-project-access"
                checked={confirmProjectAccessImpact}
                onCheckedChange={(checked) => setConfirmProjectAccessImpact(checked === true)}
              />
              <Label htmlFor="confirm-project-access" className="text-sm leading-5">
                I understand this assignment can impact directory visibility and access.
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddToProjectOpen(false);
                setConfirmProjectAccessImpact(false);
              }}
              disabled={isAddingToProject}
            >
              Cancel
            </Button>
            <Button onClick={handleAddCompanyToProject} disabled={isAddingToProject}>
              {isAddingToProject ? "Adding..." : "Add to Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
