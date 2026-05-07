"use client";

import {
  FolderKanban,
  KeyRound,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  EmptyState,
  InlineTable,
  InlineTableBody,
  InlineTableCell,
  InlineTableHeader,
  InlineTableHeaderCell,
  InlineTableHeaderRow,
  InlineTableRow,
  KpiRow,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
} from "@/components/ds";
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
  getProjectRoleTemplates,
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
  const assignmentProgress =
    user.projectCount > 0
      ? Math.round((user.assignedProjectCount / user.projectCount) * 100)
      : 100;
  const companyOverrideCount = user.granularOverrides.filter(
    (override) => override.projectId == null,
  ).length;
  const accessMode = user.isAdmin
    ? "Admin"
    : user.companyTemplateName
      ? "All-project access"
      : user.projectCount > 0
        ? "Selected projects"
        : "No project access";

  return (
    <div className="space-y-8">
      <KpiRow
          size="small"
          bare
          metrics={[
            {
              label: "Access mode",
              value: accessMode,
              context: user.companyTemplateName ?? user.primaryTemplateName,
            },
            {
              label: "Project roles",
              value: `${user.assignedProjectCount}/${user.projectCount}`,
              context: user.projectCount === 0 ? "No memberships" : "Assigned memberships",
              progress: {
                value: assignmentProgress,
                tone: user.missingTemplateCount > 0 ? "warning" : "neutral",
              },
            },
            {
              label: "Exceptions",
              value: String(companyOverrideCount),
              context: "Company-level overrides",
            },
            {
              label: "Auth link",
              value: user.authUserId ? "Linked" : "Missing",
              context: user.authUserId ? "Can sign in" : "Needs reconciliation",
              progress: {
                value: user.authUserId ? 100 : 0,
                tone: user.authUserId ? "neutral" : "danger",
              },
            },
          ]}
        />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <SectionRuleHeading
            label="Company access"
            icon={<ShieldCheck className="h-4 w-4" />}
          />
          <div className="space-y-3">
            <p className="text-sm leading-6 text-muted-foreground">
              Use company access when this person should inherit one role across every project.
              Leave it empty for project-by-project control.
            </p>
            <div className="max-w-sm">
              <Select
                value={user.companyTemplateId ?? "none"}
                disabled={isTemplatesLoading || isCompanyTemplateSaving || companyTemplates.length === 0}
                onValueChange={(val) => onAssignCompanyTemplate(user.personId, val === "none" ? null : val)}
              >
                <SelectTrigger className="h-9 w-full text-sm">
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
        </div>

        <div>
          <SectionRuleHeading
            label="Identity"
            icon={<UserRound className="h-4 w-4" />}
          />
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <IdentityField label="Email" value={user.email || "No email"} />
            <IdentityField label="Person ID" value={user.personId} monospace />
            <IdentityField
              label="Auth user"
              value={user.authUserId ?? "Not linked"}
              monospace
              missing={!user.authUserId}
            />
            <IdentityField label="Primary role" value={user.primaryTemplateName} />
          </div>
        </div>
      </section>

      <GranularExceptionPanel
        user={user}
        templates={templates}
        companyTemplates={companyTemplates}
        isSaving={isGranularOverrideSaving}
        onSetGranularOverride={onSetGranularOverride}
      />

      <section className="space-y-4">
        <div>
          <SectionRuleHeading
            label="Project access"
            icon={<FolderKanban className="h-4 w-4" />}
          />
          <p className="text-sm text-muted-foreground">
            Each membership needs one project role unless the user is covered by admin access.
          </p>
        </div>

        {user.memberships.length === 0 ? (
          <EmptyState
            title="No project memberships"
            description="This person is in the company directory, but has not been added to any project yet."
            className="border-y border-border py-12"
          />
        ) : (
          <div className="overflow-hidden border-y border-border">
            <InlineTable variant="read" className="hidden sm:block">
              <InlineTableHeader>
                <InlineTableHeaderRow>
                  <InlineTableHeaderCell>Project</InlineTableHeaderCell>
                  <InlineTableHeaderCell>Status</InlineTableHeaderCell>
                  <InlineTableHeaderCell className="w-60">Role</InlineTableHeaderCell>
                </InlineTableHeaderRow>
              </InlineTableHeader>
              <InlineTableBody>
                {user.memberships.map((membership) => (
                  <ProjectAccessTableRow
                    key={`${user.personId}-${membership.projectId}`}
                    user={user}
                    membership={membership}
                    templates={templates}
                    isTemplatesLoading={isTemplatesLoading}
                    isAssignmentSaving={isAssignmentSaving}
                    onAssignTemplate={onAssignTemplate}
                  />
                ))}
              </InlineTableBody>
            </InlineTable>
            <div className="divide-y divide-border sm:hidden">
              {user.memberships.map((membership) => (
                <ProjectAccessMobileRow
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
      </section>
    </div>
  );
}

function IdentityField({
  label,
  value,
  monospace,
  missing,
}: {
  label: string;
  value: string;
  monospace?: boolean;
  missing?: boolean;
}) {
  return (
    <div className="min-w-0 border-t border-border/70 pt-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 truncate text-sm font-medium text-foreground",
          monospace && "font-mono text-xs",
          missing && "text-muted-foreground",
        )}
      >
        {value}
      </p>
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
    <section className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <SectionRuleHeading
            label="Granular exceptions"
            icon={<KeyRound className="h-4 w-4" />}
          />
          {activeOverrideCount > 0 && (
            <Badge variant="outline">{activeOverrideCount} active</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Override individual capabilities without cloning a role. Deny takes precedence over role grants.
        </p>
      </div>

      <div className="overflow-hidden border-y border-border">
        <InlineTable variant="read" className="hidden sm:block">
          <InlineTableHeader>
            <InlineTableHeaderRow>
              <InlineTableHeaderCell>Capability</InlineTableHeaderCell>
              <InlineTableHeaderCell>Status</InlineTableHeaderCell>
              <InlineTableHeaderCell className="w-48">Exception</InlineTableHeaderCell>
            </InlineTableHeaderRow>
          </InlineTableHeader>
          <InlineTableBody>
            {ALL_GRANULAR_FLAGS.map((flag) => {
              const override = getCompanyGranularOverride(user, flag);
              const inherited = inheritedFlags.has(flag);
              const effective = override ?? (inherited ? "allow" : "deny");

              return (
                <GranularExceptionRow
                  key={flag}
                  flag={flag}
                  user={user}
                  override={override}
                  inherited={inherited}
                  effective={effective}
                  isSaving={isSaving}
                  onSetGranularOverride={onSetGranularOverride}
                />
              );
            })}
          </InlineTableBody>
        </InlineTable>
        <div className="divide-y divide-border sm:hidden">
          {ALL_GRANULAR_FLAGS.map((flag) => {
            const override = getCompanyGranularOverride(user, flag);
            const inherited = inheritedFlags.has(flag);
            const effective = override ?? (inherited ? "allow" : "deny");

            return (
              <GranularExceptionMobileRow
                key={flag}
                flag={flag}
                user={user}
                override={override}
                inherited={inherited}
                effective={effective}
                isSaving={isSaving}
                onSetGranularOverride={onSetGranularOverride}
              />
            );
          })}
        </div>
      </div>

      {user.isAdmin && (
        <p className="text-xs text-muted-foreground">
          Exceptions are bypassed because this user is a Super Admin.
        </p>
      )}
    </section>
  );
}

function GranularCapabilityLabel({
  flag,
  override,
  inherited,
}: {
  flag: GranularFlag;
  override: GranularOverrideEffect | null;
  inherited: boolean;
}) {
  return (
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
  );
}

function GranularExceptionSelect({
  user,
  flag,
  override,
  effective,
  isSaving,
  onSetGranularOverride,
}: {
  user: UserAccessSummary;
  flag: GranularFlag;
  override: GranularOverrideEffect | null;
  effective: GranularOverrideEffect;
  isSaving: boolean;
  onSetGranularOverride: (
    personId: string,
    flag: GranularFlag,
    effect: GranularOverrideEffect | null,
  ) => void;
}) {
  return (
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
  );
}

function GranularExceptionRow({
  user,
  flag,
  override,
  inherited,
  effective,
  isSaving,
  onSetGranularOverride,
}: {
  user: UserAccessSummary;
  flag: GranularFlag;
  override: GranularOverrideEffect | null;
  inherited: boolean;
  effective: GranularOverrideEffect;
  isSaving: boolean;
  onSetGranularOverride: (
    personId: string,
    flag: GranularFlag,
    effect: GranularOverrideEffect | null,
  ) => void;
}) {
  return (
    <InlineTableRow>
      <InlineTableCell>
        <GranularCapabilityLabel flag={flag} override={override} inherited={inherited} />
      </InlineTableCell>
      <InlineTableCell>
        <StatusBadge
          status={override ? "Exception" : effective === "allow" ? "Allowed" : "Denied"}
          variant={override ? "warning" : effective === "allow" ? "success" : "neutral"}
        />
      </InlineTableCell>
      <InlineTableCell>
        <GranularExceptionSelect
          user={user}
          flag={flag}
          override={override}
          effective={effective}
          isSaving={isSaving}
          onSetGranularOverride={onSetGranularOverride}
        />
      </InlineTableCell>
    </InlineTableRow>
  );
}

function GranularExceptionMobileRow({
  user,
  flag,
  override,
  inherited,
  effective,
  isSaving,
  onSetGranularOverride,
}: {
  user: UserAccessSummary;
  flag: GranularFlag;
  override: GranularOverrideEffect | null;
  inherited: boolean;
  effective: GranularOverrideEffect;
  isSaving: boolean;
  onSetGranularOverride: (
    personId: string,
    flag: GranularFlag,
    effect: GranularOverrideEffect | null,
  ) => void;
}) {
  return (
    <div className="space-y-3 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <GranularCapabilityLabel flag={flag} override={override} inherited={inherited} />
        <StatusBadge
          status={override ? "Exception" : effective === "allow" ? "Allowed" : "Denied"}
          variant={override ? "warning" : effective === "allow" ? "success" : "neutral"}
        />
      </div>
      <GranularExceptionSelect
        user={user}
        flag={flag}
        override={override}
        effective={effective}
        isSaving={isSaving}
        onSetGranularOverride={onSetGranularOverride}
      />
    </div>
  );
}

function RoleSelect({
  value,
  disabled,
  templates,
  onValueChange,
}: {
  value: string | null;
  disabled: boolean;
  templates: PermissionTemplate[];
  onValueChange: (templateId: string) => void;
}) {
  const roleTemplates = getProjectRoleTemplates(templates);

  return (
    <Select
      value={value ?? "none"}
      disabled={disabled || roleTemplates.length === 0}
      onValueChange={(templateId) => {
        if (templateId === "none") return;
        onValueChange(templateId);
      }}
    >
      <SelectTrigger className="h-9 w-full text-sm">
        <SelectValue placeholder="Select role" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none" disabled>
          No role
        </SelectItem>
        {roleTemplates.map((template) => (
          <SelectItem key={template.id} value={template.id}>
            {template.name}
            {template.is_system ? " (System)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ProjectAccessTableRow({
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
  const hasRole = Boolean(membership.templateId);

  return (
    <InlineTableRow>
      <InlineTableCell>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {membership.projectName ?? `Project #${membership.projectId}`}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Project #{membership.projectId}
          </p>
        </div>
      </InlineTableCell>
      <InlineTableCell>
        <StatusBadge
          status={hasRole ? "Assigned" : "Missing role"}
          variant={hasRole ? "success" : "warning"}
        />
      </InlineTableCell>
      <InlineTableCell>
        <RoleSelect
          value={membership.templateId}
          disabled={isTemplatesLoading || isAssignmentSaving || templates.length === 0}
          templates={templates}
          onValueChange={(templateId) =>
            onAssignTemplate(membership.projectId, user.personId, templateId)
          }
        />
      </InlineTableCell>
    </InlineTableRow>
  );
}

function ProjectAccessMobileRow({
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
  const hasRole = Boolean(membership.templateId);

  return (
    <div className="space-y-3 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {membership.projectName ?? `Project #${membership.projectId}`}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Current: {membership.templateName ?? "No role"}
          </p>
        </div>
        <StatusBadge
          status={hasRole ? "Assigned" : "Missing"}
          variant={hasRole ? "success" : "warning"}
        />
      </div>
      <RoleSelect
        value={membership.templateId}
        disabled={isTemplatesLoading || isAssignmentSaving || templates.length === 0}
        templates={templates}
        onValueChange={(templateId) =>
          onAssignTemplate(membership.projectId, user.personId, templateId)
        }
      />
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
