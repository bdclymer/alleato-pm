/**
 * Classifies database/service errors into safe, user-facing responses.
 * Prevents leaking internal details (table names, constraints, etc.) to clients.
 */
export function classifyError(error: unknown): { message: string; status: number } {
  const msg = error instanceof Error ? error.message : String(error);

  // Duplicate records
  if (msg.includes("duplicate key") || msg.includes("unique constraint")) {
    return { message: "A record with this information already exists.", status: 409 };
  }

  // Foreign key violations
  if (msg.includes("violates foreign key") || msg.includes("foreign key constraint")) {
    return { message: "Referenced record not found.", status: 400 };
  }

  // Not null violations
  if (msg.includes("violates not-null") || msg.includes("not-null constraint")) {
    return { message: "Required fields are missing.", status: 400 };
  }

  // Check constraint violations
  if (msg.includes("violates check constraint")) {
    return { message: "Invalid field value.", status: 400 };
  }

  // Permission denied
  if (msg.includes("permission denied") || msg.includes("insufficient_privilege")) {
    return { message: "You do not have permission to perform this action.", status: 403 };
  }

  // Row-level security
  if (msg.includes("new row violates row-level security")) {
    return { message: "Access denied.", status: 403 };
  }

  // Not found
  if (msg.includes("PGRST116") || msg.includes("no rows")) {
    return { message: "Record not found.", status: 404 };
  }

  // Default: generic server error (never expose raw message)
  return { message: "An unexpected error occurred. Please try again.", status: 500 };
}

/**
 * Helper to create a JSON error response with classified error.
 */
export function apiErrorResponse(error: unknown): Response {
  const { message, status } = classifyError(error);
  // Always log the full error server-side for debugging
  console.error("[API Error]", error);
  return Response.json({ error: message }, { status });
}
