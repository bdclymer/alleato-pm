import pytest

from src.services.ingestion.fireflies_pipeline import FirefliesIngestionPipeline


class TestFirefliesActionItems:
    def test_build_task_rows_from_action_items_resolves_assignee_email(self):
        rows = FirefliesIngestionPipeline._build_task_rows_from_action_items(
            metadata_id="meeting-123",
            action_items=[
                "Candon to handle outstanding payments for Superior by tomorrow (16:10)",
                "Follow up with Tyler to finalize coding and approval of all pending invoices today (13:01)",
            ],
            project_id=67,
            speaker_email_map={
                "Candon Rusin": "crusin@alleatogroup.com",
                "Jesse Dawson": "jdawson@alleatogroup.com",
            },
            speakers_json=[
                {"name": "Candon Rusin"},
                {"name": "Jesse Dawson"},
            ],
            attendees_json=[],
            source_date="2026-05-08T17:30:00+00:00",
        )

        assert len(rows) == 2
        assert rows[0]["description"] == "Candon to handle outstanding payments for Superior by tomorrow"
        assert rows[0]["assignee_name"] == "Candon Rusin"
        assert rows[0]["assignee_email"] == "crusin@alleatogroup.com"
        assert rows[0]["due_date"] == "2026-05-09"
        assert rows[0]["project_ids"] == [67]
        assert rows[1]["description"] == "Follow up with Tyler to finalize coding and approval of all pending invoices today"
        assert rows[1]["assignee_name"] == "Tyler"
        assert "assignee_email" not in rows[1]

    def test_build_task_rows_from_action_items_dedupes_and_handles_empty_project(self):
        rows = FirefliesIngestionPipeline._build_task_rows_from_action_items(
            metadata_id="meeting-123",
            action_items=[
                "Monitor invoice approval deadlines by the 5th (04:42)",
                "Monitor invoice approval deadlines by the 5th (09:11)",
            ],
            project_id=None,
            speaker_email_map={},
            speakers_json=[],
            attendees_json=[],
        )

        assert len(rows) == 1
        assert rows[0]["description"] == "Monitor invoice approval deadlines by the 5th"
        assert rows[0]["project_ids"] == []

    def test_build_task_rows_from_action_items_infers_due_dates_from_source_date(self):
        rows = FirefliesIngestionPipeline._build_task_rows_from_action_items(
            metadata_id="meeting-123",
            action_items=[
                "Finalize and submit pricing for phase one scope of work by May 18 (10:30)",
                "Text Indiana office group chat about onboarding on May 11th (14:00)",
                "Prepare new hire material list on Monday (26:00)",
            ],
            project_id=31,
            speaker_email_map={},
            speakers_json=[],
            attendees_json=[],
            source_date="2026-05-08T18:00:00+00:00",
        )

        assert [row["due_date"] for row in rows] == [
            "2026-05-18",
            "2026-05-11",
            "2026-05-11",
        ]
