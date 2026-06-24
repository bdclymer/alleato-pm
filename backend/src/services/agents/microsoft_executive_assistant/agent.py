"""Microsoft Executive Assistant Deep Agents runtime."""

from __future__ import annotations

import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Optional

from src.services.agents.runtime_common import (
    extract_agent_text as _extract_agent_text,
    resolve_deep_agents_model as _resolve_deep_agents_model,
)
from src.services.agents.microsoft_executive_assistant.contracts import (
    MicrosoftAssistantAction,
    MicrosoftAssistantEmailItem,
    MicrosoftAssistantTraceItem,
    MicrosoftExecutiveAssistantRequest,
    MicrosoftExecutiveAssistantResponse,
)
from src.services.agents.microsoft_executive_assistant.tools import (
    microsoft_executive_assistant_tools,
)


ORCHESTRATOR_NAME = "microsoft-executive-assistant"
RUNTIME_DIR = Path(__file__).resolve().parent / "runtime"


def _repo_root() -> Path:
    current = Path(__file__).resolve()
    for parent in current.parents:
        if (parent / "backend").exists() and (parent / "frontend").exists():
            return parent
    return Path.cwd()


def _source_skill_dir() -> Path:
    return RUNTIME_DIR


def _skill_roots() -> list[str]:
    source = _source_skill_dir() / "skills"
    return [str(source)] if source.exists() else []


def _memory_files() -> list[str]:
    source = _source_skill_dir() / "AGENTS.md"
    return [str(source)] if source.exists() else []


def _skills_loaded() -> list[str]:
    loaded: list[str] = []
    source = _source_skill_dir()
    if (source / "AGENTS.md").exists():
        loaded.append("microsoft-executive-assistant-memory")
    skills_root = source / "skills"
    for name in ("inbox-triage", "email-drafting", "humanizer", "wiki-markdown"):
        if (skills_root / name / "SKILL.md").exists():
            loaded.append(name)
    return loaded


def _provider_available() -> bool:
    return bool(os.getenv("OPENAI_API_KEY"))


class _TestBackend:
    def __init__(self, root: Path):
        self.cwd = root


def _microsoft_backend(*, allow_fallback: bool = False) -> Any:
    try:
        from deepagents.backends import FilesystemBackend

        return FilesystemBackend(root_dir=str(_repo_root()), virtual_mode=True)
    except Exception as exc:
        if allow_fallback:
            return _TestBackend(_repo_root())
        raise RuntimeError(f"Deep Agents filesystem backend unavailable: {exc}") from exc


def _agent_config(request: MicrosoftExecutiveAssistantRequest) -> dict[str, Any]:
    thread_id = request.session_id or f"microsoft-executive-assistant:{request.user_id}"
    configurable: dict[str, Any] = {
        "thread_id": thread_id,
        "user_id": request.user_id,
        "trigger": request.trigger,
    }
    if request.project_id is not None:
        configurable["project_id"] = request.project_id
    if request.mailbox_user_id:
        configurable["mailbox_user_id"] = request.mailbox_user_id
    return {"configurable": configurable}


def _mailbox_owner_label(request: MicrosoftExecutiveAssistantRequest) -> str:
    mailbox = (request.mailbox_user_id or "").strip().lower()
    if mailbox == "bclymer@alleatogroup.com":
        return "Brandon"
    if mailbox == "megan@alleatogroup.com":
        return "Megan"
    if mailbox:
        local = mailbox.split("@", 1)[0].strip()
        return local or "the mailbox owner"
    return "the mailbox owner"


def _microsoft_question_directives(request: MicrosoftExecutiveAssistantRequest) -> list[str]:
    normalized = " ".join(request.prompt.lower().split())
    directives: list[str] = [
        "Only state facts you can support from the live Microsoft tool output. If you infer something, label it clearly as likely or possible.",
        "Do not introduce Megan unless the prompt explicitly asks about Megan or the mailbox owner is Megan.",
        "Do not propose a draft email or Teams escalation unless the user asked for drafting/escalation or the evidence shows a true urgent/security/legal emergency.",
    ]

    if "last five email" in normalized or "last 5 email" in normalized:
        directives.extend(
            [
                "For 'last five emails' requests, return exactly five emails in newest-first order when five exist. Do not add a sixth item or an extra inbox section.",
                "For each email, include only sender, subject, received time, and one short evidence-backed action label.",
                "Do not add urgency rankings, extra triage, or escalation advice unless the user separately asked for triage.",
            ]
        )

    if "arrived today" in normalized or "mail arrived today" in normalized:
        directives.extend(
            [
                "For 'arrived today' requests, report only messages from today in the mailbox timezone/context returned by the tool.",
                "Separate confirmed attention-needed items from clearly informational items. Do not claim something needs action unless the email content supports that.",
            ]
        )

    if (
        "urgent inbox" in normalized
        or ("urgent" in normalized and "inbox" in normalized)
        or "important emails this morning" in normalized
        or "reply triage" in normalized
    ):
        directives.extend(
            [
                "For inbox triage, separate 'confirmed urgent/action-needed' from 'important but not urgent'.",
                "Treat security notices, payment reminders, and admin notifications conservatively unless the content clearly shows immediate business risk.",
                "When an item likely needs a reply, say why in one sentence and avoid inventing deadlines, owners, or consequences not shown in the email evidence.",
            ]
        )

    return directives


def _microsoft_prompt(request: MicrosoftExecutiveAssistantRequest) -> str:
    mailbox = (
        f"Primary mailbox supplied by caller: {request.mailbox_user_id}."
        if request.mailbox_user_id
        else "No mailbox was supplied. Resolve the mailbox from the request context if possible; otherwise fail loudly."
    )
    project = (
        f"Project ID supplied by caller: {request.project_id}."
        if request.project_id
        else "No project ID was supplied."
    )
    owner = _mailbox_owner_label(request)
    question_directives = _microsoft_question_directives(request)
    approved_skill_context = (
        "Approved email/Teams Skill Library context:\n"
        f"{request.approved_skill_context.strip()}\n\n"
        if request.approved_skill_context and request.approved_skill_context.strip()
        else ""
    )
    return (
        f"Microsoft operator request:\n{request.prompt}\n\n"
        f"Trigger: {request.trigger}.\n"
        f"{mailbox}\n"
        f"{project}\n"
        f"Maximum messages to inspect: {request.max_messages}.\n\n"
        f"{approved_skill_context}"
        "Required workflow:\n"
        f"1. Treat this as Microsoft executive-assistant work for {owner}, not as generic Alleato strategist work.\n"
        "2. Use live Outlook inbox reads for date-based inbox questions when a mailbox is available.\n"
        "3. Use Outlook email search, Teams search, calendar reads, and Microsoft file search when they materially improve the answer.\n"
        "4. Draft email or Teams payloads for review only. Never claim an email was sent, a calendar event was changed, or a Teams message was posted.\n"
        "5. Escalate urgent client, prospect, legal, security, or true emergency items with a concise Teams-message draft.\n"
        "6. If a required Microsoft capability is missing, stale, blocked, or failed, include the exact failed capability and what evidence is missing.\n"
        f"7. End with recommended next steps for {owner} and any approvals needed.\n\n"
        "Answer-shaping rules:\n- "
        + "\n- ".join(question_directives)
    )


def _iter_json_objects(text: str) -> list[dict[str, Any]]:
    decoder = json.JSONDecoder()
    objects: list[dict[str, Any]] = []
    cursor = 0
    while cursor < len(text):
        start = text.find("{", cursor)
        if start == -1:
            break
        try:
            parsed, end = decoder.raw_decode(text[start:])
        except Exception:
            cursor = start + 1
            continue
        if isinstance(parsed, dict):
            objects.append(parsed)
        cursor = start + max(end, 1)
    return objects


def _action_from_preview_payload(payload: dict[str, Any]) -> Optional[MicrosoftAssistantAction]:
    if payload.get("action") != "preview":
        return None
    payload_type = str(payload.get("type") or "")
    action_type = "teams_message_draft" if "teams" in payload_type else "email_draft"
    return MicrosoftAssistantAction(
        actionType=action_type,  # type: ignore[arg-type]
        title=str(payload.get("type") or "Microsoft draft"),
        status="drafted",
        detail=str(payload.get("approvalReason") or "Draft prepared for review."),
        payload=payload,
    )


def _extract_preview_actions_from_text(text: str) -> list[MicrosoftAssistantAction]:
    actions: list[MicrosoftAssistantAction] = []
    for payload in _iter_json_objects(text):
        action = _action_from_preview_payload(payload)
        if action is None:
            continue
        actions.append(action)
    return actions


def _extract_actions(answer: str, result: Any | None = None) -> list[MicrosoftAssistantAction]:
    actions = _extract_preview_actions_from_text(answer)
    if result is not None:
        for message in _messages_from_result(result):
            if _message_tool_name(message) not in {
                "draft_outlook_email_for_review",
                "draft_teams_message_for_review",
            }:
                continue
            actions.extend(_extract_preview_actions_from_text(_message_content(message)))

    deduped: list[MicrosoftAssistantAction] = []
    seen: set[str] = set()
    for action in actions:
        key = json.dumps(action.payload or {}, sort_keys=True, default=str)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(action)
    actions = deduped

    if not actions and any(marker in answer for marker in ("FAILED:", "UNAVAILABLE:", "BLOCKED:")):
        actions.append(
            MicrosoftAssistantAction(
                actionType="blocked",
                title="Microsoft capability blocked",
                status="blocked",
                detail="The assistant reported a Microsoft capability failure in the answer.",
            )
        )
    return actions


def _messages_from_result(result: Any) -> list[Any]:
    if isinstance(result, dict) and isinstance(result.get("messages"), list):
        return result["messages"]
    messages = getattr(result, "messages", None)
    return messages if isinstance(messages, list) else []


def _message_value(message: Any, key: str) -> Any:
    if isinstance(message, dict):
        return message.get(key)
    return getattr(message, key, None)


def _message_content(message: Any) -> str:
    content = _message_value(message, "content")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and isinstance(item.get("text"), str):
                parts.append(item["text"])
        return "\n".join(parts)
    return ""


def _message_tool_name(message: Any) -> Optional[str]:
    for key in ("name", "tool", "toolName"):
        value = _message_value(message, key)
        if isinstance(value, str) and value:
            return value
    message_type = _message_value(message, "type")
    if isinstance(message_type, str) and message_type == "tool":
        value = _message_value(message, "id")
        if isinstance(value, str) and value:
            return value
    return None


def _parse_tool_json(content: str) -> dict[str, Any]:
    stripped = content.strip()
    if not stripped:
        return {}
    try:
        parsed = json.loads(stripped)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _inbox_request_kind(prompt: str) -> Optional[str]:
    normalized = " ".join(prompt.lower().split())
    if "last five email" in normalized or "last 5 email" in normalized:
        return "last_five"
    if (
        "reply triage" in normalized
        or "need a reply" in normalized
        or "needs a reply" in normalized
        or "need reply" in normalized
        or "needs reply" in normalized
    ):
        return "reply_triage"
    if "important emails this morning" in normalized or (
        "important" in normalized and "this morning" in normalized and "email" in normalized
    ):
        return "important_morning"
    if (
        "arrived today" in normalized
        or "mail arrived today" in normalized
        or "today's inbox" in normalized
        or "came in through outlook today" in normalized
        or "came in today through outlook" in normalized
        or ("came in" in normalized and "today" in normalized and "outlook" in normalized)
    ):
        return "arrived_today"
    if "urgent inbox" in normalized or ("urgent" in normalized and "inbox" in normalized):
        return "urgent_triage"
    return None


def _extract_live_inbox_messages(result: Any) -> list[dict[str, Any]]:
    for message in _messages_from_result(result):
        if _message_tool_name(message) != "read_live_outlook_inbox":
            continue
        parsed = _parse_tool_json(_message_content(message))
        if parsed.get("ok") is not True:
            continue
        if parsed.get("source") != "microsoft_graph_live":
            continue
        rows = parsed.get("messages")
        if isinstance(rows, list):
            return [row for row in rows if isinstance(row, dict)]
    return []


def _parse_received_at(value: Any) -> Optional[datetime]:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
    except Exception:
        return None


def _format_received_at(value: Any) -> str:
    dt = _parse_received_at(value)
    return dt.strftime("%Y-%m-%d %H:%M UTC") if dt else "unknown time"


def _received_on_utc_day(message: dict[str, Any], day: datetime.date) -> bool:
    dt = _parse_received_at(message.get("received_at"))
    return bool(dt and dt.date() == day)


def _message_text(message: dict[str, Any]) -> str:
    return " ".join(
        str(message.get(key) or "")
        for key in ("subject", "body_text", "from_name", "from_email")
    ).lower()


def _is_internal_sender(message: dict[str, Any]) -> bool:
    from_email = str(message.get("from_email") or "").strip().lower()
    return from_email.endswith("@alleatogroup.com")


def _is_automated_sender(message: dict[str, Any]) -> bool:
    from_email = str(message.get("from_email") or "").strip().lower()
    subject = str(message.get("subject") or "").strip().lower()
    return (
        from_email.startswith("no-reply@")
        or from_email.startswith("noreply@")
        or from_email.startswith("notifications@")
        or "notification" in from_email
        or "do not reply" in subject
        or "daily summary" in subject
        or "sign in to " in subject
    )


def _has_explicit_deadline(text: str) -> bool:
    deadline_tokens = (
        "by thursday",
        "by friday",
        "by tomorrow",
        "by end of day",
        "by eod",
        "this afternoon",
        "before noon",
        "deadline",
        "confirm by",
    )
    return any(token in text for token in deadline_tokens)


def _short_action_label(message: dict[str, Any]) -> str:
    bucket = _action_bucket(message)
    if bucket == "Alert now":
        return "Reply now"
    if bucket == "Reply":
        return "Reply"
    if bucket == "Delegate":
        return "Delegate"
    if bucket == "Watch":
        return "Watch"
    if bucket == "Ignore/noise":
        return "Ignore"
    text = _message_text(message)
    if "sign in" in text or "verification" in text or "login code" in text:
        return "Login verification"
    if "quarantine" in text or "security" in text:
        return "Security/admin notice"
    if "payment is due" in text or "approaching spend limit" in text:
        return "Billing/limit reminder"
    if any(token in text for token in ("can you", "please", "confirm", "review", "reply", "follow up", "?")):
        return "Direct follow-up needed"
    if "daily summary" in text or "summary" in text or "message center" in text:
        return "Operational summary"
    if message.get("has_attachments"):
        return "Attachment review"
    return "Review message"


def _likely_reply_needed(message: dict[str, Any]) -> bool:
    text = _message_text(message)
    if _is_automated_sender(message):
        return False
    if any(token in text for token in ("sign in", "verification code", "quarantine", "approaching spend limit", "payment is due")):
        return False
    if any(token in text for token in ("can you", "please", "confirm", "reply", "follow up", "review/sign", "review and sign", "?")):
        return True
    if not _is_internal_sender(message) and str(message.get("subject") or "").lower().startswith("re:"):
        return True
    return False


def _action_bucket(message: dict[str, Any]) -> str:
    text = _message_text(message)
    subject = str(message.get("subject") or "")
    if _is_automated_sender(message):
        if "payment is due" in text or "approaching spend limit" in text:
            return "Watch"
        return "Ignore/noise"
    if any(token in text for token in ("sign in", "verification code")):
        return "Ignore/noise"
    if "quarantine" in text or "security" in text:
        return "Watch"
    if "approaching spend limit" in text or "payment is due" in text:
        return "Watch"
    if _has_explicit_deadline(text) and not _is_internal_sender(message):
        return "Alert now"
    if _likely_reply_needed(message) and not _is_internal_sender(message):
        return "Reply"
    if _likely_reply_needed(message) and _is_internal_sender(message):
        return "Delegate"
    if "daily summary" in text or "summary" in text:
        return "Ignore/noise"
    if message.get("has_attachments"):
        return "Watch"
    return "Ignore/noise"


def _message_reason(message: dict[str, Any], bucket: str) -> str:
    text = _message_text(message)
    if bucket == "Alert now":
        return "The email contains a direct external ask with explicit timing."
    if bucket == "Reply":
        return "The sender appears to be asking for a direct response."
    if bucket == "Delegate":
        return "This looks like an internal follow-up that needs ownership or routing."
    if "quarantine" in text or "security" in text:
        return "Security/admin notice exists, but the inbox evidence alone does not prove an immediate incident."
    if "approaching spend limit" in text or "payment is due" in text:
        return "Admin reminder; time-sensitive, but not clearly an immediate reply item from the email alone."
    if "sign in" in text or "verification code" in text:
        return "Authentication message; usually ignorable unless the sign-in was requested."
    if "daily summary" in text or "summary" in text:
        return "Operational summary or digest; no direct action is shown in the email itself."
    return "Present in the inbox, but the email evidence does not prove an immediate action."


def _message_evidence(message: dict[str, Any]) -> str:
    body = str(message.get("body_text") or "").replace("\r", " ").replace("\n", " ").strip()
    if not body:
        return "No body preview available."
    body = re.sub(r"\s+", " ", body)
    sentences = [segment.strip() for segment in re.split(r"(?<=[.!?])\s+", body) if segment.strip()]
    priority_tokens = (
        "can you",
        "please",
        "confirm",
        "reply",
        "review",
        "deadline",
        "by ",
        "today",
        "tomorrow",
        "thursday",
        "friday",
        "payment is due",
        "approaching spend limit",
        "verification code",
        "sign in",
        "do not reply",
    )
    for sentence in sentences:
        lowered = sentence.lower()
        if any(token in lowered for token in priority_tokens):
            return sentence[:200].strip()
    return (sentences[0] if sentences else body)[:200].strip()


def _action_owner(message: dict[str, Any], bucket: str) -> str:
    if bucket in {"Alert now", "Reply"}:
        return "Brandon should reply"
    if bucket == "Delegate":
        return "Someone on the Alleato team should pick this up"
    if bucket == "Watch":
        return "Brandon should review only if this item matters to current work"
    return "No response owner is confirmed from the email alone"


def _action_risk(message: dict[str, Any], bucket: str) -> str:
    text = _message_text(message)
    if bucket == "Alert now":
        if _has_explicit_deadline(text):
            return "Ignoring it could miss the sender's stated timeline."
        return "Ignoring it could leave an external sender waiting on a direct answer."
    if bucket == "Reply":
        return "Ignoring it could stall an active external thread that appears to expect a response."
    if bucket == "Delegate":
        return "Ignoring it could leave an internal follow-up without a clear owner."
    if bucket == "Watch":
        if "payment is due" in text or "approaching spend limit" in text:
            return "Ignoring it could let a billing issue become time-sensitive later."
        if "quarantine" in text or "security" in text:
            return "Ignoring it could delay review of a security/admin notice."
        return "Ignoring it is usually safe unless it connects to known active work."
    return "Ignoring it is usually safe from the email evidence alone."


def _dedupe_messages(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    groups: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for message in messages:
        subject = str(message.get("subject") or "").strip().lower()
        sender = str(message.get("from_email") or message.get("from_name") or "").strip().lower()
        groups.setdefault((subject, sender), []).append(message)

    deduped: list[dict[str, Any]] = []
    for rows in groups.values():
        ordered = sorted(
            rows,
            key=lambda row: _parse_received_at(row.get("received_at")) or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True,
        )
        latest = dict(ordered[0])
        latest["_message_count"] = len(rows)
        deduped.append(latest)

    deduped.sort(
        key=lambda row: _parse_received_at(row.get("received_at")) or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    return deduped


def _trimmed_messages_for_today(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    today = datetime.now(timezone.utc).date()
    today_messages = [message for message in messages if _received_on_utc_day(message, today)]
    return today_messages or messages


def _messages_for_this_morning(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    today = datetime.now(timezone.utc).date()
    rows: list[dict[str, Any]] = []
    for message in messages:
        dt = _parse_received_at(message.get("received_at"))
        if dt and dt.date() == today and dt.hour < 12:
            rows.append(message)
    return rows


def _render_last_five_answer(messages: list[dict[str, Any]], mailbox: str) -> str:
    rows = messages[:5]
    lines = [f"Your last five emails in {mailbox} are:", ""]
    for index, message in enumerate(rows, start=1):
        sender = str(message.get("from_name") or message.get("from_email") or "Unknown sender")
        subject = str(message.get("subject") or "(no subject)")
        bucket = _action_bucket(message)
        lines.append(
            f"{index}. {subject} — {sender} — {_format_received_at(message.get('received_at'))}"
        )
        lines.append(f"   Response path: {_short_action_label(message)}.")
        lines.append(f"   Owner: {_action_owner(message, bucket)}.")
        lines.append(f"   Evidence: {_message_evidence(message)}")
        lines.append(f"   If ignored: {_action_risk(message, bucket)}")
        lines.append("")
    return "\n".join(lines).strip()


def _render_action_lists(
    *,
    heading: str,
    action_needed: list[dict[str, Any]],
    informational: list[dict[str, Any]],
) -> str:
    lines = [heading, ""]

    if action_needed:
        lines.append("Action needed")
        for message in action_needed:
            sender = str(message.get("from_name") or message.get("from_email") or "Unknown sender")
            subject = str(message.get("subject") or "(no subject)")
            bucket = _action_bucket(message)
            count = int(message.get("_message_count") or 1)
            lines.append(f"- {subject} — {sender} — {_format_received_at(message.get('received_at'))}")
            if count > 1:
                lines.append(f"  Thread activity: {count} messages in this subject thread.")
            lines.append(f"  Response path: {_short_action_label(message)}")
            lines.append(f"  Why: {_message_reason(message, bucket)}")
            lines.append(f"  Owner: {_action_owner(message, bucket)}")
            lines.append(f"  Evidence: {_message_evidence(message)}")
            lines.append(f"  If ignored: {_action_risk(message, bucket)}")
        lines.append("")

    if informational:
        lines.append("Watch / informational")
        for message in informational:
            sender = str(message.get("from_name") or message.get("from_email") or "Unknown sender")
            subject = str(message.get("subject") or "(no subject)")
            bucket = _action_bucket(message)
            count = int(message.get("_message_count") or 1)
            lines.append(f"- {subject} — {sender} — {_format_received_at(message.get('received_at'))}")
            if count > 1:
                lines.append(f"  Thread activity: {count} messages in this subject thread.")
            lines.append(f"  Response path: {_short_action_label(message)}")
            lines.append(f"  Why: {_message_reason(message, bucket)}")
            lines.append(f"  Owner: {_action_owner(message, bucket)}")
            lines.append(f"  Evidence: {_message_evidence(message)}")
            lines.append(f"  If ignored: {_action_risk(message, bucket)}")
        lines.append("")

    if not action_needed and not informational:
        lines.append("No matching inbox items were identified from the live inbox read.")

    return "\n".join(lines).strip()


def _render_bucketed_triage_answer(
    *,
    heading: str,
    messages: list[dict[str, Any]],
    mailbox_owner: str,
    include_only_reply_needed: bool = False,
    same_day_only: bool = False,
) -> str:
    candidates = _trimmed_messages_for_today(messages) if same_day_only else messages
    candidates = _dedupe_messages(candidates)
    if include_only_reply_needed:
        candidates = [
            message
            for message in candidates
            if _action_bucket(message) in {"Alert now", "Reply"}
        ]

    ordered_buckets = ["Alert now", "Reply", "Delegate", "Watch", "Ignore/noise"]
    buckets: dict[str, list[dict[str, Any]]] = {name: [] for name in ordered_buckets}
    for message in candidates[:12]:
        bucket = _action_bucket(message)
        if include_only_reply_needed and bucket not in {"Alert now", "Reply", "Delegate"}:
            continue
        buckets[bucket].append(message)

    lines = [heading, ""]
    for bucket in ordered_buckets:
        rows = buckets[bucket]
        if not rows:
            continue
        lines.append(f"{bucket}")
        for message in rows[:4]:
            sender = str(message.get("from_name") or message.get("from_email") or "Unknown sender")
            subject = str(message.get("subject") or "(no subject)")
            count = int(message.get("_message_count") or 1)
            lines.append(f"- {subject} — {sender} — {_format_received_at(message.get('received_at'))}")
            if count > 1:
                lines.append(f"  Thread activity: {count} messages in this subject thread.")
            lines.append(f"  Action: {bucket}. Reason: {_message_reason(message, bucket)}")
            lines.append(f"  Owner: {_action_owner(message, bucket)}")
            lines.append(f"  Evidence: {_message_evidence(message)}")
            lines.append(f"  If ignored: {_action_risk(message, bucket)}")
        lines.append("")

    if not any(buckets[bucket] for bucket in ordered_buckets):
        lines.append("No clear action-needed inbox items were identified from the live inbox read.")
        lines.append("")

    lines.extend(
        [
            f"Recommended next steps for {mailbox_owner}",
            "1. Handle the Alert now items first, if any are present.",
            "2. Reply to the direct sender asks next.",
            "3. Leave Watch/Ignore items alone unless they match known work you are already handling.",
        ]
    )
    return "\n".join(lines).strip()


def _render_morning_answer(messages: list[dict[str, Any]], mailbox: str) -> str:
    rows = _dedupe_messages(_messages_for_this_morning(messages))
    if not rows:
        return (
            f"Important emails this morning for {mailbox}:\n\n"
            "No emails from this morning were identified in the live inbox read."
        )

    action_needed = [message for message in rows if _action_bucket(message) in {"Alert now", "Reply", "Delegate"}][:6]
    informational = [message for message in rows if _action_bucket(message) not in {"Alert now", "Reply", "Delegate"}][:6]
    return _render_action_lists(
        heading=f"Important emails this morning for {mailbox}:",
        action_needed=action_needed,
        informational=informational,
    )


def _render_arrived_today_answer(messages: list[dict[str, Any]], mailbox: str) -> str:
    rows = _dedupe_messages(_trimmed_messages_for_today(messages))
    action_needed = [message for message in rows if _action_bucket(message) in {"Alert now", "Reply"}][:6]
    informational = [message for message in rows if _action_bucket(message) not in {"Alert now", "Reply"}][:6]
    return _render_action_lists(
        heading=f"Messages that arrived today for {mailbox}:",
        action_needed=action_needed,
        informational=informational,
    )


def _deterministic_inbox_answer(
    request: MicrosoftExecutiveAssistantRequest,
    result: Any,
) -> Optional[str]:
    kind = _inbox_request_kind(request.prompt)
    if not kind:
        return None

    messages = _extract_live_inbox_messages(result)
    if not messages:
        return None

    mailbox = request.mailbox_user_id or "the mailbox"
    owner = _mailbox_owner_label(request)
    if kind == "last_five":
        return _render_last_five_answer(messages, mailbox)
    if kind == "urgent_triage":
        return _render_bucketed_triage_answer(
            heading=f"Urgent inbox triage for {mailbox}:",
            messages=messages,
            mailbox_owner=owner,
        )
    if kind == "important_morning":
        return _render_morning_answer(messages, mailbox)
    if kind == "arrived_today":
        return _render_arrived_today_answer(messages, mailbox)
    if kind == "reply_triage":
        return _render_bucketed_triage_answer(
            heading=f"Emails that most likely need a reply in {mailbox}:",
            messages=messages,
            mailbox_owner=owner,
            include_only_reply_needed=True,
        )
    return None


def _structured_inbox_emails(
    request: MicrosoftExecutiveAssistantRequest,
    result: Any,
) -> list[MicrosoftAssistantEmailItem]:
    """Shape the same live-inbox rows used for the text answer into structured
    email items the frontend renders as the outlook_inbox_summary card.

    Returns [] for non-inbox requests or when no live inbox read succeeded, so
    the frontend falls back to the text answer unchanged.
    """
    if not _inbox_request_kind(request.prompt):
        return []
    messages = _extract_live_inbox_messages(result)
    if not messages:
        return []

    items: list[MicrosoftAssistantEmailItem] = []
    for index, message in enumerate(messages[: request.max_messages]):
        subject = str(message.get("subject") or "(no subject)").strip() or "(no subject)"
        body_text = str(message.get("body_text") or "").strip() or None
        preview = re.sub(r"\s+", " ", body_text).strip()[:200] if body_text else None
        graph_id = str(message.get("graph_message_id") or message.get("id") or "").strip() or None
        conversation_id = str(message.get("conversation_id") or "").strip() or None
        item_id = graph_id or conversation_id or f"inbox-{index}"
        bucket = _action_bucket(message)
        reply_prompt = "\n".join(
            [
                "OUTLOOK_INBOX_CARD_ACTION",
                "Mode: reply",
                "Draft a short Outlook reply to this email thread.",
                f"Subject: {subject}",
                *([f"Graph message ID: {graph_id}"] if graph_id else []),
            ]
        )
        draft_prompt = "\n".join(
            [
                "OUTLOOK_INBOX_CARD_ACTION",
                "Mode: new",
                "Draft a short Outlook email about this inbox item.",
                f"Subject: {subject}",
            ]
        )
        items.append(
            MicrosoftAssistantEmailItem(
                id=item_id,
                graphMessageId=graph_id,
                conversationId=conversation_id,
                subject=subject,
                fromName=str(message.get("from_name") or "").strip() or None,
                fromEmail=str(message.get("from_email") or "").strip() or None,
                receivedAt=str(message.get("received_at") or "").strip() or None,
                hasAttachments=bool(message.get("has_attachments")),
                preview=preview,
                bodyText=body_text,
                webLink=str(message.get("web_link") or "").strip() or None,
                recommendedAction=_message_reason(message, bucket),
                replyPrompt=reply_prompt,
                draftPrompt=draft_prompt,
                # v1: no real Outlook draft lookup yet — pencil renders muted.
                draftReady=False,
            )
        )
    return items


def _tool_trace_from_result(result: Any, *, runtime_trace: MicrosoftAssistantTraceItem) -> list[MicrosoftAssistantTraceItem]:
    traces: list[MicrosoftAssistantTraceItem] = []
    known_tools = {
        "read_live_outlook_inbox",
        "search_outlook_emails",
        "search_microsoft_teams_messages",
        "search_microsoft_files",
        "list_outlook_calendar_events",
        "draft_outlook_email_for_review",
        "draft_teams_message_for_review",
    }
    for message in _messages_from_result(result):
        tool_name = _message_tool_name(message)
        if tool_name not in known_tools:
            continue
        content = _message_content(message)
        parsed = _parse_tool_json(content)
        source = parsed.get("source") if isinstance(parsed.get("source"), str) else None
        error = parsed.get("error") if isinstance(parsed.get("error"), str) else None
        ok = parsed.get("ok") if isinstance(parsed.get("ok"), bool) else None
        if ok is False and not error:
            error = content[:500] if content else f"{tool_name} failed"
        # The corpus-search tools return markdown (not JSON), so failures were
        # invisible in the trace — a degraded backend looked like a clean success.
        # Surface known failure markers so the trace and persisted metadata are honest.
        if not error and isinstance(content, str):
            stripped = content.lstrip()
            if (
                "SEARCH_BACKEND_DEGRADED" in content
                or stripped.startswith("Error searching")
                or stripped.startswith("Error executing retrieval")
                or "_SEARCH_FAILED" in content
                or "FILE_SEARCH_FAILED" in content
            ):
                error = content[:500]
        traces.append(
            MicrosoftAssistantTraceItem(
                agent=ORCHESTRATOR_NAME,
                tool=tool_name,
                status="failed" if error else "success",
                durationMs=0,
                detail=error or f"{tool_name} completed.",
                source=source,
                output={
                    key: value
                    for key, value in {
                        "source": source,
                        "ok": ok,
                        "count": parsed.get("count"),
                        "mailboxUserId": parsed.get("mailbox_user_id"),
                        "fetchedAt": parsed.get("fetched_at"),
                        "truncated": parsed.get("truncated"),
                        "error": error,
                    }.items()
                    if value is not None
                },
            )
        )
    traces.append(runtime_trace)
    return traces


def run_microsoft_executive_assistant(
    request: MicrosoftExecutiveAssistantRequest,
    *,
    create_agent: Optional[Callable[..., Any]] = None,
    model: str = "",
) -> MicrosoftExecutiveAssistantResponse:
    """Run the Microsoft Executive Assistant Deep Agent and return a typed response."""
    started = time.perf_counter()
    loaded_skills = _skills_loaded()
    try:
        if not model:
            from src.services.pipeline.config import MODEL_BRANDON_EMAIL

            model = f"openai:{MODEL_BRANDON_EMAIL}"
        if create_agent is None:
            if not _provider_available():
                raise RuntimeError(
                    "OPENAI_API_KEY is required for the Microsoft Executive Assistant."
                )
            from deepagents import create_deep_agent as create_agent

            model = _resolve_deep_agents_model(model)

        kwargs: dict[str, Any] = {
            "name": ORCHESTRATOR_NAME,
            "model": model,
            "tools": microsoft_executive_assistant_tools(),
            "backend": _microsoft_backend(allow_fallback=create_agent is not None),
            "system_prompt": (
                "You are Alleato's Microsoft Executive Assistant, a specialist delegated to by the Chief Strategist. "
                "Your domain is Outlook, Teams, Microsoft calendar, and Microsoft files. Use Deep Agents planning and "
                "specialized skills for inbox triage, drafting, urgent escalation, calendar review, and Microsoft file context. "
                "Fail loudly for missing provider keys, Microsoft Graph credentials, Graph HTTP failures, stale source context, "
                "or empty results. Never silently skip a tool failure. "
                "If any search tool returns a result beginning with SEARCH_BACKEND_DEGRADED (or *_SEARCH_FAILED), the search "
                "subsystem is broken — do NOT report 'no matching passages' or conclude that evidence is absent. Say plainly that "
                "search was unavailable, state which corpora could not be searched, and do not present a confident negative. "
                "Never send email, post Teams messages, or mutate calendar events unless an explicit approved action path exists."
            ),
        }
        skill_roots = _skill_roots()
        if skill_roots:
            kwargs["skills"] = skill_roots
        memory_files = _memory_files()
        if memory_files:
            kwargs["memory"] = memory_files

        agent = create_agent(**kwargs)
        try:
            result = agent.invoke(
                {"messages": [{"role": "user", "content": _microsoft_prompt(request)}]},
                config=_agent_config(request),
            )
        except TypeError as exc:
            if "config" not in str(exc):
                raise
            result = agent.invoke({"messages": [{"role": "user", "content": _microsoft_prompt(request)}]})

        answer = _deterministic_inbox_answer(request, result) or _extract_agent_text(result)
        if not answer:
            raise RuntimeError("Microsoft Executive Assistant returned an empty response.")

        runtime_trace = MicrosoftAssistantTraceItem(
            agent=ORCHESTRATOR_NAME,
            tool="deepagents_microsoft_executive_assistant_runtime",
            status="success",
            durationMs=max(0, int((time.perf_counter() - started) * 1000)),
            detail="Microsoft Executive Assistant produced an answer.",
        )

        return MicrosoftExecutiveAssistantResponse(
            answer=answer,
            mode="deep_agents",
            actions=_extract_actions(answer, result),
            emails=_structured_inbox_emails(request, result),
            toolTrace=_tool_trace_from_result(result, runtime_trace=runtime_trace),
            skillsLoaded=loaded_skills,
            approvedSkillContext=request.approved_skill_context,
            orchestrator=ORCHESTRATOR_NAME,
        )
    except Exception as exc:
        return MicrosoftExecutiveAssistantResponse(
            answer=(
                "The Microsoft Executive Assistant could not complete this request. "
                f"Failed capability: deepagents_microsoft_executive_assistant_runtime. Detail: {exc}"
            ),
            mode="unavailable",
            actions=[
                MicrosoftAssistantAction(
                    actionType="blocked",
                    title="Microsoft Executive Assistant unavailable",
                    status="blocked",
                    detail=str(exc),
                )
            ],
            toolTrace=[
                MicrosoftAssistantTraceItem(
                    agent=ORCHESTRATOR_NAME,
                    tool="deepagents_microsoft_executive_assistant_runtime",
                    status="failed",
                    durationMs=max(0, int((time.perf_counter() - started) * 1000)),
                    detail=str(exc),
                )
            ],
            skillsLoaded=loaded_skills,
            approvedSkillContext=request.approved_skill_context,
            orchestrator=ORCHESTRATOR_NAME,
        )
