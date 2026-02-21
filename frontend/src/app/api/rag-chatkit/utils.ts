export function isBackendOfflineError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { message?: unknown; code?: unknown };
  const message =
    typeof maybeError.message === "string" ? maybeError.message : "";
  const code =
    typeof maybeError.code === "string" ? maybeError.code : undefined;
  return (
    code === "ECONNREFUSED" ||
    message.includes("fetch failed") ||
    message.includes("ECONNREFUSED")
  );
}
