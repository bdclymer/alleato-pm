import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { apiErrorResponse } from "@/lib/api-error";

type Company = Database["public"]["Tables"]["companies"]["Row"];
type Contact = Database["public"]["Tables"]["people"]["Row"];
type Project = Database["public"]["Tables"]["projects"]["Row"];
type ProjectCompany = Database["public"]["Tables"]["project_companies"]["Row"];
type SubcontractWithTotals =
  Database["public"]["Views"]["subcontracts_with_totals"]["Row"];
type PurchaseOrderWithTotals =
  Database["public"]["Views"]["purchase_orders_with_totals"]["Row"];
type Contract = Database["public"]["Tables"]["prime_contracts"]["Row"];
type OwnerInvoice = Database["public"]["Tables"]["owner_invoices"]["Row"];
type DocumentMetadata = Database["public"]["Tables"]["document_metadata"]["Row"];

interface RouteParams {
  params: Promise<{ companyId: string }>;
}

type CommitmentItem = {
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
};

type CompanyProjectItem = {
  id: number;
  name: string | null;
  project_number: string | null;
  state: string | null;
  archived: boolean;
  company_status: string | null;
  company_type: string | null;
};

type InvoiceItem = {
  id: number;
  invoice_number: string | null;
  status: string | null;
  contract_id: string | null;
  contract_number: string | null;
  contract_title: string | null;
  project_id: number | null;
  project_name: string | null;
  project_number: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string | null;
  updated_at: string;
};

type MeetingItem = {
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
};

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { companyId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single<Company>();

    if (companyError) {
      if (companyError.code === "PGRST116") {
        return NextResponse.json({ error: "Company not found" }, { status: 404 });
      }
      return NextResponse.json(
        { error: "Failed to fetch company", details: companyError.message },
        { status: 500 },
      );
    }

    const [contactsResult, projectCompaniesResult, subcontractsResult, purchaseOrdersResult] =
      await Promise.all([
        supabase
          .from("people")
          .select("*")
          .eq("company_id", companyId)
          .order("last_name", { ascending: true })
          .returns<Contact[]>(),
        supabase
          .from("project_companies")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .returns<ProjectCompany[]>(),
        (supabase as any)
          .from("subcontracts_with_totals")
          .select("*")
          .eq("contract_company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(100),
        (supabase as any)
          .from("purchase_orders_with_totals")
          .select("*")
          .eq("contract_company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

    if (contactsResult.error) {
      return apiErrorResponse(contactsResult.error);
    }

    if (projectCompaniesResult.error) {
      return apiErrorResponse(projectCompaniesResult.error);
    }

    if (subcontractsResult.error) {
      return apiErrorResponse(subcontractsResult.error);
    }

    if (purchaseOrdersResult.error) {
      return apiErrorResponse(purchaseOrdersResult.error);
    }

    const projectCompanies = projectCompaniesResult.data || [];
    const subcontracts = (subcontractsResult.data || []) as SubcontractWithTotals[];
    const purchaseOrders = (purchaseOrdersResult.data || []) as PurchaseOrderWithTotals[];

    const projectIdsSet = new Set<number>();
    projectCompanies.forEach((row) => projectIdsSet.add(row.project_id));
    subcontracts.forEach((row) => {
      if (typeof row.project_id === "number") projectIdsSet.add(row.project_id);
    });
    purchaseOrders.forEach((row) => {
      if (typeof row.project_id === "number") projectIdsSet.add(row.project_id);
    });
    const projectIds = Array.from(projectIdsSet);

    let projects: Project[] = [];
    if (projectIds.length > 0) {
      const { data: projectData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .in("id", projectIds)
        .returns<Project[]>();

      if (projectsError) {
        return NextResponse.json(
          { error: "Failed to fetch project details", details: projectsError.message },
          { status: 500 },
        );
      }

      projects = projectData || [];
    }

    const projectMap = new Map<number, Project>();
    projects.forEach((project) => {
      projectMap.set(project.id, project);
    });

    const projectsPayload: CompanyProjectItem[] = projectIds
      .map((projectId) => {
        const project = projectMap.get(projectId);
        const projectCompany = projectCompanies.find((item) => item.project_id === projectId);
        return {
          id: projectId,
          name: project?.name || null,
          project_number: project?.project_number || null,
          state: project?.state || null,
          archived: project?.archived ?? false,
          company_status: projectCompany?.status || null,
          company_type: projectCompany?.company_type || null,
        };
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    const commitmentsPayload: CommitmentItem[] = [
      ...subcontracts.map((row) => ({
        id: row.id || "",
        type: "subcontract" as const,
        project_id: row.project_id,
        project_name:
          typeof row.project_id === "number" ? (projectMap.get(row.project_id)?.name ?? null) : null,
        project_number:
          typeof row.project_id === "number"
            ? (projectMap.get(row.project_id)?.project_number ?? null)
            : null,
        contract_number: row.contract_number,
        title: row.title,
        status: row.status,
        contract_date: row.contract_date,
        total_sov_amount: row.total_sov_amount,
        total_billed_to_date: row.total_billed_to_date,
        total_amount_remaining: row.total_amount_remaining,
        updated_at: row.updated_at,
      })),
      ...purchaseOrders.map((row) => ({
        id: row.id || "",
        type: "purchase_order" as const,
        project_id: row.project_id,
        project_name:
          typeof row.project_id === "number" ? (projectMap.get(row.project_id)?.name ?? null) : null,
        project_number:
          typeof row.project_id === "number"
            ? (projectMap.get(row.project_id)?.project_number ?? null)
            : null,
        contract_number: row.contract_number,
        title: row.title,
        status: row.status,
        contract_date: row.contract_date,
        total_sov_amount: row.total_sov_amount,
        total_billed_to_date: row.total_billed_to_date,
        total_amount_remaining: row.total_amount_remaining,
        updated_at: row.updated_at,
      })),
    ].sort((a, b) => {
      const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return bTime - aTime;
    });

    let invoicesPayload: InvoiceItem[] = [];
    let meetingsPayload: MeetingItem[] = [];
    if (projectIds.length > 0) {
      const { data: contractsData, error: contractsError } = await supabase
        .from("prime_contracts")
        .select("*")
        .in("project_id", projectIds)
        .returns<Contract[]>();

      if (contractsError) {
        return NextResponse.json(
          { error: "Failed to fetch contracts", details: contractsError.message },
          { status: 500 },
        );
      }

      const contracts = contractsData || [];
      const contractIds = contracts.map((contract) => contract.id);
      const contractMap = new Map<string, Contract>();
      contracts.forEach((contract) => {
        contractMap.set(contract.id, contract);
      });

      if (contractIds.length > 0) {
        const { data: invoiceData, error: invoicesError } = await supabase
          .from("owner_invoices")
          .select("*")
          .in("contract_id", contractIds)
          .order("created_at", { ascending: false })
          .limit(100)
          .returns<OwnerInvoice[]>();

        if (invoicesError) {
          return NextResponse.json(
            { error: "Failed to fetch invoices", details: invoicesError.message },
            { status: 500 },
          );
        }

        invoicesPayload = (invoiceData || []).map((invoice) => {
          const contract = invoice.contract_id != null ? contractMap.get(invoice.contract_id) : undefined;
          const project = contract ? projectMap.get(contract.project_id) : null;

          return {
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            status: invoice.status,
            contract_id: invoice.contract_id,
            contract_number: contract?.contract_number || null,
            contract_title: contract?.title || null,
            project_id: contract?.project_id ?? null,
            project_name: project?.name || null,
            project_number: project?.project_number || null,
            period_start: invoice.period_start,
            period_end: invoice.period_end,
            created_at: invoice.created_at,
            updated_at: invoice.updated_at,
          };
        });
      }

      const { data: meetingsData, error: meetingsError } = await supabase
        .from("document_metadata")
        .select("*")
        .in("project_id", projectIds)
        .eq("type", "meeting")
        .order("date", { ascending: false })
        .limit(200)
        .returns<DocumentMetadata[]>();

      if (meetingsError) {
        return NextResponse.json(
          { error: "Failed to fetch meetings", details: meetingsError.message },
          { status: 500 },
        );
      }

      meetingsPayload = (meetingsData || []).map((meeting) => {
        const project =
          typeof meeting.project_id === "number" ? projectMap.get(meeting.project_id) : null;

        return {
          id: meeting.id,
          title: meeting.title,
          date: meeting.date,
          status: meeting.status,
          category: meeting.category,
          participants: meeting.participants,
          project_id: meeting.project_id,
          project_name: project?.name || null,
          project_number: project?.project_number || null,
          created_at: meeting.created_at,
        };
      });
    }

    return NextResponse.json({
      company,
      contacts: contactsResult.data || [],
      projects: projectsPayload,
      commitments: commitmentsPayload,
      invoices: invoicesPayload,
      meetings: meetingsPayload,
      summary: {
        contact_count: contactsResult.data?.length || 0,
        project_count: projectsPayload.length,
        commitment_count: commitmentsPayload.length,
        invoice_count: invoicesPayload.length,
        meeting_count: meetingsPayload.length,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
