from src.services.integrations.microsoft_graph import onedrive
import pytest


class _Result:
    def __init__(self, data=None):
        self.data = data or []


class _StorageBucket:
    def __init__(self):
        self.uploads = []

    def upload(self, path, content, options):
        self.uploads.append((path, content, options))
        return _Result([{"path": path}])


class _Storage:
    def __init__(self):
        self.bucket = _StorageBucket()

    def from_(self, _name):
        return self.bucket


class _Table:
    def __init__(self, store, name):
        self.store = store
        self.name = name
        self.filters = {}
        self.payload = None
        self.action = "select"

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, key, value):
        self.filters[key] = value
        return self

    def is_(self, key, value):
        self.filters[key] = value
        return self

    def limit(self, *_args, **_kwargs):
        return self

    def insert(self, payload):
        self.action = "insert"
        self.payload = payload
        return self

    def update(self, payload):
        self.action = "update"
        self.payload = payload
        return self

    def upsert(self, payload):
        self.action = "upsert"
        self.payload = payload
        return self

    def execute(self):
        rows = self.store.setdefault(self.name, [])
        matches = [
            row for row in rows if all(row.get(key) == value for key, value in self.filters.items())
        ]

        if self.action == "insert":
            row = {"id": len(rows) + 1, **self.payload}
            rows.append(row)
            return _Result([row])

        if self.action == "update":
            for row in matches:
                row.update(self.payload)
            return _Result(matches)

        if self.action == "upsert":
            payload = self.payload
            existing = next((row for row in rows if row.get("id") == payload.get("id")), None)
            if existing:
                existing.update(payload)
                return _Result([existing])
            rows.append(dict(payload))
            return _Result([payload])

        return _Result(matches)


class _Supabase:
    def __init__(self):
        self.store = {}
        self.storage = _Storage()

    def from_(self, name):
        return _Table(self.store, name)

    def table(self, name):
        return self.from_(name)


class _Graph:
    def __init__(self, items):
        self.items = items
        self.downloads = []

    def is_configured(self):
        return True

    def get_delta(self, path, delta_token):
        assert path == "/users/pm@example.com/drive/root:/Projects:/delta"
        assert delta_token is None
        return self.items, "next-token"

    def download_bytes(self, download_url):
        self.downloads.append(download_url)
        return b"This is enough project scope text to pass extraction and assign a project."


class _FailingDeltaGraph(_Graph):
    def __init__(self):
        super().__init__([])

    def get_delta(self, path, delta_token):
        raise RuntimeError("404 Not Found")


def _drive_item():
    return {
        "id": "drive-item-1",
        "name": "Scope.txt",
        "size": 72,
        "@microsoft.graph.downloadUrl": "https://download.example/scope",
        "webUrl": "https://microsoft.example/scope",
        "lastModifiedDateTime": "2026-05-12T10:00:00Z",
        "eTag": "etag-1",
        "parentReference": {"driveId": "drive-1"},
        "createdBy": {"user": {"displayName": "Project Manager"}},
    }


def _drive_item_with_id(item_id):
    item = _drive_item()
    item["id"] = item_id
    item["name"] = f"Scope {item_id}.txt"
    item["@microsoft.graph.downloadUrl"] = f"https://download.example/{item_id}"
    return item


def test_onedrive_sync_promotes_assigned_file_to_project_documents(monkeypatch):
    supabase = _Supabase()
    graph = _Graph([_drive_item()])
    monkeypatch.setattr(onedrive, "get_graph_client", lambda: graph)
    monkeypatch.setattr(onedrive, "infer_project_id", lambda *_args, **_kwargs: (25125, "project_number", 0.95))

    count, token = onedrive.sync_onedrive_folder(supabase, "pm@example.com", "/Projects")

    assert count == 1
    assert token == "next-token"
    assert graph.downloads == ["https://download.example/scope"]
    assert supabase.storage.bucket.uploads[0][0] == "onedrive/pm@example.com/drive-item-1.txt.txt"

    metadata = supabase.store["document_metadata"][0]
    assert metadata["id"] == "onedrive_drive-item-1"
    assert metadata["project_id"] == 25125
    assert metadata["source_system"] == "onedrive"
    assert metadata["file_path"] == "onedrive/pm@example.com/drive-item-1.txt.txt"

    project_doc = supabase.store["project_documents"][0]
    assert project_doc["project_id"] == 25125
    assert project_doc["source_system"] == "onedrive"
    assert project_doc["source_item_id"] == "drive-item-1"
    assert project_doc["file_url"] == "https://microsoft.example/scope"
    assert project_doc["storage_path"] is None
    assert project_doc["source_metadata"]["text_storage_path"] == metadata["file_path"]


def test_existing_onedrive_metadata_still_promotes_to_project_documents(monkeypatch):
    supabase = _Supabase()
    supabase.store["document_metadata"] = [
        {
            "id": "onedrive_drive-item-1",
            "project_id": 25125,
            "content": "Existing extracted text",
        }
    ]
    graph = _Graph([_drive_item()])
    monkeypatch.setattr(onedrive, "get_graph_client", lambda: graph)

    count, _token = onedrive.sync_onedrive_folder(supabase, "pm@example.com", "/Projects")

    assert count == 0
    assert graph.downloads == []
    project_doc = supabase.store["project_documents"][0]
    assert project_doc["project_id"] == 25125
    assert project_doc["source_system"] == "onedrive"
    assert project_doc["source_item_id"] == "drive-item-1"


def test_onedrive_sync_caps_supported_files_per_folder(monkeypatch, caplog):
    supabase = _Supabase()
    graph = _Graph([_drive_item_with_id("a"), _drive_item_with_id("b")])
    monkeypatch.setenv("GRAPH_INGEST_MAX_FILES_PER_FOLDER", "1")
    monkeypatch.setattr(onedrive, "get_graph_client", lambda: graph)
    monkeypatch.setattr(onedrive, "infer_project_id", lambda *_args, **_kwargs: (25125, "project_number", 0.95))

    count, token = onedrive.sync_onedrive_folder(supabase, "pm@example.com", "/Projects")

    assert count == 1
    assert token == "next-token"
    assert graph.downloads == ["https://download.example/a"]
    assert "File ingestion capped at 1 supported files" in caplog.text


def test_pdf_optional_dependency_warning_logs_once(monkeypatch, caplog):
    real_import = __import__

    def fake_import(name, *args, **kwargs):
        if name in {"pypdf", "fitz"}:
            raise ImportError(name)
        return real_import(name, *args, **kwargs)

    onedrive._WARNED_OPTIONAL_DEPENDENCIES.clear()
    monkeypatch.setattr("builtins.__import__", fake_import)

    assert onedrive._extract_text_from_pdf(b"%PDF no text") == ""
    assert onedrive._extract_text_from_pdf(b"%PDF no text") == ""

    assert caplog.text.count("pypdf not installed") == 1
    assert caplog.text.count("PyMuPDF not installed") == 1


def test_onedrive_delta_failure_raises_for_orchestrator(monkeypatch):
    monkeypatch.setattr(onedrive, "get_graph_client", lambda: _FailingDeltaGraph())

    with pytest.raises(RuntimeError, match="OneDrive delta query failed"):
        onedrive.sync_onedrive_folder(_Supabase(), "pm@example.com", "/Projects")
