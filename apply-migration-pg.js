require("dotenv").config({path:"frontend/.env.local"});
const { Pool } = require("pg");
const fs = require("fs");

// Use DATABASE_URL from environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

console.log("Connecting to Supabase database...");

// Parse connection string to handle SSL properly
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  // Add connection timeout
  connectionTimeoutMillis: 10000
});

// Read the fixed migration SQL
console.log("Reading migration file...");
const migrationSQL = fs.readFileSync("supabase/migrations/20260201000001_add_specifications_system_fixed.sql", "utf8");

(async () => {
  const client = await pool.connect();

  try {
    console.log("Executing migration...");
    await client.query(migrationSQL);
    console.log("\n✅ Migration applied successfully!");
  } catch (error) {
    console.error("\n❌ Error applying migration:");
    console.error(error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
