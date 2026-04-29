import { apiFetch } from "@/lib/api-client";
import type {
  GranularFlag,
  PermissionTemplate,
} from "@/lib/permissions-shared";

export type TemplateScope = "company" | "project";
export type GranularOverrideEffect = "allow" | "deny";

export type PermissionUser = {
  personId: string;
  authUserId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  profilePhotoUrl: string | null;
  isAdmin: boolean;
  companyTemplateId: string | null;
  companyTemplateName: string | null;
  memberships: Array<{
    projectId: number | string;
    projectName: string | null;
    templateId: string | null;
    templateName: string | null;
  }>;
  granularOverrides: Array<{
    projectId: number | string | null;
    flag: GranularFlag;
    effect: GranularOverrideEffect;
  }>;
};

export type UserLinkDiagnostic = {
  authUserId: string;
  email: string;
  fullName: string | null;
  isAdmin: boolean;
  issues: Array<
    | "missing_person_auth_link"
    | "missing_users_auth_link"
    | "mismatched_users_auth_link"
    | "duplicate_people_email"
  >;
};

export type PermissionUsersResponse = {
  data: PermissionUser[];
  diagnostics?: {
    missingAuthLinks?: UserLinkDiagnostic[];
  };
};

export type UserAccessSummary = {
  id: string;
  personId: string;
  authUserId: string | null;
  fullName: string;
  initials: string;
  email: string;
  profilePhotoUrl: string | null;
  isAdmin: boolean;
  companyTemplateId: string | null;
  companyTemplateName: string | null;
  projectCount: number;
  assignedProjectCount: number;
  missingTemplateCount: number;
  primaryTemplateName: string;
  memberships: PermissionUser["memberships"];
  granularOverrides: PermissionUser["granularOverrides"];
};

export async function fetchTemplates(scope: TemplateScope): Promise<PermissionTemplate[]> {
  const { data } = await apiFetch<{ data: PermissionTemplate[] }>(
    `/api/permissions/templates?scope=${scope}`,
  );
  return data;
}

export async function fetchAllTemplates(): Promise<PermissionTemplate[]> {
  const { data } = await apiFetch<{ data: PermissionTemplate[] }>(
    "/api/permissions/templates",
  );
  return data;
}

export async function fetchUsers(): Promise<PermissionUsersResponse> {
  return apiFetch<PermissionUsersResponse>("/api/permissions/users");
}

function getInitials(firstName: string, lastName: string, fallback: string): string {
  const initials = [firstName, lastName]
    .map((name) => name.charAt(0))
    .filter(Boolean)
    .join("")
    .toUpperCase();

  return initials || fallback.charAt(0).toUpperCase() || "?";
}

export function toAccessSummary(user: PermissionUser): UserAccessSummary {
  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email ||
    "Unnamed user";
  const assignedProjectCount = user.memberships.filter((m) => !!m.templateId).length;
  const missingTemplateCount = user.isAdmin ? 0 : user.memberships.length - assignedProjectCount;
  const primaryTemplateName = user.isAdmin
    ? "App Admin"
    : user.companyTemplateName ?? user.memberships[0]?.templateName ?? "No role";

  return {
    id: user.personId,
    personId: user.personId,
    authUserId: user.authUserId,
    fullName,
    initials: getInitials(user.firstName, user.lastName, user.email),
    email: user.email,
    profilePhotoUrl: user.profilePhotoUrl,
    isAdmin: user.isAdmin,
    companyTemplateId: user.companyTemplateId,
    companyTemplateName: user.companyTemplateName,
    projectCount: user.memberships.length,
    assignedProjectCount,
    missingTemplateCount,
    primaryTemplateName,
    memberships: user.memberships,
    granularOverrides: user.granularOverrides ?? [],
  };
}

export function formatProjectCount(count: number) {
  return `${count} ${count === 1 ? "project" : "projects"}`;
}
