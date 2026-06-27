from src.services.pipeline import embedder


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

    def order(self, *_args, **_kwargs):
        return self

    def update(self, payload):
        self.action = "update"
        self.payload = payload
        return self

    def upsert(self, payload, **_kwargs):
        self.action = "upsert"
        self.payload = payload
        return self

    def delete(self):
        self.action = "delete"
        return self

    def execute(self):
        table = self.db.tables.setdefault(self.table_name, [])
        if self.action == "update":
            matching_ids = {id(row) for row in self.rows}
            updated = []
            for row in table:
                if id(row) in matching_ids:
                    row.update(self.payload)
                    updated.append(dict(row))
            return _Result(updated)
        if self.action == "upsert":
            payloads = self.payload if isinstance(self.payload, list) else [self.payload]
            upserted = []
            for payload in payloads:
                existing = None
                for key in ("id", "chunk_id"):
                    value = payload.get(key)
                    if value is not None:
                        existing = next((row for row in table if row.get(key) == value), None)
                    if existing is not None:
                        break
                if existing is None:
                    table.append(dict(payload))
                    upserted.append(dict(payload))
                else:
                    existing.update(payload)
                    upserted.append(dict(existing))
            return _Result(upserted)
        if self.action == "delete":
            matching_ids = {id(row) for row in self.rows}
            self.db.tables[self.table_name] = [row for row in table if id(row) not in matching_ids]
            return _Result([])
        if self.rows and len(self.rows) == 1:
            return _Result(dict(self.rows[0]))
        return _Result([dict(row) for row in self.rows])


class _Supabase:
    def __init__(self, tables):
        self.tables = tables

    def table(self, table_name):
        return _Table(self, table_name)


def test_embedder_marks_no_segment_no_vision_document_skipped_low_content(monkeypatch):
    metadata_id = "low-content-doc"
    app = _Supabase(
        {
            "document_metadata": [
                {
                    "id": metadata_id,
                    "title": "Blank W-9.pdf",
                    "source": "upload",
                    "source_system": "manual_upload",
                    "type": "document",
                    "category": "document",
                    "document_type": "pdf",
                    "project_id": 25125,
                    "status": "skipped_low_content",
                }
            ],
            "meeting_segments": [],
            "document_page_intelligence": [],
            "fireflies_ingestion_jobs": [],
        }
    )
    rag = _Supabase(
        {
            "rag_document_metadata": [],
            "document_chunks": [
                {
                    "chunk_id": f"{metadata_id}__ff_meeting_summary_-1_0",
                    "document_id": metadata_id,
                    "text": (
                        "Minimal extract for 'Blank W-9.pdf'. Parsed content was only "
                        "0 characters and may require OCR or a different source format."
                    ),
                }
            ],
        }
    )
    job_updates = []

    monkeypatch.setattr(embedder, "get_supabase_client", lambda: app)
    monkeypatch.setattr(embedder, "get_rag_write_client", lambda: rag)
    monkeypatch.setattr(embedder, "get_rag_read_client", lambda: rag)
    monkeypatch.setattr(embedder, "fetch_optional_row", lambda *_args, **_kwargs: {})
    monkeypatch.setattr(
        embedder,
        "update_ingestion_job_state",
        lambda *args, **kwargs: job_updates.append({"args": args, "kwargs": kwargs}),
    )
    monkeypatch.setattr(
        embedder.llm,
        "batch_embed",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("low-content docs should not embed")),
    )

    result = embedder.run_embedder(metadata_id)

    assert result == {
        "metadataId": metadata_id,
        "chunkCount": 0,
        "segmentCount": 0,
        "skipped": True,
        "skipReason": "skipped_low_content",
    }
    assert rag.tables["document_chunks"] == []
    assert app.tables["document_metadata"][0]["status"] == "skipped_low_content"
    assert rag.tables["rag_document_metadata"][0]["embedding_status"] == "skipped_low_content"
    assert "no searchable text" in rag.tables["rag_document_metadata"][0]["embedding_error"]
    assert job_updates[-1]["kwargs"]["stage"] == "done"
