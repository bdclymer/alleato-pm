#!/usr/bin/env node

/**
 * Generate Supabase Schema Documentation
 *
 * Creates:
 * 1. docs/schema/INDEX.md - Master index with links to all tables
 * 2. docs/schema/tables/{table-name}.md - Individual table documentation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaJsonPath = path.join(__dirname, '..', 'SUPABASE_SCHEMA_QUICK_REF.json');
const schemaDocsPath = path.join(__dirname, '..', 'SUPABASE_SCHEMA_DOCUMENTATION.md');
const outputDir = path.join(__dirname, '..', '..', 'documentation', 'docs', 'database');
const tablesDir = path.join(outputDir, 'tables');

// Create output directories
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
if (!fs.existsSync(tablesDir)) {
  fs.mkdirSync(tablesDir, { recursive: true });
}

// Read schema JSON
const schemaData = JSON.parse(fs.readFileSync(schemaJsonPath, 'utf8'));
const fullDocs = fs.readFileSync(schemaDocsPath, 'utf8');

// Parse full documentation to extract table details
const tableBlocks = fullDocs.split(/^## Table: /m).slice(1);

const tableDetails = {};
tableBlocks.forEach(block => {
  const lines = block.split('\n');
  const tableName = lines[0].replace(/`/g, '').trim();
  tableDetails[tableName] = block;
});

// Categorize tables
const categories = {
  'Financial Management': [
    'budget_items', 'budget_codes', 'budget_line_items', 'budget_modifications',
    'contracts', 'commitments', 'change_orders', 'change_events',
    'invoices', 'payments', 'billing_periods', 'schedule_of_values',
    'cost_codes', 'cost_code_types', 'direct_costs', 'direct_cost_line_items'
  ],
  'Project Management': [
    'projects', 'tasks', 'issues', 'rfis', 'submittals',
    'meetings', 'meeting_segments', 'daily_logs', 'daily_reports',
    'punch_list_items', 'inspections', 'observations'
  ],
  'Documents & Files': [
    'documents', 'document_metadata', 'document_chunks',
    'document_ingestion_jobs', 'document_processing_queue',
    'files', 'file_uploads'
  ],
  'Communication': [
    'messages', 'conversations', 'chat_messages', 'team_chat',
    'notifications', 'emails'
  ],
  'Directory & Contacts': [
    'clients', 'contacts', 'companies',
    'vendors', 'employees', 'users', 'app_users'
  ],
  'AI & Analysis': [
    'ai_insights', 'ai_analysis_jobs', 'ai_models', 'ai_tasks',
    'rag_embeddings', 'semantic_cache'
  ],
  'FM Global Compliance': [
    'fm_global_facilities', 'fm_global_inspections', 'fm_global_recommendations',
    'fm_parts', 'parts', 'system_types'
  ],
  'Workflow & Automation': [
    'workflows', 'workflow_steps', 'approvals', 'approval_chains',
    'automations', 'triggers'
  ],
  'Procore Integration': [
    'procore_sync_logs', 'procore_projects', 'procore_companies',
    'procore_users', 'procore_webhooks'
  ],
  'System & Internal': [
    '__drizzle_migrations', 'plugin_configs', 'plugin_executions',
    'audit_log', 'system_settings'
  ]
};

// Build category map
const tableCategoryMap = {};
Object.entries(categories).forEach(([category, tables]) => {
  tables.forEach(table => {
    tableCategoryMap[table] = category;
  });
});

// Generate individual table files
const allTables = Object.keys(schemaData.tables).sort();
const tablesByCategory = {};

allTables.forEach(tableName => {
  const tableInfo = schemaData.tables[tableName];
  const category = tableCategoryMap[tableName] || 'Other';

  if (!tablesByCategory[category]) {
    tablesByCategory[category] = [];
  }
  tablesByCategory[category].push(tableName);

  // Generate individual file
  const fileName = `${tableName}.md`;
  const filePath = path.join(tablesDir, fileName);

  let content = `# Table: \`${tableName}\`\n\n`;
  content += `**Category:** ${category}\n`;
  content += `**Column Count:** ${tableInfo.column_count}\n\n`;

  // Add link back to index
  content += `[← Back to Schema Index](../INDEX.md)\n\n`;

  content += `---\n\n`;

  // Add full table documentation from parsed blocks
  if (tableDetails[tableName]) {
    content += tableDetails[tableName];
  } else {
    content += `## Columns\n\n`;
    content += `| Column |\n|--------|\n`;
    tableInfo.columns.forEach(col => {
      content += `| \`${col}\` |\n`;
    });
  }

  content += `\n\n---\n\n`;
  content += `**Generated:** ${schemaData.generated}\n`;

  fs.writeFileSync(filePath, content);
});

// Generate master INDEX.md
let indexContent = `# Supabase Schema Documentation\n\n`;
indexContent += `**Total Tables:** ${schemaData.table_count}\n`;
indexContent += `**Last Updated:** ${schemaData.generated}\n\n`;

indexContent += `## Quick Navigation\n\n`;
indexContent += `- [📊 View All Tables (Alphabetical)](#all-tables-alphabetical)\n`;
indexContent += `- [📁 View by Category](#tables-by-category)\n`;
indexContent += `- [🔍 Quick Reference (JSON)](../SUPABASE_SCHEMA_QUICK_REF.json)\n`;
indexContent += `- [📖 Full Documentation](../SUPABASE_SCHEMA_DOCUMENTATION.md)\n\n`;

indexContent += `---\n\n`;

// Add tables by category
indexContent += `## Tables by Category\n\n`;

const categoryOrder = [
  'Financial Management',
  'Project Management',
  'Documents & Files',
  'Communication',
  'Directory & Contacts',
  'AI & Analysis',
  'FM Global Compliance',
  'Workflow & Automation',
  'Procore Integration',
  'System & Internal',
  'Other'
];

categoryOrder.forEach(category => {
  const tables = tablesByCategory[category];
  if (!tables || tables.length === 0) return;

  indexContent += `### ${category}\n\n`;
  indexContent += `**${tables.length} table${tables.length !== 1 ? 's' : ''}**\n\n`;

  tables.sort().forEach(tableName => {
    const tableInfo = schemaData.tables[tableName];
    indexContent += `- [\`${tableName}\`](tables/${tableName}.md) — ${tableInfo.column_count} columns\n`;
  });

  indexContent += `\n`;
});

// Add alphabetical list
indexContent += `---\n\n`;
indexContent += `## All Tables (Alphabetical)\n\n`;

allTables.forEach(tableName => {
  const tableInfo = schemaData.tables[tableName];
  const category = tableCategoryMap[tableName] || 'Other';
  indexContent += `- [\`${tableName}\`](tables/${tableName}.md) — ${tableInfo.column_count} columns · *${category}*\n`;
});

indexContent += `\n---\n\n`;
indexContent += `*Generated by \`scripts/generate-schema-docs.js\`*\n`;

fs.writeFileSync(path.join(outputDir, 'INDEX.md'), indexContent);

console.log(`✅ Generated schema documentation:`);
console.log(`   - Master index: documentation/docs/database/INDEX.md`);
console.log(`   - Individual tables: documentation/docs/database/tables/*.md`);
console.log(`   - Total tables documented: ${allTables.length}`);
