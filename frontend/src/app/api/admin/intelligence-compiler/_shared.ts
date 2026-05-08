import { GuardrailError } from "@/lib/guardrails/errors";
import { fetchWithPolicy } from "@/lib/guardrails/dependency";
import { createClient } from "@/lib/supabase/server";

export function getBackendCompilerUrl(path: "status" | "run"): string {
  const backendUrl = (
    process.env.BACKEND_URL ||
    process.env.PYTHON_BACKEND_URL ||
    (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : "")
  )
    .replace(/\/+$/, "")
    .trim();

  try {
    new URL(backendUrl);
  } catch {
    throw new GuardrailError({
      code: "MISSING_ENV_VAR",
      where: "api.admin.intelligence-compiler.backend-url",
      message: "Missing or invalid backend URL. Set BACKEND_URL or PYTHON_BACKEND_URL.",
      details: {
        BACKEND_URL: process.env.BACKEND_URL,
        PYTHON_BACKEND_URL: process.env.PYTHON_BACKEND_URL,
      },
      status: 503,
    });
  }

  return `${backendUrl}/api/intelligence/compiler/${path}`;
}

export function getBackendAdminApiKey(): string {
  const apiKey = process.env.ADMIN_API_KEY?.trim();
  if (!apiKey) {
    throw new GuardrailError({
      code: "MISSING_ENV_VAR",
      where: "api.admin.intelligence-compiler.admin-key",
      message: "ADMIN_API_KEY is required to call backend intelligence compiler controls.",
      status: 503,
    });
  }
  return apiKey;
}

export async function requireAdmin(where: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where,
      message: "Sign in before using intelligence compiler controls.",
      status: 401,
      details: userError?.message,
    });
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    throw new GuardrailError({
      code: "FORBIDDEN",
      where,
      message: "Admin access is required to use intelligence compiler controls.",
      status: 403,
      details: profileError?.message,
    });
  }
}

export async function fetchBackendCompiler(
  requestId: string,
  where: string,
  path: "status" | "run",
  init?: RequestInit,
): Promise<Response> {
  const apiKey = getBackendAdminApiKey();
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  headers.set("X-Admin-Api-Key", apiKey);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetchWithPolicy(
    requestId,
    where,
    `backend.intelligence-compiler.${path}`,
    getBackendCompilerUrl(path),
    {
      ...init,
      headers,
      cache: "no-store",
    },
    {
      timeoutMs: path === "run" ? 60_000 : 25_000,
      maxRetries: path === "run" ? 0 : 1,
      backoffMs: 250,
    },
  );
}
