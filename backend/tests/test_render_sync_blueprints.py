from pathlib import Path

import yaml


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"


def _render_blueprint_paths() -> tuple[Path, ...]:
    return tuple(
        path
        for path in (
            REPO_ROOT / "render.yaml",
            BACKEND_ROOT / "render.yaml",
        )
        if path.exists()
    )


def _services_by_name(path: Path) -> dict:
    data = yaml.safe_load(path.read_text())
    return {service["name"]: service for service in data["services"]}


def test_backend_render_blueprint_keeps_high_risk_sync_crons_in_parity():
    expected_schedules = {
        "alleato-acumatica-financial-sync": "0 0,12 * * *",
        "alleato-source-sync-health": "*/30 * * * *",
        "alleato-teams-channel-sync": "10 * * * *",
        "alleato-teams-dm-sync": "40 * * * *",
        "alleato-graph-sync": "20 */2 * * *",
    }

    for path in _render_blueprint_paths():
        services = _services_by_name(path)
        for name, schedule in expected_schedules.items():
            assert services[name]["schedule"] == schedule


def test_graph_sync_blueprints_do_not_override_the_safe_embed_limit():
    for path in _render_blueprint_paths():
        graph_sync = _services_by_name(path)["alleato-graph-sync"]

        assert "--embed-limit" not in graph_sync["dockerCommand"]
        assert "embed_limit=25" in graph_sync["dockerCommand"]
        assert graph_sync["schedule"] == "20 */2 * * *"
        env = {item["key"]: item.get("value") for item in graph_sync["envVars"]}
        assert env["GRAPH_SYNC_TEAMS"] == "false"
        assert env["GRAPH_SYNC_TEAMS_DM"] == "false"
        assert env["GRAPH_EMBEDDING_LIMIT"] == "25"


def test_high_risk_sync_crons_are_not_disabled_echoes():
    for path in _render_blueprint_paths():
        services = _services_by_name(path)
        for name in (
            "alleato-acumatica-financial-sync",
            "alleato-source-sync-health",
            "alleato-teams-channel-sync",
            "alleato-teams-dm-sync",
            "alleato-graph-sync",
        ):
            assert "disabled while DB incident guard is active" not in services[name]["dockerCommand"]


def test_acumatica_cron_uses_guarded_direct_entrypoint():
    for path in _render_blueprint_paths():
        acumatica = _services_by_name(path)["alleato-acumatica-financial-sync"]

        assert acumatica["schedule"] == "0 0,12 * * *"
        assert acumatica["dockerCommand"] == "python3 scripts/run_acumatica_financial_sync.py"


def test_alleato_crons_require_app_db_pressure_guard():
    for path in _render_blueprint_paths():
        services = _services_by_name(path)
        for name, service in services.items():
            if service.get("type") != "cron" or not name.startswith("alleato-"):
                continue
            env = {item["key"]: item for item in service["envVars"]}
            assert env["APP_DB_PRESSURE_GUARD_REQUIRED"]["value"] == "true"
            assert env["DATABASE_URL"]["sync"] is False


def test_root_blueprint_covers_all_db_pressure_suspend_targets():
    services = _services_by_name(REPO_ROOT / "render.yaml")
    expected = {
        "alleato-acumatica-financial-sync",
        "alleato-ai-provider-health",
        "alleato-domain-packet-compiler",
        "alleato-email-digest",
        "alleato-fireflies-sync",
        "alleato-graph-subscription-reconcile",
        "alleato-graph-sync",
        "alleato-microsoft-executive-assistant-check",
        "alleato-pipeline-alert",
        "alleato-project-synthesis-sweep",
        "alleato-rag-health",
        "alleato-rfi-email-ingest",
        "alleato-source-rag-health",
        "alleato-source-sync-health",
        "alleato-teams-channel-sync",
        "alleato-teams-dm-sync",
    }

    for name in expected:
        service = services[name]
        assert service["type"] == "cron"
        env = {item["key"]: item for item in service["envVars"]}
        assert env["APP_DB_PRESSURE_GUARD_REQUIRED"]["value"] == "true"
        assert env["DATABASE_URL"]["sync"] is False


def test_teams_dm_cron_is_tightly_bounded():
    for path in _render_blueprint_paths():
        teams_dm = _services_by_name(path)["alleato-teams-dm-sync"]
        env = {item["key"]: item.get("value") for item in teams_dm["envVars"]}

        assert "timeout 10m" in teams_dm["dockerCommand"]
        assert env["TEAMS_DM_SYNC_MAX_USERS"] == "1"
        assert env["TEAMS_DM_EXPORT_PAGE_SIZE"] == "25"
        assert env["TEAMS_DM_EXPORT_MAX_PAGES"] == "2"
