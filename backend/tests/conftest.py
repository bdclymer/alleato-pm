"""Shared fixtures for backend tests."""
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Ensure backend/src is importable
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))


# ---------------------------------------------------------------------------
# Stub heavy third-party modules BEFORE importing our app
# ---------------------------------------------------------------------------

def _stub_modules():
    """Pre-register stubs for modules that require credentials or native deps."""
    stubs = {}

    # supabase
    supabase_mod = MagicMock()
    supabase_mod.create_client = MagicMock(return_value=MagicMock())
    stubs["supabase"] = supabase_mod

    # langchain / crawl4ai / psycopg2 etc.
    for mod_name in [
        "langchain", "langchain.text_splitter", "langchain_community",
        "langchain_community.embeddings", "crawl4ai", "psycopg2",
        "pandas", "numpy",
    ]:
        stubs[mod_name] = MagicMock()

    for name, mod in stubs.items():
        sys.modules.setdefault(name, mod)


_stub_modules()

# Set required env vars before importing app
os.environ.setdefault("OPENAI_API_KEY", "sk-test-key")
os.environ.setdefault("SUPABASE_URL", "https://fake.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "fake-key")


# ---------------------------------------------------------------------------
# Now safe to import the app
# ---------------------------------------------------------------------------

# Patch env_loader so it doesn't try to read a real .env
with patch.dict(sys.modules, {"src.services.env_loader": MagicMock()}):
    # Patch heavy service modules
    mock_supabase_helpers_mod = MagicMock()
    mock_fireflies_mod = MagicMock()
    class _FakeFirefliesIngestionPipeline:
        def __init__(self, *args, **kwargs):
            pass
    mock_fireflies_mod.FirefliesIngestionPipeline = _FakeFirefliesIngestionPipeline

    with patch.dict(sys.modules, {
        "src.services.env_loader": MagicMock(),
        "src.services.supabase_helpers": mock_supabase_helpers_mod,
        "src.services.ingestion": MagicMock(),
        "src.services.ingestion.fireflies_pipeline": mock_fireflies_mod,
        "src.workers": MagicMock(),
        "src.workers.scripts": MagicMock(),
        "src.api.admin_endpoints": MagicMock(),
        "src.yokeflow": MagicMock(),
        "src.yokeflow.api": MagicMock(),
        "src.yokeflow.api.router": MagicMock(),
    }):
        from src.api.main import app, get_rag_store as _get_rag_store, get_ingestion_pipeline as _get_ingestion_pipeline  # noqa: E402


from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def mock_supabase_store():
    """Mock SupabaseRagStore injected via dependency override."""
    store = MagicMock()
    store.list_projects.return_value = []
    store.get_project.return_value = None
    store.list_tasks.return_value = []
    store.list_insights.return_value = []
    store.search_financial_rows.return_value = []
    store.search_chunks_by_keyword.return_value = []
    store.fetch_recent_chunks.return_value = []

    app.dependency_overrides[_get_rag_store] = lambda: store
    yield store
    app.dependency_overrides.pop(_get_rag_store, None)


@pytest.fixture
def mock_fireflies_pipeline():
    """Mock FirefliesIngestionPipeline injected via dependency override."""
    pipeline = MagicMock()

    class _IngestionResult:
        def __init__(self):
            self.status = "success"
            self.documents_created = 1
            self.chunks_created = 10
            self.tasks_created = 5
            self.insights_created = 3

    pipeline.ingest_file.return_value = _IngestionResult()

    app.dependency_overrides[_get_ingestion_pipeline] = lambda: pipeline
    yield pipeline
    app.dependency_overrides.pop(_get_ingestion_pipeline, None)


@pytest.fixture
def sample_project_data():
    return {
        "id": 1,
        "name": "Test Project",
        "meeting_count": 10,
        "open_tasks": 5,
    }


@pytest.fixture
def sample_chat_request():
    return {"message": "What are the risks?", "project_id": 1, "limit": 5}


@pytest.fixture
def sample_ingest_request():
    return {
        "path": "/path/to/fireflies/transcript.json",
        "project_id": 1,
        "dry_run": True,
    }
