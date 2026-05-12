export type AssistantIntent =
  | "target_briefing"
  | "latest_status"
  | "risk_review"
  | "financial_analysis"
  | "change_management_review"
  | "decision_lookup"
  | "task_followup"
  | "task_write"
  | "source_lookup"
  | "strategy_brainstorm"
  | "implementation_planning"
  | "app_help"
  | "general_conversation";

// Phrases that unambiguously mean "create / modify / delete a task record".
// These must be checked BEFORE task_followup so write-intent is not mis-routed
// to packet-retrieval, which primes the model for a reading pattern and causes
// it to describe the task in text instead of calling createGeneratedTask.
const TASK_WRITE_PATTERNS = [
  /\b(remind me to|remind me about)\b/i,
  /\b(add a task|add task|create a task|create task|make a task|log a task|log that I need to)\b/i,
  /\b(flag (this |it )?for follow[- ]?up|throw (this |it )?on (my )?list)\b/i,
  /\bnote for myself\b/i,
  /\baction item:\s/i,
  /\bget someone on\b/i,
  /\bput (this |it )?on (my |the )?list\b/i,
  /\bassign (this |that |it )?to\b/i,
  /\bschedule a task\b/i,
  /\bgenerate (a )?task\b/i,
  /\bmake (a )?task\b/i,
  // "Add a task for the PM to…" / "Add a task for X to…"
  /\badd a task for\b/i,
];

const SOURCE_LOOKUP_PATTERNS = [
  /\b(source|evidence|citation|transcript|email|teams|message|messages|meeting|document)\b/i,
  /\bshow me\b.*\b(where|source|message|email|meeting)\b/i,
];

const APP_HELP_PATTERNS = [
  /\bhow do i\b/i,
  /\bwhere do i\b/i,
  /\bwhat button\b/i,
  /\bhelp me use\b/i,
  /\bin the app\b/i,
];

export function classifyAssistantIntent(message: string): AssistantIntent {
  const text = message.trim();
  if (!text) return "general_conversation";

  // task_write must be checked FIRST — before source_lookup, decision_lookup,
  // financial_analysis, and task_followup — because write triggers like
  // "Add a task for the PM to confirm the approval owner" contain keywords
  // (approval, meeting, budget) that match domain patterns. Write intent
  // must win: routing to any packet-first or retrieval path primes the model
  // for a reading pattern and causes it to describe the task in text instead
  // of calling createGeneratedTask.
  if (TASK_WRITE_PATTERNS.some((pattern) => pattern.test(text))) {
    return "task_write";
  }

  if (SOURCE_LOOKUP_PATTERNS.some((pattern) => pattern.test(text))) {
    return "source_lookup";
  }

  if (APP_HELP_PATTERNS.some((pattern) => pattern.test(text))) {
    return "app_help";
  }

  if (/\b(change order|pco|cco|change management|change issue)\b/i.test(text)) {
    return "change_management_review";
  }

  if (/\b(financial|cost|budget|invoice|payment|paid|exposure|margin|overrun)\b/i.test(text)) {
    return "financial_analysis";
  }

  if (/\b(decision|decided|open question|approval|approve)\b/i.test(text)) {
    return "decision_lookup";
  }

  // task_followup is for READING existing tasks (list, status, overdue).
  // task_write (checked above) handles CREATING new task records.
  if (
    /\b(follow[- ]?up|missed|task|tasks|todo|to-do|next action|owner|action item|open item|on my plate|what do i need|what should i|what's open|what is open)\b/i.test(text) ||
    /\b(what are my|show me my|give me my)\b.{0,30}\b(tasks?|items?|actions?|todos?)\b/i.test(text)
  ) {
    return "task_followup";
  }

  if (/\b(risk|worried|concern|blocker|issue)\b/i.test(text)) {
    return "risk_review";
  }

  if (/\b(latest|status|update|current|what changed|briefing)\b/i.test(text)) {
    return "latest_status";
  }

  if (/\b(strategy|brainstorm|options|recommend)\b/i.test(text)) {
    return "strategy_brainstorm";
  }

  if (/\b(implement|build|plan|roadmap|steps)\b/i.test(text)) {
    return "implementation_planning";
  }

  return "general_conversation";
}

export function shouldUsePacketFirstIntent(intent: AssistantIntent): boolean {
  // task_write is intentionally excluded: loading a project packet primes the
  // model for a reading/retrieval pattern and causes it to describe the task
  // in text rather than calling createGeneratedTask. Write intents go straight
  // to streamText so the MANDATORY TASK WRITE PROTOCOL in the system prompt
  // can take effect.
  return (
    intent === "target_briefing" ||
    intent === "latest_status" ||
    intent === "risk_review" ||
    intent === "financial_analysis" ||
    intent === "change_management_review" ||
    intent === "decision_lookup" ||
    intent === "task_followup"
  );
}
