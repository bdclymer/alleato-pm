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
