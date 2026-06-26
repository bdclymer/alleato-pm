import "server-only";
import { redirect } from "next/navigation";
import { getApiRouteUser } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/auth/owner";

/**
 * Server-side route guard: allows only the workspace owner through.
 *
 * Use in a route-segment `layout.tsx` (or server page) to lock an entire
 * surface to the owner. Non-owners are redirected to access-denied; logged-out
 * users to login. Because a layout's guard runs before the page renders,
 * wrapping a route in an owner-only layout prevents the page — client or
 * server — from rendering or fetching for anyone but the owner.
 */
export async function requireOwner(): Promise<void> {
  const user = await getApiRouteUser();
  if (!user) {
    redirect("/auth/login");
  }
  if (!isOwnerEmail(user.email)) {
    redirect("/access-denied?reason=owner-only");
  }
}
