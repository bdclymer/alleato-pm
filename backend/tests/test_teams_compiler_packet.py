from src.services.intelligence.teams_compiler import write_packet_first_signals


class _Result:
    def __init__(self, data):
        self.data = data


class _TableQuery:
    def __init__(self, db, table_name):
        self.db = db
        self.table_name = table_name
        self.rows = list(db.tables.setdefault(table_name, []))
        self.action = "select"
        self.payload = None
        self.limit_count = None

    def select(self, *_args):
        self.action = "select"
        return self

    def insert(self, payload):
        self.action = "insert"
        self.payload = payload
        return self

    def update(self, payload):
        self.action = "update"
        self.payload = payload
        return self

    def delete(self):
        self.action = "delete"
        return self

    def eq(self, key, value):
        self.rows = [row for row in self.rows if row.get(key) == value]
        return self

    def in_(self, key, values):
        allowed = set(values)
        self.rows = [row for row in self.rows if row.get(key) in allowed]
        return self

    def order(self, key, desc=False):
        self.rows = sorted(self.rows, key=lambda row: row.get(key) or "", reverse=desc)
        return self

    def limit(self, value):
        self.limit_count = value
        return self

    def execute(self):
        table = self.db.tables.setdefault(self.table_name, [])
        if self.action == "insert":
            payloads = self.payload if isinstance(self.payload, list) else [self.payload]
            rows = []
            for payload in payloads:
                row = dict(payload)
                row.setdefault("id", self.db.next_id(self.table_name))
                table.append(row)
                rows.append(row)
            return _Result(rows)

        if self.action == "update":
            updated = []
            matching_ids = {id(row) for row in self.rows}
            for row in table:
                if id(row) in matching_ids:
                    row.update(self.payload)
                    updated.append(dict(row))
            return _Result(updated)

        if self.action == "delete":
            matching_ids = {id(row) for row in self.rows}
            self.db.tables[self.table_name] = [
                row for row in table if id(row) not in matching_ids
            ]
            return _Result([])

        rows = self.rows[: self.limit_count] if self.limit_count is not None else self.rows
        return _Result([dict(row) for row in rows])


class _FakeSupabase:
    def __init__(self):
        self.tables = {}
        self.counters = {}

    def table(self, table_name):
        return _TableQuery(self, table_name)

    def next_id(self, table_name):
        self.counters[table_name] = self.counters.get(table_name, 0) + 1
        return f"{table_name}-{self.counters[table_name]}"


def _seed_project_source():
    supabase = _FakeSupabase()
    supabase.tables["document_metadata"] = [
        {
            "id": "teams-doc-1",
            "title": "Teams DM Conversation: Westfield",
            "content": "[message:m1] [2026-05-02 10:00:00] Megan: Schedule is slipping.",
            "category": "teams_message",
            "source": "microsoft_graph",
            "date": "2026-05-02",
            "project_id": 43,
            "source_metadata": {},
        }
    ]
    supabase.tables["projects"] = [
        {
            "id": 43,
            "name": "Westfield Collective",
            "project_number": "24-115",
            "client": "Westfield",
            "aliases": [],
        }
    ]
    return supabase


def test_write_packet_first_signals_promotes_high_confidence_teams_outputs():
    supabase = _seed_project_source()
    messages = [
        {
            "message_id": "m1",
            "timestamp": "2026-05-02T10:00:00",
            "sender": "Megan",
            "text": "The schedule is slipping unless Brandon confirms the subcontractor plan.",
        },
        {
            "message_id": "m2",
            "timestamp": "2026-05-02T10:05:00",
            "sender": "Brandon",
            "text": "I will confirm the plan today.",
        },
    ]
    extracted = {
        "insights": [
            {
                "insight_type": "schedule_risk",
                "summary": "Schedule risk is forming around subcontractor sequencing.",
                "strategic_read": "The project needs confirmation of the subcontractor plan today.",
                "why_it_matters": "A missed confirmation could push the schedule.",
                "recommended_action": "Confirm the subcontractor plan.",
                "source_message_ids": ["m1"],
                "confidence": 0.92,
                "target_type": "client_project",
            }
        ],
        "tasks": [
            {
                "task_text": "Confirm the subcontractor plan today.",
                "owner": "Brandon",
                "source_message_id": "m2",
                "confidence": 0.91,
                "needs_review": False,
            }
        ],
    }

    result = write_packet_first_signals(
        supabase,
        "teams-doc-1",
        extracted,
        messages,
        43,
        "2026-05-02",
    )

    assert result["signals_written"] == 2
    assert result["signals_promoted"] == 2
    assert result["packet_id"]
    assert len(supabase.tables["source_signal_candidates"]) == 2
    assert {row["status"] for row in supabase.tables["source_signal_candidates"]} == {"promoted"}
    assert len(supabase.tables["insight_cards"]) == 2
    assert len(supabase.tables["insight_card_evidence"]) == 2
    assert len(supabase.tables["intelligence_packets"]) == 1
    assert supabase.tables["intelligence_packets"][0]["freshness_status"] == "fresh"
    assert len(supabase.tables["intelligence_packet_cards"]) == 2


def test_write_packet_first_signals_without_project_stays_out_of_packets():
    supabase = _seed_project_source()

    result = write_packet_first_signals(
        supabase,
        "teams-doc-1",
        {"tasks": [{"task_text": "Call the owner.", "confidence": 0.95}]},
        [],
        None,
        "2026-05-02",
    )

    assert result["signals_written"] == 0
    assert result["packet_id"] is None
    assert result["skipped_reason"] == "no high-confidence client project attribution"
