from src.services.integrations.microsoft_graph import teams


class _Result:
    def __init__(self, data):
        self.data = data


class _StorageBucket:
    def __init__(self):
        self.uploads = []

    def upload(self, path, content, options):
        self.uploads.append((path, content, options))
        return _Result({"path": path})


class _Storage:
    def __init__(self):
        self.bucket = _StorageBucket()

    def from_(self, _bucket_name):
        return self.bucket


class _TableQuery:
    def __init__(self, db, table_name):
        self.db = db
        self.table_name = table_name
        self.rows = list(db.tables.setdefault(table_name, []))
        self.action = "select"
        self.payload = None

    def select(self, *_args):
        self.action = "select"
        return self

    def insert(self, payload):
        self.action = "insert"
        self.payload = payload
        return self

    def update(self, payload):
        self.action = "update"
        self.payload = payload
        return self

    def eq(self, key, value):
        self.rows = [row for row in self.rows if row.get(key) == value]
        return self

    def single(self):
        return self

    def execute(self):
        table = self.db.tables.setdefault(self.table_name, [])
        if self.action == "insert":
            table.append(dict(self.payload))
            return _Result([dict(self.payload)])
        if self.action == "update":
            matching_ids = {id(row) for row in self.rows}
            updated = []
            for row in table:
                if id(row) in matching_ids:
                    row.update(self.payload)
                    updated.append(dict(row))
            return _Result(updated)
        if self.rows and len(self.rows) == 1:
            return _Result(dict(self.rows[0]))
        return _Result([dict(row) for row in self.rows])


class _FakeSupabase:
    def __init__(self):
        self.tables = {}
        self.storage = _Storage()

    def from_(self, table_name):
        return _TableQuery(self, table_name)


class _FakeGraph:
    GRAPH_BASE = "https://graph.microsoft.com/v1.0"

    def __init__(self):
        self.calls = []

    def is_configured(self):
        return True

    def get(self, url, params=None):
        self.calls.append((url, params))
        assert "/chats/getAllMessages" in url
        assert "/chats/chat-1/messages" not in url
        return {
            "value": [
                {
                    "id": "msg-1",
                    "messageType": "message",
                    "chatId": "chat-1",
                    "createdDateTime": "2026-05-06T13:00:00Z",
                    "lastModifiedDateTime": "2026-05-06T13:00:01Z",
                    "from": {"user": {"displayName": "Andrew Cannon", "mail": "acannon@alleatogroup.com"}},
                    "body": {"content": "Westfield owner billing needs the lien waivers sent today."},
                }
            ]
        }


def test_sync_user_chat_messages_uses_user_export_endpoint(monkeypatch):
    supabase = _FakeSupabase()
    graph = _FakeGraph()
    monkeypatch.setattr(teams, "get_graph_client", lambda: graph)
    monkeypatch.setattr(teams, "_now_graph_iso", lambda: "2026-05-06T14:00:00.000Z")
    monkeypatch.setattr(
        teams,
        "get_user_chats",
        lambda _user_email: [
            {
                "id": "chat-1",
                "display_name": "Andrew Cannon, Fatima Njie",
                "member_names": ["Andrew Cannon <acannon@alleatogroup.com>", "Fatima Njie"],
            }
        ],
    )
    monkeypatch.setattr(teams, "infer_project_id", lambda *_args, **_kwargs: (None, "none", 0.0))
    monkeypatch.setattr(teams, "_run_source_intelligence_compiler", lambda *_args, **_kwargs: None)

    count, new_ts = teams.sync_user_chat_messages(
        supabase,
        "acannon@alleatogroup.com",
        "2026-05-06T12:00:00Z",
    )

    assert count == 1
    assert new_ts == "2026-05-06T14:00:00.000Z"
    url, params = graph.calls[0]
    assert url == "https://graph.microsoft.com/v1.0/users/acannon@alleatogroup.com/chats/getAllMessages"
    assert params["$filter"] == (
        "lastModifiedDateTime gt 2026-05-06T12:00:00.000Z "
        "and lastModifiedDateTime lt 2026-05-06T14:00:00.000Z"
    )
    row = supabase.tables["document_metadata"][0]
    assert row["type"] == "teams_dm_conversation"
    assert row["status"] == "skipped_low_content"
    assert "Andrew Cannon" in row["participants"]
    assert "Westfield owner billing" in row["content"]
