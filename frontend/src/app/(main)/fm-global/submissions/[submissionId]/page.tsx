import type { ReactElement, ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/layout";
import { DetailField } from "@/components/ds/DetailField";
import { Button } from "@/components/ui/button";
import { createServiceClient } from "@/lib/supabase/service";
import { fmGlobalSpecInputSchema } from "@/lib/schemas/fm-global-schemas";
import type { FmGlobalSpecInput } from "@/types/fm-global";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{ submissionId: string }>;
}

interface ContactInfo {
  name?: string | null;
  email?: string | null;
}

interface ProjectDetails {
  project_name?: string | null;
  project_location?: string | null;
}

interface SubmissionRecord {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  user_input: FmGlobalSpecInput;
  contact_info: ContactInfo | null;
  project_details: ProjectDetails | null;
  matched_table_ids: string[] | null;
  lead_status: string | null;
  lead_score: number | null;
}

async function getSubmission(
  submissionId: string,
): Promise<SubmissionRecord | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("fm_form_submissions")
    .select(
      "id,created_at,updated_at,user_input,contact_info,project_details,matched_table_ids,lead_status,lead_score",
    )
    .eq("id", submissionId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const parsed = data.user_input
    ? fmGlobalSpecInputSchema.safeParse(data.user_input)
    : null;
  if (!parsed?.success) {
    return null;
  }

  return {
    id: data.id,
    created_at: data.created_at,
    updated_at: data.updated_at,
    user_input: parsed.data,
    contact_info: (data.contact_info as ContactInfo | null) ?? null,
    project_details: (data.project_details as ProjectDetails | null) ?? null,
    matched_table_ids: data.matched_table_ids ?? null,
    lead_status: data.lead_status ?? null,
    lead_score: data.lead_score ?? null,
  };
}

function formatNumber(
  value: number | null | undefined,
  suffix?: string,
): string | null {
  if (value === null || value === undefined) return null;
  return suffix ? `${value} ${suffix}` : String(value);
}

function formatDateTime(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function SectionHeading({ title }: { title: string }): ReactElement {
  return (
    // eslint-disable-next-line design-system/no-raw-heading
    <h2 className="text-lg font-semibold tracking-tight text-foreground">
      {title}
    </h2>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section className="space-y-4">
      <SectionHeading title={title} />
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export default async function SubmissionDetailPage({
  params,
}: PageProps): Promise<ReactElement> {
  const { submissionId } = await params;
  const submission = await getSubmission(submissionId);
  if (!submission) {
    notFound();
  }

  const {
    user_input,
    contact_info,
    project_details,
    matched_table_ids,
    lead_status,
    lead_score,
    created_at,
    updated_at,
  } = submission;

  const submittedAt = formatDateTime(created_at);
  const updatedAt = formatDateTime(updated_at);

  return (
    <PageShell
      variant="detail"
      title={project_details?.project_name || "FM Global Submission"}
      description={submittedAt ? `Submitted ${submittedAt}` : undefined}
      actions={
        <Button variant="outline" asChild>
          <Link href="/fm-global/submissions">Back to submissions</Link>
        </Button>
      }
    >
      <div className="space-y-10">
        <Section title="Submission">
          <DetailField label="Submission ID" value={submission.id} />
          <DetailField label="Submitted" value={submittedAt} />
          <DetailField label="Last Updated" value={updatedAt} />
          <DetailField label="Lead Status" value={lead_status} />
          <DetailField
            label="Lead Score"
            value={lead_score !== null ? String(lead_score) : null}
          />
        </Section>

        <Section title="Contact">
          <DetailField label="Name" value={contact_info?.name} />
          <DetailField label="Email" value={contact_info?.email} />
        </Section>

        <Section title="Project">
          <DetailField
            label="Project Name"
            value={project_details?.project_name}
          />
          <DetailField
            label="Project Location"
            value={project_details?.project_location}
          />
        </Section>

        <Section title="System Classification">
          <DetailField label="ASRS Type" value={user_input.asrs_type} />
          <DetailField label="System Type" value={user_input.system_type} />
          <DetailField label="Container Type" value={user_input.container_type} />
        </Section>

        <Section title="Building & Storage">
          <DetailField
            label="Ceiling Height"
            value={formatNumber(user_input.ceiling_height_ft, "ft")}
          />
          <DetailField
            label="Storage Height"
            value={formatNumber(user_input.storage_height_ft, "ft")}
          />
          <DetailField
            label="Rack Row Depth"
            value={formatNumber(user_input.rack_row_depth_ft, "ft")}
          />
          <DetailField
            label="Commodity Class"
            value={user_input.commodity_class}
          />
          <DetailField
            label="Existing Ceiling Sprinkler K-Factor"
            value={
              user_input.k_factor !== undefined && user_input.k_factor !== null
                ? `K ${user_input.k_factor}`
                : null
            }
          />
          <DetailField
            label="Building Heated"
            value={
              user_input.building_heated === undefined ||
              user_input.building_heated === null
                ? null
                : user_input.building_heated
                  ? "Yes"
                  : "No"
            }
          />
          <DetailField
            label="Search Tolerance"
            value={formatNumber(user_input.tolerance_ft, "ft")}
          />
        </Section>

        <Section title="Matched Tables">
          <DetailField
            label="Match Count"
            value={String(matched_table_ids?.length ?? 0)}
          />
          {matched_table_ids && matched_table_ids.length > 0 ? (
            <DetailField
              label="Table IDs"
              value={
                <div className="flex flex-wrap gap-1.5">
                  {matched_table_ids.map((id) => (
                    <span
                      key={id}
                      className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground"
                    >
                      {id}
                    </span>
                  ))}
                </div>
              }
            />
          ) : null}
        </Section>
      </div>
    </PageShell>
  );
}
