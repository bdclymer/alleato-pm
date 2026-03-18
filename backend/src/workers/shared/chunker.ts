/**
 * Chunking Utilities
 */

import type { DocumentChunk, MeetingContext, MeetingSegment, TranscriptLine } from "./types";
import { hashContent } from "./parser";

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const CHUNK_TARGET_CHARS = 3000; // ~750 tokens
const CHUNK_OVERLAP_CHARS = 500; // ~125 tokens

// -----------------------------------------------------------------------------
// Chunk Segment
// -----------------------------------------------------------------------------

export function chunkSegment(
  segment: MeetingSegment,
  allLines: TranscriptLine[]
): DocumentChunk[] {
  const segmentLines = allLines.filter(
    (l) => l.index >= segment.startIndex && l.index <= segment.endIndex
  );

  if (segmentLines.length === 0) return [];

  const fullText = segmentLines
    .map((l) => `${l.speaker}: ${l.text}`)
    .join("\n");

  const sentences = splitSentences(fullText);
  const chunks: DocumentChunk[] = [];

  let currentChunk: string[] = [];
  let currentLength = 0;
  let chunkIndex = 0;

  for (const sentence of sentences) {
    const sentenceLen = sentence.length;

    if (
      currentLength + sentenceLen > CHUNK_TARGET_CHARS &&
      currentChunk.length > 0
    ) {
      const chunkText = currentChunk.join(" ");
      chunks.push({
        content: chunkText,
        chunkIndex: chunkIndex++,
        segmentIndex: segment.segmentIndex,
        docType: "chunk",
        contentHash: hashContent(chunkText),
      });

      // Overlap: keep last N chars worth of sentences
      const overlapSentences: string[] = [];
      let overlapLen = 0;
      for (let i = currentChunk.length - 1; i >= 0; i--) {
        if (overlapLen + currentChunk[i].length <= CHUNK_OVERLAP_CHARS) {
          overlapSentences.unshift(currentChunk[i]);
          overlapLen += currentChunk[i].length;
        } else {
          break;
        }
      }

      currentChunk = overlapSentences;
      currentLength = overlapLen;
    }

    currentChunk.push(sentence);
    currentLength += sentenceLen;
  }

  // Final chunk
  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join(" ");
    chunks.push({
      content: chunkText,
      chunkIndex: chunkIndex,
      segmentIndex: segment.segmentIndex,
      docType: "chunk",
      contentHash: hashContent(chunkText),
    });
  }

  return chunks;
}

function splitSentences(text: string): string[] {
  // Split on sentence boundaries followed by whitespace and capital letter
  const pattern = /(?<=[.!?])\s+(?=[A-Z])/;
  return text.split(pattern).filter((s) => s.trim());
}

// -----------------------------------------------------------------------------
// Create All Chunks for a Meeting
// -----------------------------------------------------------------------------

export function createMeetingChunks(
  segments: MeetingSegment[],
  transcriptLines: TranscriptLine[],
  meetingSummary: string,
  meetingContext?: MeetingContext
): DocumentChunk[] {
  const allChunks: DocumentChunk[] = [];

  // Add transcript chunks from each segment
  for (const segment of segments) {
    const segmentChunks = chunkSegment(segment, transcriptLines);

    // Attach contextual prefix to each chunk for embedding quality.
    // content stays clean (stored in DB); contextualContent is what gets embedded.
    if (meetingContext) {
      const attendees = meetingContext.participants.slice(0, 5).join(", ") || "Unknown";
      const dateStr = meetingContext.date ?? "Unknown date";
      const prefix = `[Meeting: "${meetingContext.title}" | ${dateStr} | Attendees: ${attendees}]\nSegment: "${segment.title}"\n\n`;
      for (const chunk of segmentChunks) {
        chunk.contextualContent = prefix + chunk.content;
      }
    }

    allChunks.push(...segmentChunks);
  }

  // Add meeting summary as a chunk
  if (meetingSummary) {
    const summaryChunk: DocumentChunk = {
      content: meetingSummary,
      chunkIndex: 0,
      segmentIndex: -1, // -1 indicates meeting-level
      docType: "meeting_summary",
      contentHash: hashContent(meetingSummary),
    };
    if (meetingContext) {
      const dateStr = meetingContext.date ?? "Unknown date";
      summaryChunk.contextualContent = `[Meeting: "${meetingContext.title}" | ${dateStr}]\nSummary:\n\n${meetingSummary}`;
    }
    allChunks.push(summaryChunk);
  }

  // Add segment summaries as chunks
  for (const segment of segments) {
    if (segment.summary) {
      const summaryChunk: DocumentChunk = {
        content: segment.summary,
        chunkIndex: 0,
        segmentIndex: segment.segmentIndex,
        docType: "segment_summary",
        contentHash: hashContent(segment.summary),
      };
      if (meetingContext) {
        const dateStr = meetingContext.date ?? "Unknown date";
        summaryChunk.contextualContent = `[Meeting: "${meetingContext.title}" | ${dateStr} | Segment: "${segment.title}"]\n\n${segment.summary}`;
      }
      allChunks.push(summaryChunk);
    }
  }

  return allChunks;
}
