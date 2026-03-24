"""
Email Mining Script for Eval Set Bootstrapping (Phase 1)

Scans historical emails via Microsoft Graph API, uses GPT-4o to identify
past project problems that the Business Strategist Agent should have caught early,
and saves structured scenarios to the eval_scenarios_raw table.

Usage:
  cd backend && .venv/bin/python src/scripts/eval_mine_emails.py
  cd backend && .venv/bin/python src/scripts/eval_mine_emails.py --dry-run
  cd backend && .venv/bin/python src/scripts/eval_mine_emails.py --user brandon@alleatogroup.com --since 2024-01-01
  cd backend && .venv/bin/python src/scripts/eval_mine_emails.py --batch-size 50 --max-emails 500
"""

import argparse
import json
import logging
import os
import sys
import time
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "../../../.env"))

from openai import OpenAI
from supabase import create_client, ClientOptions

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# Search terms that indicate project problems worth capturing
PROBLEM_KEYWORDS = [
    "budget", "cost overrun", "over budget", "under budget",
    "delay", "behind schedule", "slipping", "late",
    "client complaint", "client concern", "escalation", "escalated",
    "change order", "CO ", "scope change", "scope creep",
    "margin", "profitability", "losing money", "cost increase",
    "issue", "problem", "risk", "concern", "worried",
    "rework", "redo", "deficiency", "punch list",
    "safety", "OSHA", "incident", "accident",
    "dispute", "claim", "lien", "back charge",
]

MINING_SYSTEM_PROMPT = """You are analyzing historical email records for a commercial construction design-build firm called Alleato Group.

Your goal is to identify past project problems that an AI business strategist should have caught early. Focus on issues where earlier detection would have saved money, time, or relationships.

For EACH distinct problem you identify in the emails provided, output a JSON object. Return a JSON array of objects.

Each object must have these fields:
{
  "project": "project name or identifier (extract from context)",
  "problem_type": "cost_overrun | timeline_delay | client_escalation | scope_creep | margin_compression | resource_conflict | safety_issue | quality_issue | other",
  "description": "2-3 sentence description of what went wrong",
  "date_range": "approximate timeframe from the emails",
  "severity": "low | medium | high | critical",
  "early_warning_signals": ["list of data points that would have flagged this early"],
  "ideal_agent_action": "what the AI strategist should have said or done proactively (be specific)",
  "data_sources_needed": ["acumatica", "emails", "transcripts", "onedrive", "teams"]
}

Rules:
- Only output problems that are REAL and evidenced in the emails — never fabricate
- Focus on problems where early detection would have changed the outcome
- Be specific about early warning signals (e.g., "AP bills trending 15% over budget at 40% completion")
- If no problems are found in a batch, return an empty array: []
- Return ONLY the JSON array, no markdown fences or other text"""


def get_clients():
    """Initialize Supabase and OpenAI clients from environment."""
    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")

    if not url or not key:
        logger.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
        sys.exit(1)
    if not openai_key:
        logger.error("Missing OPENAI_API_KEY in .env")
        sys.exit(1)

    options = ClientOptions(postgrest_client_timeout=300)
    return create_client(url, key, options), OpenAI(api_key=openai_key)


def fetch_emails_from_graph(
    user_email: str,
    since_date: str,
    search_keywords: List[str],
    max_emails: int = 500,
) -> List[Dict[str, Any]]:
    """Fetch emails from Microsoft Graph API matching problem keywords."""
    # Import the Graph client from existing integration
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
    from services.integrations.microsoft_graph.client import get_graph_client

    graph = get_graph_client()
    if not graph.is_configured():
        logger.error("Microsoft Graph API not configured. Set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID in .env")
        return []

    all_emails = []
    select_fields = "id,subject,from,toRecipients,ccRecipients,receivedDateTime,bodyPreview,body,importance"

    # Search across keyword batches to find problem-related emails
    # Graph $search only works with KQL, so we batch keywords
    keyword_batches = []
    batch = []
    for kw in search_keywords:
        batch.append(kw)
        if len(batch) >= 5:
            keyword_batches.append(batch)
            batch = []
    if batch:
        keyword_batches.append(batch)

    seen_ids = set()

    for kw_batch in keyword_batches:
        if len(all_emails) >= max_emails:
            break

        # Use $search with KQL for content matching
        search_query = " OR ".join(f'"{kw}"' for kw in kw_batch)
        url = (
            f"{graph.GRAPH_BASE}/users/{user_email}/messages"
            f"?$select={select_fields}"
            f"&$search=\"{search_query}\""
            f"&$filter=receivedDateTime ge {since_date}T00:00:00Z"
            f"&$top=50"
            f"&$orderby=receivedDateTime desc"
        )

        try:
            data = graph._get_with_retry(url)
            messages = data.get("value", [])
            for msg in messages:
                msg_id = msg.get("id")
                if msg_id and msg_id not in seen_ids:
                    seen_ids.add(msg_id)
                    all_emails.append(msg)
            logger.info(f"  Fetched {len(messages)} emails for keywords: {', '.join(kw_batch[:3])}...")
        except Exception as e:
            logger.warning(f"  Graph search failed for batch: {e}")

    logger.info(f"Total unique emails fetched: {len(all_emails)}")
    return all_emails[:max_emails]


def fetch_emails_from_supabase(
    supabase,
    since_date: str,
    max_emails: int = 500,
) -> List[Dict[str, Any]]:
    """Fallback: fetch already-ingested emails from document_metadata/document_chunks."""
    logger.info("Fetching emails from Supabase (already ingested)...")

    result = (
        supabase.table("document_chunks")
        .select("chunk_id, text, source_type, metadata, created_at")
        .in_("source_type", ["email", "outlook", "microsoft_graph"])
        .gte("created_at", f"{since_date}T00:00:00Z")
        .order("created_at", desc=True)
        .limit(max_emails)
        .execute()
    )

    emails = []
    for row in (result.data or []):
        emails.append({
            "id": row["chunk_id"],
            "subject": (row.get("metadata") or {}).get("subject", ""),
            "bodyPreview": row.get("text", "")[:500],
            "body": {"content": row.get("text", "")},
            "receivedDateTime": row.get("created_at", ""),
            "from": {"emailAddress": {"name": "", "address": ""}},
        })

    logger.info(f"Found {len(emails)} email chunks in Supabase")
    return emails


def format_email_batch(emails: List[Dict[str, Any]]) -> str:
    """Format a batch of emails into text for the mining prompt."""
    parts = []
    for i, msg in enumerate(emails, 1):
        subject = msg.get("subject", "(no subject)")
        date = msg.get("receivedDateTime", "")
        sender = msg.get("from", {}).get("emailAddress", {})
        sender_str = f"{sender.get('name', '')} <{sender.get('address', '')}>"

        body = msg.get("bodyPreview", "")
        if msg.get("body", {}).get("content"):
            import re
            raw_html = msg["body"]["content"]
            body = re.sub(r'<[^>]+>', ' ', raw_html)
            body = re.sub(r'\s+', ' ', body).strip()
            body = body[:3000]  # Keep reasonable size

        parts.append(
            f"--- Email {i} ---\n"
            f"Subject: {subject}\n"
            f"Date: {date}\n"
            f"From: {sender_str}\n"
            f"{body}\n"
        )
    return "\n".join(parts)


def mine_batch(
    openai_client: OpenAI,
    email_batch: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Send a batch of emails to GPT-4o for problem mining."""
    email_text = format_email_batch(email_batch)

    response = openai_client.chat.completions.create(
        model="gpt-4o",
        temperature=0.2,
        max_tokens=4000,
        messages=[
            {"role": "system", "content": MINING_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Analyze these {len(email_batch)} emails and identify any project problems "
                    f"that an AI business strategist should have caught early.\n\n"
                    f"{email_text}"
                ),
            },
        ],
    )

    raw = response.choices[0].message.content or "[]"
    raw = raw.strip()
    if raw.startswith("```"):
        lines = raw.split("\n")
        lines = [line for line in lines if not line.strip().startswith("```")]
        raw = "\n".join(lines)

    try:
        scenarios = json.loads(raw)
        if isinstance(scenarios, dict):
            scenarios = [scenarios]
        return scenarios if isinstance(scenarios, list) else []
    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse mining response: {e}")
        return []


def save_scenarios(supabase, scenarios: List[Dict[str, Any]], source: str = "email_mining") -> int:
    """Save mined scenarios to eval_scenarios_raw table."""
    saved = 0
    for s in scenarios:
        try:
            row = {
                "project": s.get("project", "Unknown"),
                "problem_type": s.get("problem_type", "other"),
                "description": s.get("description", ""),
                "date_range": s.get("date_range", ""),
                "severity": s.get("severity", "medium"),
                "early_warning_signals": json.dumps(s.get("early_warning_signals", [])),
                "ideal_agent_action": s.get("ideal_agent_action", ""),
                "data_sources_needed": json.dumps(s.get("data_sources_needed", [])),
                "source": source,
                "curated": False,
            }
            supabase.table("eval_scenarios_raw").insert(row).execute()
            saved += 1
        except Exception as e:
            logger.warning(f"Failed to save scenario: {e}")
    return saved


def main():
    parser = argparse.ArgumentParser(description="Mine historical emails for eval scenarios")
    parser.add_argument("--user", type=str, default="bclymer@alleatogroup.com",
                        help="Email address to scan (default: bclymer@alleatogroup.com)")
    parser.add_argument("--since", type=str, default="2024-01-01",
                        help="Start date for email search (default: 2024-01-01)")
    parser.add_argument("--max-emails", type=int, default=500,
                        help="Maximum emails to fetch (default: 500)")
    parser.add_argument("--batch-size", type=int, default=20,
                        help="Emails per GPT-4o mining batch (default: 20)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Fetch emails and show mining results without saving to DB")
    parser.add_argument("--use-supabase", action="store_true",
                        help="Use already-ingested emails from Supabase instead of Graph API")
    parser.add_argument("--output", type=str, default="/tmp/eval-mining-results.json",
                        help="Path to save JSON results")
    args = parser.parse_args()

    supabase, openai_client = get_clients()

    # Fetch emails
    logger.info("=" * 70)
    logger.info("EVAL SCENARIO MINING — Phase 1")
    logger.info("=" * 70)
    logger.info(f"  User: {args.user}")
    logger.info(f"  Since: {args.since}")
    logger.info(f"  Max emails: {args.max_emails}")
    logger.info(f"  Batch size: {args.batch_size}")
    logger.info(f"  Source: {'Supabase (ingested)' if args.use_supabase else 'Microsoft Graph API'}")
    logger.info("")

    if args.use_supabase:
        emails = fetch_emails_from_supabase(supabase, args.since, args.max_emails)
    else:
        emails = fetch_emails_from_graph(args.user, args.since, PROBLEM_KEYWORDS, args.max_emails)

    if not emails:
        logger.warning("No emails found. Check Graph API configuration or use --use-supabase.")
        return

    # Process in batches
    all_scenarios = []
    total_batches = (len(emails) + args.batch_size - 1) // args.batch_size

    for i in range(0, len(emails), args.batch_size):
        batch_num = i // args.batch_size + 1
        batch = emails[i:i + args.batch_size]
        logger.info(f"Mining batch {batch_num}/{total_batches} ({len(batch)} emails)...")

        scenarios = mine_batch(openai_client, batch)
        all_scenarios.extend(scenarios)
        logger.info(f"  Found {len(scenarios)} scenarios in batch {batch_num}")

        # Rate limit protection
        if batch_num < total_batches:
            time.sleep(1)

    logger.info(f"\nTotal scenarios mined: {len(all_scenarios)}")

    # Save results
    if all_scenarios:
        # Always save JSON output
        output = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "source_user": args.user,
            "since_date": args.since,
            "emails_processed": len(emails),
            "scenarios_found": len(all_scenarios),
            "scenarios": all_scenarios,
        }
        with open(args.output, "w") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        logger.info(f"Results saved to {args.output}")

        if not args.dry_run:
            saved = save_scenarios(supabase, all_scenarios)
            logger.info(f"Saved {saved} scenarios to eval_scenarios_raw table")
        else:
            logger.info("DRY RUN — scenarios not saved to database")
            for i, s in enumerate(all_scenarios[:10], 1):
                logger.info(f"\n  [{i}] {s.get('project', '?')} — {s.get('problem_type', '?')}")
                logger.info(f"      {s.get('description', '')[:100]}")
                logger.info(f"      Severity: {s.get('severity', '?')}")
    else:
        logger.info("No scenarios found. Try expanding the date range or keyword list.")

    logger.info("=" * 70)


if __name__ == "__main__":
    main()
