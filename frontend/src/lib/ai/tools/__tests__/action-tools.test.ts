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

jest.mock("@/services/notificationService", () => ({
  notifyChangeRequestReviewNeeded: jest.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";
import { notifyChangeRequestReviewNeeded } from "@/services/notificationService";
import { createToolGuardrails } from "../guardrails";
import {
  buildCommitmentDraftWidget,
  buildCommitmentSovInserts,
  createActionTools,
  normalizeGeneratedTaskPriority,
  normalizeGeneratedTaskStatus,
  previewCreateRFI,
  validateCommitmentLineItems,
} from "../action-tools";

const mockedCreateToolGuardrails = jest.mocked(createToolGuardrails);
const mockedCreateServiceClient = jest.mocked(createServiceClient);
const mockedNotifyChangeRequestReviewNeeded = jest.mocked(
  notifyChangeRequestReviewNeeded,
);

describe("previewCreateRFI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedNotifyChangeRequestReviewNeeded.mockResolvedValue({
      created: 1,
      skipped: 0,
    });
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

describe("createChangeEvent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("previews change request creation before writing", async () => {
    const onTrace = jest.fn();
    mockedCreateToolGuardrails.mockReturnValue({
      enforceProjectAccess: jest.fn().mockResolvedValue({
        ok: true,
        projectId: 43,
      }),
      getScope: jest.fn(),
      getScopedProjectIds: jest.fn(),
      applyPinnedProject: jest.fn(),
    });
    mockedCreateServiceClient.mockReturnValue({ from: jest.fn() } as never);

    const tools = createActionTools(
      "00000000-0000-0000-0000-000000000001",
      { onTrace },
    );
    const execute = tools.createChangeEvent.execute;
    if (!execute) throw new Error("createChangeEvent execute was not registered");

    const output = await execute({
      projectId: 43,
      title: "Owner-requested lobby finish change",
      description: "Owner asked to upgrade the lobby finish package.",
      scope: "owner_change",
      type: "potential_change",
      status: "open",
      confirmed: false,
    });

    expect(output).toMatchObject({
      action: "preview",
      preview: {
        table: "change_events",
        fields: {
          project_id: 43,
          title: "Owner-requested lobby finish change",
          description: "Owner asked to upgrade the lobby finish package.",
          scope: "owner_change",
          type: "potential_change",
          status: "open",
        },
      },
    });
    expect(mockedNotifyChangeRequestReviewNeeded).toHaveBeenCalledWith(
      "00000000-0000-0000-0000-000000000001",
      expect.objectContaining({
        projectId: 43,
        title: "Owner-requested lobby finish change",
        description: "Owner asked to upgrade the lobby finish package.",
        scope: "owner_change",
        type: "potential_change",
        status: "open",
        eventKey: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    expect(onTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        tool: "createChangeEvent",
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

describe("createSubmittal DB contract", () => {
  const userId = "00000000-0000-0000-0000-000000000001";
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function setupSubmittalMocks() {
    const submittalInsert = jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({
          data: {
            id: "sub-1",
            title: "Structural Steel Shop Drawings",
            submittal_number: "001",
            status: "pending",
          },
          error: null,
        }),
      })),
    }));
    const auditInsert = jest.fn().mockResolvedValue({ error: null });
    const from = jest.fn((tableName: string) => {
      if (tableName === "ai_tool_write_audits") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    order: jest.fn(() => ({
                      limit: jest.fn(() => ({
                        maybeSingle: jest
                          .fn()
                          .mockResolvedValue({ data: null, error: null }),
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
      if (tableName === "submittals") {
        return {
          // read path: fetch the latest submittal_number for numbering
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest
                  .fn()
                  .mockResolvedValue({ data: [], error: null }),
              })),
            })),
          })),
          // write path
          insert: submittalInsert,
        };
      }
      throw new Error(`Unexpected table in submittal test: ${tableName}`);
    });

    mockedCreateToolGuardrails.mockReturnValue({
      enforceProjectAccess: jest.fn().mockResolvedValue({ ok: true }),
      getScope: jest.fn(),
      getScopedProjectIds: jest.fn(),
      applyPinnedProject: jest.fn().mockResolvedValue(1009),
    } as never);
    mockedCreateServiceClient.mockReturnValue({ from } as never);

    return { from, submittalInsert };
  }

  it("writes the authenticated user uuid to submitted_by and the free-text party to submitter_company", async () => {
    // Regression: submitted_by is a NOT NULL uuid FK. Previously the tool wrote
    // the free-text "submittedBy" string ("TBD"/subcontractor name) straight
    // into it, so every confirmed createSubmittal failed at the DB insert and
    // the model hallucinated an unrelated "due date is required" error.
    const { submittalInsert } = setupSubmittalMocks();

    const tools = createActionTools(userId);
    const execute = tools.createSubmittal.execute;
    if (!execute) throw new Error("createSubmittal execute was not registered");

    await execute(
      {
        projectId: 1009,
        title: "Structural Steel Shop Drawings",
        specSection: "05 12 00",
        submittedBy: "ACME Steel Co",
        status: "Draft",
        confirmed: true,
        idempotencyKey: "submittal-key-1",
      },
      { toolCallId: "call-1", messages: [] } as never,
    );

    expect(submittalInsert).toHaveBeenCalledTimes(1);
    const payload = submittalInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.submitted_by).toBe(userId);
    expect(payload.submitted_by).toMatch(UUID_RE);
    expect(payload.submitted_by).not.toBe("ACME Steel Co");
    expect(payload.created_by).toBe(userId);
    expect(payload.submitter_company).toBe("ACME Steel Co");
  });

  it("only accepts status values permitted by the submittals_status_check DB constraint", () => {
    // Regression: the tool defaulted status to "pending" and offered
    // "revise_resubmit", neither of which is in the DB check constraint, so
    // every insert failed. The schema enum must be a subset of the allowed set
    // and must default to a valid status.
    const DB_ALLOWED_STATUSES = new Set([
      "Draft",
      "Open",
      "Distributed",
      "Closed",
      "draft",
      "submitted",
      "under_review",
      "requires_revision",
      "approved",
      "rejected",
      "superseded",
    ]);

    const tools = createActionTools(userId);
    const schema = (
      tools.createSubmittal as unknown as { inputSchema: import("zod").ZodTypeAny }
    ).inputSchema;
    const statusSchema = (
      schema as unknown as { shape: { status: import("zod").ZodTypeAny } }
    ).shape.status;

    // Default must be a valid status (status omitted -> default applied).
    const parsedDefault = (
      schema as unknown as {
        parse: (v: unknown) => { status: string };
      }
    ).parse({ projectId: 1009, title: "x" });
    expect(DB_ALLOWED_STATUSES.has(parsedDefault.status)).toBe(true);

    // Every status the tool offers must be permitted by the DB constraint.
    const toolStatuses = [
      "Draft",
      "Open",
      "Distributed",
      "Closed",
      "submitted",
      "under_review",
      "requires_revision",
      "approved",
      "rejected",
      "superseded",
    ];
    for (const value of toolStatuses) {
      expect(statusSchema.safeParse(value).success).toBe(true);
      expect(DB_ALLOWED_STATUSES.has(value)).toBe(true);
    }

    // The previously-broken values must be rejected by the tool schema.
    expect(statusSchema.safeParse("pending").success).toBe(false);
    expect(statusSchema.safeParse("revise_resubmit").success).toBe(false);
  });

  it("stores submitter_company as null when the party is blank or 'TBD'", async () => {
    const { submittalInsert } = setupSubmittalMocks();

    const tools = createActionTools(userId);
    const execute = tools.createSubmittal.execute;
    if (!execute) throw new Error("createSubmittal execute was not registered");

    await execute(
      {
        projectId: 1009,
        title: "Door Hardware",
        submittedBy: "TBD",
        status: "Draft",
        confirmed: true,
        idempotencyKey: "submittal-key-2",
      },
      { toolCallId: "call-2", messages: [] } as never,
    );

    const payload = submittalInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.submitted_by).toBe(userId);
    expect(payload.submitter_company).toBeNull();
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

  it("includes SOV line items and total in the commitment draft", () => {
    const widget = buildCommitmentDraftWidget({
      projectId: 25125,
      type: "subcontract",
      title: "Electrical rough-in",
      contractNumber: "SC-001",
      status: "Draft",
      vendorName: "Acme Electric",
      contractCompanyId: "company-1",
      lineItems: [
        {
          budgetCode: "26-0000",
          description: "Electrical rough-in",
          amount: 12500,
          quantity: 1,
          unitCost: 12500,
          uom: "LS",
          retainagePercent: 10,
        },
      ],
    });

    expect(widget.totalAmount).toBe(12500);
    expect(widget.lineItems).toEqual([
      expect.objectContaining({
        costCode: "26-0000",
        description: "Electrical rough-in",
        amount: 12500,
        quantity: 1,
        unitCost: 12500,
        uom: "LS",
      }),
    ]);
    expect(widget.validation).toContainEqual(
      expect.objectContaining({
        label: "SOV lines",
        status: "pass",
      }),
    );
  });

  it("maps commitment line items to the correct SOV table insert shapes", () => {
    expect(
      buildCommitmentSovInserts({
        commitmentId: "commitment-1",
        type: "subcontract",
        lineItems: [
          {
            budgetCode: "26-0000",
            description: "Electrical rough-in",
            amount: 12500,
            uom: "LS",
            retainagePercent: 10,
          },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        subcontract_id: "commitment-1",
        line_number: 1,
        budget_code: "26-0000",
        description: "Electrical rough-in",
        amount: 12500,
        billed_to_date: 0,
        unit_of_measure: "LS",
        retainage_percent: 10,
      }),
    ]);

    expect(
      buildCommitmentSovInserts({
        commitmentId: "commitment-2",
        type: "purchase_order",
        lineItems: [
          {
            budgetCode: "22-0000",
            description: "Plumbing fixtures",
            amount: 8000,
            uom: "EA",
          },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        purchase_order_id: "commitment-2",
        line_number: 1,
        budget_code: "22-0000",
        description: "Plumbing fixtures",
        amount: 8000,
        billed_to_date: 0,
        uom: "EA",
      }),
    ]);
  });

  it("fails validation for invalid SOV line items", () => {
    expect(
      validateCommitmentLineItems([
        {
          description: " ",
          amount: -1,
        },
      ]),
    ).toEqual([
      "Line 1: description is required.",
      "Line 1: amount must be zero or greater.",
    ]);
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

describe("createCommitment line-item writes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCreateToolGuardrails.mockReturnValue({
      enforceProjectAccess: jest.fn().mockResolvedValue({ ok: true, projectId: 43 }),
      getScope: jest.fn(),
      getScopedProjectIds: jest.fn(),
      applyPinnedProject: jest.fn(),
    });
  });

  it("creates SOV line items after a confirmed subcontract is created", async () => {
    const auditInsert = jest.fn().mockResolvedValue({ error: null });
    const subcontractInsert = jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({
          data: {
            id: "subcontract-1",
            contract_number: "SC-001",
            title: "Electrical rough-in",
            status: "Draft",
          },
          error: null,
        }),
      })),
    }));
    const sovInsert = jest.fn().mockResolvedValue({ error: null });
    const from = jest.fn((tableName: string) => {
      if (tableName === "subcontracts") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
          })),
          insert: subcontractInsert,
          delete: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ error: null }),
          })),
        };
      }
      if (tableName === "companies") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              ilike: jest.fn(() => ({
                limit: jest.fn().mockResolvedValue({
                  data: [{ id: "company-1", name: "Acme Electric" }],
                  error: null,
                }),
              })),
            })),
          })),
        };
      }
      if (tableName === "subcontract_sov_items") {
        return {
          insert: sovInsert,
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
      throw new Error(`Unexpected table in commitment line-item test: ${tableName}`);
    });

    mockedCreateServiceClient.mockReturnValue({ from, rpc: jest.fn() } as never);

    const tools = createActionTools("00000000-0000-0000-0000-000000000001");
    const execute = tools.createCommitment.execute;
    if (!execute) throw new Error("createCommitment execute was not registered");

    const output = await execute({
      projectId: 43,
      type: "subcontract",
      title: "Electrical rough-in",
      vendorName: "Acme Electric",
      status: "Draft",
      lineItems: [
        {
          budgetCode: "26-0000",
          description: "Electrical rough-in",
          amount: 12500,
          quantity: 1,
          unitCost: 12500,
          uom: "LS",
          retainagePercent: 10,
        },
      ],
      confirmed: true,
    });

    expect(output).toMatchObject({
      success: true,
      lineItemsCreated: 1,
    });
    expect(sovInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        subcontract_id: "subcontract-1",
        line_number: 1,
        budget_code: "26-0000",
        description: "Electrical rough-in",
        amount: 12500,
        quantity: 1,
        unit_cost: 12500,
        unit_of_measure: "LS",
        retainage_percent: 10,
      }),
    ]);
  });
});
