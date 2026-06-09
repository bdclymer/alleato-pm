from bootstrap import load_service_module


task_extraction = load_service_module(
    "services/task_extraction.py",
    "services.task_extraction",
)


def test_formats_positive_feedback_examples_for_prompt():
    block = task_extraction._format_positive_feedback_examples(
        [
            {
                "task_snapshot": {
                    "name": "Confirm long-lead switchgear delivery date",
                    "assignee": "Sam",
                    "dueDate": "2026-05-12",
                    "priority": "high",
                    "notes": "Needed before schedule update",
                }
            }
        ]
    )

    assert "Confirm long-lead switchgear delivery date" in block
    assert "assignee: Sam" in block
    assert "due: 2026-05-12" in block
    assert "priority: high" in block


def test_extract_prompt_includes_positive_examples():
    client = _CapturingClient()
    result = task_extraction._extract_tasks(
        {
            "type": "email",
            "content": "Brandon will send the updated subcontractor schedule to Megan by Friday afternoon with all pricing notes attached.",
            "summary": None,
            "action_items": None,
            "bullet_points": None,
        },
        client=client,
        model="test-model",
        positive_examples='- "Confirm vendor delivery date" (assignee: Sam, priority: high)',
        feedback_examples='- "Reply received" [trivial]',
    )

    assert result.tasks == []
    assert "Confirm vendor delivery date" in client.prompt
    assert 'Reply received' in client.prompt


def test_load_positive_feedback_examples_keeps_project_scoped_selection_stable():
    project_client = _QueryClient(
        [
            {"task_snapshot": {"name": "Project-specific example"}},
            {"task_snapshot": {"name": "Global example"}},
        ]
    )

    project_examples = task_extraction._load_positive_feedback_examples(
        project_client,
        project_id=42,
    )

    assert "Project-specific example" in project_examples
    assert project_client.query.operations == [
        ("select", "task_snapshot,created_at"),
        ("eq", "signal", "good"),
        ("eq", "promoted", True),
        ("order", "created_at", True),
        ("or_", "project_id.is.null,project_id.eq.42"),
        ("limit", task_extraction.TASK_POSITIVE_EXAMPLES_LIMIT),
    ]

    global_client = _QueryClient([{"task_snapshot": {"name": "Global-only example"}}])
    global_examples = task_extraction._load_positive_feedback_examples(
        global_client,
        project_id=None,
    )

    assert "Global-only example" in global_examples
    assert global_client.query.operations == [
        ("select", "task_snapshot,created_at"),
        ("eq", "signal", "good"),
        ("eq", "promoted", True),
        ("order", "created_at", True),
        ("is_", "project_id", None),
        ("limit", task_extraction.TASK_POSITIVE_EXAMPLES_LIMIT),
    ]


class _CapturingClient:
    def __init__(self):
        self.prompt = ""
        self.chat = self.Chat(self)

    class Chat:
        def __init__(self, outer):
            self.completions = _CapturingClient.Completions(outer)

    class Completions:
        def __init__(self, outer):
            self.outer = outer

        def create(self, **kwargs):
            self.outer.prompt = kwargs["messages"][0]["content"]
            return type(
                "Response",
                (),
                {
                    "choices": [
                        type(
                            "Choice",
                            (),
                            {"message": type("Message", (), {"content": "[]"})()},
                        )
                    ]
                },
            )()


class _QueryClient:
    def __init__(self, data):
        self.query = _RecordingQuery(data)

    def table(self, name):
        assert name == "ai_task_feedback"
        return self.query


class _RecordingQuery:
    def __init__(self, data):
        self.data = data
        self.operations = []

    def select(self, value):
        self.operations.append(("select", value))
        return self

    def eq(self, field, value):
        self.operations.append(("eq", field, value))
        return self

    def order(self, field, desc=False):
        self.operations.append(("order", field, desc))
        return self

    def or_(self, value):
        self.operations.append(("or_", value))
        return self

    def is_(self, field, value):
        self.operations.append(("is_", field, value))
        return self

    def limit(self, value):
        self.operations.append(("limit", value))
        return self

    def execute(self):
        return type("Result", (), {"data": self.data})()
