import {
  buildSkillInjectionContext,
  recordSelectedSkillUsage,
} from "../skill-injection-service";
import {
  listActiveVisibleSkills,
  recordSkillUsage,
  type AiSkill,
} from "../skill-library-service";

jest.mock("../skill-library-service", () => ({
  listActiveVisibleSkills: jest.fn(),
  recordSkillUsage: jest.fn(),
  SkillLibraryServiceError: class SkillLibraryServiceError extends Error {
    constructor(
      public readonly table: string,
      public readonly action: string,
      message: string,
    ) {
      super(message);
    }
  },
}));

const listActiveVisibleSkillsMock =
  listActiveVisibleSkills as jest.MockedFunction<typeof listActiveVisibleSkills>;
const recordSkillUsageMock =
  recordSkillUsage as jest.MockedFunction<typeof recordSkillUsage>;

function skill(overrides: Partial<AiSkill> = {}): AiSkill {
  return {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    title: "Review stored materials before pay app approval",
    slug: "review-stored-materials-before-pay-app-approval",
    summary: "Compare stored materials against approved SOV balances.",
    body: "Always verify stored materials against approved SOV balances before pay app approval.",
    instructions:
      "Before approving a pay app with stored materials, compare the stored material line to the approved SOV and flag over-billing.",
    category: "pay_app_review",
    scopeType: "project",
    projectId: 1009,
    ownerUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    reviewerUserId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    status: "active",
    version: 2,
    supersedesSkillId: null,
    examples: [
      {
        input: "Pay app includes stored materials.",
        output: "Check approved SOV balance before approval.",
      },
    ],
    sourceEventIds: [],
    riskLevel: "medium",
    usageCount: 3,
    lastUsedAt: null,
    reviewedAt: "2026-06-18T20:00:00.000Z",
    reviewNotes: null,
    metadata: {},
    createdAt: "2026-06-18T20:00:00.000Z",
    updatedAt: "2026-06-18T20:00:00.000Z",
    ...overrides,
  };
}

describe("skill-injection-service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("selects relevant visible skills and renders a priority-bounded prompt block", async () => {
    listActiveVisibleSkillsMock.mockResolvedValue([
      skill(),
      skill({
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        title: "Draft RFI with source evidence",
        slug: "draft-rfi-with-source-evidence",
        summary: "Use source evidence before drafting RFIs.",
        instructions: "Do not draft an RFI without source evidence.",
        category: "rfi",
        scopeType: "team",
        projectId: null,
        usageCount: 0,
      }),
    ]);

    const result = await buildSkillInjectionContext({
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      messageText: "Can you review this pay app with stored materials?",
      selectedProjectId: 1009,
    });

    expect(listActiveVisibleSkillsMock).toHaveBeenCalledWith({
      viewerUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      viewerProjectIds: [1009],
      limit: 25,
    });
    expect(result.usage?.skills).toHaveLength(1);
    expect(result.usage?.skills[0]).toMatchObject({
      title: "Review stored materials before pay app approval",
      category: "pay_app_review",
      version: 2,
    });
    expect(result.block).toContain("## Approved Skill Library Context");
    expect(result.block).toContain(
      "system/developer instructions > current source evidence",
    );
    expect(result.block).toContain("Review stored materials before pay app approval");
    expect(result.block).not.toContain("Draft RFI with source evidence");
  });

  it("selects app-help skills when the calling surface is app expert", async () => {
    listActiveVisibleSkillsMock.mockResolvedValue([
      skill({
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        title: "Explain where app actions live",
        slug: "explain-where-app-actions-live",
        summary: "Help users understand where app actions and page controls live.",
        instructions: "When users ask about this app, explain the relevant page controls.",
        category: "app_help",
        scopeType: "company",
        projectId: null,
        usageCount: 0,
      }),
      skill({
        id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        category: "pay_app_review",
        scopeType: "company",
        projectId: null,
        usageCount: 0,
      }),
    ]);

    const result = await buildSkillInjectionContext({
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      messageText: "What can I do here?",
      surface: "app_expert",
    });

    expect(result.usage?.selectionSurface).toBe("app_expert");
    expect(result.usage?.skills).toHaveLength(1);
    expect(result.usage?.skills[0]).toMatchObject({
      category: "app_help",
      reasons: ["surface:app_expert"],
    });
    expect(result.block).toContain("Explain where app actions live");
    expect(result.block).not.toContain("Review stored materials");
  });

  it("does not inject irrelevant skills into unrelated prompts", async () => {
    listActiveVisibleSkillsMock.mockResolvedValue([
      skill({
        category: "pay_app_review",
        summary: "Pay app stored material review.",
      }),
    ]);

    const result = await buildSkillInjectionContext({
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      messageText: "What meetings happened yesterday?",
    });

    expect(result.block).toBe("");
    expect(result.usage).toBeNull();
  });

  it("records one usage event for each selected skill", async () => {
    recordSkillUsageMock.mockResolvedValue({ id: "usage-1" } as never);

    await recordSelectedSkillUsage({
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      projectId: 1009,
      sessionId: "session-1",
      surface: "ai_assistant_chat",
      usage: {
        totalSelected: 1,
        selectionReason: "category, project, and keyword relevance",
        selectionSurface: "ai_assistant_chat",
        skills: [
          {
            id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            title: "Review stored materials before pay app approval",
            slug: "review-stored-materials-before-pay-app-approval",
            category: "pay_app_review",
            scope: "project",
            projectId: 1009,
            version: 2,
            riskLevel: "medium",
            score: 120,
            reasons: ["category:pay_app_review", "selected-project"],
          },
        ],
      },
      metadata: { responseMessageId: "message-1" },
    });

    expect(recordSkillUsageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        skillId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        projectId: 1009,
        sessionId: "session-1",
        surface: "ai_assistant_chat",
        outcome: "used",
        metadata: expect.objectContaining({
          responseMessageId: "message-1",
          category: "pay_app_review",
          version: 2,
          score: 120,
        }),
      }),
    );
  });
});
