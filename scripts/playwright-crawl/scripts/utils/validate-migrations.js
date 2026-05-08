#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const KNOWN_MIGRATION_VALIDATION_ERRORS = new Set();

function objectName(match, index) {
  return match[index + 1] || match[index];
}

function stripSqlComments(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ');
}

function stripSqlForDependencyReferences(content) {
  return stripSqlComments(content)
    .replace(/\$([A-Za-z_][A-Za-z0-9_]*)?\$[\s\S]*?\$\1\$/g, ' ')
    .replace(/'(?:''|[^'])*'/g, ' ');
}

/**
 * Validation script for Supabase migrations
 * Checks for common issues and dependencies
 */

class MigrationValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
    this.migrations = [];
  }

  async validate() {
    console.log('🔍 Validating Supabase Migrations...\n');

    try {
      await this.loadMigrations();
      await this.checkDependencies();
      await this.checkEnumUsage();
      await this.checkTableReferences();
      await this.checkFunctionUsage();
      await this.checkIndexes();
      await this.checkConstraints();
      await this.checkRLSReadiness();
      await this.generateReport();
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    }
  }

  async loadMigrations() {
    console.log('Loading migration files...');
    
    const migrationsDir = path.resolve(__dirname, '../../../../supabase/migrations');
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files
      .filter(f => f.endsWith('.sql'))
      .sort(); // Ensure order

    for (const file of sqlFiles) {
      const content = await fs.readFile(path.join(migrationsDir, file), 'utf-8');
      this.migrations.push({
        file,
        content,
        number: parseInt(file.split('_')[0]) || 0
      });
    }

    console.log(`✓ Loaded ${this.migrations.length} migration files\n`);
  }

  async checkDependencies() {
    console.log('Checking migration dependencies...');

    // Check that migrations reference tables/types from previous migrations
    const definedObjects = new Set();

    // schema_dump.sql is a historical baseline, not a timestamped migration. Seed
    // its objects before ordered checks so older migrations do not warn on base
    // tables/functions that the dump already describes.
    for (const migration of this.migrations.filter((m) => m.file === 'schema_dump.sql')) {
      const creates = this.extractCreates(migration.content);
      creates.forEach(obj => definedObjects.add(obj.toLowerCase()));
    }
    
    for (const migration of this.migrations) {
      const { file, content } = migration;
      
      // Track what this migration defines
      const creates = this.extractCreates(content);
      creates.forEach(obj => definedObjects.add(obj.toLowerCase()));
      
      // Check references
      const references = this.extractReferences(content);
      for (const ref of references) {
        if (!definedObjects.has(ref.toLowerCase()) && !this.isBuiltIn(ref)) {
          this.warnings.push(`${file}: References '${ref}' which may not exist yet`);
        }
      }
    }

    console.log('✓ Dependency check complete\n');
  }

  extractCreates(content) {
    const objects = [];
    const sql = stripSqlComments(content);
    
    // Tables
    const tableMatches = sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(\w+)\.)?(\w+)/gi);
    for (const match of tableMatches) {
      objects.push(objectName(match, 1));
    }
    
    // Types
    const typeMatches = sql.matchAll(/CREATE\s+TYPE\s+(?:(\w+)\.)?(\w+)/gi);
    for (const match of typeMatches) {
      objects.push(objectName(match, 1));
    }
    
    // Functions
    const functionMatches = sql.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:(\w+)\.)?(\w+)/gi);
    for (const match of functionMatches) {
      objects.push(objectName(match, 1));
    }
    
    // Views
    const viewMatches = sql.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(?:(\w+)\.)?(\w+)/gi);
    for (const match of viewMatches) {
      objects.push(objectName(match, 1));
    }

    // Materialized views
    const materializedViewMatches = sql.matchAll(/CREATE\s+MATERIALIZED\s+VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(\w+)\.)?(\w+)/gi);
    for (const match of materializedViewMatches) {
      objects.push(objectName(match, 1));
    }
    
    return objects;
  }

  extractReferences(content) {
    const references = new Set();
    const sql = stripSqlForDependencyReferences(content);
    
    // Foreign key references
    const fkMatches = sql.matchAll(/\bREFERENCES\b\s+(?:(\w+)\.)?(\w+)/gi);
    for (const match of fkMatches) {
      references.add(objectName(match, 1));
    }

    // DDL references. Do not scan FROM/JOIN; function bodies and comments create
    // too many false positives for a migration-order guardrail.
    const ddlPatterns = [
      /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?(?:(\w+)\.)?(\w+)/gi,
      /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?\w+\s+ON\s+(?:(\w+)\.)?(\w+)/gi,
      /CREATE\s+TRIGGER\s+\w+[\s\S]*?\s+ON\s+(?:(\w+)\.)?(\w+)/gi,
      /CREATE\s+POLICY\s+(?:"[^"]+"|\w+)\s+ON\s+(?:(\w+)\.)?(\w+)/gi,
    ];

    for (const pattern of ddlPatterns) {
      for (const match of sql.matchAll(pattern)) {
        references.add(objectName(match, 1));
      }
    }
    
    return Array.from(references);
  }

  isBuiltIn(name) {
    const builtIns = ['auth', 'users', 'uuid', 'text', 'varchar', 'integer', 'boolean',
                      'timestamp', 'date', 'money', 'decimal', 'numeric', 'jsonb', 'now',
                      'gen_random_uuid', 'uuid_generate_v4', 'extensions', 'pg_catalog',
                      'information_schema', 'pg_constraint', 'pg_policies', 'pg_tables',
                      'pg_enum', 'pg_matviews', 'pg_trigger', 'table_constraints',
                      'columns', 'storage', 'objects'];
    const normalized = name.toLowerCase();
    return builtIns.includes(normalized) || normalized.startsWith('pg_');
  }

  async checkEnumUsage() {
    console.log('Checking enum type usage...');

    const enumTypes = new Set();
    const enumUsage = new Map();

    // Find all enum definitions
    for (const migration of this.migrations) {
      const enumMatches = migration.content.matchAll(/CREATE\s+TYPE\s+(\w+)\s+AS\s+ENUM/gi);
      for (const match of enumMatches) {
        enumTypes.add(match[1]);
      }
    }

    // Check enum usage
    for (const migration of this.migrations) {
      for (const enumType of enumTypes) {
        const usagePattern = new RegExp(`\\b${enumType}\\b`, 'gi');
        const matches = migration.content.match(usagePattern) || [];
        if (matches.length > 1) { // More than just the definition
          if (!enumUsage.has(enumType)) {
            enumUsage.set(enumType, []);
          }
          enumUsage.get(enumType).push(migration.file);
        }
      }
    }

    // Report unused enums
    for (const enumType of enumTypes) {
      if (!enumUsage.has(enumType)) {
        this.warnings.push(`Enum type '${enumType}' is defined but never used`);
      }
    }

    console.log('✓ Enum usage check complete\n');
  }

  async checkTableReferences() {
    console.log('Checking table relationships...');

    const tables = new Map(); // table -> [columns]
    const foreignKeys = [];

    // Extract table definitions
    for (const migration of this.migrations) {
      const tablePattern = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(\w+)\.)?(\w+)\s*\(([\s\S]*?)\);/gi;
      let match;
      
      while ((match = tablePattern.exec(migration.content)) !== null) {
        const tableName = objectName(match, 1);
        const tableBody = match[3];
        const columns = this.extractColumns(tableBody);
        tables.set(tableName, columns);
        
        // Extract foreign keys
        const fkPattern = /(\w+)\s+uuid\s+(?:NOT\s+NULL\s+)?REFERENCES\s+(?:(\w+)\.)?(\w+)\((\w+)\)/gi;
        let fkMatch;
        while ((fkMatch = fkPattern.exec(tableBody)) !== null) {
          foreignKeys.push({
            table: tableName,
            column: fkMatch[1],
            refTable: objectName(fkMatch, 2),
            refColumn: fkMatch[4]
          });
        }
      }
    }

    // Check foreign key validity
    for (const fk of foreignKeys) {
      if (!tables.has(fk.refTable) && fk.refTable !== 'auth' && fk.refTable !== 'users') {
        this.errors.push(`Table '${fk.table}' references non-existent table '${fk.refTable}'`);
      }
    }

    console.log('✓ Table relationship check complete\n');
  }

  extractColumns(tableBody) {
    const columns = [];
    const columnPattern = /(\w+)\s+(uuid|text|varchar|integer|boolean|money|decimal|date|timestamp|[\w_]+_type|[\w_]+_status)/gi;
    let match;
    
    while ((match = columnPattern.exec(tableBody)) !== null) {
      columns.push({
        name: match[1],
        type: match[2]
      });
    }
    
    return columns;
  }

  async checkFunctionUsage() {
    console.log('Checking function definitions and usage...');

    const functions = new Map();
    const triggers = [];

    // Find function definitions
    for (const migration of this.migrations) {
      const funcPattern = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:(\w+)\.)?(\w+)\(/gi;
      let match;
      
      while ((match = funcPattern.exec(migration.content)) !== null) {
        functions.set(objectName(match, 1), migration.file);
      }
    }

    // Find trigger usage
    for (const migration of this.migrations) {
      const triggerPattern = /CREATE\s+TRIGGER\s+\w+[\s\S]*?EXECUTE\s+(?:PROCEDURE|FUNCTION)\s+(?:(\w+)\.)?(\w+)\(/gi;
      let match;
      
      while ((match = triggerPattern.exec(migration.content)) !== null) {
        triggers.push({
          function: objectName(match, 1),
          file: migration.file
        });
      }
    }

    // Check if trigger functions exist
    for (const trigger of triggers) {
      if (!functions.has(trigger.function)) {
        this.errors.push(`${trigger.file}: Trigger references non-existent function '${trigger.function}'`);
      }
    }

    console.log('✓ Function usage check complete\n');
  }

  async checkIndexes() {
    console.log('Checking index coverage...');

    const foreignKeyColumns = [];
    const indexes = new Set();

    // Find all foreign key columns
    for (const migration of this.migrations) {
      if (migration.file === 'schema_dump.sql') continue;

      const tablePattern = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(\w+)\.)?(\w+)\s*\(([\s\S]*?)\);/gi;
      let match;

      while ((match = tablePattern.exec(stripSqlComments(migration.content))) !== null) {
        const tableName = objectName(match, 1);
        const tableBody = match[3];
        const fkPattern = /(\w+)\s+uuid\s+(?:NOT\s+NULL\s+)?REFERENCES/gi;
        let fkMatch;

        while ((fkMatch = fkPattern.exec(tableBody)) !== null) {
          foreignKeyColumns.push({ table: tableName, column: fkMatch[1] });
        }
      }
    }

    // Find all indexes
    for (const migration of this.migrations) {
      const indexPattern = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?\w+\s+ON\s+(?:(\w+)\.)?(\w+)[\s\S]*?\((\w+)(?:,\s*\w+)*\)/gi;
      let match;
      
      while ((match = indexPattern.exec(stripSqlComments(migration.content))) !== null) {
        indexes.add(`${objectName(match, 1)}.${match[3]}`);
      }
    }

    // Check foreign keys have indexes
    let missingIndexes = 0;
    for (const { table, column } of foreignKeyColumns) {
      if (!indexes.has(`${table}.${column}`) && !column.endsWith('_id')) {
        this.info.push(`Consider adding index for foreign key column '${table}.${column}'`);
        missingIndexes++;
      }
    }

    if (missingIndexes === 0) {
      console.log('✓ All foreign keys have indexes\n');
    } else {
      console.log(`⚠️  ${missingIndexes} foreign keys might benefit from indexes\n`);
    }
  }

  async checkConstraints() {
    console.log('Checking constraints...');

    let hasUniqueConstraints = 0;
    let hasCheckConstraints = 0;
    let hasNotNulls = 0;

    for (const migration of this.migrations) {
      // Unique constraints
      const uniqueMatches = migration.content.match(/CONSTRAINT.*UNIQUE/gi) || [];
      hasUniqueConstraints += uniqueMatches.length;

      // Check constraints  
      const checkMatches = migration.content.match(/CONSTRAINT.*CHECK/gi) || [];
      hasCheckConstraints += checkMatches.length;

      // Not null constraints
      const notNullMatches = migration.content.match(/NOT\s+NULL/gi) || [];
      hasNotNulls += notNullMatches.length;
    }

    console.log(`✓ Found ${hasUniqueConstraints} unique constraints`);
    console.log(`✓ Found ${hasCheckConstraints} check constraints`);
    console.log(`✓ Found ${hasNotNulls} not null constraints\n`);

    if (hasCheckConstraints === 0) {
      this.info.push('Consider adding CHECK constraints for data validation');
    }
  }

  async checkRLSReadiness() {
    console.log('Checking RLS readiness...');

    const tablesWithRLS = new Set();
    const allTables = new Set();

    // Find all tables
    for (const migration of this.migrations) {
      if (migration.file === 'schema_dump.sql') continue;

      const tableMatches = stripSqlComments(migration.content).matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(\w+)\.)?(\w+)/gi);
      for (const match of tableMatches) {
        allTables.add(objectName(match, 1));
      }
    }

    // Find tables with RLS enabled
    for (const migration of this.migrations) {
      const rlsMatches = stripSqlComments(migration.content).matchAll(/ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:(\w+)\.)?(\w+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi);
      for (const match of rlsMatches) {
        tablesWithRLS.add(objectName(match, 1));
      }
    }

    // Report tables without RLS
    const tablesWithoutRLS = [];
    for (const table of allTables) {
      if (!tablesWithRLS.has(table) && !['spatial_ref_sys'].includes(table)) {
        tablesWithoutRLS.push(table);
      }
    }

    if (tablesWithoutRLS.length > 0) {
      this.info.push(`${tablesWithoutRLS.length} tables without RLS detected; run with MIGRATION_VALIDATOR_VERBOSE_RLS=1 for names.`);
      if (process.env.MIGRATION_VALIDATOR_VERBOSE_RLS === '1') {
        this.info.push(`Tables without RLS: ${tablesWithoutRLS.join(', ')}`);
      }
    } else {
      console.log('✓ All tables have RLS enabled');
    }

    console.log('✓ RLS readiness check complete\n');
  }

  async generateReport() {
    console.log('='.repeat(60));
    console.log('VALIDATION REPORT');
    console.log('='.repeat(60));

    const unbaselinedErrors = this.errors.filter(
      (error) => !KNOWN_MIGRATION_VALIDATION_ERRORS.has(error)
    );
    const baselinedErrors = this.errors.filter((error) =>
      KNOWN_MIGRATION_VALIDATION_ERRORS.has(error)
    );

    if (unbaselinedErrors.length > 0) {
      console.log('\n❌ ERRORS (must fix):');
      unbaselinedErrors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }

    if (baselinedErrors.length > 0) {
      console.log('\n⚠️  BASELINED ERRORS (known legacy issues):');
      baselinedErrors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS (should review):');
      this.warnings.forEach((warning, i) => {
        console.log(`  ${i + 1}. ${warning}`);
      });
    }

    if (this.info.length > 0) {
      console.log('\nℹ️  INFO (suggestions):');
      this.info.forEach((info, i) => {
        console.log(`  ${i + 1}. ${info}`);
      });
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('\n✅ All validations passed!');
    }

    console.log('\n' + '='.repeat(60));

    // Generate validation report file
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalMigrations: this.migrations.length,
        errors: this.errors.length,
        unbaselinedErrors: unbaselinedErrors.length,
        baselinedErrors: baselinedErrors.length,
        warnings: this.warnings.length,
        info: this.info.length
      },
      errors: this.errors,
      unbaselinedErrors,
      baselinedErrors,
      warnings: this.warnings,
      info: this.info,
      migrations: this.migrations.map(m => ({
        file: m.file,
        number: m.number,
        size: m.content.length
      }))
    };

    const reportDir = path.resolve(__dirname, '../../outputs');
    await fs.mkdir(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, 'migration-validation-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // Exit with error code if there are errors
    if (unbaselinedErrors.length > 0) {
      process.exit(1);
    }
  }
}

// Run validator
async function main() {
  try {
    const validator = new MigrationValidator();
    await validator.validate();
  } catch (error) {
    console.error('❌ Validation script error:', error);
    process.exit(1);
  }
}

main();
