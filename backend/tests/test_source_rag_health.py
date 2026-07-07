from datetime import datetime, timezone

from src.services.health.source_rag_health import _graph_conversation_chunk_alerts


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
