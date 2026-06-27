"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser Supabase client — used only for sign-in / sign-out. */
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
