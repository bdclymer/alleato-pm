"""
Tools package for Alleato Agent Workflow.

This package contains tool definitions:
- MCP connections (Supabase, Linear)
- Web search
- Vector search tools (semantic search)
- Standard retrieval tools (direct queries)
"""

from .mcp import mcp, mcp1, linear_mcp, web_search_preview
from .vector_search import (
    search_meetings,
    search_emails,
    search_teams_messages,
    search_documents,
    search_decisions,
    search_risks,
    search_opportunities,
    search_all_knowledge,
    get_supabase_client
)
from .retrieval import (
    get_recent_meetings,
    get_tasks_and_decisions,
    get_project_insights,
    list_all_projects,
    get_project_details
)

__all__ = [
    # MCP and Web Search
    'mcp',
    'mcp1',
    'linear_mcp',
    'web_search_preview',

    # Vector Search Tools
    'search_meetings',
    'search_emails',
    'search_teams_messages',
    'search_documents',
    'search_decisions',
    'search_risks',
    'search_opportunities',
    'search_all_knowledge',

    # Standard Retrieval Tools
    'get_recent_meetings',
    'get_tasks_and_decisions',
    'get_project_insights',
    'list_all_projects',
    'get_project_details',

    # Utilities
    'get_supabase_client',
]
