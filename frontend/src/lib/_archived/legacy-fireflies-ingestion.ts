/**
 * Archived legacy helper.
 *
 * This endpoint is now disabled by default on the backend.
 * Keep this here temporarily for reference only.
 */
export async function postLegacyFirefliesIngestion(data: {
  path: string;
  project_id?: number;
  dry_run?: boolean;
}) {
  const res = await fetch("/api/ingest/fireflies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Legacy ingestion failed");
  return res.json();
}
