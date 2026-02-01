require("dotenv").config({path:".env.local"});
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

console.log("Connecting to Supabase...");
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Read the migration SQL
console.log("Reading migration file...");
const migrationSQL = fs.readFileSync("supabase/migrations/20260201000001_add_specifications_system.sql", "utf8");

// Split SQL into individual statements (separated by semicolons)
const statements = migrationSQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`Executing ${statements.length} SQL statements...`);

(async () => {
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';

    // Skip comments
    if (statement.trim().startsWith('--')) continue;

    console.log(`Executing statement ${i + 1}/${statements.length}...`);

    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: statement
      });

      if (error) {
        console.error(`Error on statement ${i + 1}:`, error);
        // Try to continue with next statement
      }
    } catch (err) {
      console.error(`Exception on statement ${i + 1}:`, err.message);
    }
  }

  console.log("\nMigration application complete!");
  console.log("Note: Some statements may have failed if tables already exist.");
})();
