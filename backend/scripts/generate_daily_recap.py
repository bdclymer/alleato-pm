#!/usr/bin/env python3
"""
Generate AI-powered daily project recap from meeting transcripts.

Usage:
    cd backend
    source venv/bin/activate
    PYTHONPATH="src/services:src/workers" python scripts/generate_daily_recap.py

Options:
    --date YYYY-MM-DD    Generate recap for specific date (default: today)
    --days N             Include meetings from last N days (default: 1)
    --output FILE        Save to file instead of stdout
    --send-email         Send via email (requires SENDGRID_API_KEY)
    --send-teams         Send via Teams webhook (requires TEAMS_WEBHOOK_URL)
    --no-save            Don't save to database

This script:
1. Fetches all meeting transcripts from the specified date range
2. Uses AI to extract risks, decisions, blockers, commitments, and wins
3. Generates a formatted daily briefing for executive review
4. Saves the recap and extracted data to Supabase for historical tracking
"""

import argparse
import asyncio
import json
import os
import sys
import time
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from uuid import uuid4

# Add paths for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'services'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'workers'))

# Load environment variables
from dotenv import load_dotenv

env_locations = [
    os.path.join(os.path.dirname(__file__), '..', '..', '.env'),
    os.path.join(os.path.dirname(__file__), '..', '..', '.env.local'),
    os.path.join(os.path.dirname(__file__), '..', '.env'),
    os.path.join(os.path.dirname(__file__), '..', '.env.local'),
]

for env_path in env_locations:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break

from openai import OpenAI
from ops.db_pressure_guard import enforce_app_db_pressure_guard
from supabase_helpers import get_supabase_client


EXTRACTION_PROMPT = """You are an AI Chief of Staff analyzing a construction project meeting transcript.

Extract the following information from this meeting transcript. Be specific and quote relevant details.

Return a JSON object with these fields:
{{
    "risks": [
        {{"description": "...", "severity": "high|medium|low", "impact": "what could happen if not addressed"}}
    ],
    "decisions": [
        {{"description": "what was decided", "rationale": "why, if mentioned"}}
    ],
    "blockers": [
        {{"description": "what is blocked", "waiting_on": "who/what", "deadline": "if mentioned"}}
    ],
    "commitments": [
        {{"person": "who committed", "action": "what they'll do", "due": "when, if mentioned"}}
    ],
    "wins": [
        {{"description": "positive progress or achievement"}}
    ],
    "client_sentiment": "positive|neutral|concerned|negative|not_mentioned",
    "schedule_status": "ahead|on_track|at_risk|behind|not_discussed",
    "key_topics": ["topic1", "topic2", "topic3"],
    "summary": "2-3 sentence summary of the meeting"
}}

If a category has no items, use an empty array [].
Be conservative - only extract items that are clearly stated, don't infer.

PROJECT: {project_name}
MEETING: {meeting_title}
DATE: {meeting_date}

TRANSCRIPT:
{transcript}

Return only valid JSON, no other text:"""


RECAP_PROMPT = """You are an AI Chief of Staff generating a daily executive briefing for a construction company owner.

Based on the extracted meeting data below, generate a daily recap following this EXACT format:

DAILY PROJECT PULSE - {date}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MEETINGS TODAY: {meeting_count} across {project_count} projects

🔴 NEEDS YOUR ATTENTION
────────────────────────
[List items with HIGH severity risks or urgent blockers, grouped by project]
[Include: project name, the issue, impact, and any deadline]
[If nothing needs attention, write "None - all projects tracking normally"]

🟡 WATCHING
────────────────────────
[List MEDIUM severity items that aren't urgent but should be monitored]
[Include pending decisions, potential issues mentioned]
[If nothing to watch, write "No items requiring monitoring"]

🟢 PROGRESS & WINS
────────────────────────
[Bullet list of positive progress: milestones, completions, good news]
[Pull from 'wins' and positive schedule_status]

COMMITMENTS MADE TODAY
────────────────────────
[List commitments with: Person → Action by Date]
[If none, write "No new commitments recorded"]

OPEN QUESTIONS
────────────────────────
[Questions or uncertainties that emerged without clear answers]
[If none, write "No unresolved questions"]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated from {meeting_count} meeting transcripts | Powered by Alleato AI

MEETING DATA:
{meeting_data}

Generate the daily recap following the exact format above. Be concise but specific. Use actual names and details from the meetings:"""


def get_meetings_for_date_range(client, start_date: str, end_date: str) -> List[Dict[str, Any]]:
    """Fetch meetings within a date range with their project info."""

    # Get meetings in date range
    result = client.table('document_metadata').select(
        'id, title, date, summary, content, overview, project_id'
    ).gte('date', start_date).lte('date', end_date).order('date', desc=True).execute()

    meetings = result.data or []

    # Get project names for each meeting
    project_ids = list(set(m.get('project_id') for m in meetings if m.get('project_id')))

    project_names = {}
    if project_ids:
        projects_result = client.table('projects').select('id, name').in_('id', project_ids).execute()
        project_names = {p['id']: p['name'] for p in (projects_result.data or [])}

    # Attach project names
    for meeting in meetings:
        meeting['project_name'] = project_names.get(meeting.get('project_id'), 'Unknown Project')

    return meetings


def extract_meeting_signals(meeting: Dict[str, Any]) -> Dict[str, Any]:
    """Use AI to extract risks, decisions, blockers, etc. from a meeting."""

    # Get content - prefer overview, fall back to content
    content = meeting.get('overview') or meeting.get('content') or meeting.get('summary') or ''

    if not content or len(content) < 50:
        return {
            "risks": [],
            "decisions": [],
            "blockers": [],
            "commitments": [],
            "wins": [],
            "client_sentiment": "not_mentioned",
            "schedule_status": "not_discussed",
            "key_topics": [],
            "summary": "No transcript content available",
            "project_name": meeting.get('project_name'),
            "project_id": meeting.get('project_id'),
            "meeting_title": meeting.get('title'),
            "meeting_date": meeting.get('date'),
            "meeting_id": meeting.get('id')
        }

    # Truncate if too long
    if len(content) > 15000:
        content = content[:15000] + "\n[... transcript truncated ...]"

    prompt = EXTRACTION_PROMPT.format(
        project_name=meeting.get('project_name', 'Unknown'),
        meeting_title=meeting.get('title', 'Untitled Meeting'),
        meeting_date=meeting.get('date', 'Unknown date'),
        transcript=content
    )

    openai_client = OpenAI()

    response = openai_client.chat.completions.create(
        model="gpt-5.1",
        messages=[
            {"role": "system", "content": "You are an expert construction project analyst. Extract meeting signals and return valid JSON only."},
            {"role": "user", "content": prompt}
        ],
        max_completion_tokens=2000,
        temperature=0.3,
        response_format={"type": "json_object"}
    )

    try:
        result = json.loads(response.choices[0].message.content)
        result['project_name'] = meeting.get('project_name')
        result['project_id'] = meeting.get('project_id')
        result['meeting_title'] = meeting.get('title')
        result['meeting_date'] = meeting.get('date')
        result['meeting_id'] = meeting.get('id')
        return result
    except json.JSONDecodeError:
        return {
            "risks": [],
            "decisions": [],
            "blockers": [],
            "commitments": [],
            "wins": [],
            "client_sentiment": "not_mentioned",
            "schedule_status": "not_discussed",
            "key_topics": [],
            "summary": "Failed to parse meeting content",
            "project_name": meeting.get('project_name'),
            "project_id": meeting.get('project_id'),
            "meeting_title": meeting.get('title'),
            "meeting_date": meeting.get('date'),
            "meeting_id": meeting.get('id')
        }


def generate_recap(date_str: str, meeting_signals: List[Dict[str, Any]]) -> str:
    """Generate the formatted daily recap from extracted meeting signals."""

    if not meeting_signals:
        return f"""
DAILY PROJECT PULSE - {date_str}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MEETINGS TODAY: 0

No meetings recorded for this date.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated by Alleato AI
"""

    # Count unique projects
    project_names = list(set(m.get('project_name', 'Unknown') for m in meeting_signals))

    # Format meeting data for the prompt
    meeting_data = json.dumps(meeting_signals, indent=2, default=str)

    prompt = RECAP_PROMPT.format(
        date=date_str,
        meeting_count=len(meeting_signals),
        project_count=len(project_names),
        meeting_data=meeting_data
    )

    openai_client = OpenAI()

    response = openai_client.chat.completions.create(
        model="gpt-5.1",
        messages=[
            {"role": "system", "content": "You are an executive assistant generating a daily briefing. Be concise, specific, and actionable."},
            {"role": "user", "content": prompt}
        ],
        max_completion_tokens=2000,
        temperature=0.5
    )

    return response.choices[0].message.content


def generate_recap_html(recap_text: str) -> str:
    """Convert plain text recap to HTML for email."""
    # Escape HTML entities
    import html
    escaped = html.escape(recap_text)

    # Convert to styled HTML
    html_content = f"""
    <div style="font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', 'Droid Sans Mono', monospace;
                font-size: 14px; line-height: 1.5; color: #333; max-width: 800px; margin: 0 auto;">
        <pre style="white-space: pre-wrap; word-wrap: break-word;">{escaped}</pre>
    </div>
    """
    return html_content


def save_recap_to_db(
    client,
    recap_date: str,
    date_range_start: str,
    date_range_end: str,
    recap_text: str,
    recap_html: str,
    meetings: List[Dict[str, Any]],
    meeting_signals: List[Dict[str, Any]],
    generation_time: float,
    sent_email: bool = False,
    sent_teams: bool = False,
    recipients: Optional[List[str]] = None
) -> Optional[str]:
    """Save the recap and extracted data to Supabase."""

    try:
        # Aggregate all signals across meetings
        all_risks = []
        all_decisions = []
        all_blockers = []
        all_commitments = []
        all_wins = []

        for signal in meeting_signals:
            project_context = {
                "project_name": signal.get("project_name"),
                "project_id": signal.get("project_id"),
                "meeting_title": signal.get("meeting_title"),
                "meeting_id": signal.get("meeting_id")
            }

            for risk in signal.get("risks", []):
                all_risks.append({**risk, **project_context})
            for decision in signal.get("decisions", []):
                all_decisions.append({**decision, **project_context})
            for blocker in signal.get("blockers", []):
                all_blockers.append({**blocker, **project_context})
            for commitment in signal.get("commitments", []):
                all_commitments.append({**commitment, **project_context})
            for win in signal.get("wins", []):
                all_wins.append({**win, **project_context})

        # Build meetings_analyzed list
        meetings_analyzed = [
            {
                "id": m.get("id"),
                "title": m.get("title"),
                "project_id": m.get("project_id"),
                "project_name": m.get("project_name")
            }
            for m in meetings
        ]

        # Count unique projects
        project_names = list(set(m.get('project_name', 'Unknown') for m in meeting_signals))

        # Build the record
        record = {
            "recap_date": recap_date,
            "date_range_start": date_range_start,
            "date_range_end": date_range_end,
            "recap_text": recap_text,
            "recap_html": recap_html,
            "meeting_count": len(meetings),
            "project_count": len(project_names),
            "meetings_analyzed": meetings_analyzed,
            "risks": all_risks,
            "decisions": all_decisions,
            "blockers": all_blockers,
            "commitments": all_commitments,
            "wins": all_wins,
            "sent_email": sent_email,
            "sent_teams": sent_teams,
            "sent_at": datetime.utcnow().isoformat() if (sent_email or sent_teams) else None,
            "recipients": recipients,
            "generation_time_seconds": generation_time,
            "model_used": "gpt-5.1"
        }

        result = client.table('daily_recaps').insert(record).execute()

        if result.data:
            return result.data[0].get('id')
        return None

    except Exception as e:
        print(f"Error saving recap to database: {e}")
        return None


def send_email(recap: str, to_email: str, date_str: str) -> bool:
    """Send recap via SendGrid."""
    try:
        import sendgrid
        from sendgrid.helpers.mail import Mail, Email, To, Content

        sg_api_key = os.getenv('SENDGRID_API_KEY')
        if not sg_api_key:
            print("Warning: SENDGRID_API_KEY not set, skipping email")
            return False

        sg = sendgrid.SendGridAPIClient(api_key=sg_api_key)

        from_email = Email(os.getenv('SENDGRID_FROM_EMAIL', 'ai-chief-of-staff@alleato.io'))
        to_email_obj = To(to_email)
        subject = f"Daily Project Pulse - {date_str}"

        # Convert to HTML (preserve formatting)
        html_content = generate_recap_html(recap)
        content = Content("text/html", html_content)

        mail = Mail(from_email, to_email_obj, subject, content)
        response = sg.client.mail.send.post(request_body=mail.get())

        return response.status_code in [200, 202]
    except Exception as e:
        print(f"Error sending email: {e}")
        return False


def send_teams(recap: str, webhook_url: str) -> bool:
    """Send recap via Teams webhook."""
    try:
        import requests

        # Format for Teams adaptive card
        payload = {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "themeColor": "0076D7",
            "summary": "Daily Project Pulse",
            "sections": [{
                "activityTitle": "Daily Project Pulse",
                "text": f"```\n{recap}\n```",
                "markdown": True
            }]
        }

        response = requests.post(webhook_url, json=payload)
        return response.status_code == 200
    except Exception as e:
        print(f"Error sending to Teams: {e}")
        return False


async def main():
    parser = argparse.ArgumentParser(description='Generate daily project recap from meeting transcripts')
    parser.add_argument('--date', type=str, help='Date to generate recap for (YYYY-MM-DD), default: today')
    parser.add_argument('--days', type=int, default=1, help='Include meetings from last N days')
    parser.add_argument('--output', type=str, help='Save to file instead of stdout')
    parser.add_argument('--send-email', type=str, metavar='EMAIL', help='Send via email to this address')
    parser.add_argument('--send-teams', action='store_true', help='Send via Teams webhook')
    parser.add_argument('--no-save', action='store_true', help="Don't save to database")
    parser.add_argument('--verbose', '-v', action='store_true', help='Show detailed progress')
    args = parser.parse_args()

    start_time = time.time()

    # Determine date range
    if args.date:
        end_date = datetime.strptime(args.date, '%Y-%m-%d')
    else:
        end_date = datetime.now()

    start_date = end_date - timedelta(days=args.days - 1)

    start_str = start_date.strftime('%Y-%m-%d')
    end_str = end_date.strftime('%Y-%m-%d')
    date_display = end_date.strftime('%B %d, %Y')

    if args.verbose:
        print(f"Generating recap for {start_str} to {end_str}...")

    enforce_app_db_pressure_guard("daily_recap")
    supabase = get_supabase_client()

    # Fetch meetings
    if args.verbose:
        print("Fetching meetings...")

    meetings = get_meetings_for_date_range(supabase, start_str, end_str + 'T23:59:59')

    if args.verbose:
        print(f"Found {len(meetings)} meetings")
        for m in meetings:
            print(f"  - {m.get('project_name')}: {m.get('title')}")

    meeting_signals = []

    if not meetings:
        recap = f"""
DAILY PROJECT PULSE - {date_display}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MEETINGS TODAY: 0

No meetings recorded for this date range ({start_str} to {end_str}).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated by Alleato AI
"""
    else:
        # Extract signals from each meeting
        if args.verbose:
            print("\nExtracting meeting signals...")

        for i, meeting in enumerate(meetings):
            if args.verbose:
                print(f"  [{i+1}/{len(meetings)}] Processing: {meeting.get('title', 'Untitled')}")

            signals = extract_meeting_signals(meeting)
            meeting_signals.append(signals)

        # Generate recap
        if args.verbose:
            print("\nGenerating recap...")

        recap = generate_recap(date_display, meeting_signals)

    generation_time = time.time() - start_time

    # Output
    if args.output:
        with open(args.output, 'w') as f:
            f.write(recap)
        print(f"Recap saved to {args.output}")
    else:
        print(recap)

    # Track delivery status
    sent_email = False
    sent_teams = False
    recipients = []

    # Send notifications
    if args.send_email:
        if args.verbose:
            print(f"\nSending email to {args.send_email}...")
        if send_email(recap, args.send_email, date_display):
            print("✓ Email sent successfully")
            sent_email = True
            recipients.append(args.send_email)
        else:
            print("✗ Failed to send email")

    if args.send_teams:
        webhook_url = os.getenv('TEAMS_WEBHOOK_URL')
        if webhook_url:
            if args.verbose:
                print("\nSending to Teams...")
            if send_teams(recap, webhook_url):
                print("✓ Teams notification sent")
                sent_teams = True
            else:
                print("✗ Failed to send Teams notification")
        else:
            print("Warning: TEAMS_WEBHOOK_URL not set, skipping Teams")

    # Save to database
    if not args.no_save:
        if args.verbose:
            print("\nSaving recap to database...")

        recap_html = generate_recap_html(recap)
        recap_id = save_recap_to_db(
            client=supabase,
            recap_date=end_str,
            date_range_start=start_str,
            date_range_end=end_str,
            recap_text=recap,
            recap_html=recap_html,
            meetings=meetings,
            meeting_signals=meeting_signals,
            generation_time=generation_time,
            sent_email=sent_email,
            sent_teams=sent_teams,
            recipients=recipients if recipients else None
        )

        if recap_id:
            print(f"✓ Recap saved to database (ID: {recap_id})")
        else:
            print("✗ Failed to save recap to database")

    if args.verbose:
        print(f"\nTotal generation time: {generation_time:.2f} seconds")


if __name__ == '__main__':
    asyncio.run(main())
