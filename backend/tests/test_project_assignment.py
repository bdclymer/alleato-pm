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
    assigner._attribution_rule_cache = []
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


def test_assign_project_ignores_internal_staff_contact_references():
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
                    "email": "pm@alleatogroup.com",
                    "company_id": "company-1",
                    "status": "active",
                }
            ],
            "project_companies": [],
            "companies": [
                {
                    "id": "company-1",
                    "website": "https://alleatogroup.com",
                }
            ],
        }
    )
    assigner = ProjectAssigner(supabase)
    assigner._project_cache = [
        {
            "id": 31,
            "name": "Uniqlo Phillipsburg NJ",
            "client": "",
            "aliases": [],
            "team_members": [],
            "stakeholders": [],
        }
    ]

    project_id, method, confidence = assigner.assign_project(
        meeting_title="Weekly update",
        participants=["PM <pm@alleatogroup.com>"],
        content="General progress notes.",
    )

    assert project_id is None
    assert method == "unassigned"
    assert confidence == 0.0


def test_assign_project_leaves_ambiguous_shared_external_contacts_unassigned():
    supabase = _FakeSupabase(
        {
            "project_contact_references": [
                {"project_id": 31, "person_id": "person-1", "company_id": None, "status": "active"},
                {"project_id": 178, "person_id": "person-1", "company_id": None, "status": "active"},
            ],
            "project_directory_memberships": [],
            "people": [
                {
                    "id": "person-1",
                    "email": "shared@hy-tek.com",
                    "company_id": None,
                    "status": "active",
                }
            ],
            "project_companies": [],
            "companies": [],
        }
    )
    assigner = ProjectAssigner(supabase)
    assigner._project_cache = [
        {"id": 31, "name": "Uniqlo Phillipsburg NJ", "client": "", "aliases": []},
        {"id": 178, "name": "Superior Beverage Exotec", "client": "", "aliases": []},
    ]

    project_id, method, confidence = assigner.assign_project(
        meeting_title="Coordination call",
        participants=["Shared Contact <shared@hy-tek.com>"],
        content="General coordination notes.",
    )

    assert project_id is None
    assert method == "unassigned"
    assert confidence == 0.0


def test_assign_project_uses_explicit_keyword_attribution_rule_before_contacts():
    supabase = _FakeSupabase(
        {
            "project_attribution_rules": [
                {
                    "project_id": 67,
                    "rule_type": "keyword",
                    "pattern": "Hillsdale",
                    "confidence": 0.99,
                    "priority": 10,
                    "status": "active",
                }
            ],
            "project_contact_references": [],
            "project_directory_memberships": [],
            "people": [],
            "project_companies": [],
            "companies": [],
        }
    )
    assigner = ProjectAssigner(supabase)
    assigner._project_cache = [
        {"id": 67, "name": "Vermillion Rise Warehouse", "client": "", "aliases": []}
    ]

    project_id, method, confidence = assigner.assign_project(
        meeting_title="Hillsdale owner coordination",
        participants=[],
        content="General update.",
    )

    assert project_id == 67
    assert method == "attribution_rule:keyword"
    assert confidence == 0.99


def test_assign_project_uses_explicit_email_attribution_rule():
    supabase = _FakeSupabase(
        {
            "project_attribution_rules": [
                {
                    "project_id": 67,
                    "rule_type": "email",
                    "pattern": "mferderer@ferdimation.com",
                    "confidence": 0.99,
                    "priority": 10,
                    "status": "active",
                }
            ],
            "project_contact_references": [],
            "project_directory_memberships": [],
            "people": [],
            "project_companies": [],
            "companies": [],
        }
    )
    assigner = ProjectAssigner(supabase)
    assigner._project_cache = [
        {"id": 67, "name": "Vermillion Rise Warehouse", "client": "", "aliases": []}
    ]

    project_id, method, confidence = assigner.assign_project(
        meeting_title="Owner question",
        participants=["Michael Federer <mferderer@ferdimation.com>"],
        content="Can we review the dock plan?",
    )

    assert project_id == 67
    assert method == "attribution_rule:email"
    assert confidence == 0.99


def test_assign_project_fuzzy_title_match_handles_small_project_name_typo():
    assigner = _build_assigner(
        [
            {"id": 178, "name": "Superior Beverae Exotec", "client": "", "aliases": []},
            {"id": 31, "name": "Uniqlo Phillipsburg NJ", "client": "", "aliases": []},
        ]
    )

    project_id, method, confidence = assigner.assign_project(
        meeting_title="Re: Superior Beverage Exotec product on tray",
        participants=[],
        content="General update.",
    )

    assert project_id == 178
    assert method == "title_match"
    assert confidence >= 0.8
