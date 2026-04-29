/**
 * Regression tests for meeting-intent detection in the AI RAG pipeline.
 *
 * Bug: "review recent meetings" returned meta-commentary filler instead of data
 * because detectSourceSpecificRagRequest did not match general meeting queries.
 * Root cause: three compounding failures — see GitHub issue #282.
 *
 * These tests MUST FAIL on the pre-fix codebase and PASS after.
 *
 * @see CLAUDE.md Rules 14 & 15 — Bug Fix Completion Gate + Regression Test Gate
 */

import { detectSourceSpecificRagRequest } from "../detect-rag-request";

describe("detectSourceSpecificRagRequest — meeting-intent queries (#282 regression)", () => {
  it('returns recent_meetings kind for "review recent meetings"', () => {
    const result = detectSourceSpecificRagRequest("review recent meetings");
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("recent_meetings");
  });

  it('returns recent_meetings kind for "show me meetings this week"', () => {
    const result = detectSourceSpecificRagRequest("show me meetings this week");
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("recent_meetings");
  });

  it('returns recent_meetings kind for "tell me about our recent meetings"', () => {
    const result = detectSourceSpecificRagRequest("tell me about our recent meetings");
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("recent_meetings");
  });

  it('returns recent_meetings kind for "what meetings did we have this month"', () => {
    const result = detectSourceSpecificRagRequest("what meetings did we have this month");
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("recent_meetings");
  });

  it('returns recent_meetings kind for "can you show me our meeting notes"', () => {
    const result = detectSourceSpecificRagRequest("can you show me our meeting notes");
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("recent_meetings");
  });

  it('returns recent_meetings kind for "meeting summaries from last week"', () => {
    const result = detectSourceSpecificRagRequest("meeting summaries from last week");
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("recent_meetings");
  });

  it('returns recent_meetings with correct label and limit', () => {
    const result = detectSourceSpecificRagRequest("review recent meetings");
    expect(result?.label).toBe("Recent meeting transcripts");
    expect(result?.limit).toBe(10);
  });

  it('still returns meetings_on_date for explicit Friday query', () => {
    const result = detectSourceSpecificRagRequest("what meetings were conducted on friday");
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("meetings_on_date");
  });

  it('returns null for non-meeting queries', () => {
    const result = detectSourceSpecificRagRequest("what is the current budget for the project");
    expect(result).toBeNull();
  });

  it('returns null for queries with meeting only in unrelated context', () => {
    // "meeting" appears but no intent phrase matches
    const result = detectSourceSpecificRagRequest("we are meeting the deadline tomorrow");
    expect(result).toBeNull();
  });
});

describe("detectSourceSpecificRagRequest — existing patterns not regressed", () => {
  it('returns recent_onedrive_documents for OneDrive queries', () => {
    const result = detectSourceSpecificRagRequest("show me the most recent onedrive documents");
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("recent_onedrive_documents");
  });

  it('returns recent_emails for email queries', () => {
    const result = detectSourceSpecificRagRequest("show me the last five emails");
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("recent_emails");
  });

  it('returns recent_teams_discussions for Teams queries', () => {
    const result = detectSourceSpecificRagRequest("show me recent teams discussions");
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("recent_teams_discussions");
  });

  it('returns null for general project queries that should use other paths', () => {
    const result = detectSourceSpecificRagRequest("what is the project status");
    expect(result).toBeNull();
  });
});
