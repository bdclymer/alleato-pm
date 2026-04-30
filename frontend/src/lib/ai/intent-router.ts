export type AssistantIntent =
  | "target_briefing"
  | "latest_status"
  | "risk_review"
  | "financial_analysis"
  | "change_management_review"
  | "decision_lookup"
  | "task_followup"
  | "source_lookup"
  | "strategy_brainstorm"
  | "implementation_planning"
  | "app_help"
  | "general_conversation";

const SOURCE_LOOKUP_PATTERNS = [
  /\b(source|evidence|citation|transcript|email|teams|meeting|document)\b/i,
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

  if (/\b(follow[- ]?up|missed|task|todo|next action|owner)\b/i.test(text)) {
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
