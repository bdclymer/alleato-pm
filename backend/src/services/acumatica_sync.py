from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional, Sequence

import httpx

from .env_loader import load_env
from .supabase_helpers import get_supabase_client

load_env()

logger = logging.getLogger(__name__)

DEFAULT_COMPANY_NAME = os.getenv("ACUMATICA_COMPANY", "Alleato Group")
DEFAULT_BASE_URL = os.getenv("ACUMATICA_BASE_URL", "https://alleatogroup.acumatica.com")
ENTITY_BASE = f"{DEFAULT_BASE_URL}/entity/Default/24.200.001"
PAGE_SIZE = max(25, int(os.getenv("ACUMATICA_SYNC_PAGE_SIZE", "100")))


@dataclass
class EntitySyncResult:
    entity: str
    fetched: int = 0
    upserted: int = 0
    projected: int = 0
    skipped: int = 0
    errors: int = 0
    cursor: Optional[str] = None

    def as_dict(self) -> Dict[str, Any]:
        return {
            "entity": self.entity,
            "fetched": self.fetched,
            "upserted": self.upserted,
            "projected": self.projected,
            "skipped": self.skipped,
            "errors": self.errors,
            "cursor": self.cursor,
        }


def _chunked(values: Sequence[Dict[str, Any]], size: int = 200) -> Iterable[Sequence[Dict[str, Any]]]:
    for idx in range(0, len(values), size):
        yield values[idx : idx + size]


def _unwrap(raw: Any) -> Any:
    if raw is None:
        return None
    if isinstance(raw, list):
        return [_unwrap(item) for item in raw]
    if isinstance(raw, dict):
        if "value" in raw and len(raw) == 1:
            return raw["value"]
        return {key: _unwrap(value) for key, value in raw.items() if key not in {"id", "rowNumber", "note", "custom", "files"}}
    return raw


def _iso_to_date(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    return value.split("T")[0]


def _iso_timestamp(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    return value


def _num(value: Any) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _normalize_cost_code(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    cleaned = value.strip()
    if not cleaned or cleaned == "{}":
        return None
    if cleaned in {"<N/A>", "N/A"}:
        return None
    if len(cleaned) == 6 and cleaned.isdigit():
        return f"{cleaned[:2]}-{cleaned[2:]}"
    return cleaned


class AcumaticaSession:
    def __init__(self) -> None:
        self.base_url = DEFAULT_BASE_URL
        self.entity_base = ENTITY_BASE
        self.client = httpx.Client(timeout=60.0, follow_redirects=False)

    def login(self) -> None:
        username = os.getenv("ACCOUNTING_USER")
        password = os.getenv("ACCOUNTING_PASSWORD")
        if not username or not password:
            raise RuntimeError("ACCOUNTING_USER and ACCOUNTING_PASSWORD are required for Acumatica sync")

        response = self.client.post(
            f"{self.base_url}/entity/auth/login",
            json={
                "name": username,
                "password": password,
                "company": DEFAULT_COMPANY_NAME,
            },
            headers={"Content-Type": "application/json"},
        )
        if response.status_code != 204:
            raise RuntimeError(f"Acumatica login failed (HTTP {response.status_code}): {response.text[:300]}")

    def fetch_entity(
        self,
        entity_name: str,
        *,
        top: int = PAGE_SIZE,
        expand: Optional[str] = None,
        select: Optional[str] = None,
        modified_after: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        records: List[Dict[str, Any]] = []
        skip = 0

        while True:
            params: Dict[str, str] = {
                "$top": str(top),
                "$skip": str(skip),
            }
            if expand:
                params["$expand"] = expand
            if select:
                params["$select"] = select
            if modified_after:
                params["$filter"] = f"LastModifiedDateTime gt datetimeoffset'{modified_after}'"

            response = self.client.get(
                f"{self.entity_base}/{entity_name}",
                params=params,
                headers={"Accept": "application/json"},
            )
            if not response.is_success:
                raise RuntimeError(
                    f"Acumatica {entity_name} fetch failed (HTTP {response.status_code}): {response.text[:300]}"
                )

            page = [_unwrap(item) for item in response.json()]
            records.extend(page)
            if len(page) < top:
                break
            skip += top

        return records


class AcumaticaFinancialSyncService:
    def __init__(self) -> None:
        self.supabase = get_supabase_client()
        self.session = AcumaticaSession()
        self.sync_user_id: Optional[str] = None
        self.project_map: Dict[str, Dict[str, Any]] = {}
        self.vendor_map: Dict[str, Dict[str, Any]] = {}
        self.project_cost_code_map: Dict[tuple[int, str], str] = {}
        self.cost_codes: Dict[str, str] = {}

    def sync_all(self) -> Dict[str, Any]:
        self.session.login()
        self.sync_user_id = self._resolve_sync_user_id()
        self.project_map = self._load_project_map()
        self.vendor_map = self._load_vendor_map()
        self.cost_codes = self._load_cost_codes()

        results: List[Dict[str, Any]] = []
        errors: List[str] = []

        for entity, handler in (
            ("vendors", self._sync_vendors),
            ("ap_bills", self._sync_ap_bills),
            ("ar_invoices", self._sync_ar_invoices),
            ("ap_checks", self._sync_checks),
            ("project_budgets", self._sync_project_budgets),
        ):
            try:
                result = self._run_entity_sync(entity, handler)
                results.append(result.as_dict())
            except Exception as exc:
                logger.exception("[AcumaticaSync] %s failed", entity)
                self._update_sync_state(
                    entity,
                    status="failed",
                    last_started_at=_now_iso(),
                    last_error=str(exc),
                )
                errors.append(f"{entity}: {exc}")

        status = "success" if not errors else "partial_failure"
        return {
            "status": status,
            "ran_at": _now_iso(),
            "results": results,
            "errors": errors,
        }

    def _run_entity_sync(self, entity_name: str, handler) -> EntitySyncResult:
        state = self._get_sync_state(entity_name)
        started_at = _now_iso()
        self._update_sync_state(entity_name, status="running", last_started_at=started_at)

        result: EntitySyncResult = handler(state.get("last_cursor"))
        result.cursor = result.cursor or state.get("last_cursor") or started_at

        self._update_sync_state(
            entity_name,
            status="success",
            last_started_at=started_at,
            last_success_at=_now_iso(),
            last_cursor=result.cursor,
            last_error=None,
            last_stats=result.as_dict(),
        )
        return result

    def _get_sync_state(self, entity_name: str) -> Dict[str, Any]:
        response = (
            self.supabase.table("acumatica_sync_state")
            .select("*")
            .eq("entity_name", entity_name)
            .limit(1)
            .execute()
        )
        rows = response.data or []
        return rows[0] if rows else {}

    def _update_sync_state(
        self,
        entity_name: str,
        *,
        status: str,
        last_started_at: Optional[str] = None,
        last_success_at: Optional[str] = None,
        last_cursor: Optional[str] = None,
        last_error: Optional[str] = None,
        last_stats: Optional[Dict[str, Any]] = None,
    ) -> None:
        payload: Dict[str, Any] = {
            "entity_name": entity_name,
            "status": status,
            "updated_at": _now_iso(),
        }
        if last_started_at is not None:
            payload["last_started_at"] = last_started_at
        if last_success_at is not None:
            payload["last_success_at"] = last_success_at
        if last_cursor is not None:
            payload["last_cursor"] = last_cursor
        payload["last_error"] = last_error
        payload["last_stats"] = last_stats

        self.supabase.table("acumatica_sync_state").upsert(payload).execute()

    def _load_project_map(self) -> Dict[str, Dict[str, Any]]:
        response = self.supabase.table("projects").select("id, company_id, acumatica_project_id").execute()
        project_map: Dict[str, Dict[str, Any]] = {}
        for row in response.data or []:
            code = row.get("acumatica_project_id")
            if code:
                project_map[code] = row
        return project_map

    def _load_vendor_map(self) -> Dict[str, Dict[str, Any]]:
        response = self.supabase.table("vendors").select("id, name, company_id, acumatica_vendor_id").execute()
        vendor_map: Dict[str, Dict[str, Any]] = {}
        for row in response.data or []:
            acu_id = row.get("acumatica_vendor_id")
            if acu_id:
                vendor_map[acu_id] = row
        return vendor_map

    def _load_cost_codes(self) -> Dict[str, str]:
        response = self.supabase.table("cost_codes").select("id").execute()
        return {row["id"]: row["id"] for row in response.data or [] if row.get("id")}

    def _resolve_sync_user_id(self) -> str:
        configured = os.getenv("ACUMATICA_SYNC_USER_ID")
        if configured:
            return configured

        response = (
            self.supabase.table("users_auth")
            .select("auth_user_id")
            .limit(1)
            .execute()
        )
        rows = response.data or []
        if not rows:
            raise RuntimeError("ACUMATICA_SYNC_USER_ID is not set and no users_auth rows exist for direct_cost audit fields")
        return rows[0]["auth_user_id"]

    def _ensure_project_cost_code(self, project_id: int, cost_code_id: str) -> Optional[str]:
        normalized_cost_code_id = _normalize_cost_code(cost_code_id)
        if not normalized_cost_code_id:
            return None

        cache_key = (project_id, normalized_cost_code_id)
        if cache_key in self.project_cost_code_map:
            return self.project_cost_code_map[cache_key]

        existing = (
            self.supabase.table("project_cost_codes")
            .select("id")
            .eq("project_id", project_id)
            .eq("cost_code_id", normalized_cost_code_id)
            .limit(1)
            .execute()
        )
        if existing.data:
            project_cost_code_id = existing.data[0]["id"]
            self.project_cost_code_map[cache_key] = project_cost_code_id
            return project_cost_code_id

        if normalized_cost_code_id not in self.cost_codes:
            return None

        inserted = (
            self.supabase.table("project_cost_codes")
            .insert(
                {
                    "project_id": project_id,
                    "cost_code_id": normalized_cost_code_id,
                    "is_active": True,
                }
            )
            .execute()
        )
        if getattr(inserted, "data", None):
            inserted_row = inserted.data[0] if isinstance(inserted.data, list) else inserted.data
            project_cost_code_id = inserted_row.get("id") if isinstance(inserted_row, dict) else None
        else:
            project_cost_code_id = None

        if not project_cost_code_id:
            refetch = (
                self.supabase.table("project_cost_codes")
                .select("id")
                .eq("project_id", project_id)
                .eq("cost_code_id", normalized_cost_code_id)
                .limit(1)
                .execute()
            )
            if not refetch.data:
                return None
            project_cost_code_id = refetch.data[0]["id"]

        self.project_cost_code_map[cache_key] = project_cost_code_id
        return project_cost_code_id

    def _max_cursor(self, records: List[Dict[str, Any]]) -> Optional[str]:
        values = [
            value
            for value in (record.get("LastModifiedDateTime") for record in records)
            if value
        ]
        return max(values) if values else None

    def _sync_vendors(self, last_cursor: Optional[str]) -> EntitySyncResult:
        result = EntitySyncResult(entity="vendors")
        records = self.session.fetch_entity("Vendor", top=200, expand="MainContact", modified_after=last_cursor)
        result.fetched = len(records)
        result.cursor = self._max_cursor(records) or _now_iso()

        if not records:
            return result

        existing = (
            self.supabase.table("vendors")
            .select("id, name, acumatica_vendor_id, company_id")
            .execute()
        ).data or []

        by_acu_id = {row["acumatica_vendor_id"]: row for row in existing if row.get("acumatica_vendor_id")}
        by_name = {row["name"].strip().lower(): row for row in existing if row.get("name")}
        now = _now_iso()

        created = 0
        updated = 0

        for vendor in records:
            if vendor.get("Status") != "Active":
                continue

            vendor_id = vendor.get("VendorID")
            vendor_name = (vendor.get("VendorName") or "").strip()
            if not vendor_id or not vendor_name:
                result.skipped += 1
                continue

            payload = {
                "name": vendor_name,
                "legal_name": vendor.get("LegalName"),
                "contact_email": ((vendor.get("MainContact") or {}).get("Email")),
                "contact_phone": ((vendor.get("MainContact") or {}).get("Phone1")),
                "vendor_class": vendor.get("VendorClass"),
                "terms": vendor.get("Terms"),
                "payment_method": vendor.get("PaymentMethod"),
                "ap_account": vendor.get("APAccount"),
                "cash_account": vendor.get("CashAccount"),
                "is_1099_vendor": vendor.get("F1099Vendor"),
                "is_foreign_entity": vendor.get("ForeignEntity"),
                "is_labor_union": vendor.get("VendorIsLaborUnion"),
                "is_tax_agency": vendor.get("VendorIsTaxAgency"),
                "acumatica_sync_at": now,
                "acumatica_vendor_id": vendor_id,
            }

            existing_row = by_acu_id.get(vendor_id) or by_name.get(vendor_name.lower())
            if existing_row:
                self.supabase.table("vendors").update(payload).eq("id", existing_row["id"]).execute()
                updated += 1
            else:
                fallback_company_id = next(iter(self.project_map.values()), {}).get("company_id")
                if not fallback_company_id:
                    result.skipped += 1
                    continue
                self.supabase.table("vendors").insert(
                    {
                        "company_id": fallback_company_id,
                        "is_active": True,
                        **payload,
                    }
                ).execute()
                created += 1

        result.upserted = created + updated
        self.vendor_map = self._load_vendor_map()
        return result

    def _sync_ap_bills(self, last_cursor: Optional[str]) -> EntitySyncResult:
        result = EntitySyncResult(entity="ap_bills")
        records = self.session.fetch_entity("Bill", top=100, expand="Details", modified_after=last_cursor)
        result.fetched = len(records)
        result.cursor = self._max_cursor(records) or _now_iso()

        if not records:
            return result

        synced_at = _now_iso()
        headers: List[Dict[str, Any]] = []
        projected_rows: List[Dict[str, Any]] = []
        projected_lines_by_key: Dict[str, List[Dict[str, Any]]] = {}
        touched_project_ids: set[int] = set()

        for bill in records:
            project_code = bill.get("Project") or next(
                (detail.get("Project") for detail in bill.get("Details") or [] if detail.get("Project")),
                None,
            )
            project_row = self.project_map.get(project_code) if project_code else None
            vendor_row = self.vendor_map.get(bill.get("Vendor")) if bill.get("Vendor") else None
            external_key = f"{bill.get('Type') or 'Bill'}|{bill.get('ReferenceNbr')}"

            headers.append(
                {
                    "external_key": external_key,
                    "reference_nbr": bill.get("ReferenceNbr"),
                    "document_type": bill.get("Type"),
                    "vendor_id": bill.get("Vendor"),
                    "vendor_ref": bill.get("VendorRef"),
                    "project_code": project_code,
                    "project_id": project_row.get("id") if project_row else None,
                    "company_id": project_row.get("company_id") if project_row else None,
                    "date": _iso_to_date(bill.get("Date")),
                    "due_date": _iso_to_date(bill.get("DueDate")),
                    "post_period": bill.get("PostPeriod") or bill.get("FinancialPeriod"),
                    "status": bill.get("Status"),
                    "description": bill.get("Description"),
                    "currency_id": bill.get("CurrencyID"),
                    "cash_account": bill.get("CashAccount"),
                    "terms": bill.get("Terms"),
                    "approved_for_payment": bill.get("ApprovedForPayment"),
                    "hold": bill.get("Hold"),
                    "amount": _num(bill.get("Amount")),
                    "balance": _num(bill.get("Balance")),
                    "tax_total": _num(bill.get("TaxTotal")),
                    "last_modified_at": _iso_timestamp(bill.get("LastModifiedDateTime")),
                    "acumatica_sync_at": synced_at,
                    "raw_payload": bill,
                    "updated_at": synced_at,
                }
            )

            if not project_row:
                result.skipped += 1
                continue

            mapped_line_items: List[Dict[str, Any]] = []
            for index, detail in enumerate(bill.get("Details") or [], start=1):
                cost_code = detail.get("CostCode")
                if not cost_code:
                    continue
                budget_code_id = self._ensure_project_cost_code(project_row["id"], cost_code)
                if not budget_code_id:
                    continue
                quantity = _num(detail.get("Qty")) or 1.0
                unit_cost = _num(detail.get("UnitCost"))
                line_total = _num(detail.get("ExtendedCost")) or _num(detail.get("Amount"))
                if unit_cost is None and line_total is not None and quantity:
                    unit_cost = line_total / quantity
                unit_cost = unit_cost or 0.0
                line_total = line_total if line_total is not None else quantity * unit_cost

                mapped_line_items.append(
                    {
                        "budget_code_id": budget_code_id,
                        "description": detail.get("TransactionDescription") or detail.get("Description"),
                        "quantity": quantity,
                        "uom": detail.get("UOM"),
                        "unit_cost": unit_cost,
                        "_line_total": line_total,
                        "line_order": index,
                    }
                )

            if not mapped_line_items:
                result.skipped += 1
                continue

            total_amount = sum(item["_line_total"] or 0 for item in mapped_line_items)
            document_key = external_key
            projected_rows.append(
                {
                    "project_id": project_row["id"],
                    "cost_type": "Invoice",
                    "date": _iso_to_date(bill.get("Date")),
                    "vendor_id": vendor_row.get("id") if vendor_row else None,
                    "invoice_number": bill.get("VendorRef") or bill.get("ReferenceNbr"),
                    "status": "Approved",
                    "description": bill.get("Description"),
                    "terms": bill.get("Terms"),
                    "received_date": _iso_to_date(bill.get("Date")),
                    "paid_date": None,
                    "total_amount": total_amount,
                    "created_by_user_id": self.sync_user_id,
                    "updated_by_user_id": self.sync_user_id,
                    "acumatica_document_key": document_key,
                    "acumatica_ref_nbr": bill.get("ReferenceNbr"),
                    "acumatica_doc_type": bill.get("Type"),
                    "acumatica_financial_period": bill.get("PostPeriod") or bill.get("FinancialPeriod"),
                    "acumatica_sync_at": synced_at,
                    "is_deleted": False,
                    "updated_at": synced_at,
                }
            )
            projected_lines_by_key[document_key] = mapped_line_items
            touched_project_ids.add(project_row["id"])

        for chunk in _chunked(headers):
            self.supabase.table("acumatica_ap_bills").upsert(list(chunk), on_conflict="external_key").execute()

        result.upserted = len(headers)
        self._replace_ap_bill_lines(records)

        if projected_rows:
            for chunk in _chunked(projected_rows):
                self.supabase.table("direct_costs").upsert(list(chunk), on_conflict="acumatica_document_key").execute()

            lookup: List[Dict[str, Any]] = []
            for key_chunk in _chunked(
                [{"acumatica_document_key": key} for key in projected_lines_by_key.keys()],
                size=150,
            ):
                keys = [row["acumatica_document_key"] for row in key_chunk]
                lookup.extend(
                    (
                        self.supabase.table("direct_costs")
                        .select("id, acumatica_document_key")
                        .in_("acumatica_document_key", keys)
                        .execute()
                    ).data
                    or []
                )
            by_key = {row["acumatica_document_key"]: row["id"] for row in lookup}
            direct_cost_ids = list(by_key.values())
            for id_chunk in _chunked([{"id": value} for value in direct_cost_ids], size=150):
                ids = [row["id"] for row in id_chunk]
                self.supabase.table("direct_cost_line_items").delete().in_("direct_cost_id", ids).execute()

            line_rows: List[Dict[str, Any]] = []
            for document_key, line_items in projected_lines_by_key.items():
                direct_cost_id = by_key.get(document_key)
                if not direct_cost_id:
                    continue
                for item in line_items:
                    line_payload = {key: value for key, value in item.items() if key != "_line_total"}
                    line_rows.append(
                        {
                            "direct_cost_id": direct_cost_id,
                            **line_payload,
                        }
                    )

            for chunk in _chunked(line_rows):
                self.supabase.table("direct_cost_line_items").insert(list(chunk)).execute()

            result.projected = len(projected_rows)

        for project_id in touched_project_ids:
            self.supabase.table("projects").update(
                {
                    "erp_last_direct_cost_sync": synced_at,
                    "erp_sync_status": "synced",
                    "erp_system": "acumatica",
                }
            ).eq("id", project_id).execute()

        return result

    def _replace_ap_bill_lines(self, records: List[Dict[str, Any]]) -> None:
        external_keys = [f"{bill.get('Type') or 'Bill'}|{bill.get('ReferenceNbr')}" for bill in records]
        lookup: List[Dict[str, Any]] = []
        for key_chunk in _chunked([{"external_key": key} for key in external_keys], size=150):
            keys = [row["external_key"] for row in key_chunk]
            lookup.extend(
                (
                    self.supabase.table("acumatica_ap_bills")
                    .select("id, external_key")
                    .in_("external_key", keys)
                    .execute()
                ).data
                or []
            )
        by_key = {row["external_key"]: row["id"] for row in lookup}
        bill_ids = list(by_key.values())
        for id_chunk in _chunked([{"id": value} for value in bill_ids], size=150):
            ids = [row["id"] for row in id_chunk]
            self.supabase.table("acumatica_ap_bill_lines").delete().in_("bill_id", ids).execute()

        rows: List[Dict[str, Any]] = []
        for bill in records:
            external_key = f"{bill.get('Type') or 'Bill'}|{bill.get('ReferenceNbr')}"
            bill_id = by_key.get(external_key)
            if not bill_id:
                continue
            for detail in bill.get("Details") or []:
                rows.append(
                    {
                        "bill_id": bill_id,
                        "line_nbr": detail.get("LineNbr"),
                        "account": detail.get("Account"),
                        "amount": _num(detail.get("Amount")) or _num(detail.get("ExtendedCost")),
                        "description": detail.get("Description"),
                        "extended_cost": _num(detail.get("ExtendedCost")),
                        "inventory_id": detail.get("InventoryID"),
                        "po_order_nbr": detail.get("POOrderNbr"),
                        "po_order_type": detail.get("POOrderType"),
                        "project_code": detail.get("Project"),
                        "project_task": detail.get("ProjectTask"),
                        "qty": _num(detail.get("Qty")),
                        "cost_code": detail.get("CostCode"),
                        "tax_category": detail.get("TaxCategory"),
                        "transaction_description": detail.get("TransactionDescription"),
                        "unit_cost": _num(detail.get("UnitCost")),
                        "uom": detail.get("UOM"),
                        "raw_payload": detail,
                    }
                )

        for chunk in _chunked(rows):
            self.supabase.table("acumatica_ap_bill_lines").insert(list(chunk)).execute()

    def _sync_ar_invoices(self, last_cursor: Optional[str]) -> EntitySyncResult:
        result = EntitySyncResult(entity="ar_invoices")
        records = self.session.fetch_entity("Invoice", top=100, expand="Details", modified_after=last_cursor)
        result.fetched = len(records)
        result.cursor = self._max_cursor(records) or _now_iso()

        if not records:
            return result

        synced_at = _now_iso()
        headers: List[Dict[str, Any]] = []
        for invoice in records:
            project_code = invoice.get("Project") or next(
                (detail.get("ProjectID") for detail in invoice.get("Details") or [] if detail.get("ProjectID")),
                None,
            )
            project_row = self.project_map.get(project_code) if project_code else None
            headers.append(
                {
                    "reference_nbr": invoice.get("ReferenceNbr"),
                    "type": invoice.get("Type"),
                    "status": invoice.get("Status"),
                    "date": _iso_to_date(invoice.get("Date")),
                    "post_period": invoice.get("PostPeriod") or invoice.get("FinancialPeriod"),
                    "customer": invoice.get("Customer"),
                    "project": project_code,
                    "project_id": project_row.get("id") if project_row else None,
                    "company_id": project_row.get("company_id") if project_row else None,
                    "description": invoice.get("Description"),
                    "amount": _num(invoice.get("Amount")),
                    "balance": _num(invoice.get("Balance")),
                    "tax_total": _num(invoice.get("TaxTotal")),
                    "hold": invoice.get("Hold"),
                    "link_ar_account": invoice.get("LinkARAccount"),
                    "acumatica_sync_at": synced_at,
                    "updated_at": synced_at,
                }
            )

        for chunk in _chunked(headers):
            self.supabase.table("acumatica_ar_invoices").upsert(
                list(chunk),
                on_conflict="reference_nbr,type",
            ).execute()

        lookup = (
            self.supabase.table("acumatica_ar_invoices")
            .select("id, reference_nbr, type")
            .in_("reference_nbr", [row["reference_nbr"] for row in headers if row.get("reference_nbr")])
            .execute()
        ).data or []
        by_key = {f"{row['reference_nbr']}|{row.get('type')}": row["id"] for row in lookup}
        invoice_ids = list(by_key.values())
        if invoice_ids:
            self.supabase.table("acumatica_ar_invoice_lines").delete().in_("invoice_id", invoice_ids).execute()

        line_rows: List[Dict[str, Any]] = []
        for invoice in records:
            invoice_id = by_key.get(f"{invoice.get('ReferenceNbr')}|{invoice.get('Type')}")
            if not invoice_id:
                continue
            for detail in invoice.get("Details") or []:
                line_rows.append(
                    {
                        "invoice_id": invoice_id,
                        "line_nbr": detail.get("LineNbr"),
                        "transaction_description": detail.get("TransactionDescription"),
                        "qty": _num(detail.get("Qty")) or _num(detail.get("Quantity")),
                        "unit_price": _num(detail.get("UnitPrice")),
                        "extended_price": _num(detail.get("ExtendedPrice")),
                        "amount": _num(detail.get("Amount")) or _num(detail.get("ExtendedPrice")),
                        "discount_amount": _num(detail.get("DiscountAmount")),
                        "account": detail.get("Account"),
                        "cost_code": detail.get("CostCode"),
                        "project_task": detail.get("ProjectTask"),
                        "tax_category": detail.get("TaxCategory"),
                        "uom": detail.get("UOM"),
                    }
                )

        for chunk in _chunked(line_rows):
            self.supabase.table("acumatica_ar_invoice_lines").insert(list(chunk)).execute()

        result.upserted = len(headers)
        return result

    def _sync_checks(self, last_cursor: Optional[str]) -> EntitySyncResult:
        result = EntitySyncResult(entity="ap_checks")
        records = self.session.fetch_entity("Check", top=100, modified_after=last_cursor)
        result.fetched = len(records)
        result.cursor = self._max_cursor(records) or _now_iso()

        if not records:
            return result

        synced_at = _now_iso()
        rows = [
            {
                "external_key": f"{check.get('Type') or 'Check'}|{check.get('ReferenceNbr')}",
                "reference_nbr": check.get("ReferenceNbr"),
                "document_type": check.get("Type"),
                "vendor_id": check.get("Vendor"),
                "vendor_name": check.get("VendorName"),
                "payment_ref": check.get("PaymentRef") or check.get("ExtRefNbr"),
                "application_date": _iso_to_date(check.get("ApplicationDate") or check.get("Date")),
                "status": check.get("Status"),
                "description": check.get("Description"),
                "payment_method": check.get("PaymentMethod"),
                "cash_account": check.get("CashAccount"),
                "currency_id": check.get("CurrencyID"),
                "payment_amount": _num(check.get("PaymentAmount")),
                "last_modified_at": _iso_timestamp(check.get("LastModifiedDateTime")),
                "acumatica_sync_at": synced_at,
                "raw_payload": check,
                "updated_at": synced_at,
            }
            for check in records
        ]

        for chunk in _chunked(rows):
            self.supabase.table("acumatica_checks").upsert(list(chunk), on_conflict="external_key").execute()

        result.upserted = len(rows)
        return result

    def _sync_project_budgets(self, last_cursor: Optional[str]) -> EntitySyncResult:
        result = EntitySyncResult(entity="project_budgets")
        records = self.session.fetch_entity("ProjectBudget", top=250, modified_after=last_cursor)
        result.fetched = len(records)
        result.cursor = self._max_cursor(records) or _now_iso()

        if not records:
            return result

        synced_at = _now_iso()
        rows: List[Dict[str, Any]] = []
        touched_project_ids: set[int] = set()

        for budget in records:
            project_code = budget.get("ProjectID")
            project_row = self.project_map.get(project_code) if project_code else None
            external_key = "|".join(
                [
                    project_code or "",
                    budget.get("ProjectTaskID") or "",
                    budget.get("CostCode") or "",
                    budget.get("AccountGroup") or "",
                    budget.get("Type") or "",
                    budget.get("Description") or "",
                ]
            )
            rows.append(
                {
                    "external_key": external_key,
                    "project_code": project_code,
                    "project_id": project_row.get("id") if project_row else None,
                    "company_id": project_row.get("company_id") if project_row else None,
                    "project_task_id": budget.get("ProjectTaskID"),
                    "account_group": budget.get("AccountGroup"),
                    "cost_code": budget.get("CostCode"),
                    "description": budget.get("Description"),
                    "record_type": budget.get("Type"),
                    "inventory_id": budget.get("InventoryID"),
                    "uom": budget.get("UOM"),
                    "unit_rate": _num(budget.get("UnitRate")),
                    "original_budgeted_amount": _num(budget.get("OriginalBudgetedAmount")),
                    "revised_budgeted_amount": _num(budget.get("RevisedBudgetedAmount")),
                    "budgeted_co_amount": _num(budget.get("BudgetedCOAmount")),
                    "actual_amount": _num(budget.get("ActualAmount")),
                    "actual_plus_open_committed_amount": _num(budget.get("ActualPlusOpenCommittedAmount")),
                    "original_committed_amount": _num(budget.get("OriginalCommittedAmount")),
                    "revised_committed_amount": _num(budget.get("RevisedCommittedAmount")),
                    "committed_co_amount": _num(budget.get("CommittedCOAmount")),
                    "committed_invoiced_amount": _num(budget.get("CommittedInvoicedAmount")),
                    "committed_open_amount": _num(budget.get("CommittedOpenAmount")),
                    "cost_at_completion": _num(budget.get("CostAtCompletion")),
                    "cost_to_complete": _num(budget.get("CostToComplete")),
                    "variance_amount": _num(budget.get("VarianceAmount")),
                    "percentage_of_completion": _num(budget.get("PercentageOfCompletion")),
                    "retainage": _num(budget.get("Retainage")),
                    "draft_invoices_amount": _num(budget.get("DraftInvoicesAmount")),
                    "pending_invoice_amount": _num(budget.get("PendingInvoiceAmount")),
                    "last_modified_at": _iso_timestamp(budget.get("LastModifiedDateTime")),
                    "acumatica_sync_at": synced_at,
                    "raw_payload": budget,
                    "updated_at": synced_at,
                }
            )
            if project_row:
                touched_project_ids.add(project_row["id"])

        for chunk in _chunked(rows):
            self.supabase.table("acumatica_project_budgets").upsert(list(chunk), on_conflict="external_key").execute()

        for project_id in touched_project_ids:
            self.supabase.table("projects").update(
                {
                    "erp_last_job_cost_sync": synced_at,
                    "erp_sync_status": "synced",
                    "erp_system": "acumatica",
                }
            ).eq("id", project_id).execute()

        result.upserted = len(rows)
        return result


def run_acumatica_financial_sync() -> Dict[str, Any]:
    service = AcumaticaFinancialSyncService()
    return service.sync_all()
