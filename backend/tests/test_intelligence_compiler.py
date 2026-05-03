from datetime import datetime

from src.services.intelligence.compiler import (
    classify_basic_signal,
    compile_current_packet,
    confidence_label,
    get_intelligence_compiler_status,
    process_packet_refresh_job,
    process_source_document,
    process_source_document_to_packet,
    promote_signal_candidate,
    run_intelligence_compiler_batch,
)


class _Result:
    def __init__(self, data):
        self.data = data


class _TableQuery:
    def __init__(self, db, table_name):
        self.db = db
        self.table_name = table_name
        self.rows = list(db.tables.setdefault(table_name, []))
        self.action = "select"
        self.payload = None
        self.limit_count = None

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

    def delete(self):
        self.action = "delete"
        return self

    def eq(self, key, value):
        self.rows = [row for row in self.rows if row.get(key) == value]
        return self

    def in_(self, key, values):
        allowed = set(values)
        self.rows = [row for row in self.rows if row.get(key) in allowed]
        return self

    def order(self, key, desc=False):
        self.rows = sorted(self.rows, key=lambda row: row.get(key) or "", reverse=desc)
        return self

    def limit(self, value):
        self.limit_count = value
        return self

    def execute(self):
        table = self.db.tables.setdefault(self.table_name, [])
        if self.action == "insert":
            row = dict(self.payload)
            row.setdefault("id", self.db.next_id(self.table_name))
            table.append(row)
            return _Result([row])

        if self.action == "update":
            updated = []
            matching_ids = {id(row) for row in self.rows}
            for row in table:
                if id(row) in matching_ids:
                    row.update(self.payload)
                    updated.append(dict(row))
            return _Result(updated)

        if self.action == "delete":
            matching_ids = {id(row) for row in self.rows}
            self.db.tables[self.table_name] = [
                row for row in table if id(row) not in matching_ids
            ]
            return _Result([])

        rows = self.rows[: self.limit_count] if self.limit_count is not None else self.rows
        return _Result([dict(row) for row in rows])


class _FakeSupabase:
    def __init__(self):
        self.tables = {}
        self.counters = {}

    def table(self, table_name):
        return _TableQuery(self, table_name)

    def next_id(self, table_name):
        self.counters[table_name] = self.counters.get(table_name, 0) + 1
        return f"{table_name}-{self.counters[table_name]}"


def test_confidence_label_thresholds():
    assert confidence_label(0.85) == "high"
    assert confidence_label(0.60) == "medium"
    assert confidence_label(0.59) == "low"


def test_classify_basic_signal_prefers_task_for_follow_up_language():
    signal = classify_basic_signal(
        {
            "title": "Westfield Owner Meeting",
            "content": "Brandon needs to follow up on the schedule delay by Friday.",
        }
    )

    assert signal["signal_type"] == "task"
    assert "Westfield Owner Meeting" in signal["title"]


def test_process_source_document_stages_candidate_and_packet_refresh():
    supabase = _FakeSupabase()
    supabase.tables["document_metadata"] = [
        {
            "id": "doc-1",
            "title": "Westfield OAC follow-up",
            "content": "Brandon needs to follow up on schedule delay exposure by Friday.",
            "category": "teams_message",
            "source": "microsoft_graph",
            "date": "2026-05-02T12:00:00+00:00",
            "project_id": 43,
            "content_hash": "hash-1",
        }
    ]
    supabase.tables["projects"] = [
        {
            "id": 43,
            "name": "Westfield Collective",
            "project_number": "24-115",
            "client": "Westfield",
            "aliases": [],
        }
    ]
    supabase.tables["intelligence_targets"] = []

    result = process_source_document(supabase, "doc-1")

    assert result["status"] == "succeeded"
    assert result["project_id"] == 43
    assert result["confidence"] == "high"
    assert len(supabase.tables["source_intelligence_jobs"]) == 1
    assert supabase.tables["source_intelligence_jobs"][0]["status"] == "succeeded"
    assert len(supabase.tables["document_attribution_candidates"]) == 1
    assert supabase.tables["document_attribution_candidates"][0]["status"] == "auto_assigned"
    assert len(supabase.tables["source_signal_candidates"]) == 1
    assert supabase.tables["source_signal_candidates"][0]["signal_type"] == "task"
    assert len(supabase.tables["packet_refresh_jobs"]) == 1


def test_promote_signal_candidate_creates_card_evidence_and_refresh():
    supabase = _FakeSupabase()
    supabase.tables["document_metadata"] = [
        {
            "id": "doc-1",
            "title": "Westfield OAC follow-up",
            "content": "Brandon needs to follow up on schedule delay exposure by Friday.",
            "category": "teams_message",
            "source": "microsoft_graph",
            "date": "2026-05-02T12:00:00+00:00",
            "project_id": 43,
            "content_hash": "hash-1",
            "metadata": {"message_id": "message-1"},
            "participants": ["Brandon", "Megan"],
        }
    ]
    supabase.tables["projects"] = [
        {
            "id": 43,
            "name": "Westfield Collective",
            "project_number": "24-115",
            "client": "Westfield",
            "aliases": [],
        }
    ]
    supabase.tables["intelligence_targets"] = []

    process_result = process_source_document(supabase, "doc-1")
    candidate_id = process_result["signal_candidate_id"]

    result = promote_signal_candidate(supabase, candidate_id)

    assert result["status"] == "promoted"
    assert len(supabase.tables["insight_cards"]) == 1
    assert supabase.tables["insight_cards"][0]["card_type"] == "task"
    assert supabase.tables["insight_cards"][0]["source_count"] == 1
    assert len(supabase.tables["insight_card_targets"]) == 1
    assert supabase.tables["insight_card_targets"][0]["relationship"] == "primary"
    assert len(supabase.tables["insight_card_evidence"]) == 1
    assert supabase.tables["insight_card_evidence"][0]["source_document_id"] == "doc-1"
    assert supabase.tables["insight_card_evidence"][0]["source_message_id"] == "message-1"
    assert supabase.tables["source_signal_candidates"][0]["status"] == "promoted"
    assert (
        supabase.tables["source_signal_candidates"][0]["promoted_insight_card_id"]
        == result["insight_card_id"]
    )
    assert len(supabase.tables["packet_refresh_jobs"]) >= 1
    assert (
        supabase.tables["packet_refresh_jobs"][0]["trigger_insight_card_id"]
        == result["insight_card_id"]
    )

    refresh_result = process_packet_refresh_job(
        supabase,
        result["packet_refresh_job_id"],
    )

    assert refresh_result["status"] == "succeeded"
    assert refresh_result["card_count"] == 1
    assert refresh_result["evidence_count"] == 1
    assert len(supabase.tables["intelligence_packets"]) == 1
    assert supabase.tables["intelligence_packets"][0]["packet_type"] == "current"
    assert supabase.tables["intelligence_packets"][0]["freshness_status"] == "fresh"
    assert len(supabase.tables["intelligence_packet_cards"]) == 1
    assert supabase.tables["intelligence_packet_cards"][0]["section"] == "follow_ups"
    assert supabase.tables["packet_refresh_jobs"][0]["status"] == "succeeded"
    assert (
        supabase.tables["packet_refresh_jobs"][0]["output_packet_id"]
        == refresh_result["packet_id"]
    )


def test_promote_signal_candidate_without_target_fails_loudly_for_review():
    supabase = _FakeSupabase()
    supabase.tables["source_signal_candidates"] = [
        {
            "id": "candidate-1",
            "source_document_id": "doc-1",
            "target_id": None,
            "signal_type": "risk",
            "title": "Unattributed risk",
            "summary": "A risk could not be attributed.",
            "confidence": "medium",
            "confidence_score": 0.7,
            "normalized_signal_key": "risk-unattributed",
            "extraction_json": {},
        }
    ]

    result = promote_signal_candidate(supabase, "candidate-1")

    assert result["status"] == "needs_review"
    assert supabase.tables["source_signal_candidates"][0]["status"] == "needs_review"
    assert "promotion_error" in supabase.tables["source_signal_candidates"][0]["extraction_json"]


def test_compile_current_packet_marks_empty_target_as_partial():
    supabase = _FakeSupabase()
    supabase.tables["intelligence_targets"] = [
        {
            "id": "target-1",
            "target_type": "client_project",
            "name": "No Signal Project",
            "slug": "no-signal-project",
            "status": "active",
            "project_id": 44,
        }
    ]

    result = compile_current_packet(supabase, "target-1")

    assert result["status"] == "compiled"
    assert result["card_count"] == 0
    assert len(supabase.tables["intelligence_packets"]) == 1
    assert supabase.tables["intelligence_packets"][0]["freshness_status"] == "partial"
    assert supabase.tables["intelligence_packets"][0]["source_coverage"]["gaps"]


def test_process_source_document_to_packet_records_status_metadata():
    supabase = _FakeSupabase()
    supabase.tables["document_metadata"] = [
        {
            "id": "doc-1",
            "title": "Westfield OAC follow-up",
            "content": "Brandon needs to follow up on schedule delay exposure by Friday.",
            "category": "teams_message",
            "source": "microsoft_graph",
            "date": "2026-05-02T12:00:00+00:00",
            "project_id": 43,
            "content_hash": "hash-1",
            "source_metadata": {"origin": "test"},
        }
    ]
    supabase.tables["projects"] = [
        {
            "id": 43,
            "name": "Westfield Collective",
            "project_number": "24-115",
            "client": "Westfield",
            "aliases": [],
        }
    ]

    result = process_source_document_to_packet(supabase, "doc-1")

    assert result["status"] == "succeeded"
    assert result["promotion"]["status"] == "promoted"
    assert result["packet"]["status"] == "succeeded"
    compiler_metadata = supabase.tables["document_metadata"][0]["source_metadata"][
        "intelligence_compiler"
    ]
    assert compiler_metadata["status"] == "succeeded"
    assert compiler_metadata["result"]["packet"]["packet_id"]


def test_run_intelligence_compiler_batch_drains_source_jobs():
    supabase = _FakeSupabase()
    supabase.tables["document_metadata"] = [
        {
            "id": "doc-1",
            "title": "Westfield OAC follow-up",
            "content": "Brandon needs to follow up on schedule delay exposure by Friday.",
            "category": "teams_message",
            "source": "microsoft_graph",
            "date": "2026-05-02T12:00:00+00:00",
            "project_id": 43,
            "content_hash": "hash-1",
            "source_metadata": {},
        }
    ]
    supabase.tables["projects"] = [
        {
            "id": 43,
            "name": "Westfield Collective",
            "project_number": "24-115",
            "client": "Westfield",
            "aliases": [],
        }
    ]
    supabase.tables["source_intelligence_jobs"] = [
        {
            "id": "source-job-1",
            "source_document_id": "doc-1",
            "source_hash": "hash-1",
            "job_type": "signal_extract",
            "status": "queued",
            "priority": 0,
            "compiler_version": "ai_intelligence_compiler_v0_1",
            "attempt_count": 0,
        }
    ]

    result = run_intelligence_compiler_batch(supabase, source_limit=1, packet_limit=0)

    assert result["source_jobs_claimed"] == 1
    assert result["source_jobs_succeeded"] == 1
    assert result["source_jobs_failed"] == 0
    assert supabase.tables["source_intelligence_jobs"][0]["status"] == "succeeded"
    assert len(supabase.tables["intelligence_packets"]) == 1


def test_run_intelligence_compiler_batch_drains_packet_jobs():
    supabase = _FakeSupabase()
    supabase.tables["intelligence_targets"] = [
        {
            "id": "target-1",
            "target_type": "client_project",
            "name": "Westfield Collective",
            "slug": "westfield-collective",
            "status": "active",
            "project_id": 43,
        }
    ]
    supabase.tables["packet_refresh_jobs"] = [
        {
            "id": "packet-job-1",
            "target_id": "target-1",
            "reason": "test",
            "status": "queued",
            "priority": 0,
            "compiler_version": "ai_intelligence_compiler_v0_1",
            "attempt_count": 0,
        }
    ]

    result = run_intelligence_compiler_batch(supabase, source_limit=0, packet_limit=1)

    assert result["packet_jobs_claimed"] == 1
    assert result["packet_jobs_succeeded"] == 1
    assert result["packet_jobs_failed"] == 0
    assert supabase.tables["packet_refresh_jobs"][0]["status"] == "succeeded"
    assert len(supabase.tables["intelligence_packets"]) == 1
    assert supabase.tables["intelligence_packets"][0]["freshness_status"] == "partial"


def test_get_intelligence_compiler_status_reports_healthy_state():
    supabase = _FakeSupabase()
    supabase.tables["source_intelligence_jobs"] = [
        {"id": "source-job-1", "status": "succeeded", "finished_at": "2026-05-02T10:00:00+00:00"}
    ]
    supabase.tables["packet_refresh_jobs"] = [
        {
            "id": "packet-job-1",
            "status": "succeeded",
            "output_packet_id": "packet-1",
            "finished_at": "2026-05-02T10:00:00+00:00",
        }
    ]
    supabase.tables["source_signal_candidates"] = [
        {
            "id": "candidate-1",
            "source_document_id": "doc-1",
            "status": "promoted",
            "confidence": "high",
            "promoted_insight_card_id": "card-1",
        }
    ]
    supabase.tables["insight_cards"] = [
        {
            "id": "card-1",
            "primary_target_id": "target-1",
            "current_status": "open",
            "attribution_status": "auto_assigned",
        }
    ]
    supabase.tables["insight_card_evidence"] = [
        {
            "id": "evidence-1",
            "insight_card_id": "card-1",
            "source_document_id": "doc-1",
        }
    ]
    supabase.tables["intelligence_packets"] = [
        {"id": "packet-1", "target_id": "target-1", "packet_type": "current"}
    ]
    supabase.tables["intelligence_packet_cards"] = [
        {"packet_id": "packet-1", "insight_card_id": "card-1"}
    ]

    status = get_intelligence_compiler_status(
        supabase,
        now=datetime.fromisoformat("2026-05-02T10:05:00+00:00"),
    )

    assert status["healthy"] is True
    assert status["status"] == "healthy"
    assert status["unhealthyChecks"] == {}
    assert status["counts"]["currentPackets"] == 1


def test_get_intelligence_compiler_status_reports_unhealthy_state():
    supabase = _FakeSupabase()
    supabase.tables["source_intelligence_jobs"] = [
        {"id": "source-job-1", "status": "queued", "queued_at": "2026-05-02T09:00:00+00:00"},
        {"id": "source-job-2", "status": "failed", "finished_at": "2026-05-02T09:50:00+00:00"},
    ]
    supabase.tables["packet_refresh_jobs"] = [
        {"id": "packet-job-1", "status": "running", "started_at": "2026-05-02T09:00:00+00:00"},
        {
            "id": "packet-job-2",
            "status": "succeeded",
            "output_packet_id": None,
            "finished_at": "2026-05-02T09:55:00+00:00",
        },
    ]
    supabase.tables["source_signal_candidates"] = [
        {
            "id": "candidate-1",
            "source_document_id": "doc-1",
            "status": "candidate",
            "confidence": "high",
            "created_at": "2026-05-02T09:00:00+00:00",
        },
        {
            "id": "candidate-2",
            "source_document_id": "doc-2",
            "status": "promoted",
            "confidence": "high",
            "promoted_insight_card_id": "missing-card",
        },
    ]
    supabase.tables["insight_cards"] = [
        {
            "id": "card-1",
            "primary_target_id": "target-1",
            "current_status": "open",
            "attribution_status": "auto_assigned",
        }
    ]
    supabase.tables["insight_card_evidence"] = []
    supabase.tables["intelligence_packets"] = [
        {"id": "packet-1", "target_id": "target-1", "packet_type": "current"}
    ]
    supabase.tables["intelligence_packet_cards"] = []

    status = get_intelligence_compiler_status(
        supabase,
        now=datetime.fromisoformat("2026-05-02T10:00:00+00:00"),
    )

    assert status["healthy"] is False
    assert status["status"] == "unhealthy"
    assert status["checks"]["sourceStaleQueued"] == 1
    assert status["checks"]["packetStaleRunning"] == 1
    assert status["checks"]["sourceRecentFailed"] == 1
    assert status["checks"]["highConfidenceUnpromoted"] == 1
    assert status["checks"]["promotedWithoutCard"] == 1
    assert status["checks"]["activeCardsMissingCurrentPacket"] == 1
    assert status["checks"]["succeededPacketJobsWithoutOutput"] == 1
