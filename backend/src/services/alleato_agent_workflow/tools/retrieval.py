"""
===============================================================================
STANDARD RETRIEVAL TOOLS - Direct Database Queries (Non-Vector)
===============================================================================

ROLE: Provides direct database access for structured data (no semantic search)

CONTROLS:
- get_recent_meetings() -> Fetch latest meetings chronologically from document_metadata
- get_tasks_and_decisions() -> List tasks table with status/project filters
- get_project_insights() -> Aggregate view of risks/decisions/opportunities per project
- list_all_projects() -> Full project list with basic stats
- get_project_details() -> Detailed single project view with counts

QUERY STRATEGY: Simple SQL queries ordered by date/name, no embeddings

RETURNS: Formatted strings with:
- Meeting summaries with participants and dates
- Task lists with assignees, due dates, priorities
- Project overviews with risks/decisions/opportunities grouped
- Project statistics (task count, risk count, etc.)

USED BY:
- project_agent (gets project context and recent activity)
- strategist_agent (pulls structured project data)
- Complements vector_search.py for hybrid retrieval

DATABASE TABLES QUERIED:
- document_metadata (meetings)
- tasks
- projects
- insights (decisions, risks, opportunities — unified table with type column)

===============================================================================
"""

import os
from functools import lru_cache
from typing import Optional
from agents import function_tool
from supabase import create_client, Client


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """Get cached Supabase client."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    return create_client(url, key)


@function_tool
async def get_recent_meetings(limit: int = 10, project_id: Optional[int] = None) -> str:
    """
    Fetch the most recent meetings chronologically.

    Args:
        limit: Maximum number of meetings to return (default: 10)
        project_id: Optional project ID to filter results

    Returns:
        Formatted string with recent meeting information
    """
    try:
        supabase = get_supabase_client()

        # Order by created_at since 'date' field is often null
        # Include both date and created_at for display purposes
        query = supabase.table('document_metadata').select(
            'id, title, date, created_at, participants, summary, project_id'
        ).order('created_at', desc=True).limit(limit)

        if project_id:
            query = query.eq('project_id', project_id)

        result = query.execute()

        if not result.data:
            return "No meetings found."

        output = []
        for item in result.data:
            # Prefer 'date' field if populated, otherwise use created_at
            date = item.get('date') or item.get('created_at', 'Unknown date')
            # Format date nicely (just the date part)
            if date and isinstance(date, str) and 'T' in date:
                date = date.split('T')[0]
            title = item.get('title', 'Untitled Meeting')
            output.append(f"**{title}** - {date}")

            participants = item.get('participants', [])
            if participants:
                output.append(f"  Participants: {', '.join(participants[:5])}")
                if len(participants) > 5:
                    output.append(f"    ... and {len(participants) - 5} more")

            if item.get('summary'):
                summary = item['summary'][:200] + "..." if len(item['summary']) > 200 else item['summary']
                output.append(f"  Summary: {summary}")
            output.append("")

        return "\n".join(output)
    except Exception as e:
        return f"Error fetching recent meetings: {str(e)}"


@function_tool
async def get_tasks_and_decisions(
    status: Optional[str] = None,
    project_id: Optional[int] = None,
    limit: int = 20
) -> str:
    """
    List tasks with optional filters.

    Args:
        status: Optional status filter (e.g., 'open', 'completed', 'in_progress')
        project_id: Optional project ID to filter results
        limit: Maximum number of tasks to return (default: 20)

    Returns:
        Formatted string with task information
    """
    try:
        supabase = get_supabase_client()

        query = supabase.table('tasks').select(
            'id, description, assignee_name, due_date, status, priority, project_ids, created_at'
        ).order('created_at', desc=True).limit(limit)

        if status:
            query = query.eq('status', status)

        if project_id:
            query = query.contains('project_ids', [project_id])

        result = query.execute()

        if not result.data:
            return "No tasks found."

        output = []
        for item in result.data:
            status_str = item.get('status', 'unknown')
            priority = item.get('priority', '')
            priority_str = f" [{priority}]" if priority else ""

            output.append(f"**Task{priority_str}** - {status_str}")
            output.append(f"  {item.get('description', 'No description')}")

            if item.get('assignee_name'):
                output.append(f"  Assignee: {item['assignee_name']}")
            if item.get('due_date'):
                output.append(f"  Due: {item['due_date']}")
            output.append("")

        return "\n".join(output)
    except Exception as e:
        return f"Error fetching tasks: {str(e)}"


@function_tool
async def get_project_insights(project_id: int, limit: int = 10) -> str:
    """
    Get strategic insights for a specific project.

    Args:
        project_id: The project ID to get insights for
        limit: Maximum number of items per category (default: 10)

    Returns:
        Formatted string with project insights including risks, decisions, and opportunities
    """
    try:
        supabase = get_supabase_client()
        output = []

        # Get project info
        project_result = supabase.table('projects').select(
            'id, name, state, client'
        ).eq('id', project_id).single().execute()

        if project_result.data:
            project = project_result.data
            output.append(f"# Project: {project.get('name', 'Unknown')}")
            if project.get('client'):
                output.append(f"Client: {project['client']}")
            if project.get('state'):
                output.append(f"Status: {project['state']}")
            output.append("")

        # Get recent risks from insights table
        risks_result = supabase.table('insights').select(
            'description, details, status, owner_name'
        ).eq('type', 'risk').eq('project_id', project_id).limit(limit).execute()

        if risks_result.data:
            output.append(f"## Risks ({len(risks_result.data)})")
            for risk in risks_result.data:
                details = risk.get('details', {}) or {}
                output.append(f"- [{risk.get('status', 'unknown')}] {risk.get('description', 'N/A')}")
                if details.get('likelihood') and details.get('impact'):
                    output.append(f"  Likelihood: {details['likelihood']}, Impact: {details['impact']}")
            output.append("")

        # Get recent decisions from insights table
        decisions_result = supabase.table('insights').select(
            'description, details, status, owner_name'
        ).eq('type', 'decision').eq('project_id', project_id).limit(limit).execute()

        if decisions_result.data:
            output.append(f"## Decisions ({len(decisions_result.data)})")
            for decision in decisions_result.data:
                details = decision.get('details', {}) or {}
                output.append(f"- [{decision.get('status', 'unknown')}] {decision.get('description', 'N/A')}")
                if decision.get('owner_name'):
                    output.append(f"  Owner: {decision['owner_name']}")
            output.append("")

        # Get opportunities from insights table
        opps_result = supabase.table('insights').select(
            'description, details, status, owner_name'
        ).eq('type', 'opportunity').eq('project_id', project_id).limit(limit).execute()

        if opps_result.data:
            output.append(f"## Opportunities ({len(opps_result.data)})")
            for opp in opps_result.data:
                details = opp.get('details', {}) or {}
                output.append(f"- [{opp.get('status', 'unknown')}] {opp.get('description', 'N/A')}")
                if details.get('next_step'):
                    output.append(f"  Next step: {details['next_step']}")
            output.append("")

        if not output:
            return f"No insights found for project {project_id}"

        return "\n".join(output)
    except Exception as e:
        return f"Error fetching project insights: {str(e)}"


@function_tool
async def list_all_projects() -> str:
    """
    List all projects with basic stats.

    Returns:
        Formatted string with all projects and their statistics
    """
    try:
        supabase = get_supabase_client()

        result = supabase.table('projects').select(
            'id, name, state, client, created_at'
        ).order('name').execute()

        if not result.data:
            return "No projects found."

        output = ["# All Projects\n"]
        for project in result.data:
            state = project.get('state', 'unknown')
            name = project.get('name', 'Unnamed')
            client = project.get('client', '')

            output.append(f"**{name}** (ID: {project['id']})")
            output.append(f"  Status: {state}")
            if client:
                output.append(f"  Client: {client}")
            output.append("")

        return "\n".join(output)
    except Exception as e:
        return f"Error listing projects: {str(e)}"


@function_tool
async def get_project_details(project_id: int) -> str:
    """
    Get detailed information about a specific project.

    Args:
        project_id: The project ID to get details for

    Returns:
        Formatted string with comprehensive project details
    """
    try:
        supabase = get_supabase_client()

        # Get project info
        project_result = supabase.table('projects').select('*').eq('id', project_id).single().execute()

        if not project_result.data:
            return f"Project {project_id} not found."

        project = project_result.data
        output = []

        output.append(f"# {project.get('name', 'Unknown Project')}")
        output.append(f"ID: {project_id}")
        output.append(f"Status: {project.get('state', 'unknown')}")

        if project.get('client'):
            output.append(f"Client: {project['client']}")
        if project.get('start_date'):
            output.append(f"Start Date: {project['start_date']}")
        if project.get('end_date'):
            output.append(f"End Date: {project['end_date']}")

        # Count related items
        tasks_count = supabase.table('tasks').select('id', count='exact').contains('project_ids', [project_id]).execute()

        # Count insights by type using the unified insights table
        risks_count = supabase.table('insights').select('id', count='exact').eq('type', 'risk').eq('project_id', project_id).execute()
        decisions_count = supabase.table('insights').select('id', count='exact').eq('type', 'decision').eq('project_id', project_id).execute()
        meetings_count = supabase.table('document_metadata').select('id', count='exact').eq('project_id', project_id).execute()

        output.append("\n## Statistics")
        output.append(f"- Tasks: {tasks_count.count or 0}")
        output.append(f"- Risks: {risks_count.count or 0}")
        output.append(f"- Decisions: {decisions_count.count or 0}")
        output.append(f"- Meetings: {meetings_count.count or 0}")

        return "\n".join(output)
    except Exception as e:
        return f"Error fetching project details: {str(e)}"
