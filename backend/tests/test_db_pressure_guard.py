import pytest

from src.services.ops import db_pressure_guard


def test_pressure_guard_fails_closed_when_required_url_missing(monkeypatch):
    monkeypatch.setenv("APP_DB_PRESSURE_GUARD_REQUIRED", "true")
    monkeypatch.delenv("APP_DATABASE_URL", raising=False)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_DB_URL", raising=False)

    with pytest.raises(db_pressure_guard.AppDbPressureError, match="is missing"):
        db_pressure_guard.enforce_app_db_pressure_guard("graph_sync")


def test_pressure_guard_can_skip_local_runs_without_database_url(monkeypatch):
    monkeypatch.delenv("APP_DB_PRESSURE_GUARD_REQUIRED", raising=False)
    monkeypatch.delenv("APP_DATABASE_URL", raising=False)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_DB_URL", raising=False)

    assert db_pressure_guard.enforce_app_db_pressure_guard("local_debug") is None


def test_pressure_guard_blocks_high_connection_pressure(monkeypatch):
    class FakeCursor:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def execute(self, *_args):
            return None

        def fetchone(self):
            return {
                "total_connections": 99,
                "active_connections": 2,
                "idle_in_transaction_connections": 0,
                "long_running_active_connections": 0,
                "max_query_age_seconds": 4,
            }

    class FakeConnection:
        def cursor(self, *_args, **_kwargs):
            return FakeCursor()

        def close(self):
            return None

    monkeypatch.setenv("DATABASE_URL", "postgresql://example")
    monkeypatch.setenv("APP_DB_PRESSURE_MAX_TOTAL_CONNECTIONS", "10")
    monkeypatch.setattr(
        db_pressure_guard.psycopg2,
        "connect",
        lambda *_args, **_kwargs: FakeConnection(),
        raising=False,
    )

    with pytest.raises(db_pressure_guard.AppDbPressureError, match="total_connections=99>10"):
        db_pressure_guard.enforce_app_db_pressure_guard("graph_sync")
