from services.acumatica_sync import (
    AcumaticaFinancialSyncService,
    _purchase_order_project_code,
    _subcontract_project_code,
)


class FakeResponse:
    def __init__(self, data=None):
        self.data = data or []


class FakeQuery:
    def __init__(self, client, table_name):
        self.client = client
        self.table_name = table_name
        self.filters = {}
        self.not_null_field = None
        self.in_filter = None
        self.payload = None
        self.on_conflict = None
        self._negate_next_is = False
        self.write_response = None

    def select(self, *_args):
        return self

    def eq(self, field, value):
        self.filters[field] = value
        return self

    @property
    def not_(self):
        self._negate_next_is = True
        return self

    def is_(self, field, value):
        if self._negate_next_is:
            self.not_null_field = field
            self._negate_next_is = False
        else:
            self.filters[field] = None if value == "null" else value
        return self

    def in_(self, field, values):
        self.in_filter = (field, values)
        return self

    def limit(self, *_args):
        return self

    def upsert(self, payload, on_conflict=None):
        self.payload = payload
        self.on_conflict = on_conflict
        self.client.writes.append(("upsert", self.table_name, payload, on_conflict))
        return self

    def insert(self, payload):
        self.payload = payload
        self.write_response = payload
        self.client.writes.append(("insert", self.table_name, payload, None))
        return self

    def delete(self):
        self.client.writes.append(("delete", self.table_name, None, None))
        return self

    def execute(self):
        if self.write_response is not None:
            return FakeResponse(self.write_response if isinstance(self.write_response, list) else [self.write_response])
        return FakeResponse(self.client.resolve(self))


class FakeSupabase:
    def __init__(self):
        self.writes = []
        self.tables = {
            "acumatica_subcontracts": [
                {
                    "external_key": "SC|001",
                    "subcontract_nbr": "SC-001",
                    "project_id": 7,
                    "vendor_uuid": "vendor-1",
                    "description": "Concrete",
                    "status": "Open",
                    "subcontract_total": 1250,
                    "raw_payload": {
                        "Details": [
                            {
                                "LineNbr": 1,
                                "CostCode": "033000",
                                "Description": "Cast-in-place concrete",
                                "ExtendedCost": 1250,
                            }
                        ]
                    },
                }
            ],
            "acumatica_purchase_orders": [
                {
                    "external_key": "PO|001",
                    "order_nbr": "PO-001",
                    "project_id": 7,
                    "vendor_uuid": "vendor-1",
                    "description": "Materials",
                    "status": "Open",
                    "raw_payload": {
                        "Details": [
                            {
                                "LineNbr": 1,
                                "CostCode": "031000",
                                "Description": "Formwork",
                                "ExtendedCost": 500,
                            }
                        ]
                    },
                }
            ],
            "subcontracts": [{"id": "sub-1", "acumatica_external_key": "SC|001"}],
            "purchase_orders": [{"id": "po-1", "acumatica_external_key": "PO|001"}],
            "project_budget_codes": [
                {"id": "pbc-033000", "project_id": 7, "cost_code_id": "03-3000", "cost_type_id": None},
                {"id": "pbc-031000", "project_id": 7, "cost_code_id": "03-1000", "cost_type_id": None},
            ],
        }

    def table(self, table_name):
        return FakeQuery(self, table_name)

    def resolve(self, query):
        rows = list(self.tables.get(query.table_name, []))
        if query.not_null_field:
            rows = [row for row in rows if row.get(query.not_null_field) is not None]
        if query.in_filter:
            field, values = query.in_filter
            rows = [row for row in rows if row.get(field) in values]
        for field, value in query.filters.items():
            rows = [row for row in rows if row.get(field) == value]
        return rows


def make_service(fake_supabase):
    service = AcumaticaFinancialSyncService.__new__(AcumaticaFinancialSyncService)
    service.supabase = fake_supabase
    service.project_cost_code_map = {}
    service.cost_codes = {"03-3000": "03-3000", "03-1000": "03-1000"}
    return service


def test_purchase_order_project_code_reads_detail_lines():
    record = {
        "OrderNbr": "PO-001",
        "Details": [
            {"LineNbr": 1, "ProjectID": "25-127"},
            {"LineNbr": 2, "ProjectID": "OTHER"},
        ],
    }

    assert _purchase_order_project_code(record) == "25-127"


def test_purchase_order_project_code_prefers_header_project():
    record = {
        "OrderNbr": "PO-001",
        "Project": "25-128",
        "Details": [{"LineNbr": 1, "ProjectID": "25-127"}],
    }

    assert _purchase_order_project_code(record) == "25-128"


def test_subcontract_project_code_reads_detail_lines():
    record = {
        "SubcontractNbr": "SC-001",
        "Details": [{"LineNbr": 1, "ProjectCD": "25-127"}],
    }

    assert _subcontract_project_code(record) == "25-127"


def test_acumatica_subcontract_sov_projection_writes_project_budget_code_id():
    fake_supabase = FakeSupabase()
    service = make_service(fake_supabase)

    result = service._project_subcontracts()

    assert result.skipped == 0
    sov_write = next(
        write for write in fake_supabase.writes if write[0] == "upsert" and write[1] == "subcontract_sov_items"
    )
    [line] = sov_write[2]
    assert line["budget_code"] == "03-3000"
    assert line["project_budget_code_id"] == "pbc-033000"


def test_acumatica_purchase_order_sov_projection_writes_project_budget_code_id():
    fake_supabase = FakeSupabase()
    service = make_service(fake_supabase)

    result = service._project_purchase_orders()

    assert result.skipped == 0
    sov_write = next(
        write for write in fake_supabase.writes if write[0] == "insert" and write[1] == "purchase_order_sov_items"
    )
    [line] = sov_write[2]
    assert line["budget_code"] == "03-1000"
    assert line["project_budget_code_id"] == "pbc-031000"


def test_acumatica_commitment_sov_projection_skips_unresolved_cost_code():
    fake_supabase = FakeSupabase()
    fake_supabase.tables["project_budget_codes"] = []
    service = make_service(fake_supabase)

    result = service._project_subcontracts()

    assert result.skipped == 1
    assert not any(write[1] == "subcontract_sov_items" for write in fake_supabase.writes)
