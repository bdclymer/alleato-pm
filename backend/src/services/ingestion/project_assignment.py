"""
Automatic Project Assignment Logic

Assigns meetings to projects based on:
1. Project name in meeting title (highest confidence)
2. Participant email domains (medium confidence)
3. Meeting content/context (lower confidence, requires LLM)
"""

from typing import Optional, Dict, Any, List, Tuple
from supabase import Client
import re


class ProjectAssigner:
    """Automatically assigns meetings to projects based on heuristics and context."""

    def __init__(self, supabase_client: Client):
        self.client = supabase_client
        self._project_cache: Optional[List[Dict[str, Any]]] = None

    def _get_projects(self) -> List[Dict[str, Any]]:
        """Get all active projects with names."""
        if self._project_cache is None:
            response = self.client.table("projects").select(
                "id, name, client"
            ).execute()
            self._project_cache = response.data or []
        return self._project_cache

    def assign_project(
        self,
        meeting_title: str,
        participants: List[str],
        content: Optional[str] = None,
        existing_project_id: Optional[int] = None
    ) -> Tuple[Optional[int], str, float]:
        """
        Assign a project_id to a meeting based on available signals.

        Args:
            meeting_title: Title of the meeting
            participants: List of participant names/emails
            content: Optional meeting content for context-based matching
            existing_project_id: Existing project_id if already assigned

        Returns:
            Tuple of (project_id, assignment_method, confidence)
            - project_id: Assigned project ID or None
            - assignment_method: How it was assigned (title_match, email_domain, content, existing)
            - confidence: 0.0-1.0 confidence score
        """

        # If already assigned, keep it
        if existing_project_id is not None and existing_project_id > 0:
            return existing_project_id, "existing", 1.0

        projects = self._get_projects()
        if not projects:
            return None, "no_projects", 0.0

        # Strategy 1: Direct name match in title (highest confidence)
        project_id, confidence = self._match_by_title(meeting_title, projects)
        if project_id and confidence >= 0.8:
            return project_id, "title_match", confidence

        # Strategy 2: Participant email domains
        email_project_id, email_conf = self._match_by_email_domains(participants, projects)
        if email_project_id and email_conf >= 0.7:
            return email_project_id, "email_domain", email_conf

        # Strategy 3: Content keywords (if provided)
        if content:
            content_project_id, content_conf = self._match_by_content(content, projects)
            if content_project_id and content_conf >= 0.6:
                return content_project_id, "content_match", content_conf

        # If we got a lower-confidence title match, use it as fallback
        if project_id:
            return project_id, "title_match_low_conf", confidence

        # No confident assignment
        return None, "unassigned", 0.0

    def _match_by_title(
        self,
        meeting_title: str,
        projects: List[Dict[str, Any]]
    ) -> Tuple[Optional[int], float]:
        """
        Match project by name appearing in meeting title.

        Returns: (project_id, confidence)
        """
        title_lower = meeting_title.lower()

        # Check for exact project name matches
        for project in projects:
            project_name = project.get("name")
            client_name = project.get("client")

            # Exact name match
            if project_name and project_name.lower() in title_lower:
                return project["id"], 0.95

            # Client name match
            if client_name and client_name.lower() in title_lower:
                return project["id"], 0.90

        return None, 0.0

    def _match_by_email_domains(
        self,
        participants: List[str],
        projects: List[Dict[str, Any]]
    ) -> Tuple[Optional[int], float]:
        """
        Match project by participant email domains.

        NOTE: Requires email_domains column in projects table (not yet implemented).
        Currently disabled - returns None immediately.

        Returns: (project_id, confidence)
        """
        # Email domain matching requires email_domains column in projects table
        # TODO: Add email_domains column and implement this feature
        return None, 0.0

    def _match_by_content(
        self,
        content: str,
        projects: List[Dict[str, Any]]
    ) -> Tuple[Optional[int], float]:
        """
        Match project by project/client names appearing in content.

        Searches for project name or client name mentions in the meeting content.

        Returns: (project_id, confidence)
        """
        content_lower = content.lower()[:2000]  # Check first 2000 chars

        # Count name mentions per project
        project_scores: Dict[int, int] = {}

        for project in projects:
            score = 0

            # Project name mentions
            project_name = project.get("name")
            if project_name and project_name.lower() in content_lower:
                score += 3

            # Client name mentions
            client_name = project.get("client")
            if client_name and client_name.lower() in content_lower:
                score += 2

            if score > 0:
                project_scores[project["id"]] = score

        if not project_scores:
            return None, 0.0

        # Return project with highest score
        best_project_id = max(project_scores, key=project_scores.get)
        best_score = project_scores[best_project_id]

        # Convert score to confidence (cap at 0.7 for content-based)
        confidence = min(0.7, best_score / 5.0)

        return best_project_id, confidence


def batch_assign_projects(
    supabase_client: Client,
    limit: int = 100,
    min_confidence: float = 0.7
) -> Dict[str, Any]:
    """
    Batch process unassigned meetings and assign projects.

    Args:
        supabase_client: Supabase client instance
        limit: Max number of documents to process
        min_confidence: Minimum confidence to make assignment (default 0.7)

    Returns:
        Stats dict with counts of assigned/skipped/failed
    """
    assigner = ProjectAssigner(supabase_client)

    # Get meetings without project_id
    response = supabase_client.table("document_metadata").select(
        "id, title, participants_array, content, project_id"
    ).is_("project_id", "null").limit(limit).execute()

    unassigned = response.data or []

    stats = {
        "total": len(unassigned),
        "assigned": 0,
        "skipped_low_confidence": 0,
        "failed": 0,
        "methods": {}
    }

    for doc in unassigned:
        try:
            project_id, method, confidence = assigner.assign_project(
                meeting_title=doc.get("title", ""),
                participants=doc.get("participants_array", []),
                content=doc.get("content", "")[:3000],  # First 3k chars
                existing_project_id=doc.get("project_id")
            )

            if project_id and confidence >= min_confidence:
                # Assign the project
                supabase_client.table("document_metadata").update({
                    "project_id": project_id
                }).eq("id", doc["id"]).execute()

                stats["assigned"] += 1
                stats["methods"][method] = stats["methods"].get(method, 0) + 1

                print(f"✓ Assigned '{doc.get('title', 'Untitled')[:50]}...' to project {project_id} ({method}, {confidence:.2f})")
            else:
                stats["skipped_low_confidence"] += 1

        except Exception as e:
            stats["failed"] += 1
            print(f"✗ Failed to assign '{doc.get('title', 'Untitled')[:50]}...': {str(e)}")

    return stats
