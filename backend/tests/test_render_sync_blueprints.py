from pathlib import Path

import yaml


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"


def _services_by_name(path: Path) -> dict:
    data = yaml.safe_load(path.read_text())
    return {service["name"]: service for service in data["services"]}


def test_backend_render_blueprint_keeps_high_risk_sync_crons_in_parity():
    root_services = _services_by_name(REPO_ROOT / "render.yaml")
    backend_services = _services_by_name(BACKEND_ROOT / "render.yaml")

    expected_schedules = {
        "alleato-source-sync-health": "*/30 * * * *",
        "alleato-teams-channel-sync": "10 * * * *",
        "alleato-teams-dm-sync": "40 * * * *",
        "alleato-graph-sync": "20 */2 * * *",
    }

    for name, schedule in expected_schedules.items():
        assert root_services[name]["schedule"] == schedule
        assert backend_services[name]["schedule"] == schedule


def test_graph_sync_blueprints_do_not_override_the_safe_embed_limit():
    for path in (REPO_ROOT / "render.yaml", BACKEND_ROOT / "render.yaml"):
        graph_sync = _services_by_name(path)["alleato-graph-sync"]

        assert "--embed-limit" not in graph_sync["dockerCommand"]
        assert "embed_limit=25" in graph_sync["dockerCommand"]
        assert graph_sync["schedule"] == "20 */2 * * *"
        env = {item["key"]: item.get("value") for item in graph_sync["envVars"]}
        assert env["GRAPH_SYNC_TEAMS"] == "false"
        assert env["GRAPH_SYNC_TEAMS_DM"] == "false"
        assert env["GRAPH_EMBEDDING_LIMIT"] == "25"


def test_high_risk_sync_crons_are_not_disabled_echoes():
    for path in (REPO_ROOT / "render.yaml", BACKEND_ROOT / "render.yaml"):
        services = _services_by_name(path)
        for name in (
            "alleato-source-sync-health",
            "alleato-teams-channel-sync",
            "alleato-teams-dm-sync",
            "alleato-graph-sync",
        ):
            assert "disabled while DB incident guard is active" not in services[name]["dockerCommand"]


def test_teams_dm_cron_is_tightly_bounded():
    for path in (REPO_ROOT / "render.yaml", BACKEND_ROOT / "render.yaml"):
        teams_dm = _services_by_name(path)["alleato-teams-dm-sync"]
        env = {item["key"]: item.get("value") for item in teams_dm["envVars"]}

        assert "timeout 10m" in teams_dm["dockerCommand"]
        assert env["TEAMS_DM_SYNC_MAX_USERS"] == "1"
        assert env["TEAMS_DM_EXPORT_PAGE_SIZE"] == "25"
        assert env["TEAMS_DM_EXPORT_MAX_PAGES"] == "2"
