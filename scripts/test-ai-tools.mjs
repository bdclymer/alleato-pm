/**
 * Test AI RAG Tools - Find projects with the most data
 *
 * Queries Supabase to find which projects have real data across all tools,
 * useful for testing the AI RAG assistant.
 */

import { readFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Resolve @supabase/supabase-js from frontend/node_modules
const __filename = fileURLToPath(import.meta.url);
const require = createRequire(join(dirname(__filename), '../frontend/package.json'));
const { createClient } = require('@supabase/supabase-js');

const __dirname = dirname(__filename);

// Parse .env file manually (no dotenv dependency needed)
function loadEnv(filePath) {
  const env = {};
  try {
    const content = readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([^=]+?)=(.*)$/);
      if (match) {
        let value = match[2].trim();
        // Remove surrounding quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        env[match[1].trim()] = value;
      }
    }
  } catch (e) {
    console.error(`Could not read ${filePath}: ${e.message}`);
  }
  return env;
}

// Load env from root .env and .env.local
const rootEnv = loadEnv(resolve(__dirname, '../.env'));
const localEnv = loadEnv(resolve(__dirname, '../.env.local'));
const env = { ...rootEnv, ...localEnv };

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Found URL:', supabaseUrl ? 'yes' : 'no');
  console.error('Found Key:', supabaseKey ? 'yes' : 'no');
  process.exit(1);
}

console.log(`Connecting to Supabase: ${supabaseUrl}\n`);
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to count rows per project_id
async function countByProject(table, projectIdCol = 'project_id') {
  const { data, error } = await supabase
    .from(table)
    .select(projectIdCol);

  if (error) {
    console.error(`  Error querying ${table}: ${error.message}`);
    return {};
  }

  const counts = {};
  for (const row of data || []) {
    const pid = row[projectIdCol];
    if (pid != null) {
      counts[pid] = (counts[pid] || 0) + 1;
    }
  }
  return counts;
}

async function main() {
  // ---- Query A: List all projects ----
  console.log('=== PROJECTS ===');
  const { data: projects, error: projErr } = await supabase
    .from('projects')
    .select('id, name')
    .order('id')
    .limit(30);

  if (projErr) {
    console.error('Error fetching projects:', projErr.message);
    return;
  }

  console.log(`Found ${projects.length} projects:\n`);
  for (const p of projects) {
    console.log(`  [${p.id}] ${p.name}`);
  }
  console.log('');

  // ---- Query B-H: Count data per project for each table ----
  const tables = [
    { name: 'budget_lines', label: 'Budget Lines' },
    { name: 'schedule_tasks', label: 'Schedule Tasks' },
    { name: 'subcontracts', label: 'Commitments' },
    { name: 'submittals', label: 'Submittals' },
    { name: 'rfis', label: 'RFIs' },
    { name: 'change_orders', label: 'Change Orders' },
    { name: 'change_events', label: 'Change Events' },
    { name: 'direct_costs', label: 'Direct Costs' },
  ];

  const allCounts = {};

  for (const t of tables) {
    console.log(`Querying ${t.name}...`);
    const counts = await countByProject(t.name);
    allCounts[t.label] = counts;

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    console.log(`  Total rows: ${total}, across ${Object.keys(counts).length} projects`);
  }
  console.log('');

  // ---- Build summary table ----
  console.log('=== DATA COVERAGE SUMMARY ===\n');

  // Header
  const colLabels = tables.map(t => t.label);
  const headerParts = [
    'ID'.padStart(4),
    'Project Name'.padEnd(40),
    ...colLabels.map(l => l.substring(0, 12).padStart(13)),
    'TOTAL'.padStart(7),
  ];
  console.log(headerParts.join(' | '));
  console.log('-'.repeat(headerParts.join(' | ').length));

  // Rows - compute totals for sorting
  const projectRows = projects.map(p => {
    const rowCounts = colLabels.map(label => allCounts[label][p.id] || 0);
    const total = rowCounts.reduce((a, b) => a + b, 0);
    return { ...p, rowCounts, total };
  });

  // Sort by total descending
  projectRows.sort((a, b) => b.total - a.total);

  for (const p of projectRows) {
    const parts = [
      String(p.id).padStart(4),
      (p.name || '(unnamed)').substring(0, 40).padEnd(40),
      ...p.rowCounts.map(c => String(c).padStart(13)),
      String(p.total).padStart(7),
    ];
    console.log(parts.join(' | '));
  }

  console.log('');

  // ---- Top 5 projects for testing ----
  console.log('=== TOP 5 PROJECTS FOR AI TOOL TESTING ===\n');
  const top5 = projectRows.slice(0, 5);
  for (const p of top5) {
    const details = colLabels
      .map((label, i) => p.rowCounts[i] > 0 ? `${label}: ${p.rowCounts[i]}` : null)
      .filter(Boolean)
      .join(', ');
    console.log(`  Project ${p.id} - ${p.name}`);
    console.log(`    Total: ${p.total} records (${details})`);
    console.log('');
  }

  // ---- Query I: company_context ----
  console.log('=== COMPANY CONTEXT ===');
  const { data: compCtx, error: compCtxErr } = await supabase
    .from('company_context')
    .select('*')
    .limit(1);

  if (compCtxErr) {
    console.log(`  Error: ${compCtxErr.message}`);
  } else if (!compCtx || compCtx.length === 0) {
    console.log('  No rows found in company_context');
  } else {
    console.log(`  Found ${compCtx.length} row(s):`);
    console.log(JSON.stringify(compCtx[0], null, 2));
  }
  console.log('');

  // ---- Query J: company_knowledge ----
  console.log('=== COMPANY KNOWLEDGE ===');
  const { data: compKnow, error: compKnowErr } = await supabase
    .from('company_knowledge')
    .select('*')
    .limit(5);

  if (compKnowErr) {
    console.log(`  Error: ${compKnowErr.message}`);
  } else if (!compKnow || compKnow.length === 0) {
    console.log('  No rows found in company_knowledge');
  } else {
    console.log(`  Found ${compKnow.length} row(s):`);
    for (const row of compKnow) {
      const preview = JSON.stringify(row).substring(0, 200);
      console.log(`  - ${preview}...`);
    }
  }
  console.log('');

  // ---- Bonus: Check AI-related tables ----
  console.log('=== AI-RELATED TABLES ===');
  const aiTables = [
    'ai_insights',
    'ai_analysis_jobs',
    'ai_tasks',
    'ai_models',
    'chat_sessions',
    'chat_messages',
    'chat_threads',
    'chat_thread_items',
  ];

  for (const tbl of aiTables) {
    const { data, error, count } = await supabase
      .from(tbl)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`  ${tbl}: Error - ${error.message}`);
    } else {
      console.log(`  ${tbl}: ${count ?? 'unknown'} rows`);
    }
  }
  console.log('');

  console.log('Done!');
}

main().catch(console.error);
