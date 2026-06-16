from services.integrations.microsoft_graph import outlook


class _Result:
    def __init__(self, data=None):
        self.data = data or []


class _Table:
    def __init__(self, store, name):
        self.store = store
        self.name = name
        self.filters = {}
        self.payload = None

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

    def update(self, payload):
        self.payload = payload
        return self

    def insert(self, payload):
        self.payload = payload
        return self

    def upsert(self, payload, **_kwargs):
        self.payload = payload
        return self

    def execute(self):
        rows = self.store.setdefault(self.name, [])
        if self.payload is None:
            matches = [
                row
                for row in rows
                if all(row.get(key) == value for key, value in self.filters.items())
            ]
            return _Result(matches)

        if self.filters:
            for row in rows:
                if all(row.get(key) == value for key, value in self.filters.items()):
                    row.update(self.payload)
                    return _Result([row])

        row = {"id": len(rows) + 1, **self.payload}
        rows.append(row)
        return _Result([row])


class _Supabase:
    def __init__(self):
        self.store = {}

    def from_(self, name):
        return _Table(self.store, name)


class _Graph:
    def get(self, *_args, **_kwargs):
        raise AssertionError("attachment already has contentBytes")


class _DeltaGraph:
    def is_configured(self):
        return True

    def get_delta(self, base_path, _delta_token):
        if "Inbox" not in base_path:
            return [], "sent-token"
        return [
            {
                "id": "message-raw-1",
                "subject": "Project schedule coordination",
                "from": {
                    "emailAddress": {
                        "name": "Walter Allen",
                        "address": "wallen@example.com",
                    }
                },
                "toRecipients": [
                    {
                        "emailAddress": {
                            "name": "Brandon Clymer",
                            "address": "bclymer@alleatogroup.com",
                        }
                    }
                ],
                "ccRecipients": [],
                "receivedDateTime": "2026-06-16T18:00:00Z",
                "bodyPreview": "Please confirm the project schedule coordination path.",
                "body": {
                    "content": "Please confirm the project schedule coordination path for the team."
                },
                "categories": [],
                "importance": "normal",
                "hasAttachments": False,
                "webLink": "https://outlook.office.com/mail/message-raw-1",
                "internetMessageId": "<message-raw-1@example.com>",
                "conversationId": "conversation-raw-1",
                "internetMessageHeaders": [],
            }
        ], "inbox-token"


class _NoProjectLookupSupabase(_Supabase):
    def from_(self, name):
        if name in {"projects", "project_emails"}:
            raise AssertionError(f"Outlook raw ingestion must not synchronously query {name}")
        return super().from_(name)


def test_sync_outlook_emails_defers_project_assignment_before_raw_intake(monkeypatch):
    supabase = _NoProjectLookupSupabase()
    monkeypatch.setattr(outlook, "get_graph_client", lambda: _DeltaGraph())

    synced, token = outlook.sync_outlook_emails(
        supabase,
        "bclymer@alleatogroup.com",
        project_keywords=[],
    )

    assert synced == 1
    assert token == "inbox:inbox-token|sent:sent-token"
    row = supabase.store["outlook_email_intake"][0]
    assert row["graph_message_id"] == "message-raw-1"
    assert row["mailbox_user_id"] == "bclymer@alleatogroup.com"
    assert row["project_id"] is None
    assert row["match_status"] == "unassigned"
    assert row["assignment_method"] == "assignment_deferred"
    assert row["source_metadata"]["project_assignment"]["status"] == "deferred"


def test_outlook_intake_attachment_stores_bytea_hex_content():
    supabase = _Supabase()
    attachment = {
        "@odata.type": "#microsoft.graph.fileAttachment",
        "id": "attachment-1",
        "name": "permit.pdf",
        "contentType": "application/pdf",
        "size": 3,
        "isInline": False,
        "contentBytes": "YWJj",
    }

    wrote = outlook._upsert_outlook_intake_attachment(
        supabase_client=supabase,
        graph=_Graph(),
        user_id="pm@example.com",
        msg_id="message-1",
        intake_email_id=42,
        email_attachment_id=9,
        attachment=attachment,
    )

    assert wrote is True
    row = supabase.store["outlook_email_intake_attachments"][0]
    assert row["intake_email_id"] == 42
    assert row["email_attachment_id"] == 9
    assert row["file_name"] == "permit.pdf"
    assert row["file_size"] == 3
    assert row["content"] == "\\x616263"
    assert row["file_url"] == "graph://messages/message-1/attachments/attachment-1"


def test_outlook_intake_email_updates_existing_graph_message():
    supabase = _Supabase()
    supabase.store["outlook_email_intake"] = [
        {"id": 7, "graph_message_id": "message-1", "project_id": 1, "subject": "Old"}
    ]
    msg = {
        "id": "message-1",
        "subject": "Updated",
        "receivedDateTime": "2026-05-02T10:00:00Z",
        "hasAttachments": True,
        "conversationId": "conversation-1",
        "toRecipients": [{"emailAddress": {"address": "owner@example.com"}}],
    }

    email_id = outlook._upsert_outlook_intake_email(
        supabase_client=supabase,
        project_id=876,
        project_email_id=12,
        document_metadata_id="outlook_message-1",
        msg=msg,
        user_email="pm@example.com",
        body_text="Body",
        sender_name="PM",
        sender_addr="pm@example.com",
        assignment_method="project_name",
        assignment_confidence=0.91,
        source_metadata={"outlook_message_id": "message-1"},
    )

    assert email_id == 7
    row = supabase.store["outlook_email_intake"][0]
    assert row["project_id"] == 876
    assert row["project_email_id"] == 12
    assert row["document_metadata_id"] == "outlook_message-1"
    assert row["subject"] == "Updated"
    assert row["to_list"] == ["owner@example.com"]
    assert row["mailbox_user_id"] == "pm@example.com"
    assert row["match_status"] == "matched"


def test_reconcile_outlook_project_assignment_uses_document_metadata_project():
    supabase = _Supabase()
    supabase.store["document_metadata"] = [
        {"id": "outlook_message-1", "project_id": 178}
    ]
    supabase.store["project_emails"] = [
        {"id": 9, "graph_message_id": "message-1", "project_id": 31}
    ]
    supabase.store["outlook_email_intake"] = [
        {
            "id": 7,
            "graph_message_id": "message-1",
            "project_id": 31,
            "match_status": "matched",
            "assignment_method": "project_directory_email",
        }
    ]

    project_id = outlook._reconcile_outlook_project_assignment(
        supabase_client=supabase,
        msg_id="message-1",
        document_metadata_id="outlook_message-1",
        project_email_id=9,
        intake_email_id=7,
        inferred_project_id=31,
        assignment_method="project_directory_email",
        assignment_confidence=0.9,
    )

    assert project_id == 178
    assert supabase.store["project_emails"][0]["project_id"] == 178
    intake = supabase.store["outlook_email_intake"][0]
    assert intake["project_id"] == 178
    assert intake["document_metadata_id"] == "outlook_message-1"
    assert intake["assignment_method"] == "document_metadata_reconcile"
    assert intake["assignment_confidence"] == 1.0


def test_record_outlook_skip_audit_writes_classifier_snapshot():
    supabase = _Supabase()
    msg = {
        "id": "message-1",
        "subject": "Accepted: OAC Meeting",
        "receivedDateTime": "2026-05-12T15:00:00Z",
        "internetMessageId": "<message-1@example.com>",
        "conversationId": "conversation-1",
        "webLink": "https://outlook.office.com/mail/message-1",
    }

    outlook._record_outlook_skip_audit(
        supabase_client=supabase,
        msg=msg,
        user_email="pm@example.com",
        body_text="Accepted OAC Meeting When: Tuesday Where: Teams",
        sender_name="Owner",
        sender_addr="owner@example.com",
        source_metadata={
            "outlook_message_id": "message-1",
            "intake_classification": {
                "action": "skip",
                "category": "calendar_rsvp",
                "confidence": 0.98,
                "reason": "RSVP response has no substantive typed content.",
                "signals": ["rsvp_subject", "calendar_header"],
            },
        },
    )

    row = supabase.store["outlook_email_skip_audit"][0]
    assert row["graph_message_id"] == "message-1"
    assert row["mailbox_user_id"] == "pm@example.com"
    assert row["classification_action"] == "skip"
    assert row["classification_category"] == "calendar_rsvp"
    assert row["classification_confidence"] == 0.98
    assert row["classification_signals"] == ["rsvp_subject", "calendar_header"]
    assert row["body_preview"] == "Accepted OAC Meeting When: Tuesday Where: Teams"
