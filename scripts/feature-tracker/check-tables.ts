/**
 * check-tables.ts
 *
 * Verifies that required Supabase tables (procore_features, procore_pages)
 * exist and are accessible. Prints column names for procore_features.
 *
 * Usage: npx tsx check-tables.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase config. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  // Check procore_features
  const { data: features, error: featErr } = await supabase
    .from('procore_features')
    .select('*')
    .limit(1);

  if (featErr) {
    console.log('procore_features: ERROR -', featErr.message);
  } else {
    const cols = features && features.length > 0 ? Object.keys(features[0]) : [];
    console.log('procore_features: EXISTS');
    console.log('  Columns:', cols.join(', '));
  }

  // Check procore_pages
  const { data: pages, error: pageErr } = await supabase
    .from('procore_pages')
    .select('*')
    .limit(1);

  if (pageErr) {
    console.log('procore_pages: ERROR -', pageErr.message);
  } else {
    console.log('procore_pages: EXISTS');
  }
}

main();
