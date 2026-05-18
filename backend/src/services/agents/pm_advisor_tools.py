"""Render-owned PM advisor tools for backend Deep Agents.

These are the production-backend equivalents of the standalone alleato-ai PM
wrappers. They run inside the FastAPI/Render service and read through the
backend Supabase client instead of depending on the sidecar alleato-ai repo.
"""

from __future__ import annotations

from typing import Any

from supabase import Client


_CLOSED_MARKERS = ("closed", "approved", "void", "rejected", "cancel", "complete")


def _rows(response: Any) -> list[dict[str, Any]]:
    data = getattr(response, "data", None)
    return data if isinstance(data, list) else []


def _num(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _money(value: Any) -> str:
    return f"${_num(value):,.0f}"


def _pct(value: Any) -> str:
    try:
        return f"{float(value):.0f}%"
    except (TypeError, ValueError):
        return "n/a"


def _clean(value: Any, limit: int = 140) -> str:
    if value is None:
        return ""
    text = str(value).replace("\n", " ").replace("|", "\\|").strip()
    return text if len(text) <= limit else text[: limit - 1] + "..."


def _is_open(status: Any) -> bool:
    text = str(status or "").strip().lower()
    return not text or not any(marker in text for marker in _CLOSED_MARKERS)


def _is_overdue(row: dict[str, Any], *fields: str) -> bool:
    for field in fields:
        value = row.get(field)
        if value:
            return str(value)[:10] < _today_iso()
    return False


def _today_iso() -> str:
    from datetime import date

    return date.today().isoformat()


def _project_header(project: dict[str, Any]) -> str:
    return "\n".join(
        [
            f"# {project.get('name') or f'Project {project.get('id')}'}",
            "",
            (
                f"Phase: {_clean(project.get('phase')) or 'n/a'} | "
                f"Health: {_clean(project.get('health_status')) or 'n/a'} "
                f"({_clean(project.get('health_score')) or 'n/a'}) | "
                f"Complete: {_pct(project.get('completion_percentage'))} | "
                f"Est. completion: {_clean(project.get('est completion')) or 'n/a'}"
            ),
        ]
    )


def _project(client: Client, project_id: int) -> dict[str, Any]:
    response = (
        client.table("projects")
        .select(
            'id,name,phase,state,health_score,health_status,completion_percentage,"est completion",summary'
        )
        .eq("id", project_id)
        .limit(1)
        .execute()
    )
    rows = _rows(response)
    if not rows:
        raise ValueError(f"Project {project_id} was not found.")
    return rows[0]


def _budget_rows(client: Client, project_id: int) -> list[dict[str, Any]]:
    return _rows(
        client.table("v_budget_lines")
        .select("original_amount,revised_budget,approved_co_total,budget_mod_total")
        .eq("project_id", project_id)
        .limit(5000)
        .execute()
    )


def _contract_rows(client: Client, project_id: int) -> list[dict[str, Any]]:
    return _rows(
        client.table("prime_contract_financial_summary")
        .select(
            "original_contract_amount,revised_contract_amount,approved_change_orders,"
            "pending_change_orders,invoiced_amount,payments_received,remaining_balance"
        )
        .eq("project_id", project_id)
        .limit(500)
        .execute()
    )


def project_budget_summary(client: Client, project_id: int) -> str:
    """Return true project budget and prime-contract financial context."""

    project = _project(client, project_id)
    budget_rows = _budget_rows(client, project_id)
    contract_rows = _contract_rows(client, project_id)

    original_budget = sum(_num(row.get("original_amount")) for row in budget_rows)
    revised_budget = sum(_num(row.get("revised_budget")) for row in budget_rows)
    budget_delta = revised_budget - original_budget
    budget_growth = (budget_delta / original_budget * 100) if original_budget else 0

    original_contract = sum(_num(row.get("original_contract_amount")) for row in contract_rows)
    revised_contract = sum(_num(row.get("revised_contract_amount")) for row in contract_rows)
    approved_changes = sum(_num(row.get("approved_change_orders")) for row in contract_rows)
    pending_changes = sum(_num(row.get("pending_change_orders")) for row in contract_rows)
    invoiced = sum(_num(row.get("invoiced_amount")) for row in contract_rows)
    paid = sum(_num(row.get("payments_received")) for row in contract_rows)
    remaining = sum(_num(row.get("remaining_balance")) for row in contract_rows)

    return "\n".join(
        [
            _project_header(project),
            "",
            "## Budget",
            f"- Original budget: {_money(original_budget)}",
            f"- Revised budget: {_money(revised_budget)}",
            f"- Budget delta: {_money(budget_delta)} ({budget_growth:.1f}%)",
            f"- Approved budget changes: {_money(sum(_num(row.get('approved_co_total')) for row in budget_rows))}",
            f"- Budget modifications: {_money(sum(_num(row.get('budget_mod_total')) for row in budget_rows))}",
            "",
            "## Prime Contract",
            f"- Original contract: {_money(original_contract)}",
            f"- Revised contract: {_money(revised_contract)}",
            f"- Approved owner change orders: {_money(approved_changes)}",
            f"- Pending owner change orders: {_money(pending_changes)}",
            f"- Invoiced: {_money(invoiced)}",
            f"- Payments received: {_money(paid)}",
            f"- Remaining balance: {_money(remaining)}",
            "",
            "Source: Render backend Supabase reads (`projects`, `v_budget_lines`, `prime_contract_financial_summary`).",
        ]
    )


def _open_items(client: Client, project_id: int) -> dict[str, list[dict[str, Any]]]:
    rfis = _rows(
        client.table("rfis")
        .select("number,subject,status,due_date,ball_in_court,updated_at")
        .eq("project_id", project_id)
        .order("due_date")
        .limit(100)
        .execute()
    )
    submittals = _rows(
        client.table("submittals")
        .select("submittal_number,title,status,final_due_date,required_approval_date,ball_in_court,updated_at")
        .eq("project_id", project_id)
        .order("final_due_date")
        .limit(100)
        .execute()
    )
    schedule = _rows(
        client.table("schedule_tasks")
        .select("name,status,finish_date,assignee,updated_at")
        .eq("project_id", project_id)
        .order("finish_date")
        .limit(200)
        .execute()
    )
    return {
        "rfis": [row for row in rfis if _is_open(row.get("status"))],
        "submittals": [row for row in submittals if _is_open(row.get("status"))],
        "schedule": [row for row in schedule if _is_open(row.get("status"))],
    }


def project_risk_snapshot(client: Client, project_id: int) -> str:
    """Return overdue/open structured project risk context."""

    project = _project(client, project_id)
    items = _open_items(client, project_id)
    overdue_rfis = [row for row in items["rfis"] if _is_overdue(row, "due_date")]
    overdue_submittals = [
        row for row in items["submittals"] if _is_overdue(row, "final_due_date", "required_approval_date")
    ]
    overdue_schedule = [row for row in items["schedule"] if _is_overdue(row, "finish_date")]
    change_events = _rows(
        client.table("change_events")
        .select("number,title,status,updated_at")
        .eq("project_id", project_id)
        .order("updated_at", desc=True)
        .limit(25)
        .execute()
    )

    lines = [
        _project_header(project),
        "",
        "## Risk Counts",
        f"- Overdue RFIs: {len(overdue_rfis)} of {len(items['rfis'])} open",
        f"- Overdue submittals: {len(overdue_submittals)} of {len(items['submittals'])} open",
        f"- Overdue schedule tasks: {len(overdue_schedule)}",
        f"- Recent change events checked: {len(change_events)}",
        "",
    ]
    if overdue_schedule:
        lines.append("## Earliest Overdue Schedule Items")
        for row in overdue_schedule[:5]:
            lines.append(
                f"- {_clean(row.get('name'))} ({_clean(row.get('status'))}; due {row.get('finish_date') or 'n/a'})"
            )
        lines.append("")
    if overdue_rfis:
        lines.append("## Overdue RFIs")
        for row in overdue_rfis[:5]:
            lines.append(
                f"- {row.get('number')}: {_clean(row.get('subject'))} ({_clean(row.get('status'))}; due {row.get('due_date') or 'n/a'})"
            )
        lines.append("")
    if overdue_submittals:
        lines.append("## Overdue Submittals")
        for row in overdue_submittals[:5]:
            lines.append(
                f"- {row.get('submittal_number')}: {_clean(row.get('title'))} ({_clean(row.get('status'))})"
            )
        lines.append("")
    lines.extend(
        [
            "## Recommended Chase List",
            "- Chase overdue schedule/RFI/submittal items before sending an owner-facing update.",
            "- Cross-check pending owner changes before reporting financial exposure.",
            "",
            "Source: Render backend Supabase reads (`projects`, `rfis`, `submittals`, `schedule_tasks`, `change_events`).",
        ]
    )
    return "\n".join(lines)


def project_briefing_snapshot(client: Client, project_id: int) -> str:
    """Return a broad PM/owner briefing from structured project data."""

    project = _project(client, project_id)
    budget = project_budget_summary(client, project_id)
    risk = project_risk_snapshot(client, project_id)
    commitments = _rows(
        client.table("commitments_unified")
        .select("id,title,status,updated_at")
        .eq("project_id", project_id)
        .limit(200)
        .execute()
    )
    docs = _rows(
        client.table("document_metadata")
        .select("title,date,type,category,summary,overview")
        .eq("project_id", project_id)
        .order("date", desc=True)
        .limit(8)
        .execute()
    )
    recent_docs = []
    for row in docs[:5]:
        title = _clean(row.get("title")) or "Untitled document"
        when = _clean(row.get("date"))[:10] if row.get("date") else "unknown date"
        summary = _clean(row.get("summary") or row.get("overview"), 180)
        recent_docs.append(f"- {when}: {title}" + (f" - {summary}" if summary else ""))

    return "\n".join(
        [
            _project_header(project),
            "",
            "## Financial Snapshot",
            *budget.splitlines()[4:18],
            "",
            "## Risk Snapshot",
            *risk.splitlines()[4:12],
            f"- Commitments checked: {len(commitments)}",
            "",
            "## Recent Movement",
            *(recent_docs or ["- No recent document metadata rows returned."]),
            "",
            "Source: Render backend PM advisor tools.",
        ]
    )


def portfolio_overview(client: Client, phase: str = "Current", max_projects: int = 25) -> str:
    """Return portfolio-level project and contract context."""

    max_projects = max(1, min(int(max_projects or 25), 50))
    query = (
        client.table("projects")
        .select("id,name,phase,health_status,health_score,completion_percentage")
        .order("name")
        .limit(max_projects)
    )
    if phase.lower() != "all":
        query = query.eq("phase", phase)
    projects = _rows(query.execute())
    if not projects:
        return f"No projects found for phase `{phase}`."

    lines = [
        f"# Portfolio Overview ({phase})",
        "",
        f"- Projects shown: {len(projects)}",
        "",
        "| Project | Health | Complete |",
        "| --- | --- | ---: |",
    ]
    for project in projects:
        lines.append(
            "| "
            + " | ".join(
                [
                    _clean(project.get("name"), 60),
                    _clean(project.get("health_status") or "n/a"),
                    _pct(project.get("completion_percentage")),
                ]
            )
            + " |"
        )
    lines.append("")
    lines.append("Source: Render backend Supabase reads (`projects`).")
    return "\n".join(lines)
