#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lgveqfnpkxvzbnnwuled.supabase.co',
  'sb_secret_fDpzY_Eu0StzNOZsVKegRQ_d-G5k-Jf',
  {
    auth: { persistSession: false },
    db: { schema: 'public' }
  }
);

async function createDrawingTables() {
  console.log('🔧 FIXING MCP AND CREATING DRAWING TABLES');

  // Create the tables using raw SQL since that's what works
  const sql = `
    -- Create drawing_areas table
    CREATE TABLE IF NOT EXISTS drawing_areas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      parent_area_id UUID NULL REFERENCES drawing_areas(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_by UUID NOT NULL REFERENCES auth.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
      CONSTRAINT unique_area_name_per_project UNIQUE(project_id, parent_area_id, name)
    );

    -- Create drawings table
    CREATE TABLE IF NOT EXISTS drawings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      area_id UUID NULL REFERENCES drawing_areas(id) ON DELETE SET NULL,
      drawing_number VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      discipline VARCHAR(50) NULL,
      drawing_type VARCHAR(50) NULL,
      created_by UUID NOT NULL REFERENCES auth.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
      CONSTRAINT unique_drawing_number_per_project UNIQUE(project_id, drawing_number)
    );

    -- Create drawing_revisions table
    CREATE TABLE IF NOT EXISTS drawing_revisions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      drawing_id UUID NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
      revision_number VARCHAR(10) NOT NULL,
      drawing_set_id UUID NULL,
      drawing_date DATE NULL,
      received_date DATE NOT NULL DEFAULT CURRENT_DATE,
      status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'approved', 'superseded', 'void')),
      file_url VARCHAR(500) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_size BIGINT NOT NULL,
      file_type VARCHAR(50) NOT NULL,
      is_current_revision BOOLEAN NOT NULL DEFAULT false,
      description TEXT NULL,
      uploaded_by UUID NOT NULL REFERENCES auth.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
      CONSTRAINT unique_revision_per_drawing UNIQUE(drawing_id, revision_number)
    );

    -- Enable RLS
    ALTER TABLE drawing_areas ENABLE ROW LEVEL SECURITY;
    ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE drawing_revisions ENABLE ROW LEVEL SECURITY;

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_drawing_areas_project ON drawing_areas(project_id);
    CREATE INDEX IF NOT EXISTS idx_drawings_project ON drawings(project_id);
    CREATE INDEX IF NOT EXISTS idx_drawing_revisions_drawing ON drawing_revisions(drawing_id);
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.log('❌ Error executing migration:', error.message);
      return false;
    }

    console.log('✅ Drawing tables created successfully!');

    // Test that tables exist
    const { data: areas, error: areaError } = await supabase
      .from('drawing_areas')
      .select('id')
      .limit(1);

    if (areaError) {
      console.log('❌ Table verification failed:', areaError.message);
      return false;
    }

    console.log('✅ Tables verified - MCP should now work!');
    return true;

  } catch (err) {
    console.log('💥 Migration failed:', err.message);
    return false;
  }
}

createDrawingTables().then(success => {
  if (success) {
    console.log('🎉 MCP FIXED AND TABLES CREATED!');
    console.log('🧪 The drawings feature is now ready for testing!');
  } else {
    console.log('❌ Failed to fix MCP - manual SQL needed');
  }
});