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
        "alleato-source-sync-health": "*/15 * * * *",
        "alleato-teams-channel-sync": "*/30 * * * *",
        "alleato-teams-dm-sync": "15,45 * * * *",
        "alleato-graph-sync": "5,35 * * * *",
    }

    for name, schedule in expected_schedules.items():
        assert root_services[name]["schedule"] == schedule
        assert backend_services[name]["schedule"] == schedule


def test_graph_sync_blueprints_do_not_override_the_safe_embed_limit():
    for path in (REPO_ROOT / "render.yaml", BACKEND_ROOT / "render.yaml"):
        graph_sync = _services_by_name(path)["alleato-graph-sync"]

        assert "--embed-limit" not in graph_sync["dockerCommand"]
        assert graph_sync["schedule"] == "5,35 * * * *"
