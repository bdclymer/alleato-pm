from src.services.ingestion.project_assignment import ProjectAssigner


class _Result:
    def __init__(self, data):
        self.data = data


class _TableQuery:
    def __init__(self, tables, table_name):
        self.rows = list(tables.get(table_name, []))

    def select(self, *_args):
        return self

    def eq(self, key, value):
        self.rows = [row for row in self.rows if row.get(key) == value]
        return self

    def execute(self):
        return _Result([dict(row) for row in self.rows])


class _FakeSupabase:
    def __init__(self, tables):
        self.tables = tables

    def table(self, table_name):
        return _TableQuery(self.tables, table_name)


def _build_assigner(projects):
    assigner = ProjectAssigner(supabase_client=None)  # type: ignore[arg-type]
    assigner._project_cache = projects
    assigner._contact_signal_cache = {}
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


def test_assign_project_corrects_existing_project_when_title_has_strong_conflict():
    assigner = _build_assigner(
        [
            {"id": 31, "name": "Uniqlo Phillipsburg NJ", "client": "Uniqlo", "aliases": []},
            {"id": 876, "name": "Exol Morrisville", "client": "Exol", "aliases": ["Morrisville"]},
        ]
    )

    project_id, method, confidence = assigner.assign_project(
        meeting_title="Exol - Morrisville PA - Weekly Status Call - Exol/Alleato",
        participants=["PM <pm@alleatogroup.com>"],
        content="Permit submission and Symbotic schedule alignment.",
        existing_project_id=31,
    )

    assert project_id == 876
    assert method == "title_correction"
    assert confidence >= 0.93


def test_assign_project_does_not_correct_existing_project_on_client_only_title_match():
    assigner = _build_assigner(
        [
            {"id": 47, "name": "Goodwill Bloomington Excel", "client": "Goodwill", "aliases": []},
            {"id": 754, "name": "GW Allisonville Rd IN", "client": "Goodwill", "aliases": []},
        ]
    )

    project_id, method, confidence = assigner.assign_project(
        meeting_title="Goodwill Weekly OAC Meeting",
        participants=[],
        content="General Goodwill owner meeting notes.",
        existing_project_id=47,
    )

    assert project_id == 47
    assert method == "existing"
    assert confidence == 1.0


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


def test_assign_project_uses_attribution_contact_references_before_domain_fallback():
    supabase = _FakeSupabase(
        {
            "project_contact_references": [
                {
                    "project_id": 31,
                    "person_id": "person-1",
                    "company_id": "company-1",
                    "status": "active",
                }
            ],
            "project_directory_memberships": [],
            "people": [
                {
                    "id": "person-1",
                    "email": "permit@alphaexample.com",
                    "company_id": "company-1",
                    "status": "active",
                }
            ],
            "project_companies": [],
            "companies": [
                {
                    "id": "company-1",
                    "website": "https://alphaexample.com",
                }
            ],
        }
    )
    assigner = ProjectAssigner(supabase)
    assigner._project_cache = [
        {
            "id": 31,
            "name": "Alpha Buildout",
            "client": "Alpha",
            "aliases": [],
            "team_members": [],
            "stakeholders": [],
        },
        {
            "id": 32,
            "name": "Beta Renovation",
            "client": "Beta",
            "aliases": [],
            "team_members": ["owner@betaexample.com"],
            "stakeholders": [],
        },
    ]

    project_id, method, confidence = assigner.assign_project(
        meeting_title="Permit question",
        participants=["Permit Desk <permit@alphaexample.com>"],
        content="Can you confirm the permit package?",
    )

    assert project_id == 31
    assert method == "project_directory_email"
    assert confidence >= 0.86
