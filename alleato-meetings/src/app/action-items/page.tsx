import { supabaseService } from "@/lib/supabase";
import { ActionItemsBoard, type ActionRow } from "@/components/action-items-board";

export const dynamic = "force-dynamic";

export default async function ActionItemsPage() {
  const sb = supabaseService();
  const { data, error } = await sb
    .from("action_items")
    .select("id, title, owner, due_date, status, meeting_id, meetings(title, started_at)")
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(500);

  const rows: ActionRow[] = (data ?? []).map((a) => {
    const meeting = a.meetings as { title?: string; started_at?: string } | null;
    return {
      id: a.id as string,
      title: (a.title as string) ?? "",
      owner: (a.owner as string) ?? null,
      due_date: (a.due_date as string) ?? null,
      status: (a.status as string) ?? "open",
      meeting_id: (a.meeting_id as string) ?? "",
      meeting_title: meeting?.title ?? "Meeting",
    };
  });

  return (
    <div>
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold">Across all meetings</p>
        <h1 className="mt-1 font-display text-3xl font-500 tracking-tight">Action Items</h1>
        <p className="mt-1 text-sm text-muted">
          Every commitment captured — who owns it and when it&apos;s due.
        </p>
      </header>

      {error ? (
        <div className="surface p-6 text-sm text-bad">Could not load action items: {error.message}</div>
      ) : (
        <ActionItemsBoard rows={rows} />
      )}
    </div>
  );
}
