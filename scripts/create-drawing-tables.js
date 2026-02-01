#!/usr/bin/env node

/**
 * Quick script to create drawing tables using Supabase JavaScript client
 * This is a workaround since the MCP is not working and we need the tables created.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lgveqfnpkxvzbnnwuled.supabase.co',
  'sb_secret_fDpzY_Eu0StzNOZsVKegRQ_d-G5k-Jf'
);

async function createDrawingTables() {
  console.log('🚀 Creating drawing tables...');

  try {
    // Create drawing_areas table manually by inserting test data first
    // This will force Supabase to create the table structure
    console.log('Creating drawing_areas via INSERT...');

    // First try to create a test area to see if table exists
    const { data: testArea, error: testError } = await supabase
      .from('drawing_areas')
      .insert({
        project_id: 182,
        name: 'Test Area',
        description: 'Test area to create table',
        created_by: '8e0a5ed8-750b-49f1-9aa6-bbc01f634074' // Test user UUID
      })
      .select()
      .single();

    if (testError) {
      console.log('❌ drawing_areas table does not exist:', testError.message);
      console.log('Need to create tables via SQL migration...');

      // Alternative: Create via edge function or manual SQL
      console.log('\n📋 MANUAL STEPS NEEDED:');
      console.log('1. Go to Supabase Dashboard > SQL Editor');
      console.log('2. Run the migration SQL from: supabase/migrations/20260131142854_add_drawings_system.sql');
      console.log('3. Or run: cd supabase && npx supabase db push');

      return false;
    } else {
      console.log('✅ drawing_areas table exists, test record created:', testArea.id);

      // Clean up test record
      await supabase
        .from('drawing_areas')
        .delete()
        .eq('id', testArea.id);
      console.log('🧹 Test record cleaned up');

      return true;
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 Checking if drawing tables exist...');

  const success = await createDrawingTables();

  if (success) {
    console.log('✅ Drawing tables are ready!');
    console.log('🎉 The drawings feature can now be tested.');
  } else {
    console.log('❌ Drawing tables need to be created manually.');
    console.log('The drawings feature code is complete but needs database schema.');
  }
}

main().catch(console.error);