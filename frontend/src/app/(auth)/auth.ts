/**
 * Auth compatibility shim.
 *
 * The ai-sdk chatbot pages expect a NextAuth-style `auth()` function.
 * This module bridges that API to the existing Supabase Auth system so
 * the copied chatbot code works without modification.
 */
import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type UserType = "guest" | "regular";

interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  type: UserType;
}

interface Session {
  user: SessionUser;
}

/**
 * Get the current session from Supabase Auth.
 * Returns a NextAuth-compatible session object or `null`.
 */
export async function auth(): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
      name: user.user_metadata?.full_name ?? null,
      image: user.user_metadata?.avatar_url ?? null,
      type: "regular" as UserType,
    },
  };
}

/**
 * Sign out via Supabase and redirect.
 * Mirrors NextAuth's `signOut({ redirectTo })` server action.
 */
export async function signOut(options?: { redirectTo?: string }) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(options?.redirectTo ?? "/");
}
