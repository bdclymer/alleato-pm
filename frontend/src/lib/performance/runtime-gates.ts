"use client";

const AI_FULL_SURFACE_PREFIXES = [
  "/ai/",
  "/ai-assistant",
  "/ai-avatar",
] as const;

const COLLABORATION_FORCED_PREFIXES = [
  "/comments",
  "/team-chat",
  "/feedback-inbox",
] as const;

function normalizePathname(pathname: string | null | undefined): string {
  const trimmed = pathname?.trim();
  if (!trimmed) return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function shouldHideGlobalAiWidgetForRoute(
  pathname: string | null | undefined,
): boolean {
  const normalizedPathname = normalizePathname(pathname);

  return (
    normalizedPathname.startsWith("/auth") ||
    normalizedPathname === "/login" ||
    normalizedPathname === "/signup" ||
    normalizedPathname === "/ai" ||
    AI_FULL_SURFACE_PREFIXES.some((prefix) =>
      matchesPrefix(normalizedPathname, prefix),
    ) ||
    matchesPrefix(normalizedPathname, "/team-chat") ||
    /\/drawings\/viewer\//.test(normalizedPathname)
  );
}

export function shouldForceCollaborationRuntime(
  pathname: string | null | undefined,
): boolean {
  const normalizedPathname = normalizePathname(pathname);
  return COLLABORATION_FORCED_PREFIXES.some((prefix) =>
    matchesPrefix(normalizedPathname, prefix),
  );
}

export function shouldEnableHeavyProductAnalytics(
  pathname: string | null | undefined,
): boolean {
  const normalizedPathname = normalizePathname(pathname);

  return (
    shouldForceCollaborationRuntime(normalizedPathname) ||
    normalizedPathname === "/ai" ||
    AI_FULL_SURFACE_PREFIXES.some((prefix) =>
      matchesPrefix(normalizedPathname, prefix),
    )
  );
}
