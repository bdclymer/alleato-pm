import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type SubmittalWorkflowTemplate = {
  id: string;
  name: string;
  steps: string[];
  isDefault?: boolean;
  responseDays?: number;
};

export type SubmittalCustomField = {
  id: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  required?: boolean;
  options?: string[];
};

export type SubmittalsPreferences = {
  numberingPrefix?: string;
  workflowTemplates?: SubmittalWorkflowTemplate[];
  customFields?: SubmittalCustomField[];
};

const SUBMITTALS_PREFS_KEY = "submittals";

export const DEFAULT_SUBMITTALS_PROJECT_ID = Number(
  process.env.NEXT_PUBLIC_SUBMITTALS_PROJECT_ID ??
    process.env.SUBMITTALS_PROJECT_ID ??
    25108,
);

export function getDefaultPreferences(): SubmittalsPreferences {
  return {
    numberingPrefix: "SUB",
    workflowTemplates: [
      {
        id: "design-team-review",
        name: "Design Team Review",
        steps: ["Submitter", "Designer", "Approver"],
        isDefault: true,
        responseDays: 7,
      },
      {
        id: "supplier-submission",
        name: "Supplier Submission",
        steps: ["Vendor", "Internal QA", "PM"],
        responseDays: 5,
      },
    ],
    customFields: [
      {
        id: "spec-section",
        label: "Spec Section",
        type: "text",
        required: true,
      },
      {
        id: "review-priority",
        label: "Review Priority",
        type: "select",
        options: ["High", "Normal", "Low"],
      },
    ],
  };
}

export function extractSubmittalsPreferences(
  rawPreferences?: Record<string, unknown>,
): SubmittalsPreferences {
  const defaults = getDefaultPreferences();
  const stored = (rawPreferences?.[SUBMITTALS_PREFS_KEY] ?? {}) as
    | SubmittalsPreferences
    | undefined;

  return {
    numberingPrefix: stored?.numberingPrefix ?? defaults.numberingPrefix,
    workflowTemplates:
      stored?.workflowTemplates?.length
        ? stored.workflowTemplates
        : defaults.workflowTemplates,
    customFields:
      stored?.customFields?.length ? stored.customFields : defaults.customFields,
  };
}

export async function fetchSubmittalsPreferences(
  client: SupabaseClient<Database>,
  userId: string,
  projectId: number,
) {
  const { data, error } = await client
    .from("user_project_preferences")
    .select("id, preferences")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    return {
      rowId: undefined,
      preferences: getDefaultPreferences(),
      rawPreferences: {},
    };
  }

  const rawPreferences = (data?.preferences as Record<string, unknown>) ?? {};

  return {
    rowId: data?.id,
    preferences: extractSubmittalsPreferences(rawPreferences),
    rawPreferences,
  };
}

export async function persistSubmittalsPreferences(
  client: SupabaseClient<Database>,
  userId: string,
  projectId: number,
  preferences: SubmittalsPreferences,
  rawPreferences: Record<string, unknown>,
  rowId?: string,
) {
  const payload = { ...rawPreferences, [SUBMITTALS_PREFS_KEY]: preferences };

  if (rowId) {
    const { error } = await client
      .from("user_project_preferences")
      .update({ preferences: payload, updated_at: new Date().toISOString() })
      .eq("id", rowId);

    if (error) {
      throw error;
    }

    return rowId;
  }

  const { data, error } = await client
    .from("user_project_preferences")
    .insert({
      user_id: userId,
      project_id: projectId,
      preferences: payload,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data?.id as string;
}
