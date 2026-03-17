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
      <div className="flex items-center justify-center h-40 text-sm text-destructive">
        Error loading issues. Please try again.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Linear-style header ────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 h-11 border-b border-border/60 shrink-0">
        <span className="text-sm font-medium text-foreground">Issues</span>
      </div>
      <IssuesClientPage data={data || []} />
    </div>
  );
}
