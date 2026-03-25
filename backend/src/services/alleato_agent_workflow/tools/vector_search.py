"""
===============================================================================
VECTOR SEARCH TOOLS - Semantic Search via pgvector
===============================================================================

ROLE: Provides semantic similarity search across all knowledge tables using vector embeddings

CONTROLS:
- search_meetings() -> Search document_chunks via search_document_chunks RPC (meeting types)
- search_decisions() -> Search insights table via search_all_knowledge RPC (type=decision)
- search_risks() -> Search insights table via search_all_knowledge RPC (type=risk)
- search_opportunities() -> Search insights table via search_all_knowledge RPC (type=opportunity)
- search_all_knowledge() -> Unified search across insights table via search_all_knowledge RPC

QUERY PROCESS:
1. Generate query embedding via get_query_embedding_async()
2. Call Supabase RPC function with embedding + filters (project_id, match_count, threshold)
3. Format results with similarity scores and source citations
4. Return structured string with [Source N] references

RETURNS: Formatted strings with:
- Match similarity percentages
- Content snippets (truncated to 200-300 chars)
- Metadata (dates, owners, status, impact)
- Source citations section at bottom

USED BY:
- project_agent (searches project-specific data)
- strategist_agent (searches across all knowledge)
- Classification determines which search functions to call

DATABASE TABLES/RPCS USED:
- document_chunks (via search_document_chunks RPC) for meeting search
- insights (via search_all_knowledge RPC) for decisions, risks, opportunities

===============================================================================
"""

import os
import json
from functools import lru_cache
from typing import Optional
from agents import function_tool
from supabase import create_client, Client

from ..embeddings import get_query_embedding_async


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """Get cached Supabase client."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    return create_client(url, key)


@function_tool
async def search_meetings(query: str, limit: int = 10, project_id: Optional[int] = None) -> str:
    """
    Search meeting transcripts using semantic similarity (vector search).

    Args:
        query: The search query text
        limit: Maximum number of results to return (default: 10)
        project_id: Optional project ID to filter results

    Returns:
        Formatted string with matching meeting segments, similarity scores, and source citations
    """
    try:
        supabase = get_supabase_client()
        embedding = await get_query_embedding_async(query)

        if not embedding:
            return "Error: Could not generate embedding for query"

        # Use the unified search_document_chunks RPC with meeting source types
        rpc_params = {
            'query_embedding': embedding,
            'filter_source_types': ['meeting_transcript', 'meeting_summary', 'meeting_segment_summary'],
            'match_count': limit,
            'match_threshold': 0.3
        }
        if project_id:
            rpc_params['filter_project_id'] = project_id

        result = supabase.rpc('search_document_chunks', rpc_params).execute()

        if not result.data:
            return "No matching meeting segments found."

        output = []
        sources = []

        for idx, item in enumerate(result.data, 1):
            similarity_pct = f"{item.get('similarity', 0) * 100:.0f}%"
            meeting_title = item.get('doc_title', 'Untitled Meeting')
            meeting_date = item.get('doc_date', item.get('doc_created_at', 'Unknown date'))
            chunk_id = item.get('chunk_id', f'chunk-{idx}')

            # Build source reference
            source_ref = f"[Source {idx}]"
            sources.append({
                "id": chunk_id,
                "ref": source_ref,
                "type": item.get('source_type', 'meeting_transcript'),
                "title": meeting_title,
                "date": str(meeting_date)[:10] if meeting_date else "Unknown",
                "relevance": similarity_pct
            })

            output.append(f"{source_ref} **{meeting_title}** ({similarity_pct} match)")
            output.append(f"  Date: {str(meeting_date)[:10] if meeting_date else 'Unknown'}")
            output.append(f"  Type: {item.get('source_type', 'meeting_transcript')}")
            chunk_text = item.get('chunk_text', '')
            if chunk_text:
                output.append(f"  Content: {chunk_text[:300]}...")
            output.append("")

        # Add sources section at the end
        output.append("\n---\n**Sources:**")
        for src in sources:
            output.append(f"- {src['ref']}: {src['title']} ({src['date']}) - {src['relevance']} relevance")

        return "\n".join(output)
    except Exception as e:
        return f"Error searching meetings: {str(e)}"


@function_tool
async def search_emails(query: str, limit: int = 10) -> str:
    """
    Search synced Outlook emails using semantic similarity.
    Use this when the user asks about emails, email conversations,
    or what was communicated via email.

    Args:
        query: The search query text
        limit: Maximum number of results to return (default: 10)

    Returns:
        Formatted string with matching email content, similarity scores, and source citations
    """
    try:
        supabase = get_supabase_client()
        embedding = await get_query_embedding_async(query)

        if not embedding:
            return "Error: Could not generate embedding for query"

        rpc_params = {
            'query_embedding': embedding,
            'filter_source_types': ['email'],
            'match_count': limit,
            'match_threshold': 0.25
        }

        result = supabase.rpc('search_document_chunks', rpc_params).execute()

        if not result.data:
            return "No matching emails found."

        output = []
        sources = []

        for idx, item in enumerate(result.data, 1):
            similarity_pct = f"{item.get('similarity', 0) * 100:.0f}%"
            title = item.get('doc_title', 'Untitled Email')
            date = item.get('doc_date', item.get('doc_created_at', 'Unknown date'))
            chunk_id = item.get('chunk_id', f'chunk-{idx}')

            source_ref = f"[Source {idx}]"
            sources.append({
                "id": chunk_id,
                "ref": source_ref,
                "type": "email",
                "title": title,
                "date": str(date)[:10] if date else "Unknown",
                "relevance": similarity_pct
            })

            output.append(f"{source_ref} **{title}** ({similarity_pct} match)")
            output.append(f"  Date: {str(date)[:10] if date else 'Unknown'}")
            chunk_text = item.get('chunk_text', '')
            if chunk_text:
                output.append(f"  Content: {chunk_text[:300]}...")
            output.append("")

        output.append("\n---\n**Sources:**")
        for src in sources:
            output.append(f"- {src['ref']}: {src['title']} ({src['date']}) - {src['relevance']} relevance")

        return "\n".join(output)
    except Exception as e:
        return f"Error searching emails: {str(e)}"


@function_tool
async def search_teams_messages(query: str, limit: int = 10) -> str:
    """
    Search synced Microsoft Teams channel messages and direct messages
    using semantic similarity. Use this when the user asks about Teams
    conversations, Teams channels, or what was said in Teams.

    Args:
        query: The search query text
        limit: Maximum number of results to return (default: 10)

    Returns:
        Formatted string with matching Teams messages, similarity scores, and source citations
    """
    try:
        supabase = get_supabase_client()
        embedding = await get_query_embedding_async(query)

        if not embedding:
            return "Error: Could not generate embedding for query"

        rpc_params = {
            'query_embedding': embedding,
            'filter_source_types': ['teams_message'],
            'match_count': limit,
            'match_threshold': 0.25
        }

        result = supabase.rpc('search_document_chunks', rpc_params).execute()

        if not result.data:
            return "No matching Teams messages found."

        output = []
        sources = []

        for idx, item in enumerate(result.data, 1):
            similarity_pct = f"{item.get('similarity', 0) * 100:.0f}%"
            title = item.get('doc_title', 'Teams Message')
            date = item.get('doc_date', item.get('doc_created_at', 'Unknown date'))
            chunk_id = item.get('chunk_id', f'chunk-{idx}')

            source_ref = f"[Source {idx}]"
            sources.append({
                "id": chunk_id,
                "ref": source_ref,
                "type": "teams_message",
                "title": title,
                "date": str(date)[:10] if date else "Unknown",
                "relevance": similarity_pct
            })

            output.append(f"{source_ref} **{title}** ({similarity_pct} match)")
            output.append(f"  Date: {str(date)[:10] if date else 'Unknown'}")
            chunk_text = item.get('chunk_text', '')
            if chunk_text:
                output.append(f"  Content: {chunk_text[:300]}...")
            output.append("")

        output.append("\n---\n**Sources:**")
        for src in sources:
            output.append(f"- {src['ref']}: {src['title']} ({src['date']}) - {src['relevance']} relevance")

        return "\n".join(output)
    except Exception as e:
        return f"Error searching Teams messages: {str(e)}"


@function_tool
async def search_documents(query: str, limit: int = 10) -> str:
    """
    Search synced OneDrive and SharePoint documents using semantic similarity.
    Use this when the user asks about files, documents, SOWs, specs,
    contracts, submittals, or any content stored in OneDrive or SharePoint.

    Args:
        query: The search query text
        limit: Maximum number of results to return (default: 10)

    Returns:
        Formatted string with matching document content, similarity scores, and source citations
    """
    try:
        supabase = get_supabase_client()
        embedding = await get_query_embedding_async(query)

        if not embedding:
            return "Error: Could not generate embedding for query"

        rpc_params = {
            'query_embedding': embedding,
            'filter_source_types': ['onedrive_document'],
            'match_count': limit,
            'match_threshold': 0.25
        }

        result = supabase.rpc('search_document_chunks', rpc_params).execute()

        if not result.data:
            return "No matching documents found."

        output = []
        sources = []

        for idx, item in enumerate(result.data, 1):
            similarity_pct = f"{item.get('similarity', 0) * 100:.0f}%"
            title = item.get('doc_title', 'Untitled Document')
            date = item.get('doc_date', item.get('doc_created_at', 'Unknown date'))
            chunk_id = item.get('chunk_id', f'chunk-{idx}')

            source_ref = f"[Source {idx}]"
            sources.append({
                "id": chunk_id,
                "ref": source_ref,
                "type": "onedrive_document",
                "title": title,
                "date": str(date)[:10] if date else "Unknown",
                "relevance": similarity_pct
            })

            output.append(f"{source_ref} **{title}** ({similarity_pct} match)")
            output.append(f"  Date: {str(date)[:10] if date else 'Unknown'}")
            chunk_text = item.get('chunk_text', '')
            if chunk_text:
                output.append(f"  Content: {chunk_text[:300]}...")
            output.append("")

        output.append("\n---\n**Sources:**")
        for src in sources:
            output.append(f"- {src['ref']}: {src['title']} ({src['date']}) - {src['relevance']} relevance")

        return "\n".join(output)
    except Exception as e:
        return f"Error searching documents: {str(e)}"


@function_tool
async def search_decisions(query: str, limit: int = 10, project_id: Optional[int] = None) -> str:
    """
    Search decisions using semantic similarity (vector search).

    Args:
        query: The search query text
        limit: Maximum number of results to return (default: 10)
        project_id: Optional project ID to filter results

    Returns:
        Formatted string with matching decisions, similarity scores, and source citations
    """
    try:
        supabase = get_supabase_client()
        embedding = await get_query_embedding_async(query)

        if not embedding:
            return "Error: Could not generate embedding for query"

        # Use search_all_knowledge which queries the unified insights table
        result = supabase.rpc('search_all_knowledge', {
            'query_embedding': embedding,
            'match_count': limit * 2,  # Fetch extra to account for post-filtering
            'match_threshold': 0.3
        }).execute()

        if not result.data:
            return "No matching decisions found."

        # Post-filter for decisions only, and optionally by project_id
        filtered = []
        for item in result.data:
            if item.get('type') != 'decision':
                continue
            if project_id and item.get('project_id') != project_id:
                if project_id not in (item.get('project_ids') or []):
                    continue
            filtered.append(item)
            if len(filtered) >= limit:
                break

        if not filtered:
            return "No matching decisions found."

        output = []
        sources = []

        for idx, item in enumerate(filtered, 1):
            similarity_pct = f"{item.get('similarity', 0) * 100:.0f}%"
            decision_id = item.get('id', f'decision-{idx}')
            description = item.get('description', 'N/A')
            decision_date = item.get('created_at', 'Unknown')
            details = item.get('details', {}) or {}

            # Build source reference
            source_ref = f"[Source {idx}]"
            sources.append({
                "id": decision_id,
                "ref": source_ref,
                "type": "decision",
                "description": description[:100] + "..." if len(description) > 100 else description,
                "date": str(decision_date)[:10] if decision_date else "Unknown",
                "relevance": similarity_pct
            })

            output.append(f"{source_ref} **Decision** ({similarity_pct} match)")
            output.append(f"  Description: {description}")
            if details.get('rationale'):
                output.append(f"  Rationale: {details['rationale']}")
            if item.get('owner_name'):
                output.append(f"  Owner: {item['owner_name']}")
            if details.get('impact'):
                output.append(f"  Impact: {details['impact']}")
            if item.get('status'):
                output.append(f"  Status: {item['status']}")
            if decision_date:
                output.append(f"  Date: {str(decision_date)[:10]}")
            output.append("")

        # Add sources section at the end
        output.append("\n---\n**Sources:**")
        for src in sources:
            output.append(f"- {src['ref']}: Decision - \"{src['description']}\" ({src['date']}) - {src['relevance']} relevance")

        return "\n".join(output)
    except Exception as e:
        return f"Error searching decisions: {str(e)}"


@function_tool
async def search_risks(query: str, limit: int = 10, project_id: Optional[int] = None) -> str:
    """
    Search risks using semantic similarity (vector search).

    Args:
        query: The search query text
        limit: Maximum number of results to return (default: 10)
        project_id: Optional project ID to filter results

    Returns:
        Formatted string with matching risks, similarity scores, and source citations
    """
    try:
        supabase = get_supabase_client()
        embedding = await get_query_embedding_async(query)

        if not embedding:
            return "Error: Could not generate embedding for query"

        # Use search_all_knowledge which queries the unified insights table
        result = supabase.rpc('search_all_knowledge', {
            'query_embedding': embedding,
            'match_count': limit * 2,  # Fetch extra to account for post-filtering
            'match_threshold': 0.3
        }).execute()

        if not result.data:
            return "No matching risks found."

        # Post-filter for risks only, and optionally by project_id
        filtered = []
        for item in result.data:
            if item.get('type') != 'risk':
                continue
            if project_id and item.get('project_id') != project_id:
                if project_id not in (item.get('project_ids') or []):
                    continue
            filtered.append(item)
            if len(filtered) >= limit:
                break

        if not filtered:
            return "No matching risks found."

        output = []
        sources = []

        for idx, item in enumerate(filtered, 1):
            similarity_pct = f"{item.get('similarity', 0) * 100:.0f}%"
            risk_id = item.get('id', f'risk-{idx}')
            description = item.get('description', 'N/A')
            risk_date = item.get('created_at', 'Unknown')
            details = item.get('details', {}) or {}

            # Build source reference
            source_ref = f"[Source {idx}]"
            sources.append({
                "id": risk_id,
                "ref": source_ref,
                "type": "risk",
                "description": description[:100] + "..." if len(description) > 100 else description,
                "date": str(risk_date)[:10] if risk_date else "Unknown",
                "relevance": similarity_pct
            })

            output.append(f"{source_ref} **Risk** ({similarity_pct} match)")
            output.append(f"  Description: {description}")
            if details.get('category'):
                output.append(f"  Category: {details['category']}")
            if details.get('likelihood'):
                output.append(f"  Likelihood: {details['likelihood']}")
            if details.get('impact'):
                output.append(f"  Impact: {details['impact']}")
            if item.get('owner_name'):
                output.append(f"  Owner: {item['owner_name']}")
            if details.get('mitigation_plan'):
                output.append(f"  Mitigation: {details['mitigation_plan']}")
            if item.get('status'):
                output.append(f"  Status: {item['status']}")
            if risk_date:
                output.append(f"  Identified: {str(risk_date)[:10]}")
            output.append("")

        # Add sources section at the end
        output.append("\n---\n**Sources:**")
        for src in sources:
            output.append(f"- {src['ref']}: Risk - \"{src['description']}\" ({src['date']}) - {src['relevance']} relevance")

        return "\n".join(output)
    except Exception as e:
        return f"Error searching risks: {str(e)}"


@function_tool
async def search_opportunities(query: str, limit: int = 10, project_id: Optional[int] = None) -> str:
    """
    Search opportunities using semantic similarity (vector search).

    Args:
        query: The search query text
        limit: Maximum number of results to return (default: 10)
        project_id: Optional project ID to filter results

    Returns:
        Formatted string with matching opportunities, similarity scores, and source citations
    """
    try:
        supabase = get_supabase_client()
        embedding = await get_query_embedding_async(query)

        if not embedding:
            return "Error: Could not generate embedding for query"

        # Use search_all_knowledge which queries the unified insights table
        result = supabase.rpc('search_all_knowledge', {
            'query_embedding': embedding,
            'match_count': limit * 2,  # Fetch extra to account for post-filtering
            'match_threshold': 0.3
        }).execute()

        if not result.data:
            return "No matching opportunities found."

        # Post-filter for opportunities only, and optionally by project_id
        filtered = []
        for item in result.data:
            if item.get('type') != 'opportunity':
                continue
            if project_id and item.get('project_id') != project_id:
                if project_id not in (item.get('project_ids') or []):
                    continue
            filtered.append(item)
            if len(filtered) >= limit:
                break

        if not filtered:
            return "No matching opportunities found."

        output = []
        sources = []

        for idx, item in enumerate(filtered, 1):
            similarity_pct = f"{item.get('similarity', 0) * 100:.0f}%"
            opp_id = item.get('id', f'opportunity-{idx}')
            description = item.get('description', 'N/A')
            opp_date = item.get('created_at', 'Unknown')
            details = item.get('details', {}) or {}

            # Build source reference
            source_ref = f"[Source {idx}]"
            sources.append({
                "id": opp_id,
                "ref": source_ref,
                "type": "opportunity",
                "description": description[:100] + "..." if len(description) > 100 else description,
                "date": str(opp_date)[:10] if opp_date else "Unknown",
                "relevance": similarity_pct
            })

            output.append(f"{source_ref} **Opportunity** ({similarity_pct} match)")
            output.append(f"  Description: {description}")
            if details.get('opportunity_type'):
                output.append(f"  Type: {details['opportunity_type']}")
            if item.get('owner_name'):
                output.append(f"  Owner: {item['owner_name']}")
            if details.get('next_step'):
                output.append(f"  Next Step: {details['next_step']}")
            if item.get('status'):
                output.append(f"  Status: {item['status']}")
            if opp_date:
                output.append(f"  Identified: {str(opp_date)[:10]}")
            output.append("")

        # Add sources section at the end
        output.append("\n---\n**Sources:**")
        for src in sources:
            output.append(f"- {src['ref']}: Opportunity - \"{src['description']}\" ({src['date']}) - {src['relevance']} relevance")

        return "\n".join(output)
    except Exception as e:
        return f"Error searching opportunities: {str(e)}"


@function_tool
async def search_all_knowledge(query: str, limit: int = 20) -> str:
    """
    Search across all knowledge (decisions, risks, opportunities in the insights table).
    Returns blended results grouped by type with citations.

    Args:
        query: The search query text
        limit: Maximum number of results to return (default: 20)

    Returns:
        Formatted string with matching items grouped by type with source citations
    """
    try:
        supabase = get_supabase_client()
        embedding = await get_query_embedding_async(query)

        if not embedding:
            return "Error: Could not generate embedding for query"

        result = supabase.rpc('search_all_knowledge', {
            'query_embedding': embedding,
            'match_count': limit,
            'match_threshold': 0.35
        }).execute()

        if not result.data:
            return "No matching knowledge found."

        # Group results by type (decision, risk, opportunity)
        grouped = {}
        all_sources = []
        source_idx = 0

        for item in result.data:
            item_type = item.get('type', 'unknown')
            if item_type not in grouped:
                grouped[item_type] = []
            source_idx += 1
            item['_source_idx'] = source_idx
            grouped[item_type].append(item)

            # Build source entry
            description = item.get('description', 'N/A')
            all_sources.append({
                "idx": source_idx,
                "type": item_type,
                "content": description[:80] + "..." if len(description) > 80 else description,
                "relevance": f"{item.get('similarity', 0) * 100:.0f}%",
                "id": item.get('id', f'{item_type}-{source_idx}')
            })

        output = []
        type_labels = {
            'decision': 'Decisions',
            'risk': 'Risks',
            'opportunity': 'Opportunities'
        }

        for item_type, items in grouped.items():
            label = type_labels.get(item_type, item_type.title())
            output.append(f"\n## {label} ({len(items)} matches)\n")

            for item in items:
                source_ref = f"[Source {item['_source_idx']}]"
                similarity_pct = f"{item.get('similarity', 0) * 100:.0f}%"
                description = item.get('description', 'N/A')
                if len(description) > 200:
                    description = description[:200] + "..."
                output.append(f"{source_ref} ({similarity_pct}) {description}")

                details = item.get('details', {}) or {}
                meta_parts = []
                if item.get('owner_name'):
                    meta_parts.append(f"Owner: {item['owner_name']}")
                if item.get('status'):
                    meta_parts.append(f"Status: {item['status']}")
                if details.get('impact'):
                    meta_parts.append(f"Impact: {details['impact']}")
                if item.get('created_at'):
                    meta_parts.append(f"Date: {str(item['created_at'])[:10]}")
                if meta_parts:
                    output.append(f"  [{', '.join(meta_parts)}]")
            output.append("")

        # Add consolidated sources section
        output.append("\n---\n**Sources:**")
        for src in all_sources:
            type_label = type_labels.get(src['type'], src['type'].title())
            output.append(f"- [Source {src['idx']}]: {type_label} - \"{src['content']}\" - {src['relevance']} relevance")

        return "\n".join(output)
    except Exception as e:
        return f"Error searching knowledge: {str(e)}"
