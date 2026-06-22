import { redirect } from "next/navigation";

// `/database` was a thinner, parallel view of the same data now owned by
// `/database-inventory` (full MAIN + RAG inventory, backed by the
// `docs/architecture/tables.yaml` source of truth + CI drift gate).
// Retired and permanently redirected to the canonical inventory page.
export default function DatabaseTablesCatalogPage() {
  redirect("/database-inventory");
}
