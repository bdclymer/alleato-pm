type NonCriticalFailureContext = {
  area: string;
  operation: string;
  error: unknown;
  userVisibleFallback: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

export function reportNonCriticalFailure({
  area,
  operation,
  error,
  userVisibleFallback,
  metadata,
}: NonCriticalFailureContext) {
  console.warn(
    JSON.stringify({
      event: "non_critical_failure",
      timestamp: new Date().toISOString(),
      area,
      operation,
      user_visible_fallback: userVisibleFallback,
      error: errorMessage(error),
      metadata,
    }),
  );
}
