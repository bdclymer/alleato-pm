import { GuardrailError } from "@/lib/guardrails/errors";
import { recordSubmittalWorkflowResponse } from "../workflow-response-service";

type QueryResult = { data?: unknown; error?: { message: string } | null };

class SupabaseMock {
  calls: Array<{
    table: string;
    operation: string;
    payload?: unknown;
    filters: Array<[string, unknown]>;
  }> = [];

  private results: Record<string, QueryResult[]>;

  constructor(results: Record<string, QueryResult[]>) {
    this.results = results;
  }

  from(table: string) {
    return new QueryMock(this, table);
  }

  next(table: string, operation: string) {
    const key = `${table}.${operation}`;
    const result = this.results[key]?.shift();
    if (!result) {
      throw new Error(`No mock result queued for ${key}`);
    }
    return result;
  }
}

class QueryMock {
  private filters: Array<[string, unknown]> = [];
  private operation: "select" | "update" | "insert" | null = null;
  private payload: unknown;

  constructor(
    private readonly db: SupabaseMock,
    private readonly table: string,
  ) {}

  select() {
    this.operation ??= "select";
    return this;
  }

  update(payload: unknown) {
    this.operation = "update";
    this.payload = payload;
    return this;
  }

  insert(payload: unknown) {
    this.operation = "insert";
    this.payload = payload;
    const result = this.db.next(this.table, "insert");
    this.db.calls.push({
      table: this.table,
      operation: "insert",
      payload,
      filters: [...this.filters],
    });
    return Promise.resolve({ data: result.data, error: result.error ?? null });
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }

  order() {
    return this;
  }

  then<TResult1 = { data?: unknown; error?: { message: string } | null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data?: unknown; error?: { message: string } | null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    try {
      const result = this.db.next(this.table, this.operation ?? "select");
      this.db.calls.push({
        table: this.table,
        operation: this.operation ?? "select",
        payload: this.payload,
        filters: [...this.filters],
      });
      return Promise.resolve({
        data: result.data,
        error: result.error ?? null,
      }).then(onfulfilled, onrejected);
    } catch (error) {
      return Promise.reject(error).then(onfulfilled, onrejected);
    }
  }

  maybeSingle() {
    const result = this.db.next(this.table, this.operation ?? "select");
    this.db.calls.push({
      table: this.table,
      operation: this.operation ?? "select",
      payload: this.payload,
      filters: [...this.filters],
    });
    return Promise.resolve({ data: result.data ?? null, error: result.error ?? null });
  }

  single() {
    const result = this.db.next(this.table, this.operation ?? "select");
    this.db.calls.push({
      table: this.table,
      operation: this.operation ?? "select",
      payload: this.payload,
      filters: [...this.filters],
    });
    return Promise.resolve({ data: result.data, error: result.error ?? null });
  }
}

describe("recordSubmittalWorkflowResponse", () => {
  it("persists a submittal history entry for workflow responses", async () => {
    const supabase = new SupabaseMock({
      "submittals.select": [
        { data: { id: "sub-1", project_id: 25125, status: "Open" } },
      ],
      "submittal_workflow_steps.select": [
        { data: { id: "step-1" } },
        {
          data: [
            {
              id: "step-1",
              step_order: 1,
              step_type: "Reviewer",
              submittal_responses: [
                { responder_id: "user-1", response_status: "Revise and Resubmit" },
              ],
            },
          ],
        },
      ],
      "submittal_responses.select": [{ data: { id: "response-1" } }],
      "submittal_responses.update": [
        { data: { id: "response-1", response_status: "Revise and Resubmit" } },
      ],
      "submittals.update": [{ data: null }],
      "submittal_history.insert": [{ data: null }],
    });

    await expect(
      recordSubmittalWorkflowResponse({
        supabase: supabase as never,
        projectId: 25125,
        submittalId: "sub-1",
        stepId: "step-1",
        userId: "user-1",
        responseStatus: "Revise and Resubmit",
        comments: "AI review found a finish conflict.",
        where: "projects/[projectId]/submittals/[submittalId]/ai-review/workflow-response#POST",
      }),
    ).resolves.toEqual({
      id: "response-1",
      response_status: "Revise and Resubmit",
    });

    const historyCall = supabase.calls.find(
      (call) => call.table === "submittal_history",
    );
    expect(historyCall?.payload).toMatchObject({
      action: "workflow_response_recorded",
      actor_id: "user-1",
      previous_status: "Open",
      new_status: "Closed",
      changes: {
        response_status: "Revise and Resubmit",
        comments_present: true,
      },
      metadata: {
        project_id: 25125,
        workflow_step_id: "step-1",
        response_id: "response-1",
        source: "ai_review",
      },
    });
  });

  it("fails loudly when the history entry cannot be written", async () => {
    const supabase = new SupabaseMock({
      "submittals.select": [
        { data: { id: "sub-1", project_id: 25125, status: "Open" } },
      ],
      "submittal_workflow_steps.select": [
        { data: { id: "step-1" } },
        {
          data: [
            {
              id: "step-1",
              step_order: 1,
              step_type: "Reviewer",
              submittal_responses: [
                { responder_id: "user-1", response_status: "Approved" },
              ],
            },
          ],
        },
      ],
      "submittal_responses.select": [{ data: { id: "response-1" } }],
      "submittal_responses.update": [
        { data: { id: "response-1", response_status: "Approved" } },
      ],
      "submittals.update": [{ data: null }],
      "submittal_history.insert": [
        { error: { message: "history insert failed" } },
      ],
    });

    await expect(
      recordSubmittalWorkflowResponse({
        supabase: supabase as never,
        projectId: 25125,
        submittalId: "sub-1",
        stepId: "step-1",
        userId: "user-1",
        responseStatus: "Approved",
        comments: null,
        where: "workflow-response-test",
      }),
    ).rejects.toMatchObject<Partial<GuardrailError>>({
      code: "DB_ERROR",
      message:
        "Could not write submittal workflow response history: history insert failed",
    });
  });
});
