from datetime import datetime, timezone

from src.services.task_extraction import _source_occurred_at


def test_source_occurred_at_prefers_message_date_over_ingestion_date():
    source_date = _source_occurred_at(
        {
            "date": "2026-01-02T00:00:00+00:00",
            "captured_at": None,
            "created_at": "2026-05-05T16:30:50.680246",
        }
    )

    assert source_date == datetime(2026, 1, 2, tzinfo=timezone.utc)


def test_source_occurred_at_falls_back_to_created_at_when_source_date_missing():
    source_date = _source_occurred_at(
        {
            "date": None,
            "captured_at": None,
            "created_at": "2026-05-05T16:30:50.680246+00:00",
        }
    )

    assert source_date == datetime(2026, 5, 5, 16, 30, 50, 680246, tzinfo=timezone.utc)
