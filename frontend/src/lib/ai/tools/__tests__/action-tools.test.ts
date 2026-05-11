jest.mock("../guardrails", () => ({
  createToolGuardrails: jest.fn(),
}));

jest.mock("@/lib/supabase/service", () => ({
  createServiceClient: jest.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";
import { createToolGuardrails } from "../guardrails";
import {
  createActionTools,
  normalizeGeneratedTaskPriority,
  normalizeGeneratedTaskStatus,
  previewCreateRFI,
} from "../action-tools";

const mockedCreateToolGuardrails = jest.mocked(createToolGuardrails);
const mockedCreateServiceClient = jest.mocked(createServiceClient);

describe("previewCreateRFI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns a traced preview without writing an RFI", async () => {
    const onTrace = jest.fn();
    mockedCreateToolGuardrails.mockReturnValue({
      enforceProjectAccess: jest.fn().mockResolvedValue({ ok: true }),
      getScope: jest.fn(),
      getScopedProjectIds: jest.fn(),
      applyPinnedProject: jest.fn(),
    });

    const output = await previewCreateRFI(
      "user-1",
      { onTrace, pinnedProjectId: 43 },
      {
        projectId: 43,
        subject: "RFI - Delayed Electrical Rough-in",
        question: "Please clarify delayed electrical rough-in.",
        costImpact: "tbd",
        scheduleImpact: "tbd",
      },
    );

    expect(output).toMatchObject({
      action: "preview",
      preview: {
        table: "rfis",
        fields: {
          project_id: 43,
          subject: "RFI - Delayed Electrical Rough-in",
          question: "Please clarify delayed electrical rough-in.",
          cost_impact: "tbd",
          schedule_impact: "tbd",
          status: "open",
          is_private: false,
        },
      },
    });
    expect(onTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        tool: "createRFI",
        input: expect.objectContaining({
          projectId: 43,
          confirmed: false,
        }),
        output: expect.objectContaining({
          action: "preview",
        }),
      }),
    );
  });

  it("fails loudly through trace when project access is denied", async () => {
    const onTrace = jest.fn();
    mockedCreateToolGuardrails.mockReturnValue({
      enforceProjectAccess: jest.fn().mockResolvedValue({
        ok: false,
        error: "You do not have access to that project.",
      }),
      getScope: jest.fn(),
      getScopedProjectIds: jest.fn(),
      applyPinnedProject: jest.fn(),
    });

    const output = await previewCreateRFI(
      "user-1",
      { onTrace },
      {
        projectId: 999,
        subject: "RFI - Restricted Project",
        question: "Can I create this?",
      },
    );

    expect(output).toEqual({
      success: false,
      error: "You do not have access to that project.",
    });
    expect(onTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        tool: "createRFI",
        input: expect.objectContaining({
          projectId: 999,
          confirmed: false,
        }),
        output: output,
      }),
    );
  });
});

describe("generated task DB contract normalization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("maps AI-friendly priority aliases to public.tasks priority values", () => {
    expect(normalizeGeneratedTaskPriority("normal")).toBe("medium");
    expect(normalizeGeneratedTaskPriority("medium")).toBe("medium");
    expect(normalizeGeneratedTaskPriority("critical")).toBe("urgent");
    expect(normalizeGeneratedTaskPriority("urgent")).toBe("urgent");
    expect(normalizeGeneratedTaskPriority("high")).toBe("high");
    expect(normalizeGeneratedTaskPriority("low")).toBe("low");
    expect(normalizeGeneratedTaskPriority()).toBe("medium");
  });

  it("maps AI-friendly status aliases to public.tasks status values", () => {
    expect(normalizeGeneratedTaskStatus("completed")).toBe("done");
    expect(normalizeGeneratedTaskStatus("done")).toBe("done");
    expect(normalizeGeneratedTaskStatus("in_progress")).toBe("in_progress");
    expect(normalizeGeneratedTaskStatus("blocked")).toBe("blocked");
    expect(normalizeGeneratedTaskStatus("cancelled")).toBe("cancelled");
    expect(normalizeGeneratedTaskStatus("open")).toBe("open");
    expect(normalizeGeneratedTaskStatus()).toBe("open");
  });

  it("creates confirmed generated tasks through the atomic RPC", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: {
        id: "task-1",
        title: "Call Brandon",
        description: "Call Brandon about framing RFI",
        status: "done",
        priority: "urgent",
        due_date: "2026-05-12",
        project_id: 43,
        assignee_name: "Brandon",
        assignee_email: null,
        created_at: "2026-05-11T21:30:00Z",
      },
      error: null,
    });
    const auditInsert = jest.fn().mockResolvedValue({ error: null });
    const from = jest.fn((tableName: string) => {
      if (tableName === "people") {
        return {
          select: jest.fn(() => ({
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
          })),
        };
      }
      if (tableName === "ai_tool_write_audits") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    order: jest.fn(() => ({
                      limit: jest.fn(() => ({
                        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                      })),
                    })),
                  })),
                })),
              })),
            })),
          })),
          insert: auditInsert,
        };
      }
      throw new Error(`Unexpected table write in generated task test: ${tableName}`);
    });

    mockedCreateToolGuardrails.mockReturnValue({
      enforceProjectAccess: jest.fn().mockResolvedValue({ ok: true }),
      getScope: jest.fn(),
      getScopedProjectIds: jest.fn(),
      applyPinnedProject: jest.fn(),
    });
    mockedCreateServiceClient.mockReturnValue({ from, rpc } as never);

    const tools = createActionTools("00000000-0000-0000-0000-000000000001");
    const execute = tools.createGeneratedTask.execute;
    if (!execute) throw new Error("createGeneratedTask execute was not registered");

    const output = await execute({
      projectId: 43,
      title: "Call Brandon",
      description: "Call Brandon about framing RFI",
      assignee: "Brandon",
      dueDate: "2026-05-12",
      scheduleTaskId: "11111111-1111-1111-1111-111111111111",
      priority: "critical",
      status: "completed",
      confirmed: true,
      idempotencyKey: "task-key-1",
    });

    expect(rpc).toHaveBeenCalledWith(
      "create_ai_generated_task",
      expect.objectContaining({
        p_title: "Call Brandon",
        p_description: "Call Brandon about framing RFI",
        p_status: "done",
        p_priority: "urgent",
        p_project_id: 43,
        p_schedule_task_id: "11111111-1111-1111-1111-111111111111",
        p_assignee_name: "Brandon",
        p_idempotency_key: "task-key-1",
      }),
    );
    expect(from).not.toHaveBeenCalledWith("document_metadata");
    expect(from).not.toHaveBeenCalledWith("tasks");
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({ status: "success" }));
    expect(output).toMatchObject({
      success: true,
      record: {
        id: "task-1",
        status: "done",
        priority: "urgent",
      },
    });
  });
});
