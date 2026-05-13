from services.acumatica_sync import _purchase_order_project_code, _subcontract_project_code


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
