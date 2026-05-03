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
