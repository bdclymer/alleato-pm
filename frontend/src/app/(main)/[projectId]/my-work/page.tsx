import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PageShell } from "@/components/layout";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  FileText,
  CheckCircle,
  MessageCircle,
  Package,
  AlertCircle,
  ChevronRight,
  Clock,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface SovSubmission {
  id: string;
  status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  invite_sent_at: string | null;
  commitment: {
    id: string;
    contract_number: string | null;
    title: string | null;
    amount: number | null;
  } | null;
}

interface OpenRfi {
  id: string;
  number: number;
  subject: string;
  status: string;
  created_at: string;
}

interface OpenSubmittal {
  id: string;
  submittal_number: string;
  title: string;
  status: string | null;
  final_due_date: string | null;
}

const SOV_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft — Not submitted", color: "text-muted-foreground" },
  submitted: { label: "Submitted — Awaiting review", color: "text-blue-600" },
  approved: { label: "Approved", color: "text-green-600" },
  rejected: { label: "Rejected — Revision required", color: "text-red-600" },
  revise_resubmit: { label: "Revision requested", color: "text-amber-600" },
};

function StatusPill({ status }: { status: string }) {
  const { label, color } = SOV_STATUS_LABELS[status] ?? { label: status, color: "text-muted-foreground" };
  return <span className={`text-sm font-medium ${color}`}>{label}</span>;
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-card p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default async function MyWorkPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const numericProjectId = parseInt(projectId, 10);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const serviceClient = createServiceClient();

  // Resolve person_id for the current user
  const { data: authLink } = await serviceClient
    .from("users_auth")
    .select("person_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!authLink) redirect("/access-denied?reason=no-profile");

  const personId = authLink.person_id;

  // Verify membership and confirm subcontractor role
  const { data: membership } = await serviceClient
    .from("project_directory_memberships")
    .select("user_type, permission_template_id")
    .eq("person_id", personId)
    .eq("project_id", numericProjectId)
    .eq("status", "active")
    .maybeSingle();

  // Non-subcontractors can access this page too (e.g. PM previewing) — just show a redirect hint
  const isSubcontractor = membership?.user_type === "subcontractor";

  // Resolve company_id for this person so we can filter commitments
  const { data: person } = await serviceClient
    .from("people")
    .select("id, company_id, first_name")
    .eq("id", personId)
    .maybeSingle();

  const companyId = person?.company_id ?? null;

  // Fetch all data in parallel
  const [sovResult, rfisResult, submittalsResult, projectResult] = await Promise.all([
    // SOV submissions for commitments linked to this subcontractor's company
    companyId
      ? serviceClient
          .from("subcontractor_sov_submissions")
          .select(`
            id,
            status,
            submitted_at,
            reviewed_at,
            invite_sent_at,
            commitment:subcontracts (
              id,
              contract_number,
              title,
              amount
            )
          `)
          .eq("project_id", numericProjectId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),

    // Open RFIs on this project
    serviceClient
      .from("rfis")
      .select("id, number, subject, status, created_at")
      .eq("project_id", numericProjectId)
      .not("status", "in", '("closed","draft")')
      .order("created_at", { ascending: false })
      .limit(10),

    // Submittals pending action
    serviceClient
      .from("submittals")
      .select("id, submittal_number, title, status, final_due_date")
      .eq("project_id", numericProjectId)
      .not("status", "in", '("approved","void")')
      .order("final_due_date", { ascending: true })
      .limit(10),

    // Project name
    serviceClient
      .from("projects")
      .select("name")
      .eq("id", numericProjectId)
      .maybeSingle(),
  ]);

  const sovSubmissions = (sovResult.data ?? []) as unknown as SovSubmission[];
  const openRfis = (rfisResult.data ?? []) as OpenRfi[];
  const openSubmittals = (submittalsResult.data ?? []) as OpenSubmittal[];
  const projectName = projectResult.data?.name ?? `Project #${projectId}`;
  const firstName = person?.first_name ?? "there";

  const hasPendingSov = sovSubmissions.some(
    (s) => s.status === "draft" || s.status === "revise_resubmit",
  );

  return (
    <PageShell variant="dashboard" title="My Work">
      {/* Greeting */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          {projectName} — here&apos;s what needs your attention
        </p>
      </div>

      {/* Attention banner for pending SOV */}
      {hasPendingSov && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-amber-50 px-4 py-3 dark:bg-amber-950/30">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            You have a Schedule of Values that hasn&apos;t been submitted yet.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* SOV Section */}
        <SectionCard icon={FileText} title="Schedule of Values">
          {sovSubmissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No schedule of values found for your company on this project.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {sovSubmissions.map((sov) => {
                const commitment = sov.commitment;
                const href = commitment
                  ? `/${projectId}/commitments/${commitment.id}?tab=subcontractor-sov`
                  : `/${projectId}/commitments`;
                return (
                  <Link
                    key={sov.id}
                    href={href}
                    className="group flex items-start justify-between gap-4 rounded-lg p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {commitment?.contract_number
                          ? `#${commitment.contract_number}`
                          : "Subcontract"}{" "}
                        {commitment?.title && (
                          <span className="font-normal text-muted-foreground">
                            — {commitment.title}
                          </span>
                        )}
                      </p>
                      <StatusPill status={sov.status} />
                      {sov.invite_sent_at && sov.status === "draft" && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Invited{" "}
                          {new Date(sov.invite_sent_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                );
              })}
              {isSubcontractor && (
                <div className="pt-1">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/${projectId}/invoicing/subcontractor/new`}>
                      Submit an Invoice
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        {/* RFIs Section */}
        <SectionCard icon={MessageCircle} title="Open RFIs">
          {openRfis.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open RFIs on this project.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {openRfis.map((rfi) => (
                <Link
                  key={rfi.id}
                  href={`/${projectId}/rfis/${rfi.id}`}
                  className="group flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">
                      RFI #{rfi.number}{" "}
                      <span className="text-muted-foreground">— {rfi.subject}</span>
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
              <div className="pt-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/${projectId}/rfis/new`}>Submit an RFI</Link>
                </Button>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Submittals Section */}
        <SectionCard icon={Package} title="Submittals">
          {openSubmittals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open submittals on this project.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {openSubmittals.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/${projectId}/submittals/${sub.id}`}
                  className="group flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">
                      {sub.submittal_number ? `#${sub.submittal_number}` : "Submittal"}{" "}
                      {sub.title && (
                        <span className="text-muted-foreground">— {sub.title}</span>
                      )}
                    </p>
                    {sub.final_due_date && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Due{" "}
                        {new Date(sub.final_due_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Quick Links */}
        <SectionCard icon={CheckCircle} title="Quick Links">
          <div className="flex flex-col gap-2">
            <Link
              href={`/${projectId}/documents`}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted/50"
            >
              Project Documents
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              href={`/${projectId}/rfis`}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted/50"
            >
              All RFIs
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              href={`/${projectId}/submittals`}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted/50"
            >
              All Submittals
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
