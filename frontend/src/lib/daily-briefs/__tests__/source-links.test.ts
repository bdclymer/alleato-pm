import type { DailyBriefSourceRef } from "../canonical-packets";
import { buildSourceIndex, cleanSourceTitle } from "../source-links";

function ref(overrides: Partial<DailyBriefSourceRef>): DailyBriefSourceRef {
  return {
    id: "id",
    title: "Title",
    lane: "documents",
    projectId: null,
    projectName: null,
    sourceAt: null,
    url: null,
    ...overrides,
  };
}

const SOURCES: DailyBriefSourceRef[] = [
  ref({
    id: "01KWENX1J352C1R8E3VPVZ69A4",
    lane: "meetings",
    title: "Meeting: Union Collective: Updated OAC",
    url: "https://storage.example/transcript.md",
  }),
  ref({
    id: "teamsdm_cd0dcb2f4f189d3c_2026-07-08",
    lane: "teams",
    title: "Teams DM Conversation: 19:81e9018c",
    url: null,
  }),
  ref({
    id: "outlook_AAMkADk2_alpha",
    lane: "emails",
    title: "Email: RE: McLane Follow Up",
    url: "https://outlook.office365.com/owa/?ItemID=alpha",
  }),
  ref({
    id: "outlook_AAMkADk2_beta",
    lane: "emails",
    title: "Email: Re: Sprinkler RFQ",
    url: "https://outlook.office365.com/owa/?ItemID=beta",
  }),
];

describe("cleanSourceTitle", () => {
  it("strips the compiler's lane prefix", () => {
    expect(cleanSourceTitle(SOURCES[0])).toBe("Union Collective: Updated OAC");
    expect(cleanSourceTitle(SOURCES[2])).toBe("RE: McLane Follow Up");
  });

  it("uses a friendly lane label when the title is an opaque id or empty", () => {
    expect(
      cleanSourceTitle(
        ref({ lane: "teams", title: "Teams DM Conversation: 19:81e9018c" }),
      ),
    ).toBe("Teams message");
    expect(cleanSourceTitle(ref({ lane: "emails", title: "Email:" }))).toBe(
      "Email",
    );
  });
});

describe("buildSourceIndex.resolve", () => {
  const index = buildSourceIndex(SOURCES);

  it("resolves an exact source id", () => {
    expect(index.resolve("01KWENX1J352C1R8E3VPVZ69A4")?.lane).toBe("meetings");
  });

  it("resolves a token truncated with a trailing ellipsis via unique prefix", () => {
    expect(index.resolve("01KWENX1J352C1R8E3VPVZ…")?.id).toBe(
      "01KWENX1J352C1R8E3VPVZ69A4",
    );
  });

  it("resolves a token shortened with an interior ellipsis via unique prefix+suffix", () => {
    // Prefix 'outlook_AAMkADk2_a' + suffix 'pha' matches only _alpha.
    expect(index.resolve("outlook_AAMkADk2_a...pha")?.id).toBe(
      "outlook_AAMkADk2_alpha",
    );
  });

  it("does NOT resolve an ambiguous prefix", () => {
    // Prefix matches both outlook_AAMkADk2_alpha and _beta.
    expect(index.resolve("outlook_AAMkADk2_...")).toBeNull();
  });

  it("resolves a teams source that has no url", () => {
    const teams = index.resolve("teamsdm_cd0dcb2f4f189d3c_2026-07-08");
    expect(teams?.lane).toBe("teams");
    expect(teams?.url).toBeNull();
  });

  it("returns null for text that is not a source id", () => {
    expect(index.resolve("some inline code")).toBeNull();
    expect(index.resolve("")).toBeNull();
  });
});
