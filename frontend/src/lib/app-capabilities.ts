import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { getApiRouteUser } from "@/lib/supabase/server";
import { GuardrailError } from "@/lib/guardrails/errors";
import {
  APP_CAPABILITY_FLAGS,
  type AppCapability,
} from "@/lib/permissions-shared";

type AppCapabilityEffect = "allow" | "deny";

export interface AppCapabilityAccess {
  userId: string;
  personId: string | null;
  isAdmin: boolean;
  templateCapabilities: AppCapability[];
  overrides: Partial<Record<AppCapability, AppCapabilityEffect>>;
}

function isAppCapability(value: string): value is AppCapability {
  return APP_CAPABILITY_FLAGS.includes(value as AppCapability);
}

export function hasAppCapability(
  access: AppCapabilityAccess,
  capability: AppCapability,
): boolean {
  if (access.isAdmin) return true;

  const override = access.overrides[capability];
  if (override === "deny") return false;
  if (override === "allow") return true;

  return access.templateCapabilities.includes(capability);
}

export async function loadAppCapabilityAccessForUser(
  userId: string,
): Promise<AppCapabilityAccess | null> {
  const supabase = createServiceClient();

  const [profileResult, userAuthResult] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("users_auth")
      .select("person_id")
      .eq("auth_user_id", userId)
      .maybeSingle(),
  ]);

  const isAdmin = profileResult.data?.is_admin === true;
  const personId = userAuthResult.data?.person_id ?? null;

  if (!personId) {
    if (!isAdmin) return null;

    return {
      userId,
      personId: null,
      isAdmin: true,
      templateCapabilities: [],
      overrides: {},
    };
  }

  const [companyTemplateResult, overridesResult] = await Promise.all([
    supabase
      .from("person_company_templates")
      .select("template:permission_templates (granular_flags)")
      .eq("person_id", personId)
      .maybeSingle(),
    supabase
      .from("user_granular_permission_overrides")
      .select("flag, effect")
      .eq("person_id", personId)
      .is("project_id", null),
  ]);

  const rawTemplate = Array.isArray(companyTemplateResult.data?.template)
    ? companyTemplateResult.data.template[0]
    : companyTemplateResult.data?.template;

  const templateCapabilities = (rawTemplate?.granular_flags ?? []).filter(
    isAppCapability,
  );

  const overrides = (overridesResult.data ?? []).reduce(
    (acc, row) => {
      if (
        isAppCapability(row.flag) &&
        (row.effect === "allow" || row.effect === "deny")
      ) {
        acc[row.flag] = row.effect;
      }
      return acc;
    },
    {} as Partial<Record<AppCapability, AppCapabilityEffect>>,
  );

  return {
    userId,
    personId,
    isAdmin,
    templateCapabilities,
    overrides,
  };
}

export async function canCurrentUserAccessAppCapability(
  capability: AppCapability,
): Promise<boolean> {
  const user = await getApiRouteUser();
  if (!user) return false;

  const access = await loadAppCapabilityAccessForUser(user.id);
  return access ? hasAppCapability(access, capability) : false;
}

export async function requireCurrentUserAppCapability(
  capability: AppCapability,
  where: string,
  message = "Access denied.",
) {
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where,
      message: "Authentication required.",
      status: 401,
    });
  }

  const access = await loadAppCapabilityAccessForUser(user.id);
  if (!access || !hasAppCapability(access, capability)) {
    throw new GuardrailError({
      code: "FORBIDDEN",
      where,
      message,
      status: 403,
    });
  }

  return { user, access };
}
