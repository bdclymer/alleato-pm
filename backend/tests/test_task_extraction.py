from datetime import datetime, timezone

from src.services.pipeline.extractor import _enrich_fireflies_tasks_with_llm_context
from src.services.pipeline.models import TaskItem
from src.services.task_extraction import _extract_tasks, _source_occurred_at


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


class _FakeMessage:
    def __init__(self, content):
        self.content = content


class _FakeChoice:
    def __init__(self, content):
        self.message = _FakeMessage(content)


class _FakeResponse:
    def __init__(self, content):
        self.choices = [_FakeChoice(content)]


class _FakeCompletions:
    def __init__(self, content=None, error=None):
        self.content = content
        self.error = error

    def create(self, **_kwargs):
        if self.error:
            raise self.error
        return _FakeResponse(self.content)


class _FakeChat:
    def __init__(self, content=None, error=None):
        self.completions = _FakeCompletions(content=content, error=error)


class _FakeOpenAIClient:
    def __init__(self, content=None, error=None):
        self.chat = _FakeChat(content=content, error=error)


def _task_doc(content=None):
    return {
        "id": "doc-1",
        "type": "email",
        "content": content
        or (
            "Brandon asked Megan to send the revised budget backup by Friday. "
            "Megan confirmed she would send the revised budget backup by Friday."
        ),
    }


def test_extract_tasks_returns_tasks_for_valid_json_array():
    result = _extract_tasks(
        _task_doc(),
        _FakeOpenAIClient(
            content=(
                '[{"title":"Send budget backup",'
                '"description":"Send the revised budget backup",'
                '"assignee_name":"Megan",'
                '"due_date":"2026-05-15"}]'
            )
        ),
        "test-model",
    )

    assert result.error_message is None
    assert result.tasks[0]["title"] == "Send budget backup"


def test_extract_tasks_marks_invalid_json_shape_as_error():
    result = _extract_tasks(
        _task_doc(),
        _FakeOpenAIClient(content='{"title":"Not an array"}'),
        "test-model",
    )

    assert result.tasks == []
    assert result.error_message == "LLM response was not a JSON array"


def test_extract_tasks_marks_provider_failure_as_error():
    result = _extract_tasks(
        _task_doc(),
        _FakeOpenAIClient(error=RuntimeError("provider unavailable")),
        "test-model",
    )

    assert result.tasks == []
    assert result.error_message == "provider unavailable"


def test_extract_tasks_short_source_is_empty_not_failed():
    result = _extract_tasks(
        _task_doc(content="Too short."),
        _FakeOpenAIClient(error=RuntimeError("should not be called")),
        "test-model",
    )

    assert result.tasks == []
    assert result.error_message is None
