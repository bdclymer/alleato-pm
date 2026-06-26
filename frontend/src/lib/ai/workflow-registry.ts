export type WorkflowFieldType =
  | "number"
  | "text"
  | "textarea"
  | "select"
  | "boolean";

export type WorkflowFieldDefinition = {
  name: string;
  label: string;
  type: WorkflowFieldType;
  required: boolean;
  promptOrder: number;
  description: string;
  placeholder?: string;
  defaultValue?: string | number | boolean | null;
  options?: readonly string[];
  mapsTo: string;
};

export type AssistantCreateWorkflowDefinition = {
  workflowKey: string;
  objectLabel: string;
  route: string;
  chatSupported: boolean;
  backingTool: string;
  fallbackPage: string;
  confirmationRequired: boolean;
  launchScope: "pilot" | "later";
  requiredFields: readonly string[];
  optionalFields: readonly string[];
  fields: readonly WorkflowFieldDefinition[];
  lookupDependencies: readonly string[];
  permissionNotes: readonly string[];
  failureLoudly: string;
};

export const CHANGE_REQUEST_TYPE_OPTIONS = [
  "Owner Change",
  "Design Change",
  "Allowance",
  "Scope Gap",
  "Unforeseen Condition",
  "Value Engineering",
  "Owner Requested",
  "Constructability Issue",
] as const;

export const CHANGE_REQUEST_SCOPE_OPTIONS = [
  "TBD",
  "In Scope",
  "Out of Scope",
  "Allowance",
] as const;

export const CHANGE_REQUEST_STATUS_OPTIONS = [
  "Open",
  "Pending Approval",
  "Approved",
  "Rejected",
  "Closed",
  "Converted",
] as const;

export const CHANGE_REQUEST_REASON_OPTIONS = [
  "Allowance",
  "Back Charge",
  "Client Request",
  "Design Development",
  "Existing Condition",
] as const;

export const CHANGE_REQUEST_ORIGIN_OPTIONS = [
  "Internal",
  "RFI",
  "Field",
  "Emails",
  "Meetings",
  "RFI's",
] as const;

export const CHANGE_REQUEST_WORKFLOW: AssistantCreateWorkflowDefinition = {
  workflowKey: "change_event",
  objectLabel: "Change Request",
  route: "/:projectId/change-events/new",
  chatSupported: true,
  backingTool: "createChangeEvent",
  fallbackPage: "/:projectId/change-events/new",
  confirmationRequired: true,
  launchScope: "pilot",
  requiredFields: ["projectId", "title"],
  optionalFields: [
    "description",
    "type",
    "scope",
    "status",
    "reason",
    "origin",
    "expectingRevenue",
    "lineItemRevenueSource",
  ],
  lookupDependencies: ["projectId"],
  permissionNotes: [
    "Requires project access and change_orders write permission.",
    "Always preview before confirmed write.",
  ],
  failureLoudly:
    "Invalid enum values must fail before insert; confirmed writes must use DB-compatible change_events values.",
  fields: [
    {
      name: "projectId",
      label: "Project",
      type: "number",
      required: true,
      promptOrder: 1,
      description: "Numeric Alleato project id. Resolve this before previewing.",
      mapsTo: "change_events.project_id",
    },
    {
      name: "title",
      label: "Title",
      type: "text",
      required: true,
      promptOrder: 2,
      description: "Short name for the potential change.",
      placeholder: "Owner-requested lobby finish change",
      mapsTo: "change_events.title",
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      required: false,
      promptOrder: 3,
      description: "Known scope, cost, schedule, or source context.",
      mapsTo: "change_events.description",
    },
    {
      name: "type",
      label: "Type",
      type: "select",
      required: false,
      promptOrder: 4,
      description: "Native change event type. Defaults to Owner Change.",
      defaultValue: "Owner Change",
      options: CHANGE_REQUEST_TYPE_OPTIONS,
      mapsTo: "change_events.type",
    },
    {
      name: "scope",
      label: "Scope",
      type: "select",
      required: false,
      promptOrder: 5,
      description: "Native change event scope. Defaults to TBD until reviewed.",
      defaultValue: "TBD",
      options: CHANGE_REQUEST_SCOPE_OPTIONS,
      mapsTo: "change_events.scope",
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: false,
      promptOrder: 6,
      description: "Native change event status. Defaults to Open.",
      defaultValue: "Open",
      options: CHANGE_REQUEST_STATUS_OPTIONS,
      mapsTo: "change_events.status",
    },
    {
      name: "reason",
      label: "Reason",
      type: "select",
      required: false,
      promptOrder: 7,
      description: "Optional reason used by the native change event form.",
      options: CHANGE_REQUEST_REASON_OPTIONS,
      mapsTo: "change_events.reason",
    },
    {
      name: "origin",
      label: "Origin",
      type: "select",
      required: false,
      promptOrder: 8,
      description: "Where the change originated. Defaults to Internal.",
      defaultValue: "Internal",
      options: CHANGE_REQUEST_ORIGIN_OPTIONS,
      mapsTo: "change_events.origin",
    },
    {
      name: "expectingRevenue",
      label: "Expecting revenue",
      type: "boolean",
      required: false,
      promptOrder: 9,
      description: "Whether revenue is expected from this change.",
      defaultValue: true,
      mapsTo: "change_events.expecting_revenue",
    },
    {
      name: "lineItemRevenueSource",
      label: "Line item revenue source",
      type: "select",
      required: false,
      promptOrder: 10,
      description: "Optional line item revenue calculation mode.",
      options: [
        "Match Revenue to Latest Cost",
        "Enter manually",
        "Quantity x Unit Cost",
      ],
      mapsTo: "change_events.line_item_revenue_source",
    },
  ],
} as const;

export const ASSISTANT_CREATE_WORKFLOWS = [
  CHANGE_REQUEST_WORKFLOW,
] as const;

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function enumLookup<const T extends readonly string[]>(
  values: T,
  aliases: Record<string, T[number]> = {},
): Map<string, T[number]> {
  const map = new Map<string, T[number]>();
  values.forEach((value) => map.set(normalizeKey(value), value));
  Object.entries(aliases).forEach(([alias, value]) => {
    map.set(normalizeKey(alias), value);
  });
  return map;
}

const typeLookup = enumLookup(CHANGE_REQUEST_TYPE_OPTIONS, {
  owner_change: "Owner Change",
  potential_change: "Owner Change",
  trend: "Owner Change",
  field_change: "Owner Change",
  other: "Owner Change",
  design_error: "Design Change",
  rfi_answer_required: "Design Change",
  unforeseen_condition: "Unforeseen Condition",
  constructability: "Constructability Issue",
});

const legacyScopeTypeLookup = enumLookup(CHANGE_REQUEST_TYPE_OPTIONS, {
  owner_change: "Owner Change",
  design_error: "Design Change",
  unforeseen_condition: "Unforeseen Condition",
});

const scopeLookup = enumLookup(CHANGE_REQUEST_SCOPE_OPTIONS, {
  tbd: "TBD",
  unknown: "TBD",
  other: "TBD",
  in_scope: "In Scope",
  out_of_scope: "Out of Scope",
});

const statusLookup = enumLookup(CHANGE_REQUEST_STATUS_OPTIONS, {
  open: "Open",
  in_review: "Pending Approval",
  pending: "Pending Approval",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  closed: "Closed",
  converted: "Converted",
});

const reasonLookup = enumLookup(CHANGE_REQUEST_REASON_OPTIONS, {
  backcharge: "Back Charge",
  back_charge: "Back Charge",
});

const originLookup = enumLookup(CHANGE_REQUEST_ORIGIN_OPTIONS, {
  rfis: "RFI's",
});

type NormalizeOptionalEnumResult<T extends string> =
  | { ok: true; value: T | undefined }
  | { ok: false; error: string };

function normalizeOptionalEnum<T extends string>(params: {
  value?: string | null;
  lookup: Map<string, T>;
  label: string;
  defaultValue?: T;
}): NormalizeOptionalEnumResult<T> {
  const raw = params.value?.trim();
  if (!raw) return { ok: true, value: params.defaultValue };
  const mapped = params.lookup.get(normalizeKey(raw));
  if (mapped) return { ok: true, value: mapped };
  return {
    ok: false,
    error: `Invalid change request ${params.label} "${raw}". Use one of: ${Array.from(new Set(params.lookup.values())).join(", ")}.`,
  };
}

export type NormalizeChangeRequestInput = {
  projectId?: number | null;
  title?: string | null;
  description?: string | null;
  scope?: string | null;
  type?: string | null;
  status?: string | null;
  reason?: string | null;
  origin?: string | null;
  expectingRevenue?: boolean | null;
  lineItemRevenueSource?: string | null;
};

export type NormalizedChangeRequestDraft = {
  projectId: number;
  title: string;
  description: string | null;
  type: (typeof CHANGE_REQUEST_TYPE_OPTIONS)[number];
  scope: (typeof CHANGE_REQUEST_SCOPE_OPTIONS)[number];
  status: (typeof CHANGE_REQUEST_STATUS_OPTIONS)[number];
  reason: (typeof CHANGE_REQUEST_REASON_OPTIONS)[number] | null;
  origin: (typeof CHANGE_REQUEST_ORIGIN_OPTIONS)[number];
  expectingRevenue: boolean;
  lineItemRevenueSource: string | null;
};

export type NormalizeChangeRequestResult =
  | { ok: true; draft: NormalizedChangeRequestDraft }
  | { ok: false; error: string; missingFields?: string[] };

export function normalizeChangeRequestDraft(
  input: NormalizeChangeRequestInput,
): NormalizeChangeRequestResult {
  const missingFields: string[] = [];
  if (typeof input.projectId !== "number" || !Number.isFinite(input.projectId)) {
    missingFields.push("projectId");
  }

  const title = input.title?.trim();
  if (!title) missingFields.push("title");

  if (missingFields.length > 0) {
    return {
      ok: false,
      error: `Missing required change request field${missingFields.length === 1 ? "" : "s"}: ${missingFields.join(", ")}.`,
      missingFields,
    };
  }

  const legacyTypeFromScope = input.scope
    ? legacyScopeTypeLookup.get(normalizeKey(input.scope))
    : undefined;

  const type = normalizeOptionalEnum({
    value: input.type ?? legacyTypeFromScope,
    lookup: typeLookup,
    label: "type",
    defaultValue: "Owner Change",
  });
  if (!type.ok) return { ok: false, error: type.error };

  const scope = normalizeOptionalEnum({
    value:
      input.scope && scopeLookup.has(normalizeKey(input.scope))
        ? input.scope
        : undefined,
    lookup: scopeLookup,
    label: "scope",
    defaultValue: "TBD",
  });
  if (!scope.ok) return { ok: false, error: scope.error };

  const status = normalizeOptionalEnum({
    value: input.status,
    lookup: statusLookup,
    label: "status",
    defaultValue: "Open",
  });
  if (!status.ok) return { ok: false, error: status.error };

  const reason = normalizeOptionalEnum({
    value: input.reason,
    lookup: reasonLookup,
    label: "reason",
  });
  if (!reason.ok) return { ok: false, error: reason.error };

  const origin = normalizeOptionalEnum({
    value: input.origin,
    lookup: originLookup,
    label: "origin",
    defaultValue: "Internal",
  });
  if (!origin.ok) return { ok: false, error: origin.error };

  return {
    ok: true,
    draft: {
      projectId: input.projectId as number,
      title: title as string,
      description: input.description?.trim() || null,
      type: type.value ?? "Owner Change",
      scope: scope.value ?? "TBD",
      status: status.value ?? "Open",
      reason: reason.value ?? null,
      origin: origin.value ?? "Internal",
      expectingRevenue: input.expectingRevenue ?? true,
      lineItemRevenueSource: input.lineItemRevenueSource?.trim() || null,
    },
  };
}

export function buildChangeRequestPreviewFields(
  draft: NormalizedChangeRequestDraft,
) {
  return {
    project_id: draft.projectId,
    title: draft.title,
    description: draft.description,
    type: draft.type,
    scope: draft.scope,
    status: draft.status,
    reason: draft.reason,
    origin: draft.origin,
    expecting_revenue: draft.expectingRevenue,
    line_item_revenue_source: draft.lineItemRevenueSource,
  };
}

export function getAssistantCreateWorkflow(workflowKey: string) {
  return ASSISTANT_CREATE_WORKFLOWS.find(
    (workflow) => workflow.workflowKey === workflowKey,
  );
}
