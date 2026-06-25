from src.services.ops.db_pressure_guard import AppDbProjectionError
from src.services.pipeline import orchestrator


def test_run_full_pipeline_treats_final_projection_guard_as_non_blocking(monkeypatch):
    monkeypatch.setattr(orchestrator, "get_supabase_client", lambda: object())
    monkeypatch.setattr(orchestrator, "_is_financial_document", lambda *_args: False)
    monkeypatch.setattr(orchestrator, "_is_generic_document", lambda *_args: False)
    monkeypatch.setattr(orchestrator, "run_parser", lambda metadata_id: {"stage": "parsed"})
    monkeypatch.setattr(orchestrator, "run_embedder", lambda metadata_id: {"stage": "embedded"})
    monkeypatch.setattr(orchestrator, "run_extractor", lambda metadata_id: {"stage": "extracted"})

    def _blocked_projection(*_args, **_kwargs):
        raise AppDbProjectionError(
            "Blocked project_operating_snapshot_projection: final projection disabled"
        )

    monkeypatch.setattr(orchestrator, "process_source_document_to_packet", _blocked_projection)

    result = orchestrator.run_full_pipeline("doc-1")

    assert result["status"] == "done"
    assert result["intelligence_compiler"]["status"] == "projection_blocked"
    assert result["intelligence_compiler"]["non_blocking"] is True
    assert "final projection disabled" in result["intelligence_compiler"]["error"]
