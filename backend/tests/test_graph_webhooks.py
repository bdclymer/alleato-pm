from src.services.integrations.microsoft_graph import webhooks


class _Result:
    def __init__(self, data):
        self.data = data


class _TableQuery:
    def __init__(self, db, table_name):
        self.db = db
        self.table_name = table_name
        self.payload = None
        self.action = "insert"
        self.rows = list(db.tables.setdefault(table_name, []))

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

    def limit(self, _value):
        return self

    def select(self, *_args, **_kwargs):
        return self

    def execute(self):
        table = self.db.tables.setdefault(self.table_name, [])
        if self.action == "update":
            updated = []
            matching_ids = {id(row) for row in self.rows}
            for row in table:
                if id(row) in matching_ids:
                    row.update(self.payload)
                    updated.append(dict(row))
            return _Result(updated)
        row = dict(self.payload)
        table.append(row)
        return _Result([row])


class _FakeSupabase:
    def __init__(self):
        self.tables = {}

    def table(self, table_name):
        return _TableQuery(self, table_name)


def test_validation_token_returns_plain_text(client):
    response = client.post(
        "/api/graph/webhooks/notifications?validationToken=plain-token-123",
    )

    assert response.status_code == 200
    assert response.text == "plain-token-123"
    assert response.headers["content-type"].startswith("text/plain")


def test_lifecycle_validation_token_returns_plain_text(client):
    response = client.post(
        "/api/graph/webhooks/lifecycle?validationToken=lifecycle-token-123",
    )

    assert response.status_code == 200
    assert response.text == "lifecycle-token-123"
    assert response.headers["content-type"].startswith("text/plain")


def test_handle_graph_notifications_rejects_bad_client_state(monkeypatch):
    monkeypatch.setenv("GRAPH_WEBHOOK_CLIENT_STATE", "expected-state")

    try:
        webhooks.handle_graph_notifications(
            _FakeSupabase(),
            {
                "value": [
                    {
                        "subscriptionId": "sub-1",
                        "clientState": "wrong-state",
                        "resource": "users/a@example.com/messages",
                    }
                ]
            },
        )
    except webhooks.GraphWebhookAuthError as exc:
        assert "clientState" in str(exc)
    else:
        raise AssertionError("bad clientState should fail")


def test_handle_graph_notifications_records_valid_notification(monkeypatch):
    monkeypatch.setenv("GRAPH_WEBHOOK_CLIENT_STATE", "expected-state")
    supabase = _FakeSupabase()

    result = webhooks.handle_graph_notifications(
        supabase,
        {
            "value": [
                {
                    "subscriptionId": "sub-1",
                    "clientState": "expected-state",
                    "changeType": "created,updated",
                    "tenantId": "tenant-1",
                    "resource": "users/a@example.com/messages",
                    "resourceData": {"id": "message-1"},
                }
            ]
        },
    )

    assert result == {
        "status": "accepted",
        "notification_count": 1,
        "recorded": 1,
        "queued_realtime": 0,
    }
    row = supabase.tables["source_sync_runs"][0]
    assert row["source"] == "outlook_email"
    assert row["stage"] == "webhook"
    assert row["status"] == "queued"
    assert row["metadata"]["subscription_id"] == "sub-1"


def test_handle_graph_notifications_enqueues_outlook_realtime(monkeypatch):
    monkeypatch.setenv("GRAPH_WEBHOOK_CLIENT_STATE", "expected-state")
    supabase = _FakeSupabase()
    queued = []

    result = webhooks.handle_graph_notifications(
        supabase,
        {
            "value": [
                {
                    "subscriptionId": "sub-1",
                    "clientState": "expected-state",
                    "changeType": "created",
                    "resource": "users/a@example.com/messages/message-1",
                    "resourceData": {"id": "message-1"},
                }
            ]
        },
        on_realtime_notification=lambda notification: queued.append(notification) or True,
    )

    assert result["queued_realtime"] == 1
    assert queued[0]["resource"] == "users/a@example.com/messages/message-1"


def test_process_graph_notification_realtime_syncs_mailbox_delta(monkeypatch):
    monkeypatch.setenv("GRAPH_WEBHOOK_CLIENT_STATE", "expected-state")
    supabase = _FakeSupabase()
    calls = []

    monkeypatch.setattr(
        "src.services.integrations.microsoft_graph.sync.sync_outlook_mailbox_delta",
        lambda client, mailbox, *, reason: calls.append((client, mailbox, reason))
        or {"status": "succeeded", "items_synced": 1},
    )

    result = webhooks.process_graph_notification_realtime(
        supabase,
        {
            "subscriptionId": "sub-1",
            "clientState": "expected-state",
            "changeType": "created",
            "resource": "users/a@example.com/messages/message-1",
            "resourceData": {"id": "message-1"},
        },
    )

    assert calls == [(supabase, "a@example.com", "graph_webhook")]
    assert result["message_id"] == "message-1"
    assert result["subscription_id"] == "sub-1"


def test_handle_graph_lifecycle_marks_subscription_removed(monkeypatch):
    monkeypatch.setenv("GRAPH_WEBHOOK_CLIENT_STATE", "expected-state")
    supabase = _FakeSupabase()
    supabase.tables["graph_subscriptions"] = [
        {"graph_subscription_id": "sub-removed", "status": "active"}
    ]

    result = webhooks.handle_graph_lifecycle_notifications(
        supabase,
        {
            "value": [
                {
                    "subscriptionId": "sub-removed",
                    "clientState": "expected-state",
                    "tenantId": "tenant-1",
                    "lifecycleEvent": "subscriptionRemoved",
                }
            ]
        },
    )

    assert result == {"status": "accepted", "notification_count": 1, "recorded": 1}
    assert supabase.tables["graph_subscriptions"][0]["status"] == "removed"
    assert supabase.tables["graph_subscriptions"][0]["last_lifecycle_event_at"]
    row = supabase.tables["source_sync_runs"][0]
    assert row["stage"] == "webhook"
    assert row["status"] == "warning"
    assert row["metadata"]["lifecycle_event"] == "subscriptionRemoved"
