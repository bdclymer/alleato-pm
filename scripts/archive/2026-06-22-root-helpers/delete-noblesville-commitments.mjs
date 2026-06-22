#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const PROJECT_ID = 25125; // Noblesville

async function main() {
  try {
    console.log("🔍 Querying Noblesville commitments (project", PROJECT_ID, ")");

    // Query commitments for Noblesville project
    const { data: commitments, error: queryError } = await supabase
      .from("commitments")
      .select("id, number, original_amount, type")
      .eq("project_id", PROJECT_ID)
      .order("number");

    if (queryError) {
      console.error("❌ Query error:", queryError);
      process.exit(1);
    }

    if (!commitments || commitments.length === 0) {
      console.log("ℹ️  No commitments found in Noblesville project");
      process.exit(0);
    }

    console.log(
      `Found ${commitments.length} commitments to delete:`,
      commitments.map((c) => `${c.number} (${c.type})`)
    );

    // Delete each commitment
    for (const commitment of commitments) {
      const { error: deleteError } = await supabase
        .from("commitments")
        .delete()
        .eq("id", commitment.id);

      if (deleteError) {
        console.error(`❌ Failed to delete ${commitment.number}:`, deleteError);
      } else {
        console.log(`✅ Deleted ${commitment.number}`);
      }
    }

    console.log("\n✨ All commitments deleted from Noblesville project");

    // Now query all companies to get UUIDs for the lookup
    console.log("\n🔍 Fetching all companies for UUID lookup...");

    const { data: companies, error: companyError } = await supabase
      .from("companies")
      .select("id, name")
      .order("name");

    if (companyError) {
      console.error("❌ Company query error:", companyError);
      process.exit(1);
    }

    if (!companies) {
      console.log("No companies found");
      process.exit(0);
    }

    // Create a mapping of company names to UUIDs
    const companyMap = {};
    companies.forEach((company) => {
      companyMap[company.name] = company.id;
    });

    // List of vendors needed for Noblesville
    const vendors = [
      "C&S Heating & Cooling Inc.",
      "Casework Concepts LLC",
      "Superior Contractors Inc.",
      "Deem, LLC",
      "Justin Dorsey Plumbing",
      "KLEENIT GROUP INC.",
      "Inline Painting LLC",
      "Integrity Concrete Cutters",
      "Central Security & Communications",
      "Vulcan Fire Protection Services, Inc.",
      "Division 4 Masonry",
      "Market Ready Interiors Inc",
      "Apex Glass LLC",
      "Bul-Tec Roofing",
      "Central Indiana Hardware, CO, Inc",
      "EURO Plastering",
      "Steel Services, Inc",
    ];

    console.log("\n📋 Company UUID Lookup:");
    console.log("───────────────────────────────────────────────────");

    const results = {
      found: [],
      missing: [],
    };

    vendors.forEach((vendor) => {
      const uuid = companyMap[vendor];
      if (uuid) {
        results.found.push({ name: vendor, id: uuid });
        console.log(`✅ ${vendor}`);
        console.log(`   ${uuid}\n`);
      } else {
        results.missing.push(vendor);
        console.log(`❌ ${vendor} (NOT FOUND)\n`);
      }
    });

    // Save results to file
    const resultsFile = "scripts/noblesville-company-lookup.json";
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`\n📄 Results saved to ${resultsFile}`);

    if (results.missing.length > 0) {
      console.log(
        `\n⚠️  WARNING: ${results.missing.length} vendors not found in Alleato directory`
      );
      console.log("Missing vendors:", results.missing);
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
}

main();
