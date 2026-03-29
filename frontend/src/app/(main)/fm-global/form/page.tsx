import type { ReactElement } from "react";
import { createServiceClient } from "@/lib/supabase/service";
import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { FmGlobalClient } from "./fm-global-client";
import type { FmGlobalSubmissionSummary } from "@/types/fm-global";
import { fmGlobalSpecInputSchema } from "@/lib/schemas/fm-global-schemas";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getRecentSubmissions(): Promise<FmGlobalSubmissionSummary[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("fm_form_submissions")
    .select("id,created_at,user_input,matched_table_ids,selected_configuration")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    return [];
  }

  return (data ?? []).map((submission): FmGlobalSubmissionSummary => {
    const parsed = submission.user_input
      ? fmGlobalSpecInputSchema.safeParse(submission.user_input)
      : null;

    return {
      id: submission.id,
      created_at: submission.created_at ?? null,
      user_input: parsed?.success === true ? parsed.data : null,
      matched_table_ids: submission.matched_table_ids ?? null,
      selected_configuration: (submission.selected_configuration as Record<string, unknown>) ?? null,
    };
  });
}

/**
 * FM Global specifications form (global, not project-scoped).
 */
export default async function FMGlobalSpecsPage(): Promise<ReactElement> {
  const submissions = await getRecentSubmissions();

  return (
    <>
      <PageHeader
        title="FM Global Form"
        description="Enter building details to get exact FM Global table, figures, and sprinkler configuration."
        actions={
          <Button variant="outline" asChild>
            <Link href="/fm-global">Back to Dashboard</Link>
          </Button>
        }
      />
      <PageContainer maxWidth="xl">
        <FmGlobalClient initialSubmissions={submissions} />
      </PageContainer>
    </>
  );
}
