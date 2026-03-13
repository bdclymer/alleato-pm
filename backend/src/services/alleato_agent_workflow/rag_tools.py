"""RAG Tools for Alleato Agent Workflow.

This module provides the actual data access tools that agents need to retrieve
and interact with company data stored in Supabase. These tools bridge the gap
between the agent's reasoning capabilities and the underlying data layer.
"""

from __future__ import annotations

import os
import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from dataclasses import dataclass

from agents import function_tool, RunContextWrapper

# Import from parent directory
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from supabase_helpers import SupabaseRagStore, get_supabase_client

# Import project assignment and classification modules
from .tools.project_assignment import ProjectAssigner, batch_assign_projects
try:
    from project_classifier import SegmentProjectClassifier, get_active_projects_for_classification
except ImportError:
    # project_classifier might not exist yet
    SegmentProjectClassifier = None
    get_active_projects_for_classification = None

# Optional OpenAI for embeddings
try:
    from openai import OpenAI
    _openai_client = OpenAI() if os.getenv("OPENAI_API_KEY") else None
except ImportError:
    _openai_client = None

# Lazy-initialized classifiers
_project_assigner: Optional[ProjectAssigner] = None
_segment_classifier: Optional[SegmentProjectClassifier] = None


def _get_project_assigner() -> ProjectAssigner:
    """Get or create the project assigner instance."""
    global _project_assigner
    if _project_assigner is None:
        client = get_supabase_client()
        _project_assigner = ProjectAssigner(client)
    return _project_assigner


def _get_segment_classifier() -> SegmentProjectClassifier:
    """Get or create the segment classifier instance."""
    global _segment_classifier
    if _segment_classifier is None:
        _segment_classifier = SegmentProjectClassifier(_openai_client)
    return _segment_classifier


def _get_embedding(text: str, model: str = "text-embedding-3-small") -> List[float]:
    """Generate embedding for text using OpenAI."""
    if _openai_client is None:
        return []
    response = _openai_client.embeddings.create(model=model, input=[text])
    return response.data[0].embedding


def _format_chunks_for_context(chunks: List[Dict[str, Any]]) -> str:
    """Format retrieved chunks into readable context for the agent."""
    if not chunks:
        return "No relevant meeting data found."

    formatted_parts = []
    for i, chunk in enumerate(chunks, 1):
        metadata = chunk.get("metadata", {})
        doc_title = metadata.get("title", metadata.get("document_title", "Unknown Meeting"))
        meeting_date = metadata.get("captured_at", metadata.get("date", "Unknown date"))
        project_name = metadata.get("project_name", "")
        text = chunk.get("text", "")

        header = f"**Source {i}: {doc_title}**"
        if project_name:
            header += f" (Project: {project_name})"
        if meeting_date:
            header += f" | Date: {meeting_date}"

        formatted_parts.append(f"{header}\n{text}\n")

    return "\n---\n".join(formatted_parts)


def _format_tasks_for_context(tasks: List[Dict[str, Any]]) -> str:
    """Format tasks into readable context.

    Reads from the unified ``tasks`` table which uses ``description``,
    ``assignee_name``, ``priority``, and ``status`` columns.
    """
    if not tasks:
        return "No tasks found."

    formatted = []
    for task in tasks:
        status = task.get("status", "unknown")
        description = task.get("description", "Untitled task")
        assignee = task.get("assignee_name", "Unassigned")
        due_date = task.get("due_date", "No due date")
        priority = task.get("priority", "medium")

        formatted.append(f"- [{status.upper()}] {description} | Owner: {assignee} | Due: {due_date} | Priority: {priority}")

    return "\n".join(formatted)


def _format_insights_for_context(insights: List[Dict[str, Any]]) -> str:
    """Format insights into readable context."""
    if not insights:
        return "No insights found."

    formatted = []
    for insight in insights:
        insight_type = insight.get("insight_type", "general")
        content = insight.get("content", insight.get("insight", ""))
        captured_at = insight.get("captured_at", "")

        formatted.append(f"- **{insight_type.upper()}**: {content}")
        if captured_at:
            formatted.append(f"  (Captured: {captured_at})")

    return "\n".join(formatted)


def _format_meetings_for_context(meetings: List[Dict[str, Any]]) -> str:
    """Format meeting metadata into readable context."""
    if not meetings:
        return "No meetings found."

    formatted = []
    for meeting in meetings:
        title = meeting.get("title", "Untitled Meeting")
        created_at = meeting.get("created_at", "Unknown date")
        participants = meeting.get("participants", [])
        project_id = meeting.get("project_id", "")

        participant_str = ", ".join(participants) if participants else "No participants listed"
        formatted.append(f"- **{title}** ({created_at})\n  Participants: {participant_str}")
        if project_id:
            formatted.append(f"  Project ID: {project_id}")

    return "\n".join(formatted)


# =============================================================================
# RAG TOOLS
# =============================================================================

@function_tool
def company_rag_search(
    query: str,
    project_id: Optional[int] = None,
    use_vector_search: bool = True,
    limit: int = 10
) -> str:
    """
    Search company meetings, documents, and knowledge base for relevant information.

    This tool searches across all ingested meeting transcripts, documents, and
    company knowledge to find information relevant to the query.

    Args:
        query: The search query - can be a question, topic, or keywords
        project_id: Optional project ID to filter results to a specific project
        use_vector_search: Whether to use semantic vector search (recommended for natural language queries)
        limit: Maximum number of results to return

    Returns:
        Formatted context from relevant documents and meetings
    """
    store = SupabaseRagStore()
    chunks = []

    # Try vector search first if enabled and embeddings available
    if use_vector_search and _openai_client is not None:
        try:
            query_embedding = _get_embedding(query)
            if query_embedding:
                chunks = store.vector_search(query_embedding, limit=limit)
                # Filter by project if specified
                if project_id is not None and chunks:
                    chunks = [c for c in chunks if c.get("metadata", {}).get("project_id") == str(project_id)]
        except Exception as e:
            print(f"Vector search failed, falling back to keyword search: {e}")

    # Fall back to keyword search if vector search returned nothing
    if not chunks:
        # Extract key terms from query for keyword search
        keywords = [w for w in query.split() if len(w) >= 4]
        for keyword in keywords[:3]:  # Try first 3 significant keywords
            keyword_chunks = store.search_chunks_by_keyword(
                keyword,
                project_id=project_id,
                limit=limit
            )
            chunks.extend(keyword_chunks)
            if len(chunks) >= limit:
                break

        # Deduplicate by chunk_id
        seen = set()
        unique_chunks = []
        for chunk in chunks:
            chunk_id = chunk.get("chunk_id", chunk.get("document_id", ""))
            if chunk_id not in seen:
                seen.add(chunk_id)
                unique_chunks.append(chunk)
        chunks = unique_chunks[:limit]

    # If still no results, get recent chunks
    if not chunks:
        chunks = store.fetch_recent_chunks(project_id=project_id, limit=limit)

    return _format_chunks_for_context(chunks)


@function_tool
def structured_analytics_query(
    project_id: Optional[int] = None,
    include_tasks: bool = True,
    include_insights: bool = True,
    include_meetings: bool = True,
    task_status: Optional[str] = None,
    limit: int = 20
) -> str:
    """
    Query structured data including tasks, insights, decisions, and risks across projects.

    Use this tool to get structured organizational data like:
    - Open/completed tasks and their owners
    - Project insights and patterns
    - Recent meeting activity
    - Decisions and risks tracked

    Args:
        project_id: Optional project ID to filter results
        include_tasks: Include task data in results
        include_insights: Include project insights in results
        include_meetings: Include recent meeting metadata
        task_status: Filter tasks by status (e.g., "open", "completed", "in_progress")
        limit: Maximum items per category

    Returns:
        Formatted structured data from the organization
    """
    store = SupabaseRagStore()
    results = []

    # Get tasks
    if include_tasks:
        tasks = store.list_tasks(project_id=project_id, status=task_status, limit=limit)
        results.append("## Tasks\n" + _format_tasks_for_context(tasks))

    # Get insights
    if include_insights:
        insights = store.list_insights(project_id=project_id, limit=limit)
        results.append("## Insights & Patterns\n" + _format_insights_for_context(insights))

    # Get recent meeting metadata
    if include_meetings:
        try:
            client = get_supabase_client()
            query = client.table("document_metadata").select("*").order("created_at", desc=True).limit(limit)
            if project_id is not None:
                query = query.eq("project_id", project_id)
            response = query.execute()
            meetings = response.data or []
            results.append("## Recent Meetings\n" + _format_meetings_for_context(meetings))
        except Exception as e:
            results.append(f"## Recent Meetings\nError fetching meetings: {e}")

    # Get project summary if project_id specified
    if project_id is not None:
        project = store.get_project(project_id)
        if project:
            results.insert(0, f"## Project Overview\n**{project.get('project_name', 'Unknown')}**\n" +
                          f"- Total Meetings: {project.get('meeting_count', 0)}\n" +
                          f"- Open Tasks: {project.get('open_task_count', 0)}\n" +
                          f"- Total Insights: {project.get('insight_count', 0)}")

    return "\n\n".join(results)


@function_tool
def get_recent_meetings(
    project_id: Optional[int] = None,
    limit: int = 10
) -> str:
    """
    Get a list of recent meetings with their key details.

    Args:
        project_id: Optional project ID to filter to specific project
        limit: Maximum number of meetings to return

    Returns:
        Formatted list of recent meetings with dates, participants, and summaries
    """
    store = SupabaseRagStore()

    try:
        client = get_supabase_client()
        query = client.table("document_metadata").select("*").order("created_at", desc=True).limit(limit)
        if project_id is not None:
            query = query.eq("project_id", project_id)
        response = query.execute()
        meetings = response.data or []

        if not meetings:
            return "No meetings found in the system."

        # Format meeting summaries
        formatted = ["# Recent Meetings\n"]
        for meeting in meetings:
            title = meeting.get("title", "Untitled Meeting")
            created_at = meeting.get("created_at", "Unknown date")
            participants = meeting.get("participants", [])
            fireflies_id = meeting.get("fireflies_id", "")

            formatted.append(f"### {title}")
            formatted.append(f"**Date:** {created_at}")
            if participants:
                formatted.append(f"**Participants:** {', '.join(participants)}")

            # Try to get the overview/summary chunk for this meeting
            doc_id = meeting.get("id")
            if doc_id:
                chunks = store.query_chunks({"document_id": doc_id}, limit=1)
                if chunks:
                    summary_text = chunks[0].get("text", "")[:500]
                    if summary_text:
                        formatted.append(f"**Summary:** {summary_text}...")

            formatted.append("")  # Empty line between meetings

        return "\n".join(formatted)

    except Exception as e:
        return f"Error fetching meetings: {str(e)}"


@function_tool
def task_writer(
    description: str,
    assignee_name: Optional[str] = None,
    due_date: Optional[str] = None,
    priority: str = "medium",
    project_id: Optional[int] = None,
    source_meeting_id: Optional[str] = None
) -> str:
    """
    Create or update a task in the unified tasks table.

    Use this tool to create actionable tasks from strategic recommendations,
    meeting follow-ups, or identified action items.

    Args:
        description: What needs to be done (concise but complete)
        assignee_name: Person responsible for the task
        due_date: Due date in YYYY-MM-DD format
        priority: Priority level (low, medium, high, urgent)
        project_id: Project this task belongs to
        source_meeting_id: Meeting/document ID where this task was identified

    Returns:
        Confirmation of task creation with task details
    """
    store = SupabaseRagStore()

    # Map priority values to tasks table CHECK constraint (low/medium/high/urgent)
    priority_map = {"normal": "medium", "critical": "urgent"}
    mapped_priority = priority_map.get(priority, priority)

    task: Dict[str, Any] = {
        "description": description,
        "assignee_name": assignee_name,
        "due_date": due_date,
        "priority": mapped_priority,
        "status": "open",
        "source_system": "assistant",
        "metadata_id": source_meeting_id,
    }

    if project_id is not None:
        task["project_ids"] = [project_id]

    try:
        store.upsert_task(task)
        return f"✓ Task created successfully:\n" \
               f"  Description: {description}\n" \
               f"  Owner: {assignee_name or 'Unassigned'}\n" \
               f"  Due: {due_date or 'Not set'}\n" \
               f"  Priority: {mapped_priority}"
    except Exception as e:
        return f"Error creating task: {str(e)}"


@function_tool
def list_projects() -> str:
    """
    List all projects in the system with their activity summary.

    Returns:
        Formatted list of all projects with meeting counts, task counts, etc.
    """
    store = SupabaseRagStore()

    try:
        projects = store.list_projects()

        if not projects:
            return "No projects found in the system."

        formatted = ["# All Projects\n"]
        for project in projects:
            name = project.get("project_name", f"Project {project.get('project_id', 'Unknown')}")
            meeting_count = project.get("meeting_count", 0)
            task_count = project.get("open_task_count", 0)
            insight_count = project.get("insight_count", 0)

            formatted.append(f"### {name}")
            formatted.append(f"- Meetings: {meeting_count}")
            formatted.append(f"- Open Tasks: {task_count}")
            formatted.append(f"- Insights: {insight_count}")
            formatted.append("")

        return "\n".join(formatted)

    except Exception as e:
        return f"Error listing projects: {str(e)}"


@function_tool
def get_project_profile(project_name: str) -> str:
    """
    Resolve a project by name and return grounded project details.

    Behavior:
    - No match: returns a clear "not found" message.
    - Multiple matches: returns candidate list for disambiguation (no synthesis).
    - Single match: returns deterministic fields only (no inferred metrics).
    """
    client = get_supabase_client()

    if not project_name or not project_name.strip():
        return "Project name is required."

    q = project_name.strip()
    try:
        projects_resp = (
            client.table("projects")
            .select("id, name, state, current_phase, budget, budget_used")
            .ilike("name", f"%{q}%")
            .order("name")
            .limit(12)
            .execute()
        )
        matches = projects_resp.data or []

        if not matches:
            return f"No projects found matching '{q}'. Try a more specific name."

        if len(matches) > 1:
            lines = [f"Multiple project matches found for '{q}'. Please choose one:"]
            for p in matches:
                lines.append(f"- {p.get('name', 'Unknown')} (ID: {p.get('id')})")
            return "\n".join(lines)

        project = matches[0]
        project_id = project.get("id")

        contracts_total = (
            client.table("contracts")
            .select("original_contract_amount")
            .eq("project_id", project_id)
            .execute()
        ).data or []
        contract_amount = sum(float(c.get("original_contract_amount") or 0) for c in contracts_total)

        change_events = (
            client.table("change_events")
            .select("id, status", count="exact")
            .eq("project_id", project_id)
            .execute()
        )
        ce_rows = change_events.data or []
        ce_total = change_events.count or len(ce_rows)
        ce_open = sum(
            1
            for r in ce_rows
            if str(r.get("status") or "").lower() not in {"closed", "complete", "completed", "approved"}
        )

        change_orders = (
            client.table("change_orders")
            .select("amount, status", count="exact")
            .eq("project_id", project_id)
            .execute()
        )
        co_rows = change_orders.data or []
        co_total = change_orders.count or len(co_rows)
        co_amount = sum(float(r.get("amount") or 0) for r in co_rows)
        co_pending_amount = sum(
            float(r.get("amount") or 0)
            for r in co_rows
            if str(r.get("status") or "").lower() in {"pending", "draft", "under_review", "submitted"}
        )

        lines = [
            f"Project: {project.get('name', 'Unknown')} (ID: {project_id})",
            f"Status: {project.get('state') or 'unknown'}",
            f"Phase: {project.get('current_phase') or 'unknown'}",
            f"Budget: {project.get('budget') if project.get('budget') is not None else 'not available'}",
            f"Budget Used: {project.get('budget_used') if project.get('budget_used') is not None else 'not available'}",
            f"Total Contract Amount: {contract_amount:.2f}",
            f"Change Events: {ce_total} (open: {ce_open})",
            f"Change Orders: {co_total} (amount total: {co_amount:.2f}, pending amount: {co_pending_amount:.2f})",
            "Data note: Values above are direct database fields only; no inferred margin/loss is computed here.",
        ]
        return "\n".join(lines)
    except Exception as e:
        return f"Error resolving project profile for '{q}': {str(e)}"


@function_tool
def assign_meeting_to_project(
    meeting_id: str,
    meeting_title: str,
    participants: Optional[List[str]] = None,
    content_preview: Optional[str] = None
) -> str:
    """
    Automatically assign a meeting to the most appropriate project based on title, participants, and content.

    This tool uses intelligent matching to determine which project a meeting belongs to based on:
    1. Project/client name appearing in the meeting title (highest confidence)
    2. Participant email domains matching project associations
    3. Content keywords and context matching project scope

    Args:
        meeting_id: The ID of the meeting/document to assign
        meeting_title: Title of the meeting
        participants: List of participant names or emails
        content_preview: Optional first portion of meeting content for context-based matching

    Returns:
        Assignment result with project ID, method used, and confidence score
    """
    assigner = _get_project_assigner()

    project_id, method, confidence = assigner.assign_project(
        meeting_title=meeting_title,
        participants=participants or [],
        content=content_preview,
        existing_project_id=None
    )

    if project_id is None:
        return f"Could not confidently assign meeting '{meeting_title}' to any project.\n" \
               f"Method attempted: {method}\n" \
               f"Confidence: {confidence:.2%}\n" \
               f"Consider manually assigning this meeting or adding more project keywords."

    # Update the meeting's project_id in the database
    try:
        client = get_supabase_client()
        client.table("document_metadata").update({
            "project_id": project_id
        }).eq("id", meeting_id).execute()

        # Get project name for the response
        project_response = client.table("projects").select("name").eq("id", project_id).single().execute()
        project_name = project_response.data.get("name", f"Project {project_id}") if project_response.data else f"Project {project_id}"

        return f"✓ Meeting assigned successfully:\n" \
               f"  Meeting: {meeting_title}\n" \
               f"  Project: {project_name} (ID: {project_id})\n" \
               f"  Method: {method}\n" \
               f"  Confidence: {confidence:.2%}"
    except Exception as e:
        return f"Project {project_id} identified ({method}, {confidence:.2%}) but failed to update database: {str(e)}"


@function_tool
def classify_segment_projects(
    segment_title: str,
    segment_summary: str,
    segment_text: str,
    meeting_title: Optional[str] = None
) -> str:
    """
    Classify which project(s) a meeting segment discusses.

    This is especially useful for internal meetings (executive, operations, accounting weekly)
    where multiple projects are often discussed in a single meeting. The classifier determines:
    - Which projects are mentioned in the segment
    - Which project is the primary focus (if any)
    - Whether the discussion is company-wide vs project-specific

    Args:
        segment_title: Title of the segment (e.g., "ASRS coordination discussion")
        segment_summary: Summary bullets from the meeting
        segment_text: Full text of the segment to analyze
        meeting_title: Title of the parent meeting for additional context

    Returns:
        Classification result with project IDs, primary project, scope, and reasoning
    """
    classifier = _get_segment_classifier()
    client = get_supabase_client()

    # Get active projects for classification
    available_projects = get_active_projects_for_classification(client)

    if not available_projects:
        return "No projects found in the system. Cannot classify segment."

    result = classifier.classify_segment(
        segment_title=segment_title,
        segment_summary=segment_summary,
        segment_text=segment_text,
        available_projects=available_projects,
        meeting_title=meeting_title or ""
    )

    # Format the result
    project_ids = result.get("project_ids", [])
    primary_id = result.get("primary_project_id")
    confidence = result.get("confidence", 0)
    reasoning = result.get("reasoning", "")
    scope = result.get("scope", "unknown")

    # Get project names
    project_names = []
    primary_name = None
    for p in available_projects:
        if p["id"] in project_ids:
            project_names.append(f"{p['name']} (ID: {p['id']})")
            if p["id"] == primary_id:
                primary_name = p["name"]

    if scope == "company_wide":
        return f"## Segment Classification: Company-Wide Discussion\n\n" \
               f"This segment discusses company-wide topics rather than specific projects.\n\n" \
               f"**Confidence:** {confidence:.2%}\n" \
               f"**Reasoning:** {reasoning}"

    result_text = f"## Segment Classification Results\n\n" \
                  f"**Scope:** {scope.replace('_', ' ').title()}\n" \
                  f"**Confidence:** {confidence:.2%}\n\n"

    if project_names:
        result_text += f"**Projects Discussed:**\n"
        for pn in project_names:
            result_text += f"- {pn}\n"

    if primary_name:
        result_text += f"\n**Primary Focus:** {primary_name}\n"

    result_text += f"\n**Reasoning:** {reasoning}"

    return result_text


@function_tool
def batch_assign_unassigned_meetings(
    limit: int = 50,
    min_confidence: float = 0.7
) -> str:
    """
    Process all meetings without project assignments and attempt to auto-assign them.

    This is a batch operation that finds all meetings with null project_id and uses
    intelligent matching to assign them to appropriate projects based on:
    - Meeting titles containing project/client names
    - Participant email domains
    - Meeting content keywords

    Args:
        limit: Maximum number of meetings to process (default 50)
        min_confidence: Minimum confidence threshold for assignments (0.0-1.0, default 0.7)

    Returns:
        Summary of assignment results including counts and methods used
    """
    client = get_supabase_client()

    stats = batch_assign_projects(client, limit=limit, min_confidence=min_confidence)

    result = f"## Batch Project Assignment Results\n\n" \
             f"**Total Processed:** {stats['total']}\n" \
             f"**Successfully Assigned:** {stats['assigned']}\n" \
             f"**Skipped (Low Confidence):** {stats['skipped_low_confidence']}\n" \
             f"**Failed:** {stats['failed']}\n\n"

    if stats['methods']:
        result += "**Assignment Methods Used:**\n"
        for method, count in stats['methods'].items():
            result += f"- {method}: {count}\n"

    if stats['assigned'] == 0 and stats['total'] > 0:
        result += "\n⚠️ No confident assignments could be made. Consider:\n" \
                  "- Adding more project keywords\n" \
                  "- Lowering the confidence threshold\n" \
                  "- Manually assigning edge cases"

    return result


@function_tool
def get_meeting_category(
    meeting_title: str,
    participants: Optional[List[str]] = None,
    project_id: Optional[int] = None
) -> str:
    """
    Classify the category of a meeting to understand its nature.

    Categories include:
    - project_specific: Focused on a single project (client meetings, kickoffs, status updates)
    - executive_weekly: Leadership/executive team meetings
    - operations_weekly: Operations team regular meetings
    - accounting_weekly: Finance/accounting team meetings
    - cross_project: Meetings covering multiple projects or company-wide topics

    Args:
        meeting_title: Title of the meeting
        participants: List of participant names/emails
        project_id: Existing project_id if already assigned

    Returns:
        Meeting category with description
    """
    classifier = _get_segment_classifier()

    category = classifier.classify_meeting_category(
        meeting_title=meeting_title,
        participants=participants or [],
        project_id=project_id
    )

    category_descriptions = {
        "project_specific": "Project-Specific Meeting - Focused on a single project with client or team",
        "executive_weekly": "Executive Weekly - Leadership team meeting covering high-level strategy",
        "operations_weekly": "Operations Weekly - Operations team meeting covering execution and logistics",
        "accounting_weekly": "Accounting Weekly - Finance/accounting team meeting",
        "cross_project": "Cross-Project Meeting - Covers multiple projects or company-wide topics"
    }

    description = category_descriptions.get(category, f"Unknown category: {category}")

    return f"**Meeting Category:** {category}\n\n{description}"


# Export all tools
__all__ = [
    "company_rag_search",
    "structured_analytics_query",
    "get_recent_meetings",
    "task_writer",
    "list_projects",
    "assign_meeting_to_project",
    "classify_segment_projects",
    "batch_assign_unassigned_meetings",
    "get_meeting_category",
]
