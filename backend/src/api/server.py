"""
═══════════════════════════════════════════════════════════════════════════
ALLEATO PM - Construction Project Management Agent
═══════════════════════════════════════════════════════════════════════════

Construction PM domain agent with tools for managing:
- Budgets & Cost Codes
- Change Orders (PCOs, CCOs, OCOs)
- RFIs (Requests for Information)
- Submittals
- Daily Logs
- Contracts & Commitments
- Specifications
- Project Directory

NOTE: This is a scaffold. Each tool returns placeholder responses.
Implement actual Supabase queries in each tool body.
═══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

from pydantic import BaseModel
from typing import Optional, List

from agents import (
    Agent,
    RunContextWrapper,
    Runner,
    TResponseInputItem,
    function_tool,
    handoff,
    GuardrailFunctionOutput,
    input_guardrail,
)
from chatkit.agents import AgentContext
from agents.extensions.handoff_prompt import RECOMMENDED_PROMPT_PREFIX


# =========================
# CONTEXT
# =========================

class ProjectContext(BaseModel):
    """Context for construction PM agent conversations."""
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    user_id: Optional[str] = None
    user_role: Optional[str] = None  # e.g. "owner", "gc", "subcontractor"
    company_id: Optional[str] = None


class ProjectChatContext(AgentContext[dict]):
    """AgentContext wrapper for ChatKit runs."""
    state: ProjectContext


def create_initial_context() -> ProjectContext:
    """Factory for a new ProjectContext."""
    return ProjectContext()


# =========================
# BUDGET & COST TOOLS
# =========================

@function_tool(
    name_override="get_budget_summary",
    description_override="Get a summary of the project budget including original value, approved changes, and current budget."
)
async def get_budget_summary(
    context: RunContextWrapper[ProjectChatContext], project_id: str
) -> str:
    """Fetch budget summary for a project."""
    # TODO: Query supabase for budget data from budgets/budget_line_items tables
    # TODO: Aggregate original_budget_amount, approved_cos, revised_budget
    return f"Budget summary for project {project_id}: [Not yet implemented - wire to Supabase]"


@function_tool(
    name_override="get_cost_codes",
    description_override="List cost codes for a project, optionally filtered by division."
)
async def get_cost_codes(
    context: RunContextWrapper[ProjectChatContext], project_id: str, division: str = ""
) -> str:
    """Fetch cost codes for a project."""
    # TODO: Query cost_codes table filtered by project_id and optional division
    return f"Cost codes for project {project_id}: [Not yet implemented]"


@function_tool(
    name_override="get_direct_costs",
    description_override="Get direct costs for a project with optional date range filtering."
)
async def get_direct_costs(
    context: RunContextWrapper[ProjectChatContext], project_id: str
) -> str:
    """Fetch direct costs entries."""
    # TODO: Query direct_costs table with joins to cost_codes, vendors
    return f"Direct costs for project {project_id}: [Not yet implemented]"


# =========================
# CHANGE ORDER TOOLS
# =========================

@function_tool(
    name_override="list_change_orders",
    description_override="List change orders (PCOs, CCOs, OCOs) for a project."
)
async def list_change_orders(
    context: RunContextWrapper[ProjectChatContext], project_id: str, status: str = ""
) -> str:
    """List change orders with optional status filter."""
    # TODO: Query potential_change_orders, commitment_change_orders, owner_change_orders
    # TODO: Include amounts, status, dates
    return f"Change orders for project {project_id}: [Not yet implemented]"


@function_tool(
    name_override="get_change_order_detail",
    description_override="Get detailed information about a specific change order."
)
async def get_change_order_detail(
    context: RunContextWrapper[ProjectChatContext], change_order_id: str
) -> str:
    """Get details of a specific change order."""
    # TODO: Fetch CO with line items, attachments, approval history
    return f"Change order {change_order_id}: [Not yet implemented]"


# =========================
# RFI TOOLS
# =========================

@function_tool(
    name_override="list_rfis",
    description_override="List RFIs for a project with optional status/assignee filtering."
)
async def list_rfis(
    context: RunContextWrapper[ProjectChatContext], project_id: str, status: str = ""
) -> str:
    """List RFIs for a project."""
    # TODO: Query rfis table with status filter, include assignee, due_date, ball_in_court
    return f"RFIs for project {project_id}: [Not yet implemented]"


@function_tool(
    name_override="create_rfi",
    description_override="Create a new RFI for a project."
)
async def create_rfi(
    context: RunContextWrapper[ProjectChatContext],
    project_id: str,
    subject: str,
    question: str,
    assignee_id: str = "",
) -> str:
    """Create a new RFI."""
    # TODO: Insert into rfis table, auto-assign number, notify assignee
    return f"RFI created in project {project_id}: {subject} [Not yet implemented]"


# =========================
# SUBMITTAL TOOLS
# =========================

@function_tool(
    name_override="list_submittals",
    description_override="List submittals for a project with optional status filtering."
)
async def list_submittals(
    context: RunContextWrapper[ProjectChatContext], project_id: str, status: str = ""
) -> str:
    """List submittals for a project."""
    # TODO: Query submittals table with spec_section, status, due_date
    return f"Submittals for project {project_id}: [Not yet implemented]"


# =========================
# DAILY LOG TOOLS
# =========================

@function_tool(
    name_override="get_daily_log",
    description_override="Get daily log entries for a project on a specific date."
)
async def get_daily_log(
    context: RunContextWrapper[ProjectChatContext], project_id: str, date: str = ""
) -> str:
    """Get daily log for a date (defaults to today)."""
    # TODO: Query daily_logs table, include weather, workforce, notes, safety
    return f"Daily log for project {project_id} on {date or 'today'}: [Not yet implemented]"


# =========================
# CONTRACT TOOLS
# =========================

@function_tool(
    name_override="list_contracts",
    description_override="List contracts and commitments for a project."
)
async def list_contracts(
    context: RunContextWrapper[ProjectChatContext], project_id: str
) -> str:
    """List prime contracts and commitments."""
    # TODO: Query prime_contracts and commitments tables
    return f"Contracts for project {project_id}: [Not yet implemented]"


# =========================
# PROJECT DIRECTORY TOOLS
# =========================

@function_tool(
    name_override="search_directory",
    description_override="Search the project directory for people or companies."
)
async def search_directory(
    context: RunContextWrapper[ProjectChatContext], project_id: str, query: str
) -> str:
    """Search project directory."""
    # TODO: Query project_directory_members, people, companies tables
    return f"Directory search '{query}' in project {project_id}: [Not yet implemented]"


# =========================
# GUARDRAILS
# =========================

class RelevanceOutput(BaseModel):
    reasoning: str
    is_relevant: bool

guardrail_agent = Agent(
    model="gpt-4.1-mini",
    name="Relevance Guardrail",
    instructions=(
        "Determine if the user's message is related to construction project management "
        "(budgets, contracts, change orders, RFIs, submittals, daily logs, schedules, "
        "specifications, drawings, project directory, safety, etc.). "
        "Conversational messages like 'Hi' or 'OK' are fine. "
        "Return is_relevant=True if relevant, else False."
    ),
    output_type=RelevanceOutput,
)

@input_guardrail(name="Relevance Guardrail")
async def relevance_guardrail(
    context: RunContextWrapper[None], agent: Agent, input: str | list[TResponseInputItem]
) -> GuardrailFunctionOutput:
    result = await Runner.run(guardrail_agent, input, context=context.context.state if hasattr(context.context, "state") else context.context)
    final = result.final_output_as(RelevanceOutput)
    return GuardrailFunctionOutput(output_info=final, tripwire_triggered=not final.is_relevant)


# =========================
# AGENTS
# =========================

budget_agent = Agent[ProjectChatContext](
    name="Budget Agent",
    model="gpt-4.1",
    handoff_description="An agent that handles budget inquiries, cost codes, and direct costs.",
    instructions=f"""{RECOMMENDED_PROMPT_PREFIX}
    You are a Budget Agent for a construction project management system.
    Help users with budget summaries, cost code lookups, and direct cost tracking.
    Use available tools to fetch data. If the question is outside your scope, transfer to the triage agent.""",
    tools=[get_budget_summary, get_cost_codes, get_direct_costs],
    input_guardrails=[relevance_guardrail],
)

change_order_agent = Agent[ProjectChatContext](
    name="Change Order Agent",
    model="gpt-4.1",
    handoff_description="An agent that manages change orders (PCOs, CCOs, OCOs).",
    instructions=f"""{RECOMMENDED_PROMPT_PREFIX}
    You are a Change Order Agent. Help users list, review, and understand change orders.
    You handle Potential Change Orders (PCOs), Commitment Change Orders (CCOs), and Owner Change Orders (OCOs).
    Use available tools to fetch data. Transfer to triage for unrelated questions.""",
    tools=[list_change_orders, get_change_order_detail],
    input_guardrails=[relevance_guardrail],
)

rfi_agent = Agent[ProjectChatContext](
    name="RFI Agent",
    model="gpt-4.1",
    handoff_description="An agent that manages Requests for Information (RFIs).",
    instructions=f"""{RECOMMENDED_PROMPT_PREFIX}
    You are an RFI Agent. Help users list, create, and track RFIs.
    Use available tools. Transfer to triage for unrelated questions.""",
    tools=[list_rfis, create_rfi],
    input_guardrails=[relevance_guardrail],
)

submittal_agent = Agent[ProjectChatContext](
    name="Submittal Agent",
    model="gpt-4.1",
    handoff_description="An agent that tracks submittals and their approval status.",
    instructions=f"""{RECOMMENDED_PROMPT_PREFIX}
    You are a Submittal Agent. Help users track submittals, their status, and due dates.
    Transfer to triage for unrelated questions.""",
    tools=[list_submittals],
    input_guardrails=[relevance_guardrail],
)

triage_agent = Agent[ProjectChatContext](
    name="Triage Agent",
    model="gpt-4.1",
    handoff_description="Routes requests to the appropriate construction PM agent.",
    instructions=(
        f"{RECOMMENDED_PROMPT_PREFIX} "
        "You are the Alleato PM assistant for construction project management. "
        "Route questions to the appropriate specialist agent: "
        "Budget Agent for costs/budgets, Change Order Agent for COs, "
        "RFI Agent for RFIs, Submittal Agent for submittals. "
        "For general questions about daily logs, contracts, or directory, use available tools directly."
    ),
    handoffs=[
        budget_agent,
        change_order_agent,
        rfi_agent,
        submittal_agent,
    ],
    tools=[get_daily_log, list_contracts, search_directory],
    input_guardrails=[relevance_guardrail],
)

# Set up handoff back to triage
budget_agent.handoffs.append(triage_agent)
change_order_agent.handoffs.append(triage_agent)
rfi_agent.handoffs.append(triage_agent)
submittal_agent.handoffs.append(triage_agent)
