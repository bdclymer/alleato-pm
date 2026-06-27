import Link from "next/link";
import { supabaseService } from "@/lib/supabase";
import { SearchBox } from "@/components/search-box";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

interface Result {
  id: string;
  title: string;
  started_at: string | null;
  snippet: string | null;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  // Strip characters that would break PostgREST filter syntax / wildcards.
  const safe = query.replace(/[%,()*]/g, " ").trim();

  let results: Result[] = [];
  if (safe) {
    const sb = supabaseService();
    const [{ data: byMeta }, { data: segs }] = await Promise.all([
      sb
        .from("meetings")
        .select("id, title, started_at, summary")
        .or(`title.ilike.%${safe}%,summary.ilike.%${safe}%`)
        .order("started_at", { ascending: false })
        .limit(50),
      sb
        .from("meeting_segments")
        .select("meeting_id, text")
        .ilike("text", `%${safe}%`)
        .limit(100),
    ]);

    // Snippet per meeting from the first matching transcript segment.
    const snippetByMeeting = new Map<string, string>();
    for (const s of segs ?? []) {
      const mid = s.meeting_id as string;
      if (!snippetByMeeting.has(mid)) snippetByMeeting.set(mid, (s.text as string) ?? "");
    }

    const merged = new Map<string, Result>();
    for (const m of byMeta ?? []) {
      merged.set(m.id as string, {
        id: m.id as string,
        title: (m.title as string) ?? "Untitled meeting",
        started_at: (m.started_at as string) ?? null,
        snippet: snippetByMeeting.get(m.id as string) ?? ((m.summary as string) ?? null),
      });
    }
    // Meetings matched only by transcript text — fetch their titles.
    const missing = [...snippetByMeeting.keys()].filter((id) => !merged.has(id));
    if (missing.length) {
      const { data: extra } = await sb
        .from("meetings")
        .select("id, title, started_at")
        .in("id", missing);
      for (const m of extra ?? []) {
        merged.set(m.id as string, {
          id: m.id as string,
          title: (m.title as string) ?? "Untitled meeting",
          started_at: (m.started_at as string) ?? null,
          snippet: snippetByMeeting.get(m.id as string) ?? null,
        });
      }
    }
    results = [...merged.values()];
  }

  return (
    <div>
      <header className="mb-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold">Search</p>
        <h1 className="mt-1 mb-4 font-display text-3xl font-500 tracking-tight">Find anything</h1>
        <SearchBox initial={query} />
      </header>

      {!safe ? (
        <p className="text-sm text-muted">Search meeting titles, summaries, and full transcripts.</p>
      ) : results.length === 0 ? (
        <div className="surface px-6 py-12 text-center text-sm text-muted">
          No meetings match “{query}”.
        </div>
      ) : (
        <>
          <p className="mb-3 font-mono text-xs text-faint">{results.length} result{results.length === 1 ? "" : "s"}</p>
          <ul className="space-y-2">
            {results.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/meetings/${r.id}`}
                  className="block rounded-xl border border-line bg-ink-850 p-4 transition-colors hover:border-gold/40 hover:bg-ink-800"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="truncate font-500 text-text">{r.title}</h3>
                    <span className="shrink-0 font-mono text-[11px] text-faint">{formatDate(r.started_at)}</span>
                  </div>
                  {r.snippet && <p className="mt-1 line-clamp-2 text-sm text-muted">{r.snippet}</p>}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
