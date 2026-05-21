"""Sub-agent definitions.

Each sub-agent is a focused investigator with its own context window and tool subset.
The orchestrator delegates to them in parallel and integrates their reports.
"""

from typing import Literal

from pydantic import BaseModel, Field

from .prompts import (
    BUSINESS_DEVELOPMENT_ANALYST_PROMPT,
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


class _SubagentPacket(BaseModel):
    """Structured packet returned by analyst subagents to the orchestrator."""

    findings: list[str] = Field(
        default_factory=list,
        description="Specific facts or observations found by the subagent. No narrative synthesis.",
    )
    citations: list[str] = Field(
        default_factory=list,
        description="Source identifiers supporting the findings, such as table IDs, dates, or tool result labels.",
    )
    confidence: Literal["high", "medium", "low"] = Field(
        description="Confidence based on data freshness, source coverage, and conflicting evidence.",
    )
    open_questions: list[str] = Field(
        default_factory=list,
        description="Specific unresolved gaps the orchestrator should disclose or investigate further.",
    )


class FinancialAnalystPacket(_SubagentPacket):
    """Financial analyst structured output."""


class RiskAnalystPacket(_SubagentPacket):
    """Risk analyst structured output."""


class CommunicationsAnalystPacket(_SubagentPacket):
    """Communications analyst structured output."""

def build_subagents(
    *,
    include_sql: bool = True,
    include_acumatica: bool = True,
) -> list[dict]:
    """Build subagents with the same tool gates as the orchestrator runtime."""

    financial_tools = [
        project_budget_summary,
        portfolio_overview,
        think_tool,
    ]
    if include_sql:
        financial_tools = [describe_schema, query_db, *financial_tools]
    if include_acumatica:
        financial_tools.extend(
            [
                acumatica_ap_aging,
                acumatica_ar_aging,
                acumatica_cash_position,
                acumatica_project_budget,
                acumatica_project_list,
                acumatica_purchase_orders,
                acumatica_recent_bills,
                acumatica_recent_invoices,
                acumatica_vendor_spend,
            ]
        )

    schedule_tools = [
        project_briefing_snapshot,
        project_risk_snapshot,
        search_meeting_transcripts,
        list_recent_meetings,
        recent_activity,
        think_tool,
    ]
    if include_sql:
        schedule_tools = [describe_schema, query_db, *schedule_tools]

    risk_tools = [
        project_briefing_snapshot,
        project_risk_snapshot,
        search_meeting_transcripts,
        list_recent_meetings,
        recent_activity,
        search_emails,
        search_teams_messages,
        think_tool,
    ]
    if include_sql:
        risk_tools = [describe_schema, query_db, *risk_tools]

    communications_tools = [
        search_meeting_transcripts,
        list_recent_meetings,
        recent_activity,
        search_unstructured,
        search_emails,
        search_teams_messages,
        think_tool,
    ]

    business_development_tools = [
        portfolio_overview,
        project_briefing_snapshot,
        list_recent_meetings,
        recent_activity,
        search_unstructured,
        search_emails,
        search_teams_messages,
        search_meeting_transcripts,
        think_tool,
    ]
    if include_sql:
        business_development_tools = [
            describe_schema,
            query_db,
            *business_development_tools,
        ]

    return [
        {
            "name": "financial-analyst",
            "description": (
                "Delegate financial questions: budget vs. actuals, commitments, change orders, "
                "pay applications, cash position, Acumatica data. Give one focused question at a time."
            ),
            "system_prompt": FINANCIAL_ANALYST_PROMPT,
            "tools": financial_tools,
            "response_format": FinancialAnalystPacket,
        },
        {
            "name": "schedule-analyst",
            "description": (
                "Delegate schedule questions: status vs. baseline, float, critical path, milestones, "
                "delays. Give one focused question at a time."
            ),
            "system_prompt": SCHEDULE_ANALYST_PROMPT,
            "tools": schedule_tools,
        },
        {
            "name": "risk-analyst",
            "description": (
                "Delegate risk-surfacing: aged RFIs, late submittals, unanswered communications, "
                "approaching deadlines, contractual exposure. Give one focused question at a time."
            ),
            "system_prompt": RISK_ANALYST_PROMPT,
            "tools": risk_tools,
            "response_format": RiskAnalystPacket,
        },
        {
            "name": "communications-analyst",
            "description": (
                "Delegate stakeholder-communication investigation: meeting discussions, Teams threads, "
                "email tone, sentiment. Give one focused question at a time."
            ),
            "system_prompt": COMMUNICATIONS_ANALYST_PROMPT,
            "tools": communications_tools,
            "response_format": CommunicationsAnalystPacket,
        },
        {
            "name": "business-development-analyst",
            "description": (
                "Delegate pipeline and client-development questions: pursuits, estimating handoffs, "
                "proposal or quote follow-up, client relationship risk, and stuck deals. "
                "Give one focused question at a time."
            ),
            "system_prompt": BUSINESS_DEVELOPMENT_ANALYST_PROMPT,
            "tools": business_development_tools,
        },
    ]


ALL_SUBAGENTS = build_subagents(include_sql=True, include_acumatica=True)
