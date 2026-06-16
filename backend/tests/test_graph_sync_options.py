from src.services.integrations.microsoft_graph import sync


class _FakeGraph:
    def is_configured(self):
        return True


class _FakeSupabase:
    pass


def test_run_graph_sync_can_skip_heavy_embedding_and_compiler(monkeypatch):
    monkeypatch.setattr(sync, "get_graph_client", lambda: _FakeGraph())
    monkeypatch.setenv("GRAPH_SYNC_OUTLOOK", "false")
    monkeypatch.setenv("GRAPH_SYNC_TEAMS", "false")
    monkeypatch.setenv("GRAPH_SYNC_TEAMS_DM", "false")
    monkeypatch.setenv("GRAPH_SYNC_ONEDRIVE", "false")
    monkeypatch.setenv("SHAREPOINT_SYNC_FOLDERS", "")

    def fail_embed(*_args, **_kwargs):
        raise AssertionError("embedding should not run")

    monkeypatch.setattr(sync, "embed_pending_graph_documents", fail_embed)

    result = sync.run_graph_sync(
        _FakeSupabase(),
        run_embedding=False,
    )

    assert result["status"] == "complete"
    assert result["phases"]["embedding"] == "skipped"
    assert result["embed"]["status"] == "skipped"


class _FakeQuery:
    def __init__(self, rows):
        self.rows = rows

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, *_args, **_kwargs):
        return self

    def in_(self, *_args, **_kwargs):
        return self

    def execute(self):
        return type("Result", (), {"data": self.rows})()


class _FakeStateSupabase:
    def __init__(self, rows):
        self.rows = rows

    def from_(self, table):
        assert table == "graph_sync_state"
        return _FakeQuery(self.rows)


def test_limit_sync_users_selects_stalest_slice(monkeypatch):
    monkeypatch.setenv("TEAMS_DM_SYNC_MAX_USERS", "2")
    supabase = _FakeStateSupabase(
        [
            {"resource_id": "newer@example.com", "last_sync_at": "2026-05-13T23:00:00Z"},
            {"resource_id": "older@example.com", "last_sync_at": "2026-05-13T20:00:00Z"},
        ]
    )

    selected = sync._limit_sync_users(
        supabase,
        source="teams_chat_export",
        users=["newer@example.com", "never@example.com", "older@example.com"],
        env_key="TEAMS_DM_SYNC_MAX_USERS",
        default_limit=1,
    )

    assert selected == ["never@example.com", "older@example.com"]


def test_outlook_mailbox_delta_does_not_load_project_keywords_by_default(monkeypatch):
    calls = {}

    def fail_project_keywords(_supabase):
        raise AssertionError("raw Outlook mailbox sync must not query projects")

    def fake_sync_outlook_emails(_supabase, user_email, project_keywords, token, since_date):
        calls["user_email"] = user_email
        calls["project_keywords"] = project_keywords
        calls["token"] = token
        calls["since_date"] = since_date
        return 1, "inbox:next|sent:next"

    monkeypatch.setattr(sync, "_get_active_project_keywords", fail_project_keywords)
    monkeypatch.setattr(sync, "_get_delta_token", lambda *_args, **_kwargs: "")
    monkeypatch.setattr(sync, "sync_outlook_emails", fake_sync_outlook_emails)
    monkeypatch.setattr(sync, "_save_sync_state", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(sync, "_record_sync_run_safe", lambda *_args, **_kwargs: None)

    result = sync.sync_outlook_mailbox_delta(
        _FakeSupabase(),
        "bclymer@alleatogroup.com",
        reason="unit_test",
        verify_persisted_count=False,
    )

    assert result["status"] == "succeeded"
    assert calls == {
        "user_email": "bclymer@alleatogroup.com",
        "project_keywords": [],
        "token": "",
        "since_date": None,
    }
