import { NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse } from "@/lib/api-error";
import { parseJsonBody, withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";

const CreateDocumentTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(4000),
  assigneePersonId: z.string().uuid().nullable().optional(),
  dueDate: z.string().trim().min(1).nullable().optional(),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  status: z.enum(["open", "in_progress", "blocked"]).default("open"),
});

function normalizeTaskText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export const POST = withApiGuardrails<{ docId: string }>(
  "documents/[docId]/tasks#POST",
  async ({ request, params }) => {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "documents/[docId]/tasks#POST",
        message: "Authentication required.",
      });
    }

    const { docId } = await params;
    const body = await parseJsonBody(
      request,
      CreateDocumentTaskSchema,
      "documents/[docId]/tasks#POST",
    );

    const { data: source, error: sourceError } = await supabase
      .from("document_metadata")
      .select("id, title, project_id, file_name, type")
      .eq("id", docId)
      .maybeSingle();

    if (sourceError) {
      return apiErrorResponse(sourceError);
    }

    if (!source) {
      throw new GuardrailError({
        code: "NOT_FOUND",
        where: "documents/[docId]/tasks#POST",
        message: "Source document not found.",
        status: 404,
      });
    }

    const normalizedTitle = normalizeTaskText(body.title);
    const normalizedDescription = normalizeTaskText(body.description);

    const { data: existingTask, error: existingTaskError } = await supabase
      .from("tasks")
      .select("id")
      .eq("metadata_id", source.id)
      .eq("title", normalizedTitle)
      .eq("description", normalizedDescription)
      .limit(1)
      .maybeSingle();

    if (existingTaskError) {
      return apiErrorResponse(existingTaskError);
    }

    if (existingTask) {
      return NextResponse.json(
        {
          success: false,
          duplicate: true,
          taskId: existingTask.id,
          error: "A matching task already exists for this conversation.",
        },
        { status: 409 },
      );
    }

    let assigneeFields: {
      assignee_person_id: string | null;
      assignee_name: string | null;
      assignee_email: string | null;
    } = {
      assignee_person_id: null,
      assignee_name: null,
      assignee_email: null,
    };

    if (body.assigneePersonId) {
      const { data: person, error: personError } = await supabase
        .from("people")
        .select("id, first_name, last_name, email")
        .eq("id", body.assigneePersonId)
        .maybeSingle();

      if (personError) {
        return apiErrorResponse(personError);
      }

      if (!person) {
        throw new GuardrailError({
          code: "VALIDATION_ERROR",
          where: "documents/[docId]/tasks#POST",
          message: "Selected assignee was not found.",
          status: 400,
        });
      }

      assigneeFields = {
        assignee_person_id: person.id,
        assignee_name:
          [person.first_name, person.last_name].filter(Boolean).join(" ").trim() || null,
        assignee_email: person.email ?? null,
      };
    }

    const { data: task, error: insertError } = await supabase
      .from("tasks")
      .insert({
        metadata_id: source.id,
        title: normalizedTitle,
        description: normalizedDescription,
        due_date: body.dueDate || null,
        priority: body.priority,
        status: body.status,
        project_id: source.project_id ?? null,
        project_ids: source.project_id ? [source.project_id] : null,
        source_system: "teams_conversation_review",
        assigned_by: user.id,
        extraction_source: "manual_thread_review",
        extraction_metadata: {
          created_from: "teams_conversation_detail",
          source_type: source.type,
        },
        file_name: source.file_name ?? source.title ?? null,
        ...assigneeFields,
      })
      .select("id")
      .single();

    if (insertError) {
      return apiErrorResponse(insertError);
    }

    return NextResponse.json({ success: true, taskId: task.id });
  },
);
