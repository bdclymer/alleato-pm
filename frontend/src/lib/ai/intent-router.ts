export type AssistantIntent =
  | "target_briefing"
  | "latest_status"
  | "risk_review"
  | "financial_analysis"
  | "change_management_review"
  | "decision_lookup"
  | "task_followup"
  | "task_write"
  | "email_action"
  | "calendar_action"
  | "external_research"
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
  /\b(push|move|bump)\b.{0,40}\b(task|due date|deadline)\b/i,
  /\bhand\b.{0,40}\boff to\b/i,
  /\bschedule a task\b/i,
  /\bgenerate (a )?task\b/i,
  /\bmake (a )?task\b/i,
  // "Add a task for the PM to…" / "Add a task for X to…"
  /\badd a task for\b/i,
];

const CALENDAR_ACTION_PATTERNS = [
  /\b(schedule|create|send|draft|set up|book)\b.{0,50}\b(calendar invite|outlook invite|meeting invite|teams invite|calendar event|meeting)\b/i,
  /\b(add|put)\b.{0,40}\b(on|to)\b.{0,20}\b(calendar|outlook)\b/i,
  /\b(create|send)\b.{0,40}\b(invite|invitation)\b/i,
];

const EMAIL_ACTION_PATTERNS = [
  /\b(draft|write|prepare|compose)\b.{0,50}\b(email|e-mail|reply|response|outlook message|message)\b/i,
  /\b(email|e-mail|reply|respond)\b.{0,50}\b(draft|write|prepare|compose|back)\b/i,
];

const SOURCE_LOOKUP_PATTERNS = [
  /\b(source|evidence|citation|transcript|emails?|e-mails?|inbox|mails?|outlook|teams|messages?|meetings?|documents?)\b/i,
  /\bshow me\b.*\b(where|source|messages?|emails?|e-mails?|inbox|meetings?)\b/i,
];

const EXTERNAL_RESEARCH_PATTERNS = [
  /\b(web search|search the web|live web|internet|online sources?|external sources?)\b/i,
  /\b(current|latest|up[- ]?to[- ]?date)\b.{0,80}\b(requirements?|regulations?|rules?|ordinance|zoning|code|market|competitors?)\b/i,
  /\b(PUD|planned unit development|zoning|ordinance|permit requirements?|municipal requirements?)\b/i,
];

const APP_HELP_PATTERNS = [
  /\bhow do i\b/i,
  /\bwhere do i\b/i,
  /\bwhat button\b/i,
  /\bhelp me use\b/i,
  /\bin the app\b/i,
];

const OWNER_PORTFOLIO_BRIEFING_PATTERNS = [
  /\b(active jobs?|active projects?|across (all )?(jobs|projects)|portfolio|everything|business)\b/i,
  /\b(red flags?|watchlist|lose sleep|attention this week|rundown|catch me up|where everything stands|what should i focus|what should i personally handle|fires?)\b/i,
];

const OWNER_RISK_REVIEW_PATTERNS = [
  /\b(risks?|risk review|red flags?|watchlist|blockers?|issues?|concerns?)\b/i,
  /\b(worried|worry|nervous|bite us|could bite|blow up|burn us|go wrong|keep me up)\b/i,
];

const IMPLEMENTATION_PLANNING_PATTERNS = [
  /\b(systems?|processes?|workflows?|cadence|operating rhythm|guardrails?)\b.{0,80}\b(need|should|put in place|implement|build|create|recommend)\b/i,
  /\b(what|which)\b.{0,40}\b(systems?|processes?|workflows?|cadence|operating rhythm|guardrails?)\b.{0,80}\b(need|should|put in place)\b/i,
];

type IntentClassificationOptions = {
  selectedProjectId?: number | null;
};

function hasSelectedProjectContext(options?: IntentClassificationOptions): boolean {
  return typeof options?.selectedProjectId === "number";
}

function isProjectStatusBriefingPrompt(text: string): boolean {
  return (
    /\b(latest|status|update|current|what changed|briefing)\b/i.test(text) ||
    OWNER_PORTFOLIO_BRIEFING_PATTERNS.some((pattern) => pattern.test(text))
  );
}

export function classifyAssistantIntent(
  message: string,
  options?: IntentClassificationOptions,
): AssistantIntent {
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

  if (CALENDAR_ACTION_PATTERNS.some((pattern) => pattern.test(text))) {
    return "calendar_action";
  }

  if (EMAIL_ACTION_PATTERNS.some((pattern) => pattern.test(text))) {
    return "email_action";
  }

  if (EXTERNAL_RESEARCH_PATTERNS.some((pattern) => pattern.test(text))) {
    return "external_research";
  }

  // With a pinned project, broad owner/status phrasing should stay on the
  // project-status path even when it asks for evidence, risks, or next actions.
  // Otherwise the source/task keyword checks steal Deep Agents-eligible
  // questions into narrower retrieval lanes.
  if (hasSelectedProjectContext(options) && isProjectStatusBriefingPrompt(text)) {
    return "latest_status";
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
    /\b(waiting on|waiting for|blocked by|held up by)\b/i.test(text) ||
    /\b(what are my|show me my|give me my)\b.{0,30}\b(tasks?|items?|actions?|todos?)\b/i.test(text)
  ) {
    return "task_followup";
  }

  if (OWNER_RISK_REVIEW_PATTERNS.some((pattern) => pattern.test(text))) {
    return "risk_review";
  }

  if (isProjectStatusBriefingPrompt(text)) {
    return "latest_status";
  }

  if (
    IMPLEMENTATION_PLANNING_PATTERNS.some((pattern) => pattern.test(text)) ||
    /\b(implement|build|plan|roadmap|steps)\b/i.test(text)
  ) {
    return "implementation_planning";
  }

  if (/\b(strategy|brainstorm|options|recommend)\b/i.test(text)) {
    return "strategy_brainstorm";
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
