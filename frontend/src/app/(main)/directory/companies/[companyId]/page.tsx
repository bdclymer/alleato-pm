"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Building2, Calendar, FileText, FolderOpen, Users } from "lucide-react";
import { PageContainer, ProjectPageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
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
  if (normalized === "active" || normalized === "approved") return "default";
  if (normalized === "draft" || normalized === "pending") return "secondary";
  if (normalized === "inactive" || normalized === "void" || normalized === "rejected") {
    return "destructive";
  }
  return "outline";
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold">{value}</p>
          </div>
          <div className="text-muted-foreground">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CompanyDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.companyId as string;

  const [data, setData] = React.useState<CompanyDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    async function load() {
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
        if (isMounted) setData(payload);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to fetch company details");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [companyId]);

  if (isLoading) {
    return (
      <>
        <ProjectPageHeader title="Company Details" description="Loading company information..." />
        <PageContainer>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </PageContainer>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <ProjectPageHeader title="Company Details" description="Unable to load company details" />
        <PageContainer>
          <Card>
            <CardContent className="flex flex-col items-start gap-4 p-6">
              <p className="text-sm text-destructive">{error || "Company not found"}</p>
              <Button variant="outline" onClick={() => router.push("/directory/companies")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Companies
              </Button>
            </CardContent>
          </Card>
        </PageContainer>
      </>
    );
  }

  const { company, contacts, projects, commitments, invoices, summary } = data;
  const companyLocation = [company.city, company.state].filter(Boolean).join(", ");

  return (
    <>
      <ProjectPageHeader
        title={company.name}
        description={companyLocation || company.website || "Company details"}
        actions={
          <Button variant="outline" onClick={() => router.push("/directory/companies")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Companies
          </Button>
        }
      />
      <PageContainer>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={statusVariant(company.status)}>{company.status || "Unknown"}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="text-sm">{company.type || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="text-sm">{company.address || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Website</p>
                <p className="text-sm">{company.website || "—"}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard title="Contacts" value={summary.contact_count} icon={<Users className="h-5 w-5" />} />
            <SummaryCard title="Projects" value={summary.project_count} icon={<FolderOpen className="h-5 w-5" />} />
            <SummaryCard title="Commitments" value={summary.commitment_count} icon={<FileText className="h-5 w-5" />} />
            <SummaryCard title="Invoices" value={summary.invoice_count} icon={<Calendar className="h-5 w-5" />} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts associated with this company.</p>
              ) : (
                <div className="space-y-3">
                  {contacts.map((contact) => (
                    <div key={contact.id} className="rounded border p-3">
                      <p className="font-medium">
                        {contact.first_name} {contact.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{contact.email || "No email"}</p>
                      <p className="text-sm text-muted-foreground">
                        {contact.phone_business || contact.phone_mobile || "No phone"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Projects</CardTitle>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No projects associated with this company.</p>
              ) : (
                <div className="space-y-3">
                  {projects.map((project) => (
                    <div key={project.id} className="rounded border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{project.name || `Project ${project.id}`}</p>
                        <Badge variant={statusVariant(project.company_status)}>
                          {project.company_status || "Unknown"}
                        </Badge>
                        {project.archived ? <Badge variant="outline">Archived</Badge> : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        #{project.project_number || "—"} • {project.state || "No status"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Commitments</CardTitle>
            </CardHeader>
            <CardContent>
              {commitments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No commitments found for this company.</p>
              ) : (
                <div className="space-y-3">
                  {commitments.map((commitment) => (
                    <div key={`${commitment.type}-${commitment.id}`} className="rounded border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {commitment.contract_number || "Unnumbered"} {commitment.title ? `• ${commitment.title}` : ""}
                        </p>
                        <Badge variant="outline">
                          {commitment.type === "subcontract" ? "Subcontract" : "Purchase Order"}
                        </Badge>
                        <Badge variant={statusVariant(commitment.status)}>
                          {commitment.status || "Unknown"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {commitment.project_name || "Unknown project"} ({commitment.project_number || "—"})
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Contract: {formatCurrency(commitment.total_sov_amount)} • Billed:{" "}
                        {formatCurrency(commitment.total_billed_to_date)} • Remaining:{" "}
                        {formatCurrency(commitment.total_amount_remaining)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No invoices found for associated projects.</p>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="rounded border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{invoice.invoice_number || `Invoice ${invoice.id}`}</p>
                        <Badge variant={statusVariant(invoice.status)}>{invoice.status || "Unknown"}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Contract {invoice.contract_number || invoice.contract_id}:{" "}
                        {invoice.contract_title || "Untitled"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.project_name || "Unknown project"} ({invoice.project_number || "—"}) •{" "}
                        {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </>
  );
}
