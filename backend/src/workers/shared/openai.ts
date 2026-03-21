/**
 * OpenAI API Utilities
 */

import type { Env } from "./types";

// -----------------------------------------------------------------------------
// Embeddings
// -----------------------------------------------------------------------------

export async function batchEmbed(
  env: Env,
  texts: string[],
  model: string = "text-embedding-3-large",
  dimensions: number = 1536
): Promise<number[][]> {
  if (texts.length === 0) return [];

  // Truncate texts to avoid token limits
  const truncatedTexts = texts.map((t) => t.slice(0, 8000));

  console.log(`[OpenAI] Embedding ${texts.length} texts with ${model} (${dimensions} dims)`);

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: truncatedTexts,
      dimensions,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI embedding error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };

  console.log(`[OpenAI] Generated ${data.data.length} embeddings`);
  return data.data.map((d) => d.embedding);
}

// -----------------------------------------------------------------------------
// Chat Completions
// -----------------------------------------------------------------------------

export async function callLLM(
  env: Env,
  prompt: string,
  options: {
    model?: string;
    temperature?: number;
    jsonMode?: boolean;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const {
    model = "gpt-4o-mini",
    temperature = 0.3,
    jsonMode = false,
    maxTokens,
  } = options;

  console.log(`[OpenAI] Calling ${model} (json=${jsonMode})`);

  const body: Record<string, unknown> = {
    model,
    messages: [{ role: "user", content: prompt }],
    temperature,
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  if (maxTokens) {
    body.max_tokens = maxTokens;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI chat error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  return data.choices[0].message.content;
}

// -----------------------------------------------------------------------------
// Specialized LLM Functions
// -----------------------------------------------------------------------------

export async function generateMeetingSummary(
  env: Env,
  transcriptExcerpt: string,
  title: string,
  existingSummary?: string
): Promise<string> {
  const prompt = `Generate a comprehensive executive summary of this meeting.

Meeting: ${title}
${existingSummary ? `Existing Summary: ${existingSummary}` : ""}

Transcript excerpt:
${transcriptExcerpt.slice(0, 12000)}

Write a 3-5 paragraph summary covering:
1. Meeting purpose and key participants
2. Main topics discussed
3. Key decisions and outcomes
4. Action items and next steps
5. Any risks or concerns raised

Be specific and include names, dates, and concrete details where mentioned.`;

  return await callLLM(env, prompt);
}

export interface SegmentResult {
  title: string;
  start_index: number;
  end_index: number;
  summary: string;
  decisions: string[];
  risks: string[];
  tasks: string[];
}

export async function segmentTranscript(
  env: Env,
  formattedTranscript: string,
  title: string
): Promise<SegmentResult[]> {
  const prompt = `Analyze this meeting transcript and identify distinct semantic segments (topic changes, agenda items, discussion phases).

Meeting: ${title}

Transcript (each line prefixed with [index]):
${formattedTranscript.slice(0, 15000)}

Return JSON array of segments. Each segment should capture a coherent topic or discussion phase.

Required format:
{
  "segments": [
    {
      "title": "Brief descriptive title for this segment",
      "start_index": 0,
      "end_index": 15,
      "summary": "2-3 sentence summary of what was discussed",
      "decisions": ["Any decisions made in this segment"],
      "risks": ["Any risks or concerns raised"],
      "tasks": ["Any action items or tasks assigned"]
    }
  ]
}

Guidelines:
- Segments should be 10-50 lines typically
- Every line must belong to exactly one segment
- Capture natural topic transitions
- Include opening/closing segments if present
- Extract decisions, risks, tasks mentioned in each segment`;

  const response = await callLLM(env, prompt, { jsonMode: true });
  const parsed = JSON.parse(response) as { segments: SegmentResult[] };

  return parsed.segments;
}

export interface ExtractedStructuredData {
  decisions: Array<{
    description: string;
    rationale?: string;
    owner?: string;
  }>;
  risks: Array<{
    description: string;
    category?: string;
    likelihood?: string;
    impact?: string;
    owner?: string;
  }>;
  tasks: Array<{
    description: string;
    assignee?: string;
    assigneeEmail?: string;
    dueDate?: string;
    priority?: string;
  }>;
  opportunities: Array<{
    description: string;
    type?: string;
    owner?: string;
  }>;
}

export async function extractStructuredData(
  env: Env,
  title: string,
  date: string | null,
  participants: string[],
  summary: string,
  rawDecisions: string[],
  rawRisks: string[],
  rawTasks: string[],
  notesContext?: string,
  speakerEmailMap?: Record<string, string>
): Promise<ExtractedStructuredData> {
  const normalizedEmailMap = speakerEmailMap || {};
  const emailMapLines = Object.entries(normalizedEmailMap).map(
    ([name, email]) => `  ${name} -> ${email}`
  );
  const emailMapText = emailMapLines.length > 0
    ? `\n\nSpeaker Email Mapping (use for assigneeEmail):\n${emailMapLines.join("\n")}`
    : "";
  const notesText = notesContext?.trim()
    ? `\n\nAdditional Notes & Action Items:\n${notesContext.slice(0, 6000)}`
    : "";

  const prompt = `Analyze and normalize these meeting extractions. Deduplicate, add context, and identify opportunities.

Meeting: ${title}
Date: ${date || "Unknown"}
Participants: ${participants.join(", ")}${emailMapText}

Raw Decisions: ${JSON.stringify(rawDecisions)}
Raw Risks: ${JSON.stringify(rawRisks)}
Raw Tasks: ${JSON.stringify(rawTasks)}${notesText}

Meeting Summary: ${summary.slice(0, 2000)}

Return JSON with normalized, deduplicated entries:
{
  "decisions": [
    {"description": "Clear description", "rationale": "Why decided", "owner": "Person name or null"}
  ],
  "risks": [
    {"description": "Risk description", "category": "schedule|budget|resource|technical|external", "likelihood": "low|medium|high", "impact": "low|medium|high", "owner": "Person or null"}
  ],
  "tasks": [
    {"description": "Task description", "assignee": "Person name or null", "assigneeEmail": "email@example.com or null", "dueDate": "YYYY-MM-DD or null", "priority": "low|medium|high|urgent"}
  ],
  "opportunities": [
    {"description": "Opportunity description", "type": "efficiency|revenue|relationship|innovation", "owner": "Person or null"}
  ]
}

Guidelines:
- Deduplicate similar items across all sources (raw tasks and notes/action-items)
- Infer owners from context when possible
- Convert vague items to specific actionable descriptions
- Map assignee names to emails using the Speaker Email Mapping when possible
- Identify implied opportunities from discussion`;

  const response = await callLLM(env, prompt, { jsonMode: true });
  const parsed = JSON.parse(response) as ExtractedStructuredData;

  if (!Array.isArray(parsed.tasks)) {
    parsed.tasks = [];
    return parsed;
  }

  parsed.tasks = parsed.tasks.map((task) => {
    if (task.assigneeEmail || !task.assignee) {
      return task;
    }
    const mappedEmail = normalizedEmailMap[task.assignee];
    if (!mappedEmail) {
      return task;
    }
    return {
      ...task,
      assigneeEmail: mappedEmail,
    };
  });

  return parsed;
}
