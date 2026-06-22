#!/usr/bin/env npx tsx
/**
 * import-to-supabase.ts
 *
 * Syncs data from the local SQLite tracker database (tracker.db) into
 * the remote Supabase procore_features and procore_pages tables.
 * Upserts features by slug and replaces all pages on each run.
 *
 * Usage: npx tsx import-to-supabase.ts
 */

import Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, 'tracker.db');
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase config. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

interface SQLiteFeature {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  procore_tool_url: string | null;
  priority: string | null;
  status: string;
  match_score: number | null;
  notes: string | null;
}

interface SQLitePage {
  id: string;
  feature_id: string;
  name: string;
  slug: string;
  page_type: string | null;
  procore_url: string | null;
  screenshot_path: string | null;
  dom_path: string | null;
  metadata_path: string | null;
  alleato_route: string | null;
  alleato_url: string | null;
  status: string;
  implementation_notes: string | null;
  button_count: number | null;
  form_field_count: number | null;
  table_column_count: number | null;
}

async function main() {
  console.log('Opening SQLite database...');
  const sqlite = new Database(DB_PATH, { readonly: true });

  console.log('Connecting to Supabase...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Test connection
  const { error: testError } = await supabase.from('procore_features').select('count').limit(1);
  if (testError) {
    console.error('Failed to connect to Supabase:', testError.message);
    process.exit(1);
  }

  // Get existing features from Supabase
  const { data: existingFeatures } = await supabase
    .from('procore_features')
    .select('id, slug');

  const existingFeaturesBySlug = new Map(
    (existingFeatures || []).map(f => [f.slug, f.id])
  );

  // Load features from SQLite
  const sqliteFeatures = sqlite.prepare(`
    SELECT id, name, slug, description, procore_tool_url, priority, status, match_score, notes
    FROM procore_features
    ORDER BY name
  `).all() as SQLiteFeature[];

  console.log(`Found ${sqliteFeatures.length} features in SQLite`);

  // Map SQLite feature IDs to Supabase UUIDs
  const featureIdMap = new Map<string, string>();

  // Upsert features
  console.log('\nImporting features...');
  for (const feature of sqliteFeatures) {
    const existingId = existingFeaturesBySlug.get(feature.slug);

    if (existingId) {
      // Update existing feature
      const { error } = await supabase
        .from('procore_features')
        .update({
          name: feature.name,
          description: feature.description,
          priority: feature.priority,
          status: feature.status,
          match_score: feature.match_score,
          procore_tool_url: feature.procore_tool_url,
        })
        .eq('id', existingId);

      if (error) {
        console.error(`  ✗ Failed to update ${feature.name}:`, error.message);
      } else {
        console.log(`  ✓ Updated ${feature.name}`);
        featureIdMap.set(feature.id, existingId);
      }
    } else {
      // Insert new feature
      const { data, error } = await supabase
        .from('procore_features')
        .insert({
          name: feature.name,
          slug: feature.slug,
          description: feature.description,
          priority: feature.priority,
          status: feature.status,
          match_score: feature.match_score,
          procore_tool_url: feature.procore_tool_url,
        })
        .select('id')
        .single();

      if (error) {
        console.error(`  ✗ Failed to insert ${feature.name}:`, error.message);
      } else if (data) {
        console.log(`  ✓ Inserted ${feature.name}`);
        featureIdMap.set(feature.id, data.id);
      }
    }
  }

  // Load pages from SQLite
  const sqlitePages = sqlite.prepare(`
    SELECT *
    FROM procore_pages
    ORDER BY feature_id, name
  `).all() as SQLitePage[];

  console.log(`\nFound ${sqlitePages.length} pages in SQLite`);

  // Clear existing pages
  console.log('\nClearing existing pages...');
  const { error: deleteError } = await supabase
    .from('procore_pages')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError) {
    console.error('Failed to clear pages:', deleteError.message);
  }

  // Import pages
  console.log('\nImporting pages...');
  let importedCount = 0;
  let skippedCount = 0;

  for (const page of sqlitePages) {
    const supabaseFeatureId = featureIdMap.get(page.feature_id);

    if (!supabaseFeatureId) {
      console.log(`  ⚠ Skipping page "${page.name}" - feature not found: ${page.feature_id}`);
      skippedCount++;
      continue;
    }

    const { error } = await supabase
      .from('procore_pages')
      .insert({
        feature_id: supabaseFeatureId,
        name: page.name,
        slug: page.slug,
        page_type: page.page_type,
        procore_url: page.procore_url,
        screenshot_path: page.screenshot_path,
        dom_path: page.dom_path,
        metadata_path: page.metadata_path,
        alleato_route: page.alleato_route,
        alleato_url: page.alleato_url,
        status: page.status,
        implementation_notes: page.implementation_notes,
        button_count: page.button_count,
        form_field_count: page.form_field_count,
        table_column_count: page.table_column_count,
      });

    if (error) {
      console.error(`  ✗ Failed to insert page "${page.name}":`, error.message);
    } else {
      importedCount++;
    }
  }

  console.log(`\n✓ Imported ${importedCount} pages (skipped ${skippedCount})`);

  // Update page counts on features
  console.log('\nUpdating page counts...');
  for (const [sqliteId, supabaseId] of featureIdMap) {
    const { count } = await supabase
      .from('procore_pages')
      .select('*', { count: 'exact', head: true })
      .eq('feature_id', supabaseId);

    await supabase
      .from('procore_features')
      .update({ page_count: count || 0 })
      .eq('id', supabaseId);
  }

  console.log('\n✅ Import complete!');
  console.log(`   Features: ${featureIdMap.size}`);
  console.log(`   Pages: ${importedCount}`);
  console.log('\nView at: http://localhost:3000/procore-tracker');

  sqlite.close();
}

main().catch(console.error);
