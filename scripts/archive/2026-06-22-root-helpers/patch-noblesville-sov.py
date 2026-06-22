#!/usr/bin/env python3
"""
Patch the 18 already-imported Noblesville commitments (project 25125).
Updates each subcontract_sov_items row with:
  - budget_code  (Cost Code column)
  - description  (Cost Code Description column — short SOV label)
Also updates each subcontracts row with:
  - description  (long Description/Inclusions scope text)
  - inclusions   (Inclusions column)
  - exclusions   (Exclusions column)
"""

import csv
import os
import sys
import psycopg2

CSV_PATH = "/Users/meganharrison/Downloads/noblesville-corrected-import/Commitments - Corrected-Table 1.csv"
DB_URL   = "postgresql://postgres.lgveqfnpkxvzbnnwuled:Alleatogroup2025!@aws-1-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require"
PROJECT_ID = 25125

def clean(val):
    return val.strip() if val else None

def load_csv():
    rows = []
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows

def main():
    rows = load_csv()
    print(f"Loaded {len(rows)} rows from CSV")

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    updated = 0
    skipped = 0

    for row in rows:
        number           = clean(row.get("Number"))
        cost_code        = clean(row.get("Cost Code"))
        cost_code_desc   = clean(row.get("Cost Code Description"))
        description      = clean(row.get("Description"))
        inclusions       = clean(row.get("Inclusions"))
        exclusions       = clean(row.get("Exclusions"))

        if not number:
            continue

        # Find the subcontract
        cur.execute(
            "SELECT id FROM subcontracts WHERE contract_number = %s AND project_id = %s AND deleted_at IS NULL",
            (number, PROJECT_ID),
        )
        result = cur.fetchone()
        if not result:
            print(f"  SKIP {number}: not found in DB")
            skipped += 1
            continue

        sc_id = result[0]

        # Update the subcontract description/inclusions/exclusions
        cur.execute(
            """UPDATE subcontracts
               SET description = %s, inclusions = %s, exclusions = %s
               WHERE id = %s""",
            (description or inclusions, inclusions, exclusions, sc_id),
        )

        # Update the SOV item (there should be exactly 1 line created by the import)
        sov_desc = cost_code_desc  # short label for SOV line
        cur.execute(
            """UPDATE subcontract_sov_items
               SET budget_code = %s, description = COALESCE(%s, description)
               WHERE subcontract_id = %s""",
            (cost_code, sov_desc, sc_id),
        )

        print(f"  OK  {number}  cost_code={cost_code or '—'}  sov_desc={sov_desc or '—'}")
        updated += 1

    conn.commit()
    cur.close()
    conn.close()

    print(f"\nDone — updated: {updated}, skipped: {skipped}")

if __name__ == "__main__":
    main()
