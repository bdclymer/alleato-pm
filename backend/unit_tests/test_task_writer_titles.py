from types import SimpleNamespace

from bootstrap import load_service_module


email_compiler = load_service_module(
    "services/intelligence/email_compiler.py",
    "services.intelligence.email_compiler",
)
teams_compiler = load_service_module(
    "services/intelligence/teams_compiler.py",
    "services.intelligence.teams_compiler",
)


class _Result:
    def __init__(self, data):
        self.data = data


class _TableQuery:
    def __init__(self, db, table_name):
        self.db = db
        self.table_name = table_name
        self.payload = None

    def upsert(self, payload, on_conflict=None):
        self.payload = payload if isinstance(payload, list) else [payload]
        self.db.upserts.append(
            {
                "table": self.table_name,
                "rows": self.payload,
                "on_conflict": on_conflict,
            }
        )
        return self

    def execute(self):
        return _Result(self.payload or [])


class _FakeSupabase:
    def __init__(self):
        self.upserts = []

    def table(self, table_name):
        return _TableQuery(self, table_name)


class _FakeResolver:
    def __init__(self, _supabase):
        pass

    def resolve(self, name, email):
        return SimpleNamespace(
            is_employee=True,
            row_values=lambda: {
                "assignee_name": name,
                "assignee_email": email,
                "assignee_person_id": "person-1",
            },
            metadata=lambda: {"assignee_resolution_method": "test"},
        )


def test_email_compiler_writes_task_title(monkeypatch):
    monkeypatch.setattr(email_compiler, "TaskAssigneeResolver", _FakeResolver)
    supabase = _FakeSupabase()

    inserted = email_compiler.write_tasks(
        supabase,
        "doc-1",
        [
            {
                "task_text": "Confirm the subcontractor plan with procurement before Friday.",
                "owner": "Brandon",
                "owner_email": "brandon@alleatogroup.com",
                "confidence": 0.95,
                "needs_review": False,
            }
        ],
        42,
    )

    assert inserted == 1
    row = supabase.upserts[0]["rows"][0]
    assert (
        row["title"]
        == "Confirm the subcontractor plan with procurement before Friday"
    )
    assert (
        row["description"]
        == "Confirm the subcontractor plan with procurement before Friday."
    )


def test_teams_compiler_writes_task_title(monkeypatch):
    monkeypatch.setattr(teams_compiler, "TaskAssigneeResolver", _FakeResolver)
    supabase = _FakeSupabase()

    inserted = teams_compiler.write_tasks(
        supabase,
        "doc-2",
        [
            {
                "task_text": "Send the updated schedule to the field team after coordination is complete.",
                "owner": "Megan",
                "owner_email": "megan@alleatogroup.com",
                "confidence": 0.93,
                "needs_review": False,
            }
        ],
        77,
    )

    assert inserted == 1
    row = supabase.upserts[0]["rows"][0]
    assert (
        row["title"]
        == "Send the updated schedule to the field team after coordination"
    )
    assert (
        row["description"]
        == "Send the updated schedule to the field team after coordination is complete."
    )
