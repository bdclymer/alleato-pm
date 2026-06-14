jest.mock("../guardrails", () => ({
  createToolGuardrails: jest.fn(),
}));

jest.mock("@/lib/supabase/service", () => ({
  createServiceClient: jest.fn(),
}));

jest.mock("@/lib/microsoft-graph/calendar-invites", () => ({
  buildCalendarInviteAdaptiveCard: jest.fn(),
  createOutlookCalendarInvite: jest.fn(),
  resolveOutlookOrganizerEmail: jest.fn(),
}));

jest.mock("@/lib/microsoft-graph/mail", () => ({
  buildOutlookMailDraftAdaptiveCard: jest.fn(),
  createOutlookMailDraft: jest.fn(),
  resolveOutlookMailboxUserId: jest.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";
import { createToolGuardrails } from "../guardrails";
import {
  buildCommitmentDraftWidget,
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

describe("buildCommitmentDraftWidget", () => {
  it("marks unresolved vendors as a failing validation item", () => {
    const widget = buildCommitmentDraftWidget({
      projectId: 25125,
      type: "subcontract",
      title: "Electrical rough-in",
      contractNumber: "SC-001",
      status: "Draft",
      vendorName: "Acme Electric",
      contractCompanyId: null,
      description: "Electrical rough-in scope",
    });

    expect(widget.type).toBe("commitment_draft");
    expect(widget.vendorResolved).toBe(false);
    expect(widget.validation).toContainEqual(
      expect.objectContaining({
        label: "Vendor",
        status: "fail",
      }),
    );
  });

  it("builds a passable purchase order draft when the vendor is resolved", () => {
    const widget = buildCommitmentDraftWidget({
      projectId: 25125,
      type: "purchase_order",
      title: "Switchgear procurement",
      contractNumber: "PO-001",
      status: "Draft",
      vendorName: "Acme Supply",
      contractCompanyId: "company-1",
      estimatedCompletionDate: "2026-07-01",
      defaultRetainagePercent: 5,
    });

    expect(widget.commitmentType).toBe("purchase_order");
    expect(widget.vendorResolved).toBe(true);
    expect(widget.validation.every((item) => item.status !== "fail")).toBe(true);
    expect(widget.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Delivery date", value: "2026-07-01" }),
        expect.objectContaining({ label: "Retainage %", value: "5" }),
      ]),
    );
  });
});

describe("project directory action tools", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCreateToolGuardrails.mockReturnValue({
      enforceProjectAccess: jest.fn().mockResolvedValue({ ok: true }),
      getScope: jest.fn(),
      getScopedProjectIds: jest.fn(),
      applyPinnedProject: jest.fn(),
    });
    mockedCreateServiceClient.mockReturnValue({
      from: jest.fn(),
      rpc: jest.fn(),
    } as never);
  });

  it("previews project company creation before writing", async () => {
    const tools = createActionTools("00000000-0000-0000-0000-000000000001");
    const execute = tools.createProjectCompany.execute;
    if (!execute) throw new Error("createProjectCompany execute was not registered");

    const output = await execute({
      projectId: 43,
      name: "ABC Electric",
      companyType: "SUBCONTRACTOR",
      emailAddress: "estimating@abcelectric.test",
      businessPhone: "555-0100",
      confirmed: false,
    });

    expect(output).toMatchObject({
      action: "preview",
      preview: {
        tables: ["companies", "project_companies"],
        fields: {
          project_id: 43,
          name: "ABC Electric",
          company_type: "SUBCONTRACTOR",
          email_address: "estimating@abcelectric.test",
          contact_phone: "555-0100",
          status: "ACTIVE",
        },
      },
    });
  });

  it("previews project contact creation before writing", async () => {
    const tools = createActionTools("00000000-0000-0000-0000-000000000001");
    const execute = tools.createProjectContact.execute;
    if (!execute) throw new Error("createProjectContact execute was not registered");

    const output = await execute({
      projectId: 43,
      firstName: "Alex",
      lastName: "Rivera",
      email: "alex.rivera@abcelectric.test",
      jobTitle: "Project Manager",
      companyName: "ABC Electric",
      role: "Electrical PM",
      makePrimaryCompanyContact: true,
      confirmed: false,
    });

    expect(output).toMatchObject({
      action: "preview",
      preview: {
        tables: ["people", "project_directory_memberships", "project_companies"],
        fields: {
          project_id: 43,
          first_name: "Alex",
          last_name: "Rivera",
          email: "alex.rivera@abcelectric.test",
          job_title: "Project Manager",
          company_name: "ABC Electric",
          role: "Electrical PM",
          person_type: "contact",
          status: "active",
          make_primary_company_contact: true,
        },
      },
    });
  });
});
