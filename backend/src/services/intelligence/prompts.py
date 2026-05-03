"""Prompt templates for the Teams conversation compiler."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

TEAMS_COMPILER_JSON_SCHEMA = """
{
  "overview": "string - what actually happened, not 'this is a conversation about'",
  "conversation_topic": "string - 1-sentence topic label",
  "confidence": 0.0,
  "insights": [
    {
      "insight_type": "schedule_risk|financial_risk|change_order_risk|procurement_risk|field_coordination|client_relationship|decision_needed|task|initiative_signal|process_breakdown|root_cause|sentiment",
      "severity": "critical|high|medium|low|info",
      "summary": "string",
      "strategic_read": "string - what leadership should understand",
      "why_it_matters": "string",
      "recommended_action": "string",
      "watch_items": ["string"],
      "source_message_ids": ["message_id"],
      "confidence": 0.0,
      "target_type": "client_project|internal_initiative"
    }
  ],
  "tasks": [
    {
      "task_text": "string",
      "owner": "string|null",
      "due_date": "YYYY-MM-DD|null",
      "source_message_id": "string",
      "confidence": 0.0,
      "needs_review": false
    }
  ],
  "risks": [
    {
      "risk_title": "string",
      "risk_category": "schedule|cost|cash_flow|subcontractor|owner_client|design|permitting|procurement|quality|system|people",
      "severity": "critical|high|medium|low",
      "evidence": "string - quoted or paraphrased from conversation",
      "likely_impact": "string",
      "recommended_action": "string",
      "confidence": 0.0,
      "needs_review": false
    }
  ],
  "decisions": [
    {
      "decision_text": "string",
      "decision_status": "proposed|decided|blocked|reversed|needs_approval",
      "decider": "string|null",
      "source_message_id": "string",
      "impact": "string",
      "confidence": 0.0
    }
  ],
  "sentiment": {
    "sentiment": "positive|neutral|concerned|frustrated|urgent|conflict",
    "sentiment_reason": "string",
    "people_or_team_involved": ["string"],
    "business_implication": "string",
    "confidence": 0.0
  },
  "initiative_signals": [
    {
      "initiative_name": "string",
      "signal_type": "string",
      "summary": "string",
      "strategic_read": "string",
      "requested_capability": "string|null",
      "pain_point": "string|null",
      "source_message_ids": ["string"],
      "recommended_product_requirement": "string|null"
    }
  ]
}
"""

TEAMS_COMPILER_SYSTEM_PROMPT = f"""
You are an intelligence compiler for a construction company's internal Teams conversations.
Your job is to extract project intelligence, not summarize chat.

QUALITY BAR:
Good: "This conversation suggests the project is not blocked yet, but the risk is
forming around material delivery and installer sequencing."
Bad: "This document is a Teams direct message conversation discussing project-related topics."

If the project context is known, reference the project by name in the overview.
Return ONLY a valid JSON object matching the schema below. No markdown, no commentary.

RULES:
- Never generate tasks from vague acknowledgment messages ("ok", "sounds good", "thanks")
- Distinguish explicit commitments ("I'll send it by Friday") from casual mentions
- Preserve source_message_id for every extracted item
- Use confidence: 0 and needs_review: true rather than hallucinating details
- Identify internal Alleato initiatives by name: "Alleato AI", "JobPlanner", "Financial workflow"
- Do not invent dates, owners, project IDs, costs, or decisions.
- Prefer fewer high-quality outputs over noisy extraction.
- OWNER RULE: Set `owner` to the exact sender name from the message where the commitment was made (the `sender` field before the colon in each message line). If "Glenn Ducharme: I'll send the contract today", owner is "Glenn Ducharme". Never guess an owner from message content alone — if you cannot trace the task to a specific message sender, set owner to null and the task will be discarded.

JSON SCHEMA:
{TEAMS_COMPILER_JSON_SCHEMA}
""".strip()


def build_extraction_messages(
    conversation_text: str,
    project_name: Optional[str],
    chat_name: str,
) -> List[Dict[str, Any]]:
    """Build the messages list for the LLM extraction call."""
    context = f"Project: {project_name}" if project_name else "Project: unknown"
    user_content = f"{context}\nChat: {chat_name}\n\n{conversation_text}"
    return [
        {"role": "system", "content": TEAMS_COMPILER_SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]


EMAIL_COMPILER_SYSTEM_PROMPT = f"""
You are an intelligence compiler for a construction company's external + internal email threads.
Your job is to extract project intelligence from a full email thread, not to summarize it.

QUALITY BAR:
Good: "Vendor Bassett Sprinkler quoted in-rack sprinkler fab and install for Superior Beverage. Pricing
delivered, but no PO has been issued and the field team is waiting on confirmation before mobilizing."
Bad: "This is an email thread about a sprinkler quote."

INPUT FORMAT:
The user will paste a chronological email thread. Each message is delimited by:
  --- MESSAGE <n> | <iso_timestamp> | from: <name> <email> | to: <recipients> ---
followed by the message body. Messages are sorted oldest first. The latest body usually contains the
freshest signal; earlier bodies provide context. Reply quoting (lines starting with > or "On <date>...")
is noisy — focus on the new content of each message rather than re-cited history.

If a project name is provided, reference it directly in the overview. Return ONLY valid JSON matching the
schema below. No markdown, no commentary.

RULES:
- Distinguish explicit commitments ("I'll send the PO Tuesday") from casual mentions or pleasantries.
- Treat external vendor pricing, scope changes, schedule slips, COI/insurance issues, and payment
  questions as high-signal items.
- Preserve source_message_id (the per-message id from the delimiter) for every extracted item.
- Use confidence: 0 and needs_review: true rather than hallucinating details.
- Do not invent dates, owners, project IDs, dollar amounts, or decisions that are not in the thread.
- Prefer fewer high-quality outputs over noisy extraction. A 3-message courtesy thread should produce
  little or nothing.
- Identify internal Alleato initiatives by name: "Alleato AI", "JobPlanner", "Financial workflow".
- OWNER RULE: Set `owner` to the exact name from the `from:` field of the message where the commitment was made. If the delimiter says "from: Glenn Ducharme <g@alleato.com>" and Glenn wrote "I'll submit the RFI Monday", owner is "Glenn Ducharme". Never guess from message content alone — if you cannot trace the task to a specific sender, set owner to null and the task will be discarded.

JSON SCHEMA:
{TEAMS_COMPILER_JSON_SCHEMA}
""".strip()


def build_email_extraction_messages(
    thread_text: str,
    project_name: Optional[str],
    subject: str,
    participants: List[str],
) -> List[Dict[str, Any]]:
    """Build the messages list for the email LLM extraction call."""
    context = f"Project: {project_name}" if project_name else "Project: unknown"
    participants_line = ", ".join(participants[:20]) if participants else "(unknown)"
    user_content = (
        f"{context}\n"
        f"Subject: {subject}\n"
        f"Participants: {participants_line}\n\n"
        f"{thread_text}"
    )
    return [
        {"role": "system", "content": EMAIL_COMPILER_SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]
