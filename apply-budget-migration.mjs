import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://lgveqfnpkxvzbnnwuled.supabase.co';
const serviceKey = 'sb_secret_fDpzY_Eu0StzNOZsVKegRQ_d-G5k-Jf';

const supabase = createClient(supabaseUrl, serviceKey);

async function applyMigration() {
  console.log('Applying budget migration...');

  // Read the migration file
  const migrationSQL = fs.readFileSync(
    '/Users/meganharrison/Documents/github/alleato-pm/supabase/migrations/20260131115801_add_budget_snapshots_and_forecasts.sql',
    'utf-8'
  );

  try {
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    }).catch(async (err) => {
      // If RPC doesn't exist, try direct execution in parts
      console.log('RPC not available, executing SQL directly in parts...');

      // Split the migration into smaller parts
      const statements = migrationSQL.split(/;\s*$/m).filter(s => s.trim());

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i].trim();
        if (!statement) continue;

        console.log(`Executing statement ${i + 1}/${statements.length}...`);

        // For now, just log what we would execute
        console.log(statement.substring(0, 100) + '...');
      }

      throw new Error('Cannot execute migration directly - please run in Supabase SQL editor');
    });

    if (error) {
      console.error('Migration error:', error);
      return;
    }

    console.log('Migration applied successfully!');
  } catch (err) {
    console.error('Failed to apply migration:', err.message);
    console.log('\n=== MANUAL APPLICATION REQUIRED ===');
    console.log('Please copy the migration file and run it in the Supabase SQL editor:');
    console.log('1. Go to https://supabase.com/dashboard/project/lgveqfnpkxvzbnnwuled/sql');
    console.log('2. Copy the contents of:');
    console.log('   /Users/meganharrison/Documents/github/alleato-pm/supabase/migrations/20260131115801_add_budget_snapshots_and_forecasts.sql');
    console.log('3. Paste and execute in the SQL editor');
  }
}

applyMigration();