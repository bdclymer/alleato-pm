/**
 * The single owner of the workspace.
 *
 * This is the ONE account that is allowed to see every project in the portfolio.
 * Everyone else — including users flagged `is_admin` — only sees the projects
 * they are explicitly assigned to (via directory memberships or project roles).
 *
 * Server-safe: this module has no client-only imports, so it can be used in
 * API routes and server components. `navigation-config.ts` re-exports
 * `OWNER_EMAIL` from here to keep a single source of truth.
 */
export const OWNER_EMAIL = "megan@megankharrison.com";

/**
 * Case-insensitive check for whether an email belongs to the workspace owner.
 */
export function isOwnerEmail(email: string | null | undefined): boolean {
  return (
    typeof email === "string" && email.trim().toLowerCase() === OWNER_EMAIL
  );
}
