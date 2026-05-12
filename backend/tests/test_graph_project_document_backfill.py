from src.services.integrations.microsoft_graph.project_document_backfill import (
    run_graph_project_document_backfill,
)


class _Result:
    def __init__(self, data=None):
        self.data = data or []


class _Table:
    def __init__(self, store, name):
        self.store = store
        self.name = name
        self.filters = {}
        self.in_filters = {}
        self.payload = None
        self.action = "select"
        self.limit_count = None

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, key, value):
        self.filters[key] = value
        return self

    def is_(self, key, value):
        self.filters[key] = None if value == "null" else value
        return self

    def in_(self, key, values):
        self.in_filters[key] = set(values)
        return self

    def limit(self, value):
        self.limit_count = value
        return self

    def insert(self, payload):
        self.action = "insert"
        self.payload = payload
        return self

    def update(self, payload):
        self.action = "update"
        self.payload = payload
        return self

    def execute(self):
        rows = self.store.setdefault(self.name, [])
        matches = [
            row
            for row in rows
            if all(row.get(key) == value for key, value in self.filters.items())
            and all(row.get(key) in values for key, values in self.in_filters.items())
        ]

        if self.action == "insert":
            row = {"id": len(rows) + 1, **self.payload}
            rows.append(row)
            return _Result([row])

        if self.action == "update":
            for row in matches:
                row.update(self.payload)
            return _Result(matches)

        if self.limit_count is not None:
            matches = matches[: self.limit_count]
        return _Result([dict(row) for row in matches])


class _Supabase:
    def __init__(self):
        self.store = {}

    def table(self, name):
        return _Table(self.store, name)

    def from_(self, name):
        return _Table(self.store, name)


def test_graph_project_document_backfill_promotes_missing_onedrive_rows():
    supabase = _Supabase()
    supabase.store["document_metadata"] = [
        {
            "id": "onedrive_drive-item-1",
            "title": "Scope.txt",
            "url": "https://microsoft.example/scope",
            "source": "microsoft_graph",
            "source_system": "microsoft_graph",
            "category": "document",
            "type": "document",
            "project_id": 25125,
            "file_path": "onedrive/pm@example.com/drive-item-1.txt.txt",
            "tags": "onedrive,txt",
            "source_metadata": {"graph_owner": "pm@example.com"},
        }
    ]
    supabase.store["project_documents"] = []

    result = run_graph_project_document_backfill(supabase, dry_run=False)

    assert result["eligible"] == 1
    assert result["missing"] == 1
    assert result["inserted"] == 1
    row = supabase.store["project_documents"][0]
    assert row["project_id"] == 25125
    assert row["source_system"] == "onedrive"
    assert row["source_item_id"] == "drive-item-1"
    assert row["file_url"] == "https://microsoft.example/scope"
    assert row["source_metadata"]["text_storage_path"] == "onedrive/pm@example.com/drive-item-1.txt.txt"


def test_graph_project_document_backfill_dry_run_does_not_write_existing_or_missing():
    supabase = _Supabase()
    supabase.store["document_metadata"] = [
        {
            "id": "sharepoint_drive-item-1",
            "title": "RFI.pdf",
            "source_system": "sharepoint",
            "source_item_id": "drive-item-1",
            "project_id": 761,
            "source_web_url": "https://microsoft.example/rfi",
        },
        {
            "id": "sharepoint_drive-item-2",
            "title": "Submittal.pdf",
            "source_system": "sharepoint",
            "source_item_id": "drive-item-2",
            "project_id": 761,
            "source_web_url": "https://microsoft.example/submittal",
        },
    ]
    supabase.store["project_documents"] = [
        {
            "id": 1,
            "project_id": 761,
            "source_system": "sharepoint",
            "source_item_id": "drive-item-2",
            "deleted_at": None,
        }
    ]

    result = run_graph_project_document_backfill(supabase, dry_run=True)

    assert result["eligible"] == 2
    assert result["missing"] == 1
    assert result["skipped_existing"] == 1
    assert result["inserted"] == 0
    assert len(supabase.store["project_documents"]) == 1
