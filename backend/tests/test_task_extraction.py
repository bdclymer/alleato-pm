from datetime import datetime, timezone

from src.services.pipeline.extractor import _enrich_fireflies_tasks_with_llm_context
from src.services.pipeline.models import TaskItem
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


def test_enrich_fireflies_tasks_preserves_direct_text_and_adds_llm_context():
    direct = [
        TaskItem(
            description="Finalize and submit pricing for phase one scope of work by May 18",
            assignee=None,
            assignee_email=None,
            due_date="2026-05-18",
            priority="medium",
        )
    ]
    llm = [
        TaskItem(
            description="Submit phase one pricing by May 18",
            assignee="Brandon Clymer",
            assignee_email="bclymer@alleatogroup.com",
            due_date="2026-05-18",
            priority="high",
        )
    ]

    enriched = _enrich_fireflies_tasks_with_llm_context(direct, llm)

    assert enriched[0].description == direct[0].description
    assert enriched[0].assignee == "Brandon Clymer"
    assert enriched[0].assignee_email == "bclymer@alleatogroup.com"
    assert enriched[0].due_date == "2026-05-18"
