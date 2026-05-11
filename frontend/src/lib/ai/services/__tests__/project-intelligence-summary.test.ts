jest.mock("server-only", () => ({}));
jest.mock("ai", () => ({
  generateText: jest.fn(),
  Output: {
    object: jest.fn((config) => ({ kind: "object", ...config })),
  },
}));
jest.mock("@/lib/ai/providers", () => ({
  getLanguageModel: jest.fn((modelId: string) => ({ modelId })),
}));
jest.mock("@/lib/ai/provider-config", () => ({
  formatAIProviderFailure: jest.fn(
    (error: unknown, purpose: string) =>
      `${purpose} failed: ${error instanceof Error ? error.message : String(error)}`,
  ),
}));

import { generateText, Output } from "ai";
import { getLanguageModel } from "@/lib/ai/providers";
import { summarizeProjectIntelligence } from "../project-intelligence-summary";

const generateTextMock = generateText as jest.MockedFunction<typeof generateText>;
const outputObjectMock = Output.object as jest.MockedFunction<typeof Output.object>;
const getLanguageModelMock = getLanguageModel as jest.MockedFunction<typeof getLanguageModel>;

const validOutput = {
  headline: "Owner approval is blocked by missing cost detail.",
  context:
    "The latest project messages show an owner decision waiting on clearer pricing and schedule impact.",
  risks: [
    {
      title: "Approval delay could push procurement",
      severity: "high" as const,
      recommendedAction: "Send a priced decision packet to the owner.",
      sourceIds: ["email-1"],
    },
  ],
  decisions: [
    {
      title: "Proceed with revised lobby finish pricing",
      owner: "Brandon",
      followUp: "Confirm owner approval after pricing is sent.",
      sourceIds: ["meeting-1"],
    },
  ],
  actionItems: [
    {
      title: "Send revised pricing packet",
      owner: "Brandon",
      dueDate: "2026-05-13",
      priority: "high" as const,
      sourceIds: ["email-1", "meeting-1"],
    },
  ],
  dataGaps: ["No final owner approval is present in the provided sources."],
  confidence: "high" as const,
};

describe("summarizeProjectIntelligence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    generateTextMock.mockResolvedValue({
      output: validOutput,
    } as Awaited<ReturnType<typeof generateText>>);
  });

  it("uses AI SDK structured output with traceable source context", async () => {
    const summary = await summarizeProjectIntelligence({
      projectName: "Ulta Beauty Fresno",
      focus: "project_brief",
      sources: [
        {
          id: "email-1",
          type: "email",
          title: "Owner pricing request",
          text: "Owner requested revised lobby finish pricing before approving the work.",
          capturedAt: "2026-05-11T12:00:00.000Z",
        },
        {
          id: "meeting-1",
          type: "meeting",
          text: "Brandon said he would send the revised pricing packet by 2026-05-13.",
        },
      ],
    });

    expect(getLanguageModelMock).toHaveBeenCalledWith("openai/gpt-4.1-nano");
    expect(outputObjectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "project_intelligence_summary",
      }),
    );
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        output: expect.objectContaining({ kind: "object" }),
        prompt: expect.stringContaining("Available source IDs: email-1, meeting-1"),
      }),
    );
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("Owner requested revised lobby finish pricing"),
      }),
    );
    expect(summary).toMatchObject({
      schema: "project_intelligence_summary_v1",
      model: "openai/gpt-4.1-nano",
      sourceCount: 2,
      sourceIds: ["email-1", "meeting-1"],
      headline: validOutput.headline,
    });
  });

  it("fails loudly before model calls when sources are missing", async () => {
    await expect(
      summarizeProjectIntelligence({ sources: [] }),
    ).rejects.toThrow("Project intelligence summary requires at least one source");
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("rejects model output that cites unknown source IDs", async () => {
    generateTextMock.mockResolvedValueOnce({
      output: {
        ...validOutput,
        actionItems: [
          {
            ...validOutput.actionItems[0],
            sourceIds: ["not-provided"],
          },
        ],
      },
    } as Awaited<ReturnType<typeof generateText>>);

    await expect(
      summarizeProjectIntelligence({
        sources: [
          {
            id: "email-1",
            type: "email",
            text: "Owner requested revised lobby finish pricing before approval.",
          },
          {
            id: "meeting-1",
            type: "meeting",
            text: "Brandon said he would send the revised pricing packet by 2026-05-13.",
          },
        ],
      }),
    ).rejects.toThrow("Project intelligence summary cited unknown source IDs: not-provided");
  });
});
