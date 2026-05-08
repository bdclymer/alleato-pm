"""
Automatic Project Assignment Logic.

Assigns documents to projects based on:
1. Project number/name/client/alias matches in title (highest confidence)
2. Participant email domain overlap with known project contacts
3. Project number/name/client/alias matches in content
"""

from typing import Optional, Dict, Any, List, Tuple
from supabase import Client
import os
import re


PUBLIC_EMAIL_DOMAINS = {
    "aol.com",
    "gmail.com",
    "hotmail.com",
    "icloud.com",
    "live.com",
    "me.com",
    "msn.com",
    "outlook.com",
    "yahoo.com",
}


class ProjectAssigner:
    """Automatically assigns meetings to projects based on heuristics and context."""

    def __init__(self, supabase_client: Client):
        self.client = supabase_client
        self._project_cache: Optional[List[Dict[str, Any]]] = None
        self._contact_signal_cache: Optional[Dict[int, Dict[str, set[str]]]] = None

    def _get_projects(self) -> List[Dict[str, Any]]:
        """Get all active projects with matching signals."""
        if self._project_cache is None:
            response = self.client.table("projects").select(
                "id, name, project_number, client, aliases, team_members, stakeholders"
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

        projects = self._get_projects()
        if not projects:
            return None, "no_projects", 0.0

        # Strategy 1: Direct project number/name match in title (highest confidence)
        project_id, confidence = self._match_by_title(meeting_title, projects)
        if (
            existing_project_id is not None
            and existing_project_id > 0
            and project_id
            and int(project_id) != int(existing_project_id)
            and confidence >= 0.93
        ):
            return project_id, "title_correction", confidence

        # If already assigned and no strong title conflict exists, keep it.
        if existing_project_id is not None and existing_project_id > 0:
            return existing_project_id, "existing", 1.0

        if project_id and confidence >= 0.8:
            return project_id, "title_match", confidence

        # Strategy 2: Project-directory participant signals
        contact_project_id, contact_method, contact_conf = self._match_by_project_contacts(participants)
        if contact_project_id and contact_conf >= 0.7:
            return contact_project_id, contact_method, contact_conf

        # Strategy 3: Participant email domains recorded on project metadata
        email_project_id, email_conf = self._match_by_email_domains(participants, projects)
        if email_project_id and email_conf >= 0.7:
            return email_project_id, "email_domain", email_conf

        # Strategy 4: Content keywords (if provided)
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
        """Match project by number/name/alias/client appearing in title."""
        title_lower = self._normalize_text(meeting_title)
        if not title_lower:
            return None, 0.0

        scored_matches: List[Tuple[int, float]] = []
        for project in projects:
            project_id = project.get("id")
            if not project_id:
                continue

            score = 0.0
            project_number = self._normalize_text(project.get("project_number"))
            project_name = self._normalize_text(project.get("name"))
            client_name = self._normalize_text(project.get("client"))

            # Exact phrase matches
            if project_number and self._contains_token(title_lower, project_number):
                score = max(score, 0.98)
            if project_name and project_name in title_lower:
                score = max(score, 0.95)
            if client_name and client_name in title_lower:
                score = max(score, 0.90)

            # Alias/abbreviation matches (e.g., "WFC")
            for alias in self._extract_aliases(project):
                alias_norm = self._normalize_text(alias)
                if not alias_norm:
                    continue
                if self._contains_token(title_lower, alias_norm):
                    score = max(score, 0.92 if len(alias_norm) <= 5 else 0.90)

            if score > 0:
                scored_matches.append((int(project_id), score))

        if not scored_matches:
            return None, 0.0

        scored_matches.sort(key=lambda item: item[1], reverse=True)
        return scored_matches[0]

    def _match_by_email_domains(
        self,
        participants: List[str],
        projects: List[Dict[str, Any]]
    ) -> Tuple[Optional[int], float]:
        """Match project by participant email domains."""
        participant_domains = self._extract_domains(participants)
        if not participant_domains:
            return None, 0.0

        best_project_id: Optional[int] = None
        best_overlap = 0
        for project in projects:
            project_domains = self._project_domains(project)
            overlap = len(participant_domains.intersection(project_domains))
            if overlap > best_overlap:
                best_overlap = overlap
                best_project_id = int(project["id"])

        if best_project_id is None or best_overlap == 0:
            return None, 0.0

        confidence = min(0.88, 0.72 + (best_overlap - 1) * 0.08)
        return best_project_id, confidence

    def _match_by_project_contacts(self, participants: List[str]) -> Tuple[Optional[int], str, float]:
        """Match participants to project directory contacts and project companies."""
        participant_emails = self._extract_emails(participants)
        participant_domains = self._extract_domains(participants)
        if not participant_emails and not participant_domains:
            return None, "no_participant_email", 0.0

        signals = self._get_project_contact_signals()
        if not signals:
            return None, "no_project_contact_signals", 0.0

        direct_scores: Dict[int, int] = {}
        domain_scores: Dict[int, int] = {}

        for project_id, project_signals in signals.items():
            direct_overlap = participant_emails.intersection(project_signals["emails"])
            if direct_overlap:
                direct_scores[project_id] = len(direct_overlap)

            domain_overlap = participant_domains.intersection(project_signals["domains"])
            if domain_overlap:
                domain_scores[project_id] = len(domain_overlap)

        direct_project_id, direct_score, direct_second = self._best_score(direct_scores)
        if direct_project_id and direct_score > direct_second:
            confidence = min(0.94, 0.86 + (direct_score - 1) * 0.04)
            return direct_project_id, "project_directory_email", confidence

        domain_project_id, domain_score, domain_second = self._best_score(domain_scores)
        if domain_project_id and domain_score > domain_second:
            confidence = min(0.84, 0.74 + (domain_score - 1) * 0.04)
            return domain_project_id, "project_company_domain", confidence

        return None, "ambiguous_project_contact", 0.0

    def _match_by_content(
        self,
        content: str,
        projects: List[Dict[str, Any]]
    ) -> Tuple[Optional[int], float]:
        """Match project by project number/name/client/alias mentions in content."""
        content_lower = self._normalize_text(content[:3000])
        if not content_lower:
            return None, 0.0

        # Count name mentions per project
        project_scores: Dict[int, float] = {}

        for project in projects:
            score = 0.0
            project_id = project.get("id")
            if not project_id:
                continue

            # Project name mentions
            project_number = self._normalize_text(project.get("project_number"))
            if project_number and self._contains_token(content_lower, project_number):
                score += 4

            project_name = self._normalize_text(project.get("name"))
            if project_name and project_name in content_lower:
                score += 3

            # Client name mentions
            client_name = self._normalize_text(project.get("client"))
            if client_name and client_name in content_lower:
                score += 2

            # Alias mentions (short aliases matter, e.g. WFC)
            for alias in self._extract_aliases(project):
                alias_norm = self._normalize_text(alias)
                if alias_norm and self._contains_token(content_lower, alias_norm):
                    score += 2 if len(alias_norm) <= 5 else 1.5

            if score > 0:
                project_scores[int(project_id)] = score

        if not project_scores:
            return None, 0.0

        # Return project with highest score
        best_project_id = max(project_scores, key=project_scores.get)
        best_score = project_scores[best_project_id]

        # Convert score to confidence (cap at 0.7 for content-based)
        confidence = min(0.7, best_score / 5.0)

        return best_project_id, confidence

    @staticmethod
    def _normalize_text(value: Optional[str]) -> str:
        if not value:
            return ""
        return re.sub(r"\s+", " ", re.sub(r"[^a-zA-Z0-9]+", " ", value)).strip().lower()

    @staticmethod
    def _contains_token(text: str, token: str) -> bool:
        if not token:
            return False
        return bool(re.search(rf"\b{re.escape(token)}\b", text))

    @staticmethod
    def _extract_aliases(project: Dict[str, Any]) -> List[str]:
        aliases = project.get("aliases") or []
        return [str(a).strip() for a in aliases if str(a).strip()]

    @staticmethod
    def _extract_domains(values: List[str]) -> set[str]:
        domains: set[str] = set()
        for value in values:
            if not value:
                continue
            for match in re.findall(r"[a-zA-Z0-9._%+\-]+@([a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})", value):
                domain = match.lower()
                if ProjectAssigner._is_assignable_domain(domain):
                    domains.add(domain)
        return domains

    @staticmethod
    def _extract_emails(values: List[str]) -> set[str]:
        emails: set[str] = set()
        for value in values:
            if not value:
                continue
            for match in re.findall(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", value):
                emails.add(match.lower())
        return emails

    @staticmethod
    def _domain_from_url(value: Optional[str]) -> Optional[str]:
        if not value:
            return None
        normalized = value.strip().lower()
        normalized = re.sub(r"^https?://", "", normalized)
        normalized = normalized.split("/", 1)[0].split(":", 1)[0]
        normalized = normalized.removeprefix("www.")
        return normalized if "." in normalized else None

    @staticmethod
    def _is_assignable_domain(domain: str) -> bool:
        company_domains = {
            d.strip().lower()
            for d in os.environ.get("COMPANY_EMAIL_DOMAINS", "alleatogroup.com").split(",")
            if d.strip()
        }
        return domain not in PUBLIC_EMAIL_DOMAINS and domain not in company_domains

    @staticmethod
    def _best_score(scores: Dict[int, int]) -> Tuple[Optional[int], int, int]:
        if not scores:
            return None, 0, 0
        ranked = sorted(scores.items(), key=lambda item: (-item[1], item[0]))
        best_project_id, best_score = ranked[0]
        second_score = ranked[1][1] if len(ranked) > 1 else 0
        return best_project_id, best_score, second_score

    def _get_project_contact_signals(self) -> Dict[int, Dict[str, set[str]]]:
        if self._contact_signal_cache is not None:
            return self._contact_signal_cache

        signals: Dict[int, Dict[str, set[str]]] = {}

        contact_references = (
            self.client.table("project_contact_references")
            .select("project_id,person_id,company_id,status")
            .eq("status", "active")
            .execute()
            .data
            or []
        )
        memberships = (
            self.client.table("project_directory_memberships")
            .select("project_id,person_id,status")
            .eq("status", "active")
            .execute()
            .data
            or []
        )
        people = self.client.table("people").select("id,email,company_id,status").execute().data or []
        project_companies = (
            self.client.table("project_companies")
            .select("project_id,company_id,email_address,status")
            .eq("status", "ACTIVE")
            .execute()
            .data
            or []
        )
        companies = self.client.table("companies").select("id,website").execute().data or []

        people_by_id = {str(person.get("id")): person for person in people if person.get("id")}
        company_domains = {
            str(company.get("id")): domain
            for company in companies
            if company.get("id")
            for domain in [self._domain_from_url(company.get("website"))]
            if domain and self._is_assignable_domain(domain)
        }

        def ensure_project(project_id: int) -> Dict[str, set[str]]:
            if project_id not in signals:
                signals[project_id] = {"emails": set(), "domains": set()}
            return signals[project_id]

        for reference in contact_references:
            project_id = reference.get("project_id")
            person = people_by_id.get(str(reference.get("person_id")))
            if not project_id or not person:
                continue
            project_signals = ensure_project(int(project_id))
            email = str(person.get("email") or "").strip().lower()
            if email:
                project_signals["emails"].add(email)
                project_signals["domains"].update(self._extract_domains([email]))
            company_domain = company_domains.get(
                str(reference.get("company_id") or person.get("company_id"))
            )
            if company_domain:
                project_signals["domains"].add(company_domain)

        for membership in memberships:
            project_id = membership.get("project_id")
            person = people_by_id.get(str(membership.get("person_id")))
            if not project_id or not person:
                continue
            project_signals = ensure_project(int(project_id))
            email = str(person.get("email") or "").strip().lower()
            if email:
                project_signals["emails"].add(email)
                project_signals["domains"].update(self._extract_domains([email]))
            company_domain = company_domains.get(str(person.get("company_id")))
            if company_domain:
                project_signals["domains"].add(company_domain)

        for project_company in project_companies:
            project_id = project_company.get("project_id")
            if not project_id:
                continue
            project_signals = ensure_project(int(project_id))
            email = str(project_company.get("email_address") or "").strip().lower()
            if email:
                project_signals["emails"].add(email)
                project_signals["domains"].update(self._extract_domains([email]))
            company_domain = company_domains.get(str(project_company.get("company_id")))
            if company_domain:
                project_signals["domains"].add(company_domain)

        self._contact_signal_cache = signals
        return signals

    def _project_domains(self, project: Dict[str, Any]) -> set[str]:
        domains: set[str] = set()
        team_members = project.get("team_members") or []
        for member in team_members:
            domains.update(self._extract_domains([str(member)]))

        stakeholders = project.get("stakeholders") or []
        if isinstance(stakeholders, list):
            for item in stakeholders:
                domains.update(self._extract_domains([str(item)]))
        elif isinstance(stakeholders, dict):
            for value in stakeholders.values():
                domains.update(self._extract_domains([str(value)]))

        return domains


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
