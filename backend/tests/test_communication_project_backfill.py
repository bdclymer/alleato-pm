from datetime import datetime, timezone

from src.services.ingestion.communication_project_backfill import _iter_unassigned_documents


class _Result:
    def __init__(self, data):
        self.data = data


class _TableQuery:
    def __init__(self, rows):
        self.rows = list(rows)
        self.limit_count = None

    def select(self, *_args):
        return self

    def is_(self, key, value):
        if value == "null":
            self.rows = [row for row in self.rows if row.get(key) is None]
        return self

    def in_(self, key, values):
        allowed = set(values)
        self.rows = [row for row in self.rows if row.get(key) in allowed]
        return self

    def order(self, *_args, **_kwargs):
        return self

    def limit(self, value):
        self.limit_count = value
        return self

    def gte(self, key, value):
        self.rows = [
            row
            for row in self.rows
            if row.get(key) is not None and str(row.get(key)) >= str(value)
        ]
        return self

    def execute(self):
        rows = self.rows[: self.limit_count] if self.limit_count else self.rows
        return _Result([dict(row) for row in rows])


class _FakeClient:
    def __init__(self, rows):
        self.rows = rows

    def table(self, table_name):
        assert table_name == "document_metadata"
        return _TableQuery(self.rows)


def test_iter_unassigned_documents_can_scope_to_teams_only():
    client = _FakeClient(
        [
            {
                "id": "teams-1",
                "source": "microsoft_graph",
                "category": "teams_message",
                "project_id": None,
                "date": "2026-07-07T00:00:00+00:00",
            },
            {
                "id": "email-1",
                "source": "microsoft_graph",
                "category": "email",
                "project_id": None,
                "date": "2026-07-07T00:00:00+00:00",
            },
            {
                "id": "meeting-1",
                "source": "fireflies",
                "category": "meeting",
                "project_id": None,
                "date": "2026-07-07T00:00:00+00:00",
            },
        ]
    )

    rows = list(
        _iter_unassigned_documents(
            client,
            limit=10,
            since=datetime(2026, 7, 6, tzinfo=timezone.utc),
            source_filter="microsoft_graph",
            categories=["teams_message"],
        )
    )

    assert [row["id"] for row in rows] == ["teams-1"]
