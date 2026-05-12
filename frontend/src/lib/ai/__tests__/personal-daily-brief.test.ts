import {
  identityLooksLikeBrandon,
  isDailyBriefCritiqueRequest,
  isExecutiveBriefingMetadataQuestion,
  isPersonalDailyBriefRequest,
  isPersonalTaskRegisterRequest,
} from "../personal-daily-brief";

describe("personal daily brief routing", () => {
  it("detects first-person daily brief prompts", () => {
    expect(isPersonalDailyBriefRequest("what's my daily brief")).toBe(true);
    expect(isPersonalDailyBriefRequest("What needs my attention today?")).toBe(true);
    expect(isPersonalDailyBriefRequest("Give me my morning update")).toBe(true);
  });

  it("does not treat generic project updates as personal daily briefs", () => {
    expect(isPersonalDailyBriefRequest("give me the Westfield project update")).toBe(false);
    expect(isPersonalDailyBriefRequest("daily log status for project 760")).toBe(false);
  });

  it("detects personal task register prompts without replaying the daily brief", () => {
    expect(isPersonalTaskRegisterRequest("what are my tasks")).toBe(true);
    expect(isPersonalTaskRegisterRequest("show my task list")).toBe(true);
    expect(isPersonalTaskRegisterRequest("what needs my attention today?")).toBe(false);
  });

  it("recognizes CEO verbiage variants as personal task register requests", () => {
    expect(isPersonalTaskRegisterRequest("What's on my plate this week?")).toBe(true);
    expect(isPersonalTaskRegisterRequest("Pull up my todo list.")).toBe(true);
    expect(isPersonalTaskRegisterRequest("What am I behind on?")).toBe(true);
    expect(isPersonalTaskRegisterRequest("What do I owe people right now?")).toBe(true);
    expect(isPersonalTaskRegisterRequest("Show me everything that's still pending against my name.")).toBe(true);
    expect(isPersonalTaskRegisterRequest("What do I need to handle today?")).toBe(true);
    expect(isPersonalTaskRegisterRequest("What's due tomorrow on my side?")).toBe(true);
    expect(isPersonalTaskRegisterRequest("list my tasks")).toBe(true);
    expect(isPersonalTaskRegisterRequest("give me my to-do list")).toBe(true);
  });

  it("does not treat unrelated questions as personal task register requests", () => {
    // These should NOT route to the personal task register even though they share keywords.
    expect(isPersonalTaskRegisterRequest("What tasks are open on Westfield?")).toBe(false);
    expect(isPersonalTaskRegisterRequest("How is the schedule on Vermillion?")).toBe(false);
    expect(isPersonalTaskRegisterRequest("Mark the AC1 solar approval task done.")).toBe(false);
  });

  it("detects follow-up questions about executive briefing generation metadata", () => {
    expect(isExecutiveBriefingMetadataQuestion("When was this regenerated?")).toBe(true);
    expect(isExecutiveBriefingMetadataQuestion("what time was the briefing report generated")).toBe(true);
    expect(isExecutiveBriefingMetadataQuestion("is this daily operating brief current?")).toBe(true);
    expect(isExecutiveBriefingMetadataQuestion("which project is this about?")).toBe(false);
  });

  it("does not replay the daily brief when the user is critiquing the brief format", () => {
    const prompt =
      "I still think the format or the way the daily brief is structured is not very clear or confusing, but I can't really pinpoint why or what needs to change. What do you think?";

    expect(isDailyBriefCritiqueRequest(prompt)).toBe(true);
    expect(isPersonalDailyBriefRequest(prompt)).toBe(false);
    expect(isDailyBriefCritiqueRequest("The Brandon daily update format is confusing. What should change?")).toBe(true);
  });

  it("matches Brandon from profile, person, or email identity", () => {
    expect(
      identityLooksLikeBrandon({
        profileName: null,
        profileEmail: "brandon@example.com",
        personName: null,
        personEmail: null,
      }),
    ).toBe(true);

    expect(
      identityLooksLikeBrandon({
        profileName: null,
        profileEmail: null,
        personName: "Brandon Harrison",
        personEmail: "operations@example.com",
      }),
    ).toBe(true);
  });

  it("does not route another user's personal brief into Brandon's executive packet", () => {
    expect(
      identityLooksLikeBrandon({
        profileName: "Misty Smith",
        profileEmail: "misty@example.com",
        personName: "Misty Smith",
        personEmail: "misty@example.com",
      }),
    ).toBe(false);
  });
});
