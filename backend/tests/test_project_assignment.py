from src.services.ingestion.project_assignment import ProjectAssigner


def _build_assigner(projects):
    assigner = ProjectAssigner(supabase_client=None)  # type: ignore[arg-type]
    assigner._project_cache = projects
    return assigner


def test_assign_project_prefers_alias_in_title():
    assigner = _build_assigner(
        [
            {"id": 11, "name": "Westfield Collective HQ", "client": "Westfield", "aliases": ["WFC"]},
            {"id": 12, "name": "Paradise Mall", "client": "Paradise", "aliases": ["PM"]},
        ]
    )

    project_id, method, confidence = assigner.assign_project(
        meeting_title="WFC budget sync",
        participants=["Megan <megan@alleatogroup.com>"],
        content="Reviewing forecast and schedule.",
    )

    assert project_id == 11
    assert method == "title_match"
    assert confidence >= 0.9


def test_assign_project_uses_email_domain_when_available():
    assigner = _build_assigner(
        [
            {
                "id": 21,
                "name": "Alpha Buildout",
                "client": "Alpha",
                "aliases": [],
                "team_members": ["pm@alphadev.com"],
                "stakeholders": [{"email": "owner@alphadev.com"}],
            },
            {
                "id": 22,
                "name": "Beta Renovation",
                "client": "Beta",
                "aliases": [],
                "team_members": ["pm@betagc.com"],
                "stakeholders": [],
            },
        ]
    )

    project_id, method, confidence = assigner.assign_project(
        meeting_title="Weekly update",
        participants=["Owner <owner@alphadev.com>", "Team <site@alphadev.com>"],
        content="General progress notes.",
    )

    assert project_id == 21
    assert method == "email_domain"
    assert confidence >= 0.7
