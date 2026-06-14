from services.acumatica_sync import AcumaticaFinancialSyncService


class _Session:
    def __init__(self, entity_sets):
        self.entity_sets = entity_sets

    def fetch_odata_entity_sets(self):
        return self.entity_sets


def _service_with_entity_sets(entity_sets):
    service = object.__new__(AcumaticaFinancialSyncService)
    service.session = _Session(entity_sets)
    return service


def test_find_ar_payment_applications_odata_entity_uses_metadata_name():
    service = _service_with_entity_sets(["BI-ARInvoices", "ProcoreARPaymentApplications"])

    assert service._find_ar_payment_applications_odata_entity() == "ProcoreARPaymentApplications"


def test_ar_payment_application_row_from_odata_maps_common_aradjust_fields():
    service = _service_with_entity_sets([])
    row = service._ar_payment_application_row_from_odata(
        {
            "AdjgRefNbr": "000235",
            "AdjgDocType": "Payment",
            "AdjdRefNbr": "000557",
            "AdjdDocType": "Invoice",
            "CustomerID": "OWNER",
            "CuryAdjdAmt": "1234.56",
            "ProjectID": "25-125",
        }
    )

    assert row == {
        "payment_external_key": "Payment|000235",
        "payment_reference_nbr": "000235",
        "payment_type": "Payment",
        "invoice_reference_nbr": "000557",
        "invoice_type": "Invoice",
        "customer_id": "OWNER",
        "amount_applied": 1234.56,
        "balance": None,
        "resolved_project_code": "25-125",
        "resolution_method": "ar_payment_applications_odata",
    }


def test_ar_payment_application_row_from_odata_requires_payment_and_invoice_refs():
    service = _service_with_entity_sets([])

    assert service._ar_payment_application_row_from_odata({"AdjgRefNbr": "000235"}) is None
