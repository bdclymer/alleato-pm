"""Sub-agent definitions.

Each sub-agent is a focused investigator with its own context window and tool subset.
The orchestrator delegates to them in parallel and integrates their reports.
"""

from .prompts import (
    COMMUNICATIONS_ANALYST_PROMPT,
    FINANCIAL_ANALYST_PROMPT,
    RISK_ANALYST_PROMPT,
    SCHEDULE_ANALYST_PROMPT,
)
from . import (
    acumatica_ap_aging,
    acumatica_ar_aging,
    acumatica_cash_position,
    acumatica_project_budget,
    acumatica_project_list,
    acumatica_purchase_orders,
    acumatica_recent_bills,
    acumatica_recent_invoices,
    acumatica_vendor_spend,
    describe_schema,
    list_recent_meetings,
    portfolio_overview,
    project_briefing_snapshot,
    project_budget_summary,
    project_risk_snapshot,
    query_db,
    recent_activity,
    search_emails,
    search_meeting_transcripts,
    search_teams_messages,
    search_unstructured,
    think_tool,
)

financial_analyst = {
    "name": "financial-analyst",
    "description": (
        "Delegate financial questions: budget vs. actuals, commitments, change orders, "
        "pay applications, cash position, Acumatica data. Give one focused question at a time."
    ),
    "system_prompt": FINANCIAL_ANALYST_PROMPT,
    "tools": [
        describe_schema,
        query_db,
        acumatica_ap_aging,
        acumatica_ar_aging,
        acumatica_cash_position,
        acumatica_project_budget,
        acumatica_project_list,
        project_budget_summary,
        portfolio_overview,
        acumatica_purchase_orders,
        acumatica_recent_bills,
        acumatica_recent_invoices,
        acumatica_vendor_spend,
        think_tool,
    ],
}

schedule_analyst = {
    "name": "schedule-analyst",
    "description": (
        "Delegate schedule questions: status vs. baseline, float, critical path, milestones, "
        "delays. Give one focused question at a time."
    ),
    "system_prompt": SCHEDULE_ANALYST_PROMPT,
    "tools": [
        describe_schema,
        query_db,
        project_briefing_snapshot,
        project_risk_snapshot,
        search_meeting_transcripts,
        list_recent_meetings,
        recent_activity,
        think_tool,
    ],
}

risk_analyst = {
    "name": "risk-analyst",
    "description": (
        "Delegate risk-surfacing: aged RFIs, late submittals, unanswered communications, "
        "approaching deadlines, contractual exposure. Give one focused question at a time."
    ),
    "system_prompt": RISK_ANALYST_PROMPT,
    "tools": [
        describe_schema,
        query_db,
        project_briefing_snapshot,
        project_risk_snapshot,
        search_meeting_transcripts,
        list_recent_meetings,
        recent_activity,
        search_emails,
        search_teams_messages,
        think_tool,
    ],
}

communications_analyst = {
    "name": "communications-analyst",
    "description": (
        "Delegate stakeholder-communication investigation: meeting discussions, Teams threads, "
        "email tone, sentiment. Give one focused question at a time."
    ),
    "system_prompt": COMMUNICATIONS_ANALYST_PROMPT,
    "tools": [
        search_meeting_transcripts,
        list_recent_meetings,
        recent_activity,
        search_unstructured,
        search_emails,
        search_teams_messages,
        think_tool,
    ],
}

ALL_SUBAGENTS = [financial_analyst, schedule_analyst, risk_analyst, communications_analyst]
