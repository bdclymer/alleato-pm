/**
 * Direct Acumatica sync script — runs outside Next.js HTTP context.
 * Usage: cd frontend && npx tsx scripts/run-acumatica-sync.ts
 */
import { createClient } from "@supabase/supabase-js";
import { syncAllMirrorEntities } from "@/lib/acumatica/mirror-sync";
import { syncVendors, syncDirectCosts, syncARInvoices, syncARPayments } from "@/lib/acumatica/sync-service";
import type { Database } from "@/types/database.types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  console.log("\n=== Acumatica Sync ===\n");
  const start = Date.now();

  // 1. Mirror sync
  console.log("Step 1: Mirror entities...");
  const mirrorResults = await syncAllMirrorEntities({ mode: "incremental" }, supabase as any);
  const mirrorErrors = mirrorResults.reduce((sum, r) => sum + r.errors, 0);
  console.log(`  ✓ ${mirrorResults.length} entities | fetched: ${mirrorResults.reduce((s,r)=>s+r.fetched,0)} | upserted: ${mirrorResults.reduce((s,r)=>s+r.upserted,0)} | errors: ${mirrorErrors}`);
  for (const r of mirrorResults) {
    if (r.errors > 0) console.log(`    ✗ ${r.entity}: ${r.errors} errors`);
  }

  // 2. Vendor sync
  console.log("\nStep 2: Vendors...");
  const vendorResult = await syncVendors(supabase as any);
  console.log(`  ✓ created: ${vendorResult.created} | updated: ${vendorResult.updated} | errors: ${vendorResult.errors.length}`);

  // 3. Project batch
  console.log("\nStep 3: Project batch...");
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("archived", false)
    .not("acumatica_project_id", "is", null)
    .order("id");

  if (!projects?.length) {
    console.log("  No mapped projects found.");
  } else {
    console.log(`  Processing ${projects.length} projects...`);
    let totalDC = 0, totalARI = 0, totalARP = 0, totalErrors = 0;
    for (const project of projects) {
      process.stdout.write(`  [${project.id}] ${(project.name ?? "").slice(0,40).padEnd(40)} `);
      const dc = await syncDirectCosts(project.id, null, supabase as any);
      const ari = await syncARInvoices(project.id, null, supabase as any);
      const arp = await syncARPayments(project.id, null, supabase as any);
      const errs = dc.errors.length + ari.errors.length + arp.errors.length;
      totalDC += dc.created + dc.updated;
      totalARI += ari.created + ari.updated;
      totalARP += arp.created + arp.updated;
      totalErrors += errs;
      console.log(`DC:${dc.created+dc.updated} ARI:${ari.created+ari.updated} ARP:${arp.created+arp.updated}${errs ? ` ✗${errs} ${[...dc.errors,...ari.errors,...arp.errors].join('; ')}` : ' ✓'}`);
    }
    console.log(`\n  Totals — DC:${totalDC} ARI:${totalARI} ARP:${totalARP} errors:${totalErrors}`);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n=== Done in ${elapsed}s ===\n`);
}

main().catch(err => { console.error("Sync failed:", err); process.exit(1); });
