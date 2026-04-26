"""Tests for all main.py API routes."""
import pytest
from unittest.mock import MagicMock


class TestHealthEndpoint:
    """Health endpoint tests."""

    def test_health_returns_200(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert isinstance(data["openai_configured"], bool)

    def test_health_openai_configured(self, client, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "sk-real")
        r = client.get("/health")
        assert r.json()["openai_configured"] is True

    def test_health_openai_not_configured(self, client, monkeypatch):
        monkeypatch.delenv("OPENAI_API_KEY", raising=False)
        r = client.get("/health")
        assert r.json()["openai_configured"] is False


class TestProjectsEndpoints:
    """Project CRUD endpoints."""

    def test_list_projects_empty(self, client, mock_supabase_store):
        mock_supabase_store.list_projects.return_value = []
        r = client.get("/api/projects")
        assert r.status_code == 200
        assert r.json()["projects"] == []

    def test_list_projects_with_data(self, client, mock_supabase_store, sample_project_data):
        mock_supabase_store.list_projects.return_value = [sample_project_data]
        r = client.get("/api/projects")
        assert r.status_code == 200
        projects = r.json()["projects"]
        assert len(projects) == 1
        assert projects[0]["name"] == "Test Project"

    def test_get_project_success(self, client, mock_supabase_store, sample_project_data):
        mock_supabase_store.get_project.return_value = sample_project_data
        mock_supabase_store.list_tasks.return_value = []
        mock_supabase_store.list_insights.return_value = []
        r = client.get("/api/projects/1")
        assert r.status_code == 200
        assert r.json()["project"]["name"] == "Test Project"

    def test_get_project_not_found(self, client, mock_supabase_store):
        mock_supabase_store.get_project.return_value = None
        r = client.get("/api/projects/999")
        assert r.status_code == 404
        assert r.json()["detail"] == "Project not found"


class TestChatEndpoint:
    """POST /api/chat tests."""

    def test_chat_empty_message(self, client):
        r = client.post("/api/chat", json={"message": ""})
        assert r.status_code == 422

    def test_chat_missing_message(self, client):
        r = client.post("/api/chat", json={})
        assert r.status_code == 422

    def test_chat_success(self, client, mock_supabase_store):
        mock_supabase_store.search_chunks_by_keyword.return_value = []
        mock_supabase_store.fetch_recent_chunks.return_value = []
        mock_supabase_store.list_tasks.return_value = []
        mock_supabase_store.list_insights.return_value = []
        mock_supabase_store.get_project.return_value = None
        r = client.post("/api/chat", json={"message": "hello"})
        assert r.status_code == 200
        data = r.json()
        assert "reply" in data


class TestIngestionEndpoint:
    """POST /api/ingest/fireflies tests."""

    def test_legacy_file_ingest_disabled_by_default(self, client, mock_fireflies_pipeline, sample_ingest_request):
        r = client.post("/api/ingest/fireflies", json=sample_ingest_request)
        assert r.status_code == 410
        assert "Legacy file-based Fireflies ingest is disabled" in r.json()["detail"]
        mock_fireflies_pipeline.ingest_file.assert_not_called()

    def test_legacy_file_ingest_enabled(self, client, mock_fireflies_pipeline, sample_ingest_request, monkeypatch):
        monkeypatch.setenv("ENABLE_LEGACY_FIREFLIES_FILE_INGEST", "true")
        r = client.post("/api/ingest/fireflies", json=sample_ingest_request)
        assert r.status_code == 200
        data = r.json()
        assert data["result"]["status"] == "success"
        mock_fireflies_pipeline.ingest_file.assert_called_once_with(
            "/path/to/fireflies/transcript.json", project_id=1, dry_run=True
        )

    def test_ingest_no_project_id(self, client, mock_fireflies_pipeline, monkeypatch):
        monkeypatch.setenv("ENABLE_LEGACY_FIREFLIES_FILE_INGEST", "true")
        r = client.post("/api/ingest/fireflies", json={"path": "/some/file.json", "dry_run": True})
        assert r.status_code == 200
        mock_fireflies_pipeline.ingest_file.assert_called_once_with(
            "/some/file.json", project_id=None, dry_run=True
        )

    def test_ingest_error(self, client, mock_fireflies_pipeline, monkeypatch):
        monkeypatch.setenv("ENABLE_LEGACY_FIREFLIES_FILE_INGEST", "true")
        mock_fireflies_pipeline.ingest_file.side_effect = Exception("File not found")
        with pytest.raises(Exception, match="File not found"):
            client.post(
                "/api/ingest/fireflies",
                json={"path": "/bad.json", "dry_run": True},
            )


class TestOpenAPIDocs:
    """Verify docs endpoints are accessible."""

    def test_openapi_json(self, client):
        r = client.get("/openapi.json")
        assert r.status_code == 200
        assert "paths" in r.json()

    def test_docs_page(self, client):
        r = client.get("/docs")
        assert r.status_code == 200
