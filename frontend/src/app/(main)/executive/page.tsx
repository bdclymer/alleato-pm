import type { ComponentType } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileText,
  Mail,
  MessageSquareText,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageShell, SectionRuleHeading } from "@/components/layout";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "good" | "watch" | "risk";

type SourceKind = "Meeting" | "Email" | "Teams" | "Daily Log" | "Document";

type InsightItem = {
  title: string;
  summary: string;
  source: SourceKind;
  sourceDetail: string;
  date: string;
  project: string;
  owner?: string;
  status?: string;
  tone?: Tone;
  retrieval?: string;
};

type SourceStatus = {
  label: SourceKind;
  detail: string;
  count: number;
  latest: string;
  icon: ComponentType<{ className?: string }>;
};

const ownerActions: InsightItem[] = [
  {
    title: "Clear the Indiana WC, COI, license, and permit block",
    summary:
      "The City of Indianapolis permit STR26-00599 is blocked because general liability and workers comp insurance on file is expired. Brandon's license was described as suspended because WC proof was missing. ACB/World Insurance said the COI went out Apr 29 at 2:51 PM, but Maria said she did not see it in inbox or spam and asked for it to be attached in the original thread.",
    source: "Email",
    sourceDetail: "Insurance Issues / Permit Pending / Alleato COI threads",
    date: "Apr 30, 2026",
    project: "Company compliance",
    owner: "Brandon / Maria / ACB Insurance",
    status: "Confirm cleared",
    tone: "risk",
    retrieval: "RAG: search_document_chunks(email), sim 0.721",
  },
  {
    title: "Confirm the $300,000 wire form is complete",
    summary:
      "Brandon asked Misty whether the wire form had been filled out for a $300,000 forum draw. Misty said she had sent a request to another person and would complete it that afternoon.",
    source: "Teams",
    sourceDetail: "DM with Misty Rogers",
    date: "Apr 30, 2026",
    project: "Finance",
    owner: "Misty / Rob",
    status: "Needs confirmation",
    tone: "watch",
    retrieval: "RAG: search_document_chunks(Teams), sim 0.538",
  },
  {
    title: "Check Wilmer subcontractor payment status",
    summary:
      "Brandon asked whether any payments had been made to subcontractors for the Wilmer project. The thread reads like a finance follow-up risk that needs a paid/unpaid answer.",
    source: "Teams",
    sourceDetail: "DM about Wilmer subcontractors",
    date: "Apr 30, 2026",
    project: "Wilmer",
    owner: "Finance / project team",
    status: "Needs status",
    tone: "watch",
    retrieval: "RAG: search_document_chunks(Teams), sim 0.577",
  },
  {
    title: "Recover Ty Inman property and confirm access removal",
    summary:
      "Brandon told Maria to fire Ty and remove access to everything. Related meeting notes say company property, including a laptop and charger, is at a hotel and Jazmin was coordinating so the items are not discarded.",
    source: "Teams",
    sourceDetail: "Maria DM / Indeed Review meeting",
    date: "Apr 30, 2026",
    project: "Company operations",
    owner: "Maria / Jazmin / Ashley",
    status: "Verify complete",
    tone: "risk",
    retrieval: "RAG weak; metadata/chunk fallback",
  },
];

const delegatedActions: InsightItem[] = [
  {
    title: "Provide Liverpool building pricing",
    summary:
      "Richard Ellison/Green Law needs pricing for an approximately 11,500 SF Liverpool building for light manufacturing and garment storage, including five loading docks and 39 parking spaces. They need site-work and shell numbers to finalize the proforma and tenant rent, with metal vs CMU pricing referenced.",
    source: "Email",
    sourceDetail: "Liverpool Building Pricing",
    date: "Apr 30, 2026",
    project: "Liverpool building",
    owner: "Estimating / Brandon",
    status: "Pricing needed",
    tone: "watch",
    retrieval: "RAG weak; metadata/chunk fallback",
  },
  {
    title: "Align Union Collective team on ceiling direction",
    summary:
      "Brandon appears to have decided against the wood ceiling product and pointed the team toward an exposed liner similar to Westfield. Doug had offered better photos and a sample, but the decision should be made explicit so nobody prices or samples the wrong ceiling direction.",
    source: "Email",
    sourceDetail: "Wood Ceiling Product - Union Collective",
    date: "Apr 29, 2026",
    project: "Union Collective",
    owner: "Andrew / Jesse / Doug",
    status: "Direction set",
    tone: "watch",
    retrieval: "RAG weak; metadata/chunk fallback",
  },
  {
    title: "Get CECO preliminary framing and budget numbers",
    summary:
      "The CECO/Cornerstone discussion says preliminary framing and budget reports are due by Friday for subcontractor bidding. Doug asked them to price deflection criteria at 240 and 360s so the team can compare cost impact.",
    source: "Meeting",
    sourceDetail: "Call with CECO Buildings",
    date: "Apr 29, 2026",
    project: "Union Collective",
    owner: "CECO / Geramie",
    status: "Waiting on vendor",
    tone: "watch",
    retrieval: "RAG weak; metadata/chunk fallback",
  },
];

const surfacedUpdates: InsightItem[] = [
  {
    title: "Ace Hardware Champaign still has unresolved design blockers",
    summary:
      "The greenhouse design is still not approved, irrigation is missing, civil work is stalled until a surveyor is hired, and client decisions remain open on door relocation and lighting specs.",
    source: "Meeting",
    sourceDetail: "Weekly Ace Hardware Champaign IL Meeting",
    date: "Apr 30, 2026",
    project: "Ace Hardware Champaign",
    status: "Client/design decisions open",
    tone: "risk",
    retrieval: "RAG weak; metadata/chunk fallback",
  },
  {
    title: "Uniqlo/GPC material and safety coordination needs watching",
    summary:
      "System A is nearing completion, System B work with Exotec needs timing coordination, and safety upgrades are planned next week. A Sprinkler Division Teams message says couplings may not arrive until May 7, with concentric reducers floated as an alternate.",
    source: "Meeting",
    sourceDetail: "Uniqlo/GPC huddles / Sprinkler Division Teams",
    date: "Apr 29, 2026",
    project: "Uniqlo / GPC",
    status: "Material risk",
    tone: "watch",
    retrieval: "RAG: related couplings hit, sim 0.437",
  },
  {
    title: "Applied Engineering retainage should be checked after the run",
    summary:
      "Deem asked about retainage release. Robert confirmed $10,911.53 retained and a prior $98,203.62 payment; the check was expected in the Apr 30 run, meaning Deem should receive it next week.",
    source: "Email",
    sourceDetail: "Applied Engineering - Deem Retainage Release Request",
    date: "Apr 30, 2026",
    project: "Applied Engineering",
    status: "Confirm check run",
    tone: "good",
    retrieval: "RAG weak; metadata/chunk fallback",
  },
];

const sourceCoverage: SourceStatus[] = [
  {
    label: "Email",
    detail: "Source-filtered RAG found insurance/WC thread",
    count: 12,
    latest: "Apr 30",
    icon: Mail,
  },
  {
    label: "Teams",
    detail: "RAG found wire and Wilmer payment DMs",
    count: 6,
    latest: "Apr 30",
    icon: MessageSquareText,
  },
  {
    label: "Meeting",
    detail: "RAG mixed recent meetings with older insights",
    count: 10,
    latest: "Apr 30",
    icon: UsersRound,
  },
  {
    label: "Document",
    detail: "Metadata/chunk fallback filled weak RAG hits",
    count: 8,
    latest: "Apr 30",
    icon: FileText,
  },
];

const decisionQueue = [
  { label: "Needs Brandon", value: "4", tone: "risk" },
  { label: "Waiting on others", value: "3", tone: "watch" },
  { label: "Important updates", value: "3", tone: "good" },
  { label: "Source window", value: "48h", tone: "neutral" },
] satisfies Array<{ label: string; value: string; tone: Tone }>;

const toneStyles: Record<Tone, string> = {
  neutral: "border-border bg-background text-foreground",
  good: "border-emerald-200 bg-emerald-50 text-emerald-900",
  watch: "border-amber-200 bg-amber-50 text-amber-950",
  risk: "border-red-200 bg-red-50 text-red-950",
};

const toneDotStyles: Record<Tone, string> = {
  neutral: "bg-muted-foreground",
  good: "bg-emerald-500",
  watch: "bg-amber-500",
  risk: "bg-red-500",
};

function SourceMeta({ item }: { item: InsightItem }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{item.source}</span>
      <span>{item.sourceDetail}</span>
      <span>{item.date}</span>
      <span className="font-medium text-foreground">{item.project}</span>
      {item.retrieval ? <span>{item.retrieval}</span> : null}
    </div>
  );
}

function StatusBadge({ item }: { item: InsightItem }) {
  const tone = item.tone ?? "neutral";

  if (!item.status) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        toneStyles[tone],
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", toneDotStyles[tone])} />
      {item.status}
    </span>
  );
}

function InsightSection({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: InsightItem[];
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionRuleHeading label={title} className="mb-0 pb-0" />
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="divide-y divide-border">
          {items.map((item) => (
            <article
              key={`${item.project}-${item.title}`}
              className="group grid gap-4 p-4 transition-colors duration-150 hover:bg-muted/30 lg:grid-cols-[minmax(0,1fr)_180px]"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-start gap-2">
                  <div className="min-w-0 flex-1 text-sm font-semibold leading-6 text-foreground">
                    {item.title}
                  </div>
                  <StatusBadge item={item} />
                </div>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  {item.summary}
                </p>
                <SourceMeta item={item} />
              </div>
              <div className="flex items-start justify-between gap-3 lg:justify-end">
                {item.owner ? (
                  <div className="text-left lg:text-right">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Owner
                    </div>
                    <div className="mt-1 text-sm font-medium text-foreground">
                      {item.owner}
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SourceCoverage() {
  return (
    <section className="space-y-4">
      <div>
        <SectionRuleHeading label="Source Coverage" className="mb-0 pb-0" />
        <p className="mt-1 text-sm text-muted-foreground">
          Shows what the briefing checked before surfacing the summary.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-background">
        <div className="divide-y divide-border">
          {sourceCoverage.map((source) => {
            const Icon = source.icon;

            return (
              <div key={source.label} className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-foreground">{source.label}</div>
                    <div className="text-sm font-semibold text-foreground">{source.count}</div>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>{source.detail}</span>
                    <span>Latest {source.latest}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TomorrowWatchlist() {
  return (
    <section className="space-y-4">
      <div>
        <SectionRuleHeading label="Carry Forward" className="mb-0 pb-0" />
        <p className="mt-1 text-sm text-muted-foreground">
          Items that should remain visible until they are explicitly resolved.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="space-y-4">
          <div className="flex gap-3">
            <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">Insurance and permit clearance</div>
              <div className="text-sm text-muted-foreground">
                Keep the City of Indianapolis permit/license item visible until acceptance is confirmed.
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Clock3 className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">Finance follow-ups</div>
              <div className="text-sm text-muted-foreground">
                Carry the $300,000 wire, Wilmer payment status, and Deem retainage until confirmed.
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">Source confidence</div>
              <div className="text-sm text-muted-foreground">
                search_all_knowledge returned stale high-similarity insights, so recent chunk-backed results should lead this brief.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ExecutiveDailyInsightsPage() {
  return (
    <PageShell
      variant="dashboard"
      title="Executive Daily Insights"
      description="RAG-backed Brandon daily update from recent Supabase document chunks and metadata."
      actions={
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-full">
            Manual Review
          </Badge>
        </div>
      }
      contentClassName="space-y-8"
    >
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full">
              Manual pull
            </Badge>
            <span className="text-sm text-muted-foreground">RAG queries run May 1, 2026 against Apr 29-30 sources</span>
          </div>
          <div className="max-w-4xl space-y-3">
            <h1 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
              Brandon has four items that need direct confirmation before they disappear into the noise.
            </h1>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground">
              This is not automated yet. The items were reviewed after querying Supabase RAG RPCs. Strong RAG hits are labeled; weak retrieval spots are called out instead of hidden.
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">Review Readiness</div>
              <div className="mt-1 text-sm text-muted-foreground">RAG source, date, and owner included</div>
            </div>
            <CheckCircle2 className="h-5 w-5 text-status-success" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {decisionQueue.map((metric) => (
              <div key={metric.label} className="space-y-1 border-t border-border pt-3">
                <div className="flex items-center gap-2">
                  <span className={cn("h-1.5 w-1.5 rounded-full", toneDotStyles[metric.tone])} />
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                </div>
                <div className="text-2xl font-semibold text-foreground">{metric.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-8">
          <InsightSection
            title="Needs Brandon's Attention"
            description="Items where Brandon or his immediate support team needs to confirm, decide, or close the loop."
            items={ownerActions}
          />
          <InsightSection
            title="Waiting on Others"
            description="Items that matter to Brandon but are currently waiting on vendors, finance, estimating, or the project team."
            items={delegatedActions}
          />
          <InsightSection
            title="Important Issues and Updates"
            description="Business issues worth seeing without turning this into a noisy project-status report."
            items={surfacedUpdates}
          />
        </div>
        <aside className="space-y-8 lg:sticky lg:top-6 lg:self-start">
          <SourceCoverage />
          <TomorrowWatchlist />
          <section className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <AlertTriangle className="h-4 w-4 text-status-warning" />
              Fail Loudly Rule
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This page should not graduate into an automated send if rows are missing source, date, owner, or confidence. Missing attribution becomes an error state, not hidden copy.
            </p>
          </section>
        </aside>
      </section>

      <section className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <CircleDot className="mt-1 h-4 w-4 text-muted-foreground" />
          <div>
            <SectionRuleHeading
              label="Recommended next automation"
              className="mb-0 pb-0"
            />
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Keep this as a manual review page until the output is consistently useful, then generate the same sections from a structured briefing packet.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="rounded-full">
          Not automated
        </Badge>
      </section>
    </PageShell>
  );
}
