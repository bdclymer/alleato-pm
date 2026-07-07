from datetime import datetime, timezone

from src.services.health.source_rag_health import (
    _counts_project_intelligence_outcome,
    _counts_task_extraction_outcome,
    _graph_conversation_chunk_alerts,
    _has_project_attribution_review,
    _has_project_intelligence_outcome,
    _has_task_extraction_outcome,
    _is_project_required_row,
    _latest_job_metadata_by_document_id,
    _merge_source_synthesis_metadata,
)


def test_graph_conversation_chunk_alerts_pass_for_source_owned_chunks_and_skips():
    now = datetime(2026, 7, 7, tzinfo=timezone.utc)
    report = _graph_conversation_chunk_alerts(
        [
            {
                "id": "outlook_conversation_1",
                "type": "outlook_conversation",
                "source_metadata": {"document_kind": "outlook_conversation"},
                "embedding_status": "embedded",
            },
            {
                "id": "teamsdm_1_2026-07-07",
                "type": "teams_dm_conversation",
                "source_metadata": {"document_kind": "teams_dm_conversation"},
                "embedding_status": "embedded",
            },
            {
                "id": "teamsdm_tiny_2026-07-07",
                "type": "teams_dm_conversation",
                "source_metadata": {"document_kind": "teams_dm_conversation"},
                "embedding_status": "skipped",
            },
            {
                "id": "teams_root_1",
                "type": "teams_message",
                "source_metadata": {"document_kind": "teams_channel_thread"},
                "embedding_status": "embedded",
            },
        ],
        [
            {"document_id": "outlook_conversation_1", "chunk_id": "c1", "source_type": "email"},
            {"document_id": "teamsdm_1_2026-07-07", "chunk_id": "c2", "source_type": "teams_dm"},
            {"document_id": "teams_root_1", "chunk_id": "c3", "source_type": "teams_channel"},
        ],
        now=now,
    )

    assert report["status"] == "healthy"
    assert report["alerts"] == []
    teams_dm = next(summary for summary in report["summaries"] if summary["kind"] == "teams_dm")
    assert teams_dm["docsWithoutChunks"] == 1
    assert teams_dm["embeddedDocsWithoutChunks"] == 0


def test_graph_conversation_chunk_alerts_fail_for_generic_source_types():
    now = datetime(2026, 7, 7, tzinfo=timezone.utc)
    report = _graph_conversation_chunk_alerts(
        [
            {
                "id": "teamsdm_bad_2026-07-07",
                "type": "teams_dm_conversation",
                "source_metadata": {"document_kind": "teams_dm_conversation"},
                "embedding_status": "embedded",
                "title": "Bad Teams DM",
            }
        ],
        [
            {"document_id": "teamsdm_bad_2026-07-07", "chunk_id": "c1", "source_type": "document"},
            {"document_id": "teamsdm_bad_2026-07-07", "chunk_id": "c2", "source_type": "meeting_summary"},
        ],
        now=now,
    )

    assert report["status"] == "degraded"
    assert any(alert["code"] == "graph_conversation_chunk_source_type_drift" for alert in report["alerts"])
    assert report["alerts"][0]["source"] == "teams"
    assert "teamsdm_bad_2026-07-07" in report["alerts"][0]["message"]


def test_graph_conversation_chunk_alerts_fail_for_embedded_doc_without_chunks():
    now = datetime(2026, 7, 7, tzinfo=timezone.utc)
    report = _graph_conversation_chunk_alerts(
        [
            {
                "id": "outlook_conversation_missing",
                "type": "outlook_conversation",
                "source_metadata": {"document_kind": "outlook_conversation"},
                "embedding_status": "embedded",
            }
        ],
        [],
        now=now,
    )

    assert report["status"] == "degraded"
    assert any(alert["code"] == "graph_conversation_embedded_without_chunks" for alert in report["alerts"])
    assert report["alerts"][0]["source"] == "emails"


def test_latest_job_metadata_prefers_source_intelligence_task_outcome():
    metadata_by_id = _latest_job_metadata_by_document_id(
        [
            {
                "source_document_id": "doc-email",
                "metadata": {"embedding_path": "microsoft_graph.embed_graph_document"},
                "updated_at": "2026-07-07T05:37:16+00:00",
            },
            {
                "source_document_id": "doc-email",
                "metadata": {
                    "task_extraction_status": "no_actionable_tasks",
                    "tasks_created_count": 0,
                },
                "updated_at": "2026-07-07T05:36:45+00:00",
            },
        ]
    )

    assert metadata_by_id["doc-email"]["task_extraction_status"] == "no_actionable_tasks"
    assert _has_task_extraction_outcome("doc-email", set(), metadata_by_id)


def test_meeting_task_extraction_counts_existing_evidence_as_processed():
    assert _counts_task_extraction_outcome(
        family="meetings",
        document_id="meeting-doc",
        task_ids=set(),
        evidence_ids={"meeting-doc"},
        job_metadata_by_id={},
    )
    assert not _counts_task_extraction_outcome(
        family="emails",
        document_id="email-doc",
        task_ids=set(),
        evidence_ids={"email-doc"},
        job_metadata_by_id={},
    )


def test_project_intelligence_outcome_counts_source_synthesis_metadata():
    metadata_by_id = {
        "doc-email": {
            "source_synthesis_id": "source-synthesis-1",
            "_updated_at": "2026-07-07T05:36:45+00:00",
        }
    }

    assert _has_project_intelligence_outcome("doc-email", set(), metadata_by_id)
    assert _has_project_intelligence_outcome("doc-with-evidence", {"doc-with-evidence"}, {})
    assert not _has_project_intelligence_outcome("doc-missing", set(), {})


def test_project_attribution_review_counts_pending_null_project_candidate():
    assert _has_project_attribution_review("doc-review", {"doc-review"})
    assert not _has_project_attribution_review("doc-missing", {"doc-review"})


def test_source_synthesis_rows_backfill_project_intelligence_metadata():
    metadata_by_id = {"sharepoint-doc": {"_updated_at": "2026-07-07T04:22:54+00:00"}}

    _merge_source_synthesis_metadata(
        metadata_by_id,
        [
            {
                "id": "source-synthesis-1",
                "source_document_id": "sharepoint-doc",
                "project_id": 178,
                "tasks": [{"title": "Follow up"}],
                "metadata": {"deterministic_signal_type": "task"},
                "updated_at": "2026-07-07T11:40:00+00:00",
            }
        ],
    )

    assert metadata_by_id["sharepoint-doc"]["source_synthesis_id"] == "source-synthesis-1"
    assert metadata_by_id["sharepoint-doc"]["task_extraction_status"] == "task_signal_staged"
    assert _has_project_intelligence_outcome("sharepoint-doc", set(), metadata_by_id)
    assert _has_task_extraction_outcome("sharepoint-doc", set(), metadata_by_id)


def test_source_synthesis_non_task_signal_counts_as_no_actionable_tasks():
    metadata_by_id = {}

    _merge_source_synthesis_metadata(
        metadata_by_id,
        [
            {
                "id": "source-synthesis-1",
                "source_document_id": "email-doc",
                "project_id": 754,
                "tasks": [],
                "metadata": {"deterministic_signal_type": "project_update"},
                "updated_at": "2026-07-07T11:40:00+00:00",
            }
        ],
    )

    assert metadata_by_id["email-doc"]["task_extraction_status"] == "no_actionable_tasks"
    assert _has_task_extraction_outcome("email-doc", set(), metadata_by_id)


def test_meeting_project_intelligence_counts_existing_evidence_without_source_read_proof():
    assert _counts_project_intelligence_outcome(
        family="meetings",
        document_id="meeting-1",
        evidence_ids={"meeting-1"},
        job_metadata_by_id={},
    )


def test_meeting_project_intelligence_requires_full_read_for_metadata_only_outcome():
    metadata_by_id = {
        "meeting-1": {
            "source_synthesis_id": "source-synthesis-1",
            "_updated_at": "2026-07-07T05:36:45+00:00",
        },
        "meeting-2": {
            "source_synthesis_id": "source-synthesis-2",
            "read_proof": {
                "status": "full_source_read",
                "scope": "full_transcript",
            },
            "_updated_at": "2026-07-07T05:36:45+00:00",
        },
    }

    assert not _counts_project_intelligence_outcome(
        family="meetings",
        document_id="meeting-1",
        evidence_ids=set(),
        job_metadata_by_id=metadata_by_id,
    )
    assert _counts_project_intelligence_outcome(
        family="meetings",
        document_id="meeting-2",
        evidence_ids=set(),
        job_metadata_by_id=metadata_by_id,
    )


def test_project_required_fallback_excludes_empty_anonymized_teams_dm():
    row = {
        "id": "teamsdm_empty_2026-07-06",
        "title": "Teams DM Conversation: 19:d5788d4ad",
        "family": "teams",
        "category": "teams_message",
        "type": "teams_dm_conversation",
        "status": "embedded",
        "project_id": None,
        "content": "",
    }

    assert not _is_project_required_row(row, {})


def test_project_required_fallback_excludes_internal_teams_conversation():
    row = {
        "id": "teamsdm_internal_2026-07-06",
        "title": "Teams DM Conversation: Indiana Office",
        "family": "teams",
        "category": "teams_message",
        "type": "teams_dm_conversation",
        "status": "embedded",
        "project_id": None,
        "content": "",
    }

    assert not _is_project_required_row(row, {})


def test_project_required_fallback_keeps_project_signal_teams_content_required():
    row = {
        "id": "teamsdm_project_2026-07-06",
        "title": "Teams DM Conversation: Champaign",
        "family": "teams",
        "category": "teams_message",
        "type": "teams_dm_conversation",
        "status": "embedded",
        "project_id": None,
        "content": "Sarah: Need RFI pricing and permit drawings for the sprinkler penetration work.",
    }

    assert _is_project_required_row(row, {})


def test_project_required_fallback_keeps_anonymized_teams_with_project_signal_required():
    row = {
        "id": "teamsdm_project_2026-07-06",
        "title": "Teams DM Conversation: 19:8704ffd5b",
        "family": "teams",
        "category": "teams_message",
        "type": "teams_dm_conversation",
        "status": "embedded",
        "project_id": None,
        "content": "Hunter: Need drawings and pricing for Exol PA Phase 2 guardrails.",
    }

    assert _is_project_required_row(row, {})


def test_project_required_metadata_overrides_fallback_classifier():
    row = {
        "id": "teamsdm_empty_2026-07-06",
        "title": "Teams DM Conversation: 19:d5788d4ad",
        "family": "teams",
        "category": "teams_message",
        "type": "teams_dm_conversation",
        "status": "embedded",
        "project_id": None,
        "content": "",
    }

    assert _is_project_required_row(row, {"teamsdm_empty_2026-07-06": {"project_required": True}})
