import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DB_INVENTORY } from "@/components/dev-tools/db-inventory.generated";

async function requireAdmin() {
  const user = await getApiRouteUser();
  if (!user) return null;
  const supa = createServiceClient();
  const { data } = await supa
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  return data?.is_admin ? user : null;
}

interface RefreshUpdate {
  name: string;
  db: "MAIN" | "RAG";
  approxRows: number;
  totalSize: string;
  lastAutoanalyze: string | null;
}

// This route returns stats from the last generator run.
// For true live counts, re-run `npm run db:inventory`.
export const POST = withApiGuardrails(
  "/api/admin/db-inventory/refresh#POST",
  async ({ request }) => {
    const user = await requireAdmin();
    if (!user) {
      throw new GuardrailError({
        code: "FORBIDDEN",
        where: "/api/admin/db-inventory/refresh#POST",
        message: "Admin access required.",
        status: 403,
      });
    }

    const body = (await request.json().catch(() => ({}))) as { tables?: string[] };
    const requestedNames = body.tables ?? null;

    const allTables = DB_INVENTORY.tables;
    const targetTables = requestedNames
      ? allTables.filter((t) => requestedNames.includes(t.name))
      : allTables;

    if (targetTables.length === 0) {
      return NextResponse.json({ refreshedAt: new Date().toISOString(), updates: [] });
    }

    // Return current stats from the generated file.
    // The generated file is refreshed by npm run db:inventory.
    // A more expensive live query could be added here later via a server-side pg client.
    const updates: RefreshUpdate[] = targetTables.map((t) => ({
      name: t.name,
      db: t.db,
      approxRows: t.liveStats.approxRows,
      totalSize: t.liveStats.totalSize,
      lastAutoanalyze: t.liveStats.lastAutoanalyze,
    }));

    return NextResponse.json({
      refreshedAt: new Date().toISOString(),
      updates,
    });
  },
);
