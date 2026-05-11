jest.mock("../guardrails", () => ({
  createToolGuardrails: jest.fn(),
}));

import { createToolGuardrails } from "../guardrails";
import {
  normalizeGeneratedTaskPriority,
  normalizeGeneratedTaskStatus,
  previewCreateRFI,
} from "../action-tools";

const mockedCreateToolGuardrails = jest.mocked(createToolGuardrails);

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
});
