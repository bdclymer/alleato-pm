"use server";

import * as React from "react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentUserAppCapability } from "@/lib/app-capabilities";
import { resolveAppBaseUrl } from "@/lib/email/client";
import { sendEmail } from "@/lib/email/send";
import { ExecutiveBriefingEmail } from "@/lib/executive/executive-briefing-email";
import { DEFAULT_EXECUTIVE_WINDOW_DAYS } from "@/lib/executive/brandon-daily-update";
import { createServiceClient } from "@/lib/supabase/service";
import { getApiRouteUser } from "@/lib/supabase/server";
import {
  approveExecutiveBriefingDraft,
  getExecutiveBriefingDashboard,
  regenerateExecutiveBriefingDraft,
  setExecutiveFollowUpState,
} from "@/lib/executive/executive-briefing-workflow";

const EXECUTIVE_PATH = "/executive";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formNumber(formData: FormData, key: string, fallback: number) {
  const raw = Number(formString(formData, key));
  return Number.isFinite(raw) ? raw : fallback;
}

function redirectWithEmailStatus(status: "sent" | "failed", message: string) {
  const params = new URLSearchParams({
    emailStatus: status,
    emailMessage: message.slice(0, 180),
  });
  redirect(`${EXECUTIVE_PATH}?${params.toString()}`);
}

function parseRecipients(raw: string) {
  return raw
    .split(/[,\n;]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function regenerateExecutiveBriefingAction(formData: FormData) {
  await requireCurrentUserAppCapability(
    "view_executive_briefing",
    "executive-briefing-actions#regenerate",
    "Executive briefing access required.",
  );
  const windowDays = formNumber(formData, "windowDays", 2);
  await regenerateExecutiveBriefingDraft({ windowDays });
  revalidatePath(EXECUTIVE_PATH);
}

export async function approveExecutiveBriefingAction(formData: FormData) {
  await requireCurrentUserAppCapability(
    "view_executive_briefing",
    "executive-briefing-actions#approve",
    "Executive briefing access required.",
  );
  const draftId = formString(formData, "draftId");
  if (!draftId) {
    throw new Error("Missing executive briefing draft id.");
  }

  const user = await getApiRouteUser();
  await approveExecutiveBriefingDraft(draftId, user?.id ?? null);
  revalidatePath(EXECUTIVE_PATH);
}

export async function resolveExecutiveFollowUpAction(formData: FormData) {
  await requireCurrentUserAppCapability(
    "view_executive_briefing",
    "executive-briefing-actions#resolve-follow-up",
    "Executive briefing access required.",
  );
  const followUpId = formString(formData, "followUpId");
  if (!followUpId) {
    throw new Error("Missing executive follow-up id.");
  }

  const user = await getApiRouteUser();
  await setExecutiveFollowUpState({
    followUpId,
    nextState: "resolved",
    userId: user?.id ?? null,
  });
  revalidatePath(EXECUTIVE_PATH);
}

export async function reopenExecutiveFollowUpAction(formData: FormData) {
  await requireCurrentUserAppCapability(
    "view_executive_briefing",
    "executive-briefing-actions#reopen-follow-up",
    "Executive briefing access required.",
  );
  const followUpId = formString(formData, "followUpId");
  if (!followUpId) {
    throw new Error("Missing executive follow-up id.");
  }

  const user = await getApiRouteUser();
  await setExecutiveFollowUpState({
    followUpId,
    nextState: "open",
    userId: user?.id ?? null,
  });
  revalidatePath(EXECUTIVE_PATH);
}

export async function createExecutiveTaskDraftAction(formData: FormData) {
  await requireCurrentUserAppCapability(
    "view_executive_briefing",
    "executive-briefing-actions#create-task-draft",
    "Executive briefing access required.",
  );
  const sourceId = formString(formData, "sourceId");
  const title = formString(formData, "title");
  const description = formString(formData, "description");
  const assigneePersonId = formString(formData, "assigneePersonId");

  if (!sourceId) {
    throw new Error("Missing executive source id.");
  }

  if (!title || !description) {
    throw new Error("Missing executive task draft content.");
  }

  const supabase = createServiceClient();

  const { data: metadata, error: metadataError } = await supabase
    .from("document_metadata")
    .select("id, project_id")
    .eq("id", sourceId)
    .single();

  if (metadataError) {
    throw new Error(`Failed to load executive source metadata: ${metadataError.message}`);
  }

  let assigneeName: string | null = null;
  let assigneeEmail: string | null = null;

  if (assigneePersonId) {
    const { data: person, error: personError } = await supabase
      .from("people")
      .select("first_name, last_name, email")
      .eq("id", assigneePersonId)
      .single();

    if (personError) {
      throw new Error(`Failed to load assignee: ${personError.message}`);
    }

    assigneeName = [person.first_name, person.last_name].filter(Boolean).join(" ").trim() || null;
    assigneeEmail = person.email ?? null;
  }

  const normalizedDescription = `[Executive] ${title}: ${description}`.replace(/\s+/g, " ").trim();

  const { data: existingTask, error: existingTaskError } = await supabase
    .from("tasks")
    .select("id")
    .eq("metadata_id", metadata.id)
    .eq("description", normalizedDescription)
    .limit(1)
    .maybeSingle();

  if (existingTaskError) {
    throw new Error(`Failed to check for duplicate executive task: ${existingTaskError.message}`);
  }

  if (!existingTask) {
    const projectId = metadata.project_id ?? null;
    const { error: insertError } = await supabase.from("tasks").insert({
      metadata_id: metadata.id,
      description: normalizedDescription,
      assignee_name: assigneeName,
      assignee_email: assigneeEmail,
      project_id: projectId,
      project_ids: projectId ? [projectId] : null,
      source_system: "executive_briefing",
      status: "not_started",
      priority: "high",
    });

    if (insertError) {
      throw new Error(`Failed to create executive task draft: ${insertError.message}`);
    }
  }

  revalidatePath(EXECUTIVE_PATH);
}

export async function sendExecutiveBriefingEmailAction(formData: FormData) {
  await requireCurrentUserAppCapability(
    "view_executive_briefing",
    "executive-briefing-actions#send-email",
    "Executive briefing access required.",
  );

  const draftId = formString(formData, "draftId");
  const recipients = parseRecipients(formString(formData, "recipients"));
  const subject =
    formString(formData, "subject").trim() || "Daily operating brief";
  const introNote = formString(formData, "introNote").trim();

  if (!draftId) {
    redirectWithEmailStatus("failed", "Missing executive briefing draft id.");
  }

  if (recipients.length === 0) {
    redirectWithEmailStatus("failed", "Add at least one recipient email address.");
  }

  const dashboard = await getExecutiveBriefingDashboard({
    windowDays: DEFAULT_EXECUTIVE_WINDOW_DAYS,
  });

  if (dashboard.draft.id !== draftId) {
    redirectWithEmailStatus(
      "failed",
      "The visible executive draft is stale. Refresh the page and send the latest draft.",
    );
  }

  const user = await getApiRouteUser();
  const senderLabel = user?.email?.trim() || "Alleato";
  const briefUrl = `${resolveAppBaseUrl()}/executive`;

  const result = await sendEmail({
    template: "status-report",
    to: recipients,
    subject,
    react: React.createElement(ExecutiveBriefingEmail, {
      packet: dashboard.draft.packet,
      briefUrl,
      senderLabel,
      introNote: introNote || null,
    }),
    entity: { type: "executive_briefing", id: draftId },
    userId: user?.id ?? undefined,
    idempotencyKey: `executive-briefing/${draftId}/${Date.now()}`,
    metadata: {
      source: "executive-manual-send",
      recapDate: dashboard.draft.recapDate,
      workflowStatus: dashboard.draft.workflowStatus,
      recipientCount: recipients.length,
      recipients,
      introNote: introNote || null,
    },
  });

  if (result.error) {
    redirectWithEmailStatus("failed", result.error.message);
  }

  revalidatePath(EXECUTIVE_PATH);
  redirectWithEmailStatus("sent", `Sent to ${recipients.join(", ")}`);
}
