import type { ReactElement } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { PageShell } from "@/components/layout";
import { createServiceClient } from "@/lib/supabase/service";
import { DetailField, DetailFieldGrid } from "@/components/ds/DetailField";
import { Button } from "@/components/ui/button";
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
  user_input: FmGlobalSpecInput;
  contact_info: ContactInfo | null;
  project_details: ProjectDetails | null;
}

async function getSubmission(
  submissionId: string,
): Promise<SubmissionRecord | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("fm_form_submissions")
    .select("id,created_at,user_input,contact_info,project_details")
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
    user_input: parsed.data,
    contact_info: (data.contact_info as ContactInfo | null) ?? null,
    project_details: (data.project_details as ProjectDetails | null) ?? null,
  };
}

function formatNumber(value: number | null | undefined, suffix?: string): string {
  if (value === null || value === undefined) return "";
  return suffix ? `${value} ${suffix}` : String(value);
}

function ContainerTypeLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return value;
}

function SectionHeading({ title }: { title: string }): ReactElement {
  return (
    // eslint-disable-next-line design-system/no-raw-heading
    <h2 className="text-lg font-semibold tracking-tight text-foreground">
      {title}
    </h2>
  );
}

export default async function SubmittedPage({
  params,
}: PageProps): Promise<ReactElement> {
  const { submissionId } = await params;
  const submission = await getSubmission(submissionId);
  if (!submission) {
    notFound();
  }

  const { user_input, contact_info, project_details } = submission;

  return (
    <PageShell
      variant="content"
      title="Submission received"
      description="Thanks — we've received your ASRS sprinkler requirements. Our team will review the details below and follow up with the applicable FM Global 8-34 configuration."
      eyebrow={
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="h-5 w-5" aria-hidden />
        </span>
      }
    >
      <div className="space-y-10">
        <section className="space-y-4">
          <SectionHeading title="Your Details" />
          <DetailFieldGrid cols={2}>
            <DetailField label="Name" value={contact_info?.name} />
            <DetailField label="Email" value={contact_info?.email} />
            <DetailField
              label="Project Name"
              value={project_details?.project_name}
            />
            <DetailField
              label="Project Location"
              value={project_details?.project_location}
            />
          </DetailFieldGrid>
        </section>

        <section className="space-y-4">
          <SectionHeading title="System Classification" />
          <DetailFieldGrid cols={2}>
            <DetailField label="ASRS Type" value={user_input.asrs_type} />
            <DetailField
              label="Container Type"
              value={ContainerTypeLabel(user_input.container_type)}
            />
          </DetailFieldGrid>
        </section>

        <section className="space-y-4">
          <SectionHeading title="Building & Storage" />
          <DetailFieldGrid cols={3}>
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
          </DetailFieldGrid>
        </section>

        <div className="pt-2">
          <Button variant="outline" asChild>
            <Link href="/fm-global/form">Submit another request</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
