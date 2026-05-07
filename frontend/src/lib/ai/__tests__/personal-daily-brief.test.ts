import {
  identityLooksLikeBrandon,
  isDailyBriefCritiqueRequest,
  isPersonalDailyBriefRequest,
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
