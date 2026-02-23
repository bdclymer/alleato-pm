// Re-exports the local snapshot of generated Supabase types.
// To regenerate: npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts
export type { Database, Json } from "./database.local.types";
