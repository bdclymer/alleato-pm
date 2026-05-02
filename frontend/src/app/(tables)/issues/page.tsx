import { PageShell } from "@/components/layout";
import { createClient } from "@/lib/supabase/server";
import { IssuesClientPage } from "./issues-client";

export default async function IssuesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <PageShell variant="table" title="Tasks" showHeader={false}>
        <div className="flex h-40 items-center justify-center text-sm text-destructive">
          Error loading tasks. Please try again.
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell variant="table" title="Tasks" showHeader={false}>
      <IssuesClientPage data={data || []} />
    </PageShell>
  );
}
