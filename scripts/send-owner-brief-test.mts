#!/usr/bin/env tsx
/**
 * Test-send the Owner Briefing card to Megan only.
 *
 * Bypasses the EXECUTIVE_DAILY_BRIEF_ENABLED kill switch — use for formatting
 * verification before enabling production delivery to Brandon.
 *
 * Run from frontend/:
 *   npx tsx --tsconfig tsconfig.json ../scripts/send-owner-brief-test.mts
 */
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(import.meta.dirname, "../.env") });
config({ path: resolve(import.meta.dirname, "../frontend/.env.local"), override: true });

const { sendOwnerBriefingToTeams } = await import("@/lib/executive/owner-briefing-delivery");
const { OWNER_BRIEFING_RECIPIENTS } = await import("@/lib/executive/owner-briefing-recipients");

const megan = OWNER_BRIEFING_RECIPIENTS.find((r) => r.email.toLowerCase().includes("mharrison"));
if (!megan) {
  console.error("❌ Could not find Megan in OWNER_BRIEFING_RECIPIENTS");
  process.exit(1);
}

console.log(`\nSending Owner Brief test to ${megan.displayName} (${megan.email})…`);
const start = Date.now();

const result = await sendOwnerBriefingToTeams({ recipients: [megan] });
const elapsed = ((Date.now() - start) / 1000).toFixed(1);

if (result.ok) {
  console.log(`\n✅ Sent in ${elapsed}s`);
  console.log(`   Decisions needed:  ${result.decisionsNeeded}`);
  console.log(`   Actions required:  ${result.actionsRequired}`);
  console.log(`   Projects shown:    ${result.projectsShown}`);
  for (const r of result.recipients) {
    console.log(`   Recipient: ${r.displayName} — ${r.sent ? "delivered" : `FAILED: ${r.reason}`}`);
  }
} else {
  console.error(`\n❌ Failed (${elapsed}s): ${result.reason}`);
  process.exit(1);
}
