from src.services.integrations.microsoft_graph import embed


class _Result:
    def __init__(self, data=None):
        self.data = data


class _Table:
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

    def single(self):
        return self

    def update(self, payload):
        self.action = "update"
        self.payload = payload
        return self

    def delete(self):
        self.action = "delete"
        return self

    def execute(self):
        if self.db.raise_on_app_metadata and self.table_name == "document_metadata":
            raise RuntimeError("document_metadata table is not available")

        table = self.db.tables.setdefault(self.table_name, [])
        if self.action == "update":
            matching_ids = {id(row) for row in self.rows}
            updated = []
            for row in table:
                if id(row) in matching_ids:
                    row.update(self.payload)
                    updated.append(dict(row))
            return _Result(updated)
        if self.action == "delete":
            matching_ids = {id(row) for row in self.rows}
            self.db.tables[self.table_name] = [row for row in table if id(row) not in matching_ids]
            return _Result([])
        if self.rows and len(self.rows) == 1:
            return _Result(dict(self.rows[0]))
        return _Result([dict(row) for row in self.rows])


class _Supabase:
    def __init__(self, tables, *, raise_on_app_metadata=False):
        self.tables = tables
        self.raise_on_app_metadata = raise_on_app_metadata

    def from_(self, table_name):
        return _Table(self, table_name)


def test_embed_graph_document_skips_app_status_update_when_using_rag_metadata(monkeypatch):
    doc_id = "outlook-low-content"
    rag = _Supabase(
        {
            "rag_document_metadata": [
                {
                    "id": doc_id,
                    "title": "Short email",
                    "category": "email",
                    "source": "microsoft_graph",
                    "project_id": None,
                    "type": "email",
                    "source_system": "outlook",
                    "source_item_id": "message-1",
                    "source_web_url": "https://outlook.office.com/mail/message-1",
                    "content": "Thanks",
                    "raw_text": "Thanks",
                }
            ],
            "document_chunks": [{"document_id": doc_id, "chunk_index": 0}],
            "fireflies_ingestion_jobs": [],
        }
    )
    app = _Supabase({}, raise_on_app_metadata=True)

    monkeypatch.setattr(embed, "get_rag_read_client", lambda: rag)
    monkeypatch.setattr(embed, "get_rag_write_client", lambda: rag)
    monkeypatch.setattr(embed, "record_source_processing_status", lambda *_args, **_kwargs: None)

    chunks = embed.embed_graph_document(app, doc_id)

    assert chunks == 0
    assert rag.tables["document_chunks"] == []
    assert rag.tables["rag_document_metadata"][0]["embedding_status"] == "skipped"


def test_graph_embed_queues_source_intelligence_by_default(monkeypatch):
    queued = []
    monkeypatch.setattr(embed, "GRAPH_EMBED_INLINE_SOURCE_INTELLIGENCE", False)

    def fake_import(name, *args, **kwargs):
        if name.endswith("intelligence.compiler"):
            class _Compiler:
                @staticmethod
                def enqueue_source_intelligence_job(_client, metadata_id, **job_kwargs):
                    queued.append({"metadata_id": metadata_id, **job_kwargs})
                    return {"id": "job-1", "status": "queued"}

                @staticmethod
                def process_source_document_to_packet(*_args, **_kwargs):
                    raise AssertionError("inline compiler should not run")

            return _Compiler
        return original_import(name, *args, **kwargs)

    original_import = __import__
    monkeypatch.setattr("builtins.__import__", fake_import)

    embed._run_source_intelligence_compiler(object(), "outlook_message-1")

    assert queued == [
        {
            "metadata_id": "outlook_message-1",
            "job_type": "attribution",
            "priority": 0,
            "input_snapshot": {
                "path": "microsoft_graph.embed_graph_document",
                "reason": "queued_to_keep_embedding_path_bounded",
            },
        }
    ]
