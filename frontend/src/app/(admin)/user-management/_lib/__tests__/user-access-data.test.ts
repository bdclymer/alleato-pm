import {
  getProjectRoleTemplates,
  toAccessSummary,
  type PermissionUser,
} from "../user-access-data";
import type { PermissionTemplate } from "@/lib/permissions-shared";

function template(
  id: string,
  name: string,
  scope: PermissionTemplate["scope"],
): PermissionTemplate {
  return {
    id,
    name,
    scope,
    description: undefined,
    rules_json: {
      directory: ["read"],
      budget: ["read"],
      contracts: ["read"],
      documents: ["read"],
      schedule: ["read"],
      submittals: ["read"],
      rfis: ["read"],
      change_orders: ["read"],
    },
    granular_flags: [],
    is_system: true,
  };
}

describe("getProjectRoleTemplates", () => {
  it("removes company templates from project-role dropdown options", () => {
    const templates = [
      template("company-pm", "Project Manager", "company"),
      template("project-pm", "Project Manager", "project"),
      template("project-admin", "Project Admin", "project"),
    ];

    expect(getProjectRoleTemplates(templates).map((item) => item.id)).toEqual([
      "project-pm",
      "project-admin",
    ]);
  });

  it("dedupes visually identical project template names", () => {
    const templates = [
      template("pm-1", "Project Manager", "project"),
      template("pm-2", "  Project   Manager  ", "project"),
      template("super", "Superintendent", "project"),
    ];

    expect(getProjectRoleTemplates(templates).map((item) => item.id)).toEqual([
      "pm-1",
      "super",
    ]);
  });
});

function permissionUser(overrides: Partial<PermissionUser> = {}): PermissionUser {
  return {
    personId: "person-1",
    authUserId: "auth-1",
    firstName: "Megan",
    lastName: "Harrison",
    email: "megan@example.com",
    profilePhotoUrl: null,
    isAdmin: true,
    companyTemplateId: null,
    companyTemplateName: null,
    teamsAccount: null,
    memberships: [],
    granularOverrides: [],
    ...overrides,
  };
}

describe("toAccessSummary", () => {
  it("preserves linked Teams account details", () => {
    const summary = toAccessSummary(
      permissionUser({
        teamsAccount: {
          platformUserId: "29:teams-user",
          displayName: "Megan Harrison",
          linkedAt: "2026-06-25T16:00:00.000Z",
        },
      }),
    );

    expect(summary.teamsAccount).toEqual({
      platformUserId: "29:teams-user",
      displayName: "Megan Harrison",
      linkedAt: "2026-06-25T16:00:00.000Z",
    });
  });

  it("keeps unlinked Teams account state explicit", () => {
    const summary = toAccessSummary(permissionUser({ teamsAccount: null }));

    expect(summary.teamsAccount).toBeNull();
  });
});
