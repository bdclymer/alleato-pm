#!/usr/bin/env tsx
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../.env") });
dotenv.config({ path: resolve(__dirname, "../.env.local"), override: true });

async function main() {
  const { regenerateExecutiveBriefingDraft } = await import(
    "../src/lib/executive/executive-briefing-workflow"
  );

  const start = Date.now();
  const { draft } = await regenerateExecutiveBriefingDraft({});
  const ms = Date.now() - start;

  const allItems = [
    ...draft.packet.sections.needsBrandon,
    ...draft.packet.sections.waitingOnOthers,
    ...draft.packet.sections.importantUpdates,
  ];
  const multiCitation = allItems.filter((item) => item.citations.length > 1);

  console.log(`✓ Regenerated draft ${draft.id} for ${draft.recapDate} in ${ms}ms`);
  console.log(`  needsBrandon: ${draft.packet.sections.needsBrandon.length}`);
  console.log(`  waitingOnOthers: ${draft.packet.sections.waitingOnOthers.length}`);
  console.log(`  importantUpdates: ${draft.packet.sections.importantUpdates.length}`);
  console.log(`  total items: ${allItems.length}`);
  console.log(`  multi-citation items: ${multiCitation.length}`);
  for (const item of multiCitation) {
    console.log(`    - ${item.title} [${item.citations.length} sources]`);
    for (const citation of item.citations) {
      console.log(`        ${citation.source} :: ${citation.sourceDetail} :: ${citation.sourceUrl ?? "(no url)"}`);
    }
  }
}

main().catch((err) => {
  console.error("Regeneration failed:", err);
  process.exit(1);
});
