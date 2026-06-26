from src.services.integrations.microsoft_graph import sync
from src.services.integrations.microsoft_graph import ocr_worker
import time


class _FakeGraph:
    def is_configured(self):
        return True


class _FakeSupabase:
    pass


class _SlowOcrQuery:
    not_ = None

    def __init__(self):
        self.not_ = self

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, *_args, **_kwargs):
        return self

    def is_(self, *_args, **_kwargs):
        return self

    def limit(self, *_args, **_kwargs):
        return self

    def execute(self):
        time.sleep(2)
        return type("Result", (), {"data": []})()


class _SlowOcrSupabase:
    def from_(self, table_name):
        assert table_name == "document_metadata"
        return _SlowOcrQuery()


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
        run_ocr=False,
        run_attachment_promotion=False,
    )

    assert result["status"] == "complete"
    assert result["phases"]["embedding"] == "skipped"
    assert result["embed"]["status"] == "skipped"
    assert result["intelligence_extraction"]["status"] == "skipped"


def test_run_graph_sync_runs_intelligence_for_fetch_only_communications(monkeypatch):
    extraction_calls = []

    monkeypatch.setattr(sync, "get_graph_client", lambda: _FakeGraph())
    monkeypatch.setenv("GRAPH_SYNC_OUTLOOK", "false")
    monkeypatch.setenv("GRAPH_SYNC_TEAMS", "true")
    monkeypatch.setenv("GRAPH_SYNC_TEAMS_DM", "false")
    monkeypatch.setenv("GRAPH_SYNC_ONEDRIVE", "false")
    monkeypatch.setenv("SHAREPOINT_SYNC_FOLDERS", "")
    monkeypatch.setenv("TEAMS_CHANNEL_SYNC_MAX_CHANNELS", "1")

    monkeypatch.setattr(
        sync,
        "get_all_teams_and_channels",
        lambda _supabase: [
            {
                "team_id": "team-1",
                "team_name": "Team",
                "channel_id": "channel-1",
                "channel_name": "General",
            }
        ],
    )
    monkeypatch.setattr(sync, "_get_delta_token", lambda *_args, **_kwargs: "")
    monkeypatch.setattr(
        sync,
        "sync_teams_channel",
        lambda *_args, **_kwargs: (2, "next-token"),
    )
    monkeypatch.setattr(sync, "_save_sync_state", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(sync, "_record_sync_run_safe", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(
        "src.services.intelligence.project_synthesizer.synthesize_new_comms_since",
        lambda since: extraction_calls.append(since) or {
            "projects": 1,
            "cards_written": 0,
            "synthesis_packets_written": 0,
            "errors": [],
        },
    )
    monkeypatch.setattr(
        sync,
        "embed_pending_graph_documents",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(
            AssertionError("embedding should not run")
        ),
    )

    result = sync.run_graph_sync(
        _FakeSupabase(),
        run_embedding=False,
        run_ocr=False,
        run_attachment_promotion=False,
    )

    assert result["status"] == "complete"
    assert result["teams"] == 2
    assert result["phases"]["embedding"] == "skipped"
    assert result["intelligence_extraction"]["projects"] == 1
    assert extraction_calls


def test_ocr_no_text_fetch_times_out_loudly(monkeypatch):
    monkeypatch.setenv("GRAPH_OCR_FETCH_TIMEOUT_SECONDS", "1")

    try:
        ocr_worker._fetch_no_text_records(_SlowOcrSupabase(), 1)
    except TimeoutError as exc:
        assert "OCR no_text fetch exceeded 1s" in str(exc)
    else:
        raise AssertionError("stalled OCR no_text fetch should time out")


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


class _StateResult:
    def __init__(self, data, count=None):
        self.data = data
        self.count = count


class _MutableStateQuery:
    def __init__(self, db, table_name):
        self.db = db
        self.table_name = table_name
        self.rows = list(db.tables.setdefault(table_name, []))
        self.action = "select"
        self.payload = None

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, key, value):
        self.rows = [row for row in self.rows if row.get(key) == value]
        return self

    def is_(self, key, value):
        if value == "null":
            self.rows = [row for row in self.rows if row.get(key) is None]
        else:
            self.rows = [row for row in self.rows if row.get(key) == value]
        return self

    def update(self, payload):
        self.action = "update"
        self.payload = payload
        return self

    def insert(self, payload):
        self.action = "insert"
        self.payload = payload
        return self

    def execute(self):
        table = self.db.tables.setdefault(self.table_name, [])
        if self.action == "update":
            matched = {id(row) for row in self.rows}
            updated = []
            for row in table:
                if id(row) in matched:
                    row.update(self.payload)
                    updated.append(dict(row))
            return _StateResult(updated)
        if self.action == "insert":
            row = dict(self.payload)
            table.append(row)
            return _StateResult([row])
        rows = [dict(row) for row in self.rows]
        return _StateResult(rows, count=len(rows))


class _MutableStateSupabase:
    def __init__(self, tables):
        self.tables = tables

    def from_(self, table_name):
        return _MutableStateQuery(self, table_name)


def test_limit_sync_users_selects_stalest_slice(monkeypatch):
    monkeypatch.setenv("TEAMS_DM_SYNC_MAX_USERS", "2")
    rag_supabase = _FakeStateSupabase(
        [
            {"resource_id": "newer@example.com", "last_sync_at": "2026-05-13T23:00:00Z"},
            {"resource_id": "older@example.com", "last_sync_at": "2026-05-13T20:00:00Z"},
        ]
    )
    monkeypatch.setattr(sync, "_get_graph_sync_state_read_client", lambda: rag_supabase)

    selected = sync._limit_sync_users(
        _FakeSupabase(),
        source="teams_chat_export",
        users=["newer@example.com", "never@example.com", "older@example.com"],
        env_key="TEAMS_DM_SYNC_MAX_USERS",
        default_limit=1,
    )

    assert selected == ["never@example.com", "older@example.com"]


def test_outlook_persisted_count_uses_raw_intake_rows(monkeypatch):
    rag_supabase = _MutableStateSupabase(
        {
            "outlook_email_intake": [
                {"id": 1, "mailbox_user_id": "bclymer@alleatogroup.com", "deleted_at": None},
                {"id": 2, "mailbox_user_id": "bclymer@alleatogroup.com", "deleted_at": "2026-06-20T00:00:00Z"},
                {"id": 3, "mailbox_user_id": "other@example.com", "deleted_at": None},
            ],
            "document_metadata": [],
        }
    )
    monkeypatch.setattr(sync, "get_rag_read_client", lambda: rag_supabase)

    assert sync._count_outlook_docs_for_mailbox(_FakeSupabase(), "bclymer@alleatogroup.com") == 1


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
    monkeypatch.delenv("OUTLOOK_SYNC_SINCE", raising=False)

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


def test_outlook_mailbox_delta_passes_since_date_even_with_existing_token(monkeypatch):
    calls = {}

    def fake_sync_outlook_emails(_supabase, user_email, project_keywords, token, since_date):
        calls["user_email"] = user_email
        calls["project_keywords"] = project_keywords
        calls["token"] = token
        calls["since_date"] = since_date
        return 0, token

    monkeypatch.setenv("OUTLOOK_SYNC_SINCE", "2026-06-20")
    monkeypatch.setattr(sync, "_get_delta_token", lambda *_args, **_kwargs: "inbox:stale|sent:stale")
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
        "token": "inbox:stale|sent:stale",
        "since_date": "2026-06-20",
    }


def test_outlook_mailbox_delta_allows_updates_without_net_new_intake_rows(monkeypatch):
    counts = [839, 839]

    monkeypatch.setattr(sync, "_count_outlook_docs_for_mailbox", lambda *_args, **_kwargs: counts.pop(0))
    monkeypatch.setattr(sync, "_get_delta_token", lambda *_args, **_kwargs: "inbox:next|sent:next")
    monkeypatch.setattr(
        sync,
        "sync_outlook_emails",
        lambda *_args, **_kwargs: (17, "inbox:next|sent:next"),
    )
    monkeypatch.setattr(sync, "_save_sync_state", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(sync, "_record_sync_run_safe", lambda *_args, **_kwargs: None)

    result = sync.sync_outlook_mailbox_delta(
        _FakeSupabase(),
        "bclymer@alleatogroup.com",
        reason="unit_test",
        verify_persisted_count=True,
    )

    assert result["status"] == "succeeded"
    assert result["items_synced"] == 17
    assert result["persisted_delta"] == 0
    assert result["error"] is None


def test_drain_pending_outlook_mailboxes_processes_queued_rows(monkeypatch):
    rag_supabase = _MutableStateSupabase(
        {
            "graph_sync_state": [
                {
                    "source": "outlook_email",
                    "resource_id": "older@example.com",
                    "resource_name": "Outlook: older@example.com",
                    "sync_status": "webhook_pending",
                    "updated_at": "2026-06-17T12:00:00Z",
                },
                {
                    "source": "outlook_email",
                    "resource_id": "newer@example.com",
                    "resource_name": "Outlook: newer@example.com",
                    "sync_status": "webhook_pending",
                    "updated_at": "2026-06-17T12:05:00Z",
                },
            ]
        }
    )
    processed = []
    monkeypatch.setattr(sync, "_get_graph_sync_state_read_client", lambda: rag_supabase)
    monkeypatch.setattr(sync, "_get_graph_sync_state_write_client", lambda: rag_supabase)
    monkeypatch.setattr(
        sync,
        "sync_outlook_mailbox_delta",
        lambda _supabase, mailbox, *, reason, verify_persisted_count: processed.append(
            (mailbox, reason, verify_persisted_count)
        )
        or {"status": "succeeded", "items_synced": 2},
    )

    result = sync.drain_pending_outlook_mailboxes(_FakeSupabase(), limit=1)

    assert result == {
        "status": "ok",
        "queued": 1,
        "processed": 1,
        "failed": 0,
        "items_synced": 2,
        "mailboxes": ["older@example.com"],
    }
    assert processed == [("older@example.com", "graph_webhook_drain", False)]
