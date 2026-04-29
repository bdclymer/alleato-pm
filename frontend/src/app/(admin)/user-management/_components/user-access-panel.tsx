"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionRuleHeading } from "@/components/layout";
import { cn } from "@/lib/utils";
import {
  ALL_GRANULAR_FLAGS,
  GRANULAR_FLAG_LABELS,
  type GranularFlag,
  type PermissionTemplate,
} from "@/lib/permissions-shared";
import {
  formatProjectCount,
  type GranularOverrideEffect,
  type UserAccessSummary,
} from "../_lib/user-access-data";

export function UserAccessPanel({
  user,
  templates,
  companyTemplates,
  isTemplatesLoading,
  isAssignmentSaving,
  isCompanyTemplateSaving,
  isGranularOverrideSaving,
  onAssignTemplate,
  onAssignCompanyTemplate,
  onSetGranularOverride,
}: {
  user: UserAccessSummary;
  templates: PermissionTemplate[];
  companyTemplates: PermissionTemplate[];
  isTemplatesLoading: boolean;
  isAssignmentSaving: boolean;
  isCompanyTemplateSaving: boolean;
  isGranularOverrideSaving: boolean;
  onAssignTemplate: (projectId: number | string, personId: string, templateId: string) => void;
  onAssignCompanyTemplate: (personId: string, templateId: string | null) => void;
  onSetGranularOverride: (
    personId: string,
    flag: GranularFlag,
    effect: GranularOverrideEffect | null,
  ) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <UserAvatar user={user} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold text-foreground">
                {user.fullName}
              </h2>
              {user.isAdmin && <Badge>Admin</Badge>}
              {user.companyTemplateId && (
                <Badge variant="outline" className="border-primary/30 text-primary">
                  All projects
                </Badge>
              )}
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {user.email || "No email"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline">{formatProjectCount(user.projectCount)}</Badge>
              <Badge variant={user.missingTemplateCount > 0 ? "secondary" : "outline"}>
                {user.assignedProjectCount} assigned
              </Badge>
              {user.missingTemplateCount > 0 && (
                <Badge variant="outline" className="border-destructive/30 text-destructive">
                  {user.missingTemplateCount} missing
                </Badge>
              )}
            </div>
          </div>
        </div>

        {!user.authUserId && <Badge variant="outline">No auth</Badge>}
      </div>

      <div className="space-y-3">
        <SectionRuleHeading label="Company Access" />
        <p className="text-sm text-muted-foreground">
          Assign a company permission template to grant access to every project automatically. Choose specific project access below only when the user should be limited to certain projects.
        </p>
        <div className="flex items-center gap-3">
          <Select
            value={user.companyTemplateId ?? "none"}
            disabled={isTemplatesLoading || isCompanyTemplateSaving || companyTemplates.length === 0}
            onValueChange={(val) => onAssignCompanyTemplate(user.personId, val === "none" ? null : val)}
          >
            <SelectTrigger className="h-9 w-64 text-sm">
              <SelectValue placeholder="No company access" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No company access</SelectItem>
              {companyTemplates.map((tpl) => (
                <SelectItem key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <GranularExceptionPanel
        user={user}
        templates={templates}
        companyTemplates={companyTemplates}
        isSaving={isGranularOverrideSaving}
        onSetGranularOverride={onSetGranularOverride}
      />

      <div className="space-y-4">
        <div>
          <SectionRuleHeading label="Project Access" />
          <p className="text-sm text-muted-foreground">
            Assign one permission template per project membership.
            {user.isAdmin && " Project assignments are bypassed by the Admin company template."}
            {user.companyTemplateId && !user.isAdmin && " Project assignments override the company permission template."}
          </p>
        </div>

        {user.memberships.length === 0 ? (
          <div className="border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              This user is not a member of any project.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden border-y border-border">
            <div className="grid grid-cols-[minmax(0,1fr)_220px] gap-4 border-b border-border bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground max-sm:hidden">
              <span>Project</span>
              <span>Role</span>
            </div>
            <div className="divide-y divide-border">
              {user.memberships.map((membership) => (
                <ProjectAccessRow
                  key={`${user.personId}-${membership.projectId}`}
                  user={user}
                  membership={membership}
                  templates={templates}
                  isTemplatesLoading={isTemplatesLoading}
                  isAssignmentSaving={isAssignmentSaving}
                  onAssignTemplate={onAssignTemplate}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getTemplateFlagsById(templates: PermissionTemplate[]) {
  return new Map(templates.map((template) => [template.id, template.granular_flags ?? []]));
}

function getInheritedGranularFlags(
  user: UserAccessSummary,
  templates: PermissionTemplate[],
  companyTemplates: PermissionTemplate[],
) {
  const flags = new Set<GranularFlag>();
  const flagsById = getTemplateFlagsById([...templates, ...companyTemplates]);
  const assignedTemplateIds = [
    user.companyTemplateId,
    ...user.memberships.map((membership) => membership.templateId),
  ].filter((id): id is string => !!id);

  for (const templateId of assignedTemplateIds) {
    for (const flag of flagsById.get(templateId) ?? []) {
      flags.add(flag);
    }
  }

  return flags;
}

function getCompanyGranularOverride(
  user: UserAccessSummary,
  flag: GranularFlag,
): GranularOverrideEffect | null {
  return (
    user.granularOverrides.find(
      (override) => override.projectId == null && override.flag === flag,
    )?.effect ?? null
  );
}

function GranularExceptionPanel({
  user,
  templates,
  companyTemplates,
  isSaving,
  onSetGranularOverride,
}: {
  user: UserAccessSummary;
  templates: PermissionTemplate[];
  companyTemplates: PermissionTemplate[];
  isSaving: boolean;
  onSetGranularOverride: (
    personId: string,
    flag: GranularFlag,
    effect: GranularOverrideEffect | null,
  ) => void;
}) {
  const inheritedFlags = getInheritedGranularFlags(user, templates, companyTemplates);
  const activeOverrideCount = user.granularOverrides.filter(
    (override) => override.projectId == null,
  ).length;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <SectionRuleHeading label="Granular Exceptions" />
          {activeOverrideCount > 0 && (
            <Badge variant="outline">{activeOverrideCount} active</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Override individual capabilities without cloning the user role. Deny takes precedence over role grants.
        </p>
      </div>

      <div className="overflow-hidden border-y border-border">
        <div className="grid grid-cols-[minmax(0,1fr)_160px] gap-4 border-b border-border bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground max-sm:hidden">
          <span>Capability</span>
          <span>Exception</span>
        </div>
        <div className="divide-y divide-border">
          {ALL_GRANULAR_FLAGS.map((flag) => {
            const override = getCompanyGranularOverride(user, flag);
            const inherited = inheritedFlags.has(flag);
            const effective = override ?? (inherited ? "allow" : "deny");

            return (
              <div
                key={flag}
                className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_160px] sm:items-center sm:gap-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {GRANULAR_FLAG_LABELS[flag] ?? flag}
                    </p>
                    {flag === "approve_change_orders" && (
                      <Badge variant="outline" className="text-xs">
                        Change orders
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {override
                      ? `${override === "allow" ? "Allowed" : "Denied"} by exception`
                      : `${inherited ? "Allowed" : "Denied"} by assigned role`}
                  </p>
                </div>

                <Select
                  value={override ?? "inherit"}
                  disabled={user.isAdmin || isSaving}
                  onValueChange={(value) => {
                    onSetGranularOverride(
                      user.personId,
                      flag,
                      value === "inherit" ? null : (value as GranularOverrideEffect),
                    );
                  }}
                >
                  <SelectTrigger className="h-9 w-full text-sm">
                    <SelectValue placeholder="Inherit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inherit">
                      Inherit ({effective === "allow" ? "Allowed" : "Denied"})
                    </SelectItem>
                    <SelectItem value="allow">Always allow</SelectItem>
                    <SelectItem value="deny">Deny</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      </div>

      {user.isAdmin && (
        <p className="text-xs text-muted-foreground">
          Exceptions are bypassed because this user is a Super Admin.
        </p>
      )}
    </div>
  );
}

function ProjectAccessRow({
  user,
  membership,
  templates,
  isTemplatesLoading,
  isAssignmentSaving,
  onAssignTemplate,
}: {
  user: UserAccessSummary;
  membership: UserAccessSummary["memberships"][number];
  templates: PermissionTemplate[];
  isTemplatesLoading: boolean;
  isAssignmentSaving: boolean;
  onAssignTemplate: (
    projectId: number | string,
    personId: string,
    templateId: string,
  ) => void;
}) {
  return (
    <div className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center sm:gap-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {membership.projectName ?? `Project #${membership.projectId}`}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Current: {membership.templateName ?? "No role"}
        </p>
      </div>
      <Select
        value={membership.templateId ?? "none"}
        disabled={isTemplatesLoading || isAssignmentSaving || templates.length === 0}
        onValueChange={(templateId) => {
          if (templateId === "none") return;
          onAssignTemplate(membership.projectId, user.personId, templateId);
        }}
      >
        <SelectTrigger className="h-9 w-full text-sm">
          <SelectValue placeholder="Select role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none" disabled>
            No role
          </SelectItem>
          {templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              {template.name}
              {template.is_system ? " (System)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function UserAvatar({
  user,
  size = "md",
}: {
  user: Pick<UserAccessSummary, "fullName" | "initials" | "profilePhotoUrl">;
  size?: "md" | "lg";
}) {
  return (
    <Avatar className={cn(size === "lg" ? "h-12 w-12" : "h-9 w-9")}>
      {user.profilePhotoUrl && (
        <AvatarImage src={user.profilePhotoUrl} alt={user.fullName} />
      )}
      <AvatarFallback>{user.initials}</AvatarFallback>
    </Avatar>
  );
}
