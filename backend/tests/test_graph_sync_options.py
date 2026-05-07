from src.services.integrations.microsoft_graph import sync


class _FakeGraph:
    def is_configured(self):
        return True


class _FakeSupabase:
    pass


def test_run_graph_sync_can_skip_heavy_embedding_and_compiler(monkeypatch):
    monkeypatch.setattr(sync, "get_graph_client", lambda: _FakeGraph())
    monkeypatch.setenv("GRAPH_SYNC_OUTLOOK", "false")
    monkeypatch.setenv("GRAPH_SYNC_TEAMS", "false")
    monkeypatch.setenv("GRAPH_SYNC_TEAMS_DM", "false")
    monkeypatch.setenv("GRAPH_SYNC_ONEDRIVE", "false")
    monkeypatch.setenv("SHAREPOINT_SYNC_FOLDERS", "")

    def fail_embed(*_args, **_kwargs):
        raise AssertionError("embedding should not run")

    monkeypatch.setattr(sync, "embed_pending_graph_documents", fail_embed)

    result = sync.run_graph_sync(
        _FakeSupabase(),
        run_embedding=False,
        run_teams_compiler=False,
    )

    assert result["status"] == "complete"
    assert result["phases"]["embedding"] == "skipped"
    assert result["phases"]["teams_compiler"] == "skipped"
    assert result["embed"]["status"] == "skipped"
    assert result["teams_compiler"]["status"] == "skipped"
