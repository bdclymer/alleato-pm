import { describe, it, expect } from "vitest";
import { parseVtt, cuesToTranscript } from "@/lib/vtt";

const SAMPLE = `WEBVTT

00:00:00.000 --> 00:00:04.500
<v Brandon Clymer>Let's kick off the weekly OPS sync.</v>

00:00:04.500 --> 00:00:09.000
<v Jane Dawson>I'll cover the estimating backlog first.</v>

00:00:09.000 --> 00:00:12.000
No speaker tag on this cue.
`;

describe("parseVtt", () => {
  it("extracts speaker, timestamp, and text from voice tags", () => {
    const cues = parseVtt(SAMPLE);
    expect(cues).toHaveLength(3);
    expect(cues[0]).toEqual({
      timestamp: "00:00",
      speaker: "Brandon Clymer",
      text: "Let's kick off the weekly OPS sync.",
    });
    expect(cues[1].speaker).toBe("Jane Dawson");
    expect(cues[1].timestamp).toBe("00:04");
  });

  it("yields speaker=null when a cue has no voice tag", () => {
    const cues = parseVtt(SAMPLE);
    expect(cues[2].speaker).toBeNull();
    expect(cues[2].text).toBe("No speaker tag on this cue.");
  });

  it("handles CRLF and multi-line cue text", () => {
    const vtt = "WEBVTT\r\n\r\n00:01:05.000 --> 00:01:10.000\r\n<v Speaker A>First line\r\nsecond line.</v>\r\n";
    const cues = parseVtt(vtt);
    expect(cues).toHaveLength(1);
    expect(cues[0].timestamp).toBe("01:05");
    expect(cues[0].speaker).toBe("Speaker A");
    expect(cues[0].text).toContain("First line");
    expect(cues[0].text).toContain("second line.");
  });

  it("renders minutes beyond 99 for long meetings", () => {
    const vtt = "WEBVTT\n\n02:05:30.000 --> 02:05:35.000\n<v X>Two hours in.</v>\n";
    const cues = parseVtt(vtt);
    expect(cues[0].timestamp).toBe("125:30");
  });

  it("returns [] for empty or header-only input", () => {
    expect(parseVtt("")).toEqual([]);
    expect(parseVtt("WEBVTT\n")).toEqual([]);
  });

  it("cuesToTranscript flattens to readable lines", () => {
    const line = cuesToTranscript([{ timestamp: "00:00", speaker: "A", text: "hi" }]);
    expect(line).toBe("[00:00] A: hi");
  });
});
