from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional, Sequence
from urllib.parse import quote

import httpx

from .env_loader import load_env
from .supabase_helpers import get_supabase_client

load_env()

logger = logging.getLogger(__name__)

DEFAULT_COMPANY_NAME = os.getenv("ACUMATICA_COMPANY", "Alleato Group")
DEFAULT_BASE_URL = os.getenv("ACUMATICA_BASE_URL", "https://alleatogroup.acumatica.com")
ENTITY_BASE = f"{DEFAULT_BASE_URL}/entity/Default/24.200.001"
PAGE_SIZE = max(25, int(os.getenv("ACUMATICA_SYNC_PAGE_SIZE", "100")))

PAYMENT_APPLICATION_REMEDIATION = (
    "Acumatica Payment.ApplicationHistory is not readable from the current Default endpoint, "
    "and the safe DocumentsToApply probe did not return historical application lines. "
    "Expose a Generic Inquiry or endpoint with payment type/ref, customer, applied invoice "
    "type/ref, amount applied, balance, project, and last modified timestamp, then wire "
    "payment_applications to that source."
)

AR_PAYMENT_APPLICATION_ENTITY_CANDIDATES = (
    "ARPaymentApplications",
    "ARPaymentsToInvoices",
    "ARInvoicesToPayments",
    "PaymentApplications",
    "CustomerPaymentApplications",
    "BI-ARPaymentApplications",
    "BI-ARPaymentsToInvoices",
    "BI-ARApplications",
    "ProcoreARPaymentApplications",
    "ProcorePaymentApplications",
)


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


def _int(value: Any) -> Optional[int]:
    parsed = _num(value)
    if parsed is None:
        return None
    return int(parsed)


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _is_duplicate_key_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return "duplicate key value violates unique constraint" in message or "23505" in message


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


# Acumatica project statuses for which we must NEVER auto-create a new local
# project. Cancelled projects are frequently duplicate twins of an active job
# that share the same name (e.g. cancelled code 12131 vs active 25117, both
# "Aspire Kissimmee Gardens"). Auto-creating a shell for one would collide with
# the `uq_projects_active_name` unique index and re-open the name-based data
# misrouting hole. Existing local rows are still updated normally.
_NO_CREATE_PROJECT_STATUSES = {"canceled", "cancelled"}


def _first_text(record: Dict[str, Any], keys: Sequence[str]) -> Optional[str]:
    for key in keys:
        value = record.get(key)
        if value not in (None, ""):
            return str(value)
    return None


def _project_code_aliases(value: Optional[str]) -> List[str]:
    if value is None:
        return []
    raw = str(value).strip()
    if not raw:
        return []

    aliases = {raw}
    compact = "".join(ch for ch in raw if ch.isalnum())
    if compact:
        aliases.add(compact)

        # Normalize common job-number shape: 25126 <-> 25-126
        if compact.isdigit() and len(compact) >= 4:
            aliases.add(f"{compact[:2]}-{compact[2:]}")

    return [alias for alias in aliases if alias]


def _format_job_number(value: Optional[str]) -> Optional[str]:
    aliases = _project_code_aliases(value)
    if not aliases:
        return None
    compact = next((alias for alias in aliases if alias.isdigit() and "-" not in alias), None)
    if compact and len(compact) >= 4:
        return f"{compact[:2]}-{compact[2:]}"
    return aliases[0]


def _subcontract_project_code(record: Dict[str, Any]) -> Optional[str]:
    # In many Acumatica tenants, Subcontract project is stored on detail lines.
    header_project = _first_text(record, ("Project", "ProjectID", "ProjectCD"))
    if header_project:
        return header_project

    details = record.get("Details") or []
    if isinstance(details, list):
        for detail in details:
            if not isinstance(detail, dict):
                continue
            project = _first_text(detail, ("Project", "ProjectID", "ProjectCD"))
            if project:
                return project
    return None


def _purchase_order_project_code(record: Dict[str, Any]) -> Optional[str]:
    # Purchase orders can carry project only on detail lines, just like subcontracts.
    header_project = _first_text(record, ("Project", "ProjectID", "ProjectCD"))
    if header_project:
        return header_project

    details = record.get("Details") or []
    if isinstance(details, list):
        for detail in details:
            if not isinstance(detail, dict):
                continue
            project = _first_text(detail, ("Project", "ProjectID", "ProjectCD"))
            if project:
                return project
    return None


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

    def fetch_odata_entity(self, entity_set_name: str, *, top: int = 1000) -> List[Dict[str, Any]]:
        username = os.getenv("ACCOUNTING_USER")
        password = os.getenv("ACCOUNTING_PASSWORD")
        if not username or not password:
            raise RuntimeError("ACCOUNTING_USER and ACCOUNTING_PASSWORD are required for Acumatica OData sync")

        records: List[Dict[str, Any]] = []
        skip = 0
        company_path = quote(DEFAULT_COMPANY_NAME, safe="")
        entity_set_path = quote(entity_set_name, safe="")
        while True:
            response = self.client.get(
                f"{self.base_url}/odata/{company_path}/{entity_set_path}",
                params={"$top": str(top), "$skip": str(skip)},
                headers={"Accept": "application/json"},
                auth=(username, password),
            )
            if not response.is_success:
                raise RuntimeError(
                    f"Acumatica OData {entity_set_name} fetch failed "
                    f"(HTTP {response.status_code}): {response.text[:300]}"
                )

            page = response.json().get("value") or []
            records.extend(page)
            if len(page) < top:
                break
            skip += top

        return records

    def fetch_odata_entity_sets(self) -> List[str]:
        username = os.getenv("ACCOUNTING_USER")
        password = os.getenv("ACCOUNTING_PASSWORD")
        if not username or not password:
            raise RuntimeError("ACCOUNTING_USER and ACCOUNTING_PASSWORD are required for Acumatica OData sync")

        company_path = quote(DEFAULT_COMPANY_NAME, safe="")
        response = self.client.get(
            f"{self.base_url}/odata/{company_path}/$metadata",
            headers={"Accept": "application/xml,text/xml,*/*"},
            auth=(username, password),
        )
        if not response.is_success:
            raise RuntimeError(
                f"Acumatica OData metadata fetch failed (HTTP {response.status_code}): {response.text[:300]}"
            )

        import re

        return sorted(set(re.findall(r'EntitySet Name="([^"]+)"', response.text)))


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
            ("projects", self._sync_projects),
            ("vendors", self._sync_vendors),
            ("accounts", self._sync_accounts),
            ("customers", self._sync_customers),
            ("project_tasks", self._sync_project_tasks),
            ("change_orders", self._sync_change_orders),
            ("change_orders_projection", self._sync_change_orders_projection),
            ("subcontracts", self._sync_subcontracts),
            ("purchase_orders", self._sync_purchase_orders),
            ("ap_bills", self._sync_ap_bills),
            ("commitments_projection", self._sync_commitments_projection),
            ("ar_invoices", self._sync_ar_invoices),
            ("ar_payments", self._sync_payments),
            ("ap_payment_applications", self._sync_ap_payment_applications),
            ("payment_applications", self._sync_payment_applications),
            ("ap_checks", self._sync_checks),
            ("project_budgets", self._sync_project_budgets),
        ):
            try:
                result = self._run_entity_sync(entity, handler)
                results.append(result.as_dict())
            except Exception as exc:
                logger.exception("[AcumaticaSync] %s failed", entity)
                started_at = _now_iso()
                self._update_sync_state(
                    entity,
                    status="failed",
                    last_started_at=started_at,
                    last_error=str(exc),
                )
                self._record_sync_run(
                    entity_name=entity,
                    status="failed",
                    started_at=started_at,
                    finished_at=_now_iso(),
                    error_message=str(exc),
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
        self._record_sync_run(
            entity_name=entity_name,
            status="success",
            started_at=started_at,
            finished_at=_now_iso(),
            result=result,
            cursor=result.cursor,
            stats=result.as_dict(),
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

    def _record_sync_run(
        self,
        *,
        entity_name: str,
        status: str,
        started_at: str,
        finished_at: Optional[str] = None,
        result: Optional[EntitySyncResult] = None,
        cursor: Optional[str] = None,
        error_message: Optional[str] = None,
        stats: Optional[Dict[str, Any]] = None,
    ) -> None:
        payload: Dict[str, Any] = {
            "entity_name": entity_name,
            "status": status,
            "started_at": started_at,
            "finished_at": finished_at,
            "cursor": cursor if cursor is not None else (result.cursor if result else None),
            "fetched": result.fetched if result else None,
            "upserted": result.upserted if result else None,
            "projected": result.projected if result else None,
            "skipped": result.skipped if result else None,
            "errors": result.errors if result else None,
            "error_message": error_message,
            "stats": stats if stats is not None else (result.as_dict() if result else None),
            "created_at": _now_iso(),
        }

        self.supabase.table("acumatica_sync_runs").insert(payload).execute()

    def _load_project_map(self) -> Dict[str, Dict[str, Any]]:
        response = self.supabase.table("projects").select("*").execute()
        project_map: Dict[str, Dict[str, Any]] = {}
        for row in response.data or []:
            for source in (
                row.get("acumatica_project_id"),
                row.get("project_number"),
                row.get("job number"),
                row.get("name_code"),
            ):
                for alias in _project_code_aliases(source):
                    if alias not in project_map:
                        project_map[alias] = row
        return project_map

    def _resolve_project_row(self, project_code: Optional[str]) -> Optional[Dict[str, Any]]:
        if not project_code:
            return None
        for alias in _project_code_aliases(project_code):
            row = self.project_map.get(alias)
            if row:
                return row
        return None

    def _remember_project_row(self, row: Dict[str, Any]) -> None:
        for source in (
            row.get("acumatica_project_id"),
            row.get("project_number"),
            row.get("job number"),
            row.get("name_code"),
        ):
            for alias in _project_code_aliases(source):
                self.project_map[alias] = row

    def _find_existing_project_row(
        self,
        project_code: Optional[str],
        formatted_job_number: Optional[str],
    ) -> Optional[Dict[str, Any]]:
        if project_code:
            response = (
                self.supabase.table("projects")
                .select("*")
                .eq("acumatica_project_id", project_code)
                .limit(1)
                .execute()
            )
            rows = response.data or []
            if rows:
                self._remember_project_row(rows[0])
                return rows[0]

        if formatted_job_number:
            for column in ("project_number", "job number"):
                response = (
                    self.supabase.table("projects")
                    .select("*")
                    .eq(column, formatted_job_number)
                    .order("created_at")
                    .limit(1)
                    .execute()
                )
                rows = response.data or []
                if rows:
                    self._remember_project_row(rows[0])
                    return rows[0]

        for candidate in (project_code, formatted_job_number):
            row = self._resolve_project_row(candidate)
            if row:
                return row

        return None

    def _update_project_from_acumatica(
        self,
        project_row: Dict[str, Any],
        *,
        project_code: str,
        formatted_job_number: Optional[str],
        project_name: str,
    ) -> None:
        payload: Dict[str, Any] = {
            "acumatica_project_id": project_code,
            "erp_system": "acumatica",
            "erp_sync_status": "synced",
        }

        if formatted_job_number and not project_row.get("job number"):
            payload["job number"] = formatted_job_number
        if formatted_job_number and not project_row.get("project_number"):
            payload["project_number"] = formatted_job_number
        if project_name and not project_row.get("name"):
            payload["name"] = project_name

        self.supabase.table("projects").update(payload).eq("id", project_row["id"]).execute()

        refreshed = {**project_row, **payload}
        self._remember_project_row(refreshed)

    def _sync_projects(self, last_cursor: Optional[str]) -> EntitySyncResult:
        result = EntitySyncResult(entity="projects")
        records = self.session.fetch_entity("Project", top=200, modified_after=last_cursor)
        result.fetched = len(records)
        result.cursor = self._max_cursor(records) or _now_iso()

        if not records:
            return result

        default_company_id = next(
            (row.get("company_id") for row in self.project_map.values() if row.get("company_id")),
            None,
        )

        created = 0
        updated = 0
        skipped = 0

        for project in records:
            project_code = _first_text(project, ("ProjectID", "Project", "ProjectCD"))
            if not project_code:
                skipped += 1
                continue

            formatted_job_number = _format_job_number(project_code)
            project_name = project.get("Description") or project.get("ProjectName") or f"Project {project_code}"
            project_row = self._find_existing_project_row(project_code, formatted_job_number)

            if project_row:
                self._update_project_from_acumatica(
                    project_row,
                    project_code=project_code,
                    formatted_job_number=formatted_job_number,
                    project_name=project_name,
                )
                updated += 1
                continue

            # Guardrail: never CREATE a new local project from a cancelled
            # Acumatica project (see _NO_CREATE_PROJECT_STATUSES). This is how
            # the duplicate "Aspire Kissimmee Gardens" #798 shell was born from
            # cancelled code 12131. Existing rows still update in the branch
            # above; only first-time creation is blocked here.
            project_status = (_first_text(project, ("Status", "ProjectStatus")) or "").strip().lower()
            if project_status in _NO_CREATE_PROJECT_STATUSES:
                logger.info(
                    "[AcumaticaSync] Skipping creation of %s Acumatica project_code=%s name=%r — no existing local row",
                    project_status,
                    project_code,
                    project_name,
                )
                skipped += 1
                continue

            if not default_company_id:
                skipped += 1
                continue

            insert_payload = {
                "name": project_name,
                "job number": formatted_job_number,
                "project_number": formatted_job_number,
                "acumatica_project_id": project_code,
                "company_id": default_company_id,
                "erp_system": "acumatica",
                "erp_sync_status": "synced",
            }
            try:
                self.supabase.table("projects").insert(insert_payload).execute()
                created += 1
            except Exception as exc:
                if not _is_duplicate_key_error(exc):
                    raise

                conflict_row = self._find_existing_project_row(project_code, formatted_job_number)
                if not conflict_row:
                    # Most likely a collision on uq_projects_active_name: a
                    # DIFFERENT active project already owns this name. Do NOT
                    # silently link two distinct Acumatica codes to one row
                    # (that is the misrouting bug). Skip loudly so one bad
                    # record never aborts the whole projects sync.
                    logger.error(
                        "[AcumaticaSync] Skipping project_code=%s name=%r — insert hit duplicate-key conflict "
                        "and no existing row could be resolved by acumatica_project_id/job_number "
                        "(likely an active-name collision): %s",
                        project_code,
                        project_name,
                        exc,
                    )
                    skipped += 1
                    continue

                logger.warning(
                    "[AcumaticaSync] Reused existing project row id=%s after duplicate-key conflict for project_code=%s job_number=%s",
                    conflict_row.get("id"),
                    project_code,
                    formatted_job_number,
                )
                self._update_project_from_acumatica(
                    conflict_row,
                    project_code=project_code,
                    formatted_job_number=formatted_job_number,
                    project_name=project_name,
                )
                updated += 1

        result.upserted = created + updated
        result.skipped = skipped
        self.project_map = self._load_project_map()
        return result

    def _load_vendor_map(self) -> Dict[str, Dict[str, Any]]:
        response = (
            self.supabase.table("companies")
            .select("id, name, acumatica_vendor_id")
            .eq("is_vendor", True)
            .execute()
        )
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
            self.supabase.table("project_budget_codes")
            .select("id")
            .eq("project_id", project_id)
            .eq("cost_code_id", normalized_cost_code_id)
            .is_("cost_type_id", "null")
            .limit(1)
            .execute()
        )
        if existing.data:
            project_cost_code_id = existing.data[0]["id"]
            self.project_cost_code_map[cache_key] = project_cost_code_id
            return project_cost_code_id

        if normalized_cost_code_id not in self.cost_codes:
            return None

        cost_code_description = normalized_cost_code_id
        cost_code_meta = (
            self.supabase.table("cost_codes")
            .select("title")
            .eq("id", normalized_cost_code_id)
            .limit(1)
            .execute()
        )
        if cost_code_meta.data and cost_code_meta.data[0].get("title"):
            cost_code_description = cost_code_meta.data[0]["title"]

        inserted = (
            self.supabase.table("project_budget_codes")
            .insert(
                {
                    "project_id": project_id,
                    "cost_code_id": normalized_cost_code_id,
                    "cost_type_id": None,
                    "description": cost_code_description,
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
                self.supabase.table("project_budget_codes")
                .select("id")
                .eq("project_id", project_id)
                .eq("cost_code_id", normalized_cost_code_id)
                .is_("cost_type_id", "null")
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

    def _fetch_payment_application_records(self, last_cursor: Optional[str]) -> List[Dict[str, Any]]:
        try:
            return self.session.fetch_entity(
                "Payment",
                top=100,
                expand="ApplicationHistory",
                select="ReferenceNbr,Type,CustomerID,LastModifiedDateTime,ApplicationHistory",
                modified_after=last_cursor,
            )
        except RuntimeError as exc:
            application_history_error = str(exc)

        documents_to_apply_records = self.session.fetch_entity(
            "Payment",
            top=100,
            expand="DocumentsToApply",
            select="ReferenceNbr,Type,CustomerID,LastModifiedDateTime,DocumentsToApply",
            modified_after=last_cursor,
        )
        if any(self._payment_application_lines(payment) for payment in documents_to_apply_records):
            logger.warning(
                "[AcumaticaSync] Payment.ApplicationHistory failed; using DocumentsToApply fallback for applications: %s",
                application_history_error,
            )
            return documents_to_apply_records

        raise RuntimeError(
            f"{PAYMENT_APPLICATION_REMEDIATION} ApplicationHistory error: {application_history_error}"
        )

    @staticmethod
    def _payment_application_lines(payment: Dict[str, Any]) -> List[Dict[str, Any]]:
        lines: List[Dict[str, Any]] = []
        for key in ("ApplicationHistory", "DocumentsToApply"):
            value = payment.get(key)
            if isinstance(value, list):
                lines.extend(item for item in value if isinstance(item, dict))
        return lines

    def _sync_vendors(self, last_cursor: Optional[str]) -> EntitySyncResult:
        result = EntitySyncResult(entity="vendors")
        records = self.session.fetch_entity("Vendor", top=200, expand="MainContact", modified_after=last_cursor)
        result.fetched = len(records)
        result.cursor = self._max_cursor(records) or _now_iso()

        if not records:
            return result

        existing = (
            self.supabase.table("companies")
            .select("id, name, acumatica_vendor_id")
            .eq("is_vendor", True)
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
                self.supabase.table("companies").update({**payload, "is_vendor": True}).eq("id", existing_row["id"]).execute()
                updated += 1
            else:
                self.supabase.table("companies").insert(
                    {
                        "is_vendor": True,
                        "status": "active",
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
            project_row = self._resolve_project_row(project_code)
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
            project_row = self._resolve_project_row(project_code)
            headers.append(
                {
                    "external_key": f"{invoice.get('Type') or 'Invoice'}|{invoice.get('ReferenceNbr')}",
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
        result.projected = self._project_owner_invoices_from_ar_invoices()
        return result

    @staticmethod
    def _map_owner_invoice_status(acumatica_status: Optional[str]) -> str:
        if not acumatica_status:
            return "draft"

        normalized = acumatica_status.strip().lower()
        if normalized in {"open", "balanced"}:
            return "submitted"
        if normalized == "released":
            return "approved"
        if normalized == "closed":
            return "paid"
        if normalized == "voided":
            return "void"
        return "draft"

    def _project_owner_invoices_from_ar_invoices(self) -> int:
        prime_contracts = (
            self.supabase.table("prime_contracts")
            .select("id, project_id")
            .order("created_at")
            .execute()
        ).data or []
        contract_by_project_id: Dict[int, str] = {}
        for contract in prime_contracts:
            project_id = contract.get("project_id")
            contract_id = contract.get("id")
            if project_id is None or not contract_id or project_id in contract_by_project_id:
                continue
            contract_by_project_id[int(project_id)] = contract_id

        raw_invoices = (
            self.supabase.table("acumatica_ar_invoices")
            .select("id, reference_nbr, type, status, date, project, project_id, amount")
            .execute()
        ).data or []
        if not raw_invoices:
            return 0

        existing_owner_invoices = (
            self.supabase.table("owner_invoices")
            .select("id, acumatica_ref_nbr, acumatica_doc_type")
            .not_.is_("acumatica_ref_nbr", "null")
            .execute()
        ).data or []
        owner_invoice_by_key: Dict[tuple[str, str], int] = {}
        for row in existing_owner_invoices:
            ref = row.get("acumatica_ref_nbr")
            if not ref:
                continue
            doc_type = row.get("acumatica_doc_type") or "Invoice"
            owner_invoice_by_key[(str(ref), str(doc_type))] = int(row["id"])

        raw_invoice_ids = [int(row["id"]) for row in raw_invoices if row.get("id") is not None]
        raw_lines_by_invoice_id: Dict[int, List[Dict[str, Any]]] = {}
        for chunk in _chunked([{"id": value} for value in raw_invoice_ids], size=150):
            ids = [row["id"] for row in chunk]
            line_rows = (
                self.supabase.table("acumatica_ar_invoice_lines")
                .select("invoice_id, line_nbr, transaction_description, amount, extended_price, account")
                .in_("invoice_id", ids)
                .execute()
            ).data or []
            for line in line_rows:
                invoice_id = line.get("invoice_id")
                if invoice_id is None:
                    continue
                raw_lines_by_invoice_id.setdefault(int(invoice_id), []).append(line)

        now = _now_iso()
        projected_count = 0
        for invoice in raw_invoices:
            ref_nbr = invoice.get("reference_nbr")
            if not ref_nbr:
                continue

            project_id = invoice.get("project_id")
            if project_id is None:
                project_row = self._resolve_project_row(invoice.get("project"))
                project_id = project_row.get("id") if project_row else None
            if project_id is None:
                continue

            contract_id = contract_by_project_id.get(int(project_id))
            if not contract_id:
                continue

            doc_type = str(invoice.get("type") or "Invoice")
            owner_payload = {
                "prime_contract_id": contract_id,
                "invoice_number": ref_nbr,
                "status": self._map_owner_invoice_status(invoice.get("status")),
                "period_start": _iso_to_date(invoice.get("date")),
                "period_end": None,
                "gross_amount": _num(invoice.get("amount")),
                "net_amount": _num(invoice.get("amount")),
                "acumatica_ref_nbr": ref_nbr,
                "acumatica_doc_type": doc_type,
                "acumatica_sync_at": now,
                "updated_at": now,
            }

            owner_invoice_id = owner_invoice_by_key.get((str(ref_nbr), doc_type))
            if owner_invoice_id is not None:
                self.supabase.table("owner_invoices").update(owner_payload).eq("id", owner_invoice_id).execute()
            else:
                inserted = (
                    self.supabase.table("owner_invoices")
                    .insert(owner_payload)
                    .execute()
                )
                inserted_rows = getattr(inserted, "data", None) or []
                inserted_row = inserted_rows[0] if isinstance(inserted_rows, list) and inserted_rows else inserted_rows
                owner_invoice_id = inserted_row.get("id") if isinstance(inserted_row, dict) else None
                if owner_invoice_id is None:
                    lookup = (
                        self.supabase.table("owner_invoices")
                        .select("id")
                        .eq("acumatica_ref_nbr", ref_nbr)
                        .limit(1)
                        .execute()
                    ).data or []
                    owner_invoice_id = lookup[0]["id"] if lookup else None
                if owner_invoice_id is None:
                    raise RuntimeError(
                        f"Projected owner invoice for Acumatica ref {ref_nbr} but could not resolve inserted row id"
                    )
                owner_invoice_by_key[(str(ref_nbr), doc_type)] = int(owner_invoice_id)

            self.supabase.table("owner_invoice_line_items").delete().eq("invoice_id", owner_invoice_id).execute()
            raw_lines = raw_lines_by_invoice_id.get(int(invoice["id"]), [])
            owner_line_rows = [
                {
                    "invoice_id": owner_invoice_id,
                    "acumatica_line_nbr": line.get("line_nbr"),
                    "description": line.get("transaction_description") or line.get("account"),
                    "approved_amount": _num(line.get("amount")) or _num(line.get("extended_price")) or 0,
                    "category": line.get("account"),
                }
                for line in raw_lines
            ]
            if owner_line_rows:
                for chunk in _chunked(owner_line_rows):
                    self.supabase.table("owner_invoice_line_items").insert(list(chunk)).execute()

            projected_count += 1

        return projected_count

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
        result.projected = self._project_commitment_payments_from_checks()
        return result

    @staticmethod
    def _extract_check_applications(check: Dict[str, Any]) -> List[Dict[str, Any]]:
        applications: List[Dict[str, Any]] = []
        for key in (
            "Applications",
            "ApplicationHistory",
            "DocumentsToApply",
            "Adjustments",
            "Details",
        ):
            value = check.get(key)
            if isinstance(value, list):
                applications.extend(item for item in value if isinstance(item, dict))
        return applications

    @staticmethod
    def _application_ref(application: Dict[str, Any]) -> Optional[str]:
        return _first_text(
            application,
            (
                "ReferenceNbr",
                "RefNbr",
                "DocRefNbr",
                "AdjdRefNbr",
                "AppliedToDocRef",
                "BillReferenceNbr",
                "DocumentRefNbr",
            ),
        )

    @staticmethod
    def _application_doc_type(application: Dict[str, Any]) -> Optional[str]:
        return _first_text(
            application,
            (
                "Type",
                "DocType",
                "AdjdDocType",
                "AppliedToDocType",
                "DocumentType",
            ),
        )

    @staticmethod
    def _application_amount(application: Dict[str, Any]) -> Optional[float]:
        for key in (
            "AmountPaid",
            "AppliedAmount",
            "Amount",
            "PaymentAmount",
            "CuryAdjdAmt",
            "CuryAdjgAmt",
        ):
            amount = _num(application.get(key))
            if amount is not None:
                return amount
        return None

    @staticmethod
    def _clean_acumatica_text(value: Any) -> Optional[str]:
        if value is None:
            return None
        cleaned = str(value).strip()
        return cleaned or None

    @staticmethod
    def _normalize_prime_payment_method(value: Any) -> str:
        cleaned = AcumaticaFinancialSyncService._clean_acumatica_text(value)
        if not cleaned:
            return "other"
        lowered = cleaned.lower()
        if "check" in lowered:
            return "check"
        if "wire" in lowered:
            return "wire"
        if "ach" in lowered:
            return "ach"
        if "credit" in lowered:
            return "credit_card"
        if lowered == "cash":
            return "cash"
        return "other"

    @staticmethod
    def _first_text_from_aliases(record: Dict[str, Any], keys: Sequence[str]) -> Optional[str]:
        for key in keys:
            cleaned = AcumaticaFinancialSyncService._clean_acumatica_text(record.get(key))
            if cleaned:
                return cleaned
        return None

    @staticmethod
    def _first_num_from_aliases(record: Dict[str, Any], keys: Sequence[str]) -> Optional[float]:
        for key in keys:
            amount = _num(record.get(key))
            if amount is not None:
                return amount
        return None

    def _find_ar_payment_applications_odata_entity(self) -> Optional[str]:
        configured = self._clean_acumatica_text(os.getenv("ACUMATICA_AR_PAYMENT_APPLICATIONS_ENTITY"))
        candidates = [configured] if configured else []
        candidates.extend(AR_PAYMENT_APPLICATION_ENTITY_CANDIDATES)

        entity_sets = self.session.fetch_odata_entity_sets()
        by_lower = {name.lower(): name for name in entity_sets}
        for candidate in candidates:
            if not candidate:
                continue
            match = by_lower.get(candidate.lower())
            if match:
                return match

        return None

    def _available_ar_payment_application_entity_message(self) -> str:
        entity_sets = self.session.fetch_odata_entity_sets()
        relevant = [
            name
            for name in entity_sets
            if any(token in name.lower() for token in ("ar", "payment", "pay", "invoice", "application"))
        ]
        return (
            f"{PAYMENT_APPLICATION_REMEDIATION} No AR payment application OData entity set was found. "
            f"Set ACUMATICA_AR_PAYMENT_APPLICATIONS_ENTITY to the exposed GI name once it appears in metadata. "
            f"Currently relevant OData entity sets: {', '.join(relevant) or '(none)'}."
        )

    def _project_commitment_payments_from_checks(self) -> int:
        invoices: List[Dict[str, Any]] = []
        invoice_offset = 0
        while True:
            invoice_page = (
                self.supabase.table("subcontractor_invoices")
                .select("id, project_id, subcontract_id, purchase_order_id, acumatica_ref_nbr, acumatica_doc_type, acumatica_ap_bill_id")
                .not_.is_("acumatica_ref_nbr", "null")
                .range(invoice_offset, invoice_offset + 999)
                .execute()
            ).data or []
            invoices.extend(invoice_page)
            if len(invoice_page) < 1000:
                break
            invoice_offset += 1000

        if not invoices:
            return 0

        invoice_by_ref: Dict[str, Dict[str, Any]] = {}
        for invoice in invoices:
            ref = invoice.get("acumatica_ref_nbr")
            if not ref:
                continue
            invoice_by_ref[str(ref)] = invoice
            doc_type = invoice.get("acumatica_doc_type")
            if doc_type:
                invoice_by_ref[f"{doc_type}|{ref}"] = invoice

        checks_response = (
            self.supabase.table("acumatica_checks")
            .select("id, external_key, reference_nbr, document_type, vendor_id, vendor_name, payment_ref, application_date, status, payment_method, payment_amount, acumatica_sync_at, raw_payload")
            .range(0, 9999)
            .execute()
        )
        checks = checks_response.data or []
        check_by_external_key = {
            check.get("external_key"): check
            for check in checks
            if check.get("external_key")
        }
        check_by_ref = {
            check.get("reference_nbr"): check
            for check in checks
            if check.get("reference_nbr")
        }

        rows_by_external_key: Dict[str, Dict[str, Any]] = {}
        for check in checks:
            raw_payload = check.get("raw_payload") or {}
            if not isinstance(raw_payload, dict):
                continue

            applications = self._extract_check_applications(raw_payload)
            matched_applications: List[tuple[Dict[str, Any], Dict[str, Any]]] = []
            for application in applications:
                ref = self._application_ref(application)
                if not ref:
                    continue
                doc_type = self._application_doc_type(application)
                invoice = invoice_by_ref.get(f"{doc_type}|{ref}") if doc_type else None
                invoice = invoice or invoice_by_ref.get(str(ref))
                if invoice:
                    matched_applications.append((application, invoice))

            for application, invoice in matched_applications:
                ref = self._application_ref(application) or ""
                doc_type = self._application_doc_type(application) or invoice.get("acumatica_doc_type") or "Bill"
                amount = self._application_amount(application)
                if amount is None and len(matched_applications) == 1:
                    amount = _num(check.get("payment_amount"))
                if amount is None:
                    continue

                external_key = f"{check.get('external_key')}|{doc_type}|{ref}"
                rows_by_external_key[external_key] = {
                    "external_key": external_key,
                    "project_id": invoice["project_id"],
                    "subcontract_id": invoice.get("subcontract_id"),
                    "purchase_order_id": invoice.get("purchase_order_id"),
                    "subcontractor_invoice_id": invoice["id"],
                    "acumatica_check_id": check.get("id"),
                    "acumatica_ap_bill_id": invoice.get("acumatica_ap_bill_id"),
                    "payment_number": check.get("reference_nbr"),
                    "payment_ref": check.get("payment_ref"),
                    "payment_method": check.get("payment_method"),
                    "payment_date": check.get("application_date"),
                    "vendor_id": check.get("vendor_id"),
                    "vendor_name": check.get("vendor_name"),
                    "amount": amount,
                    "status": check.get("status"),
                    "source": "acumatica",
                    "raw_payload": application,
                    "acumatica_sync_at": check.get("acumatica_sync_at"),
                    "updated_at": _now_iso(),
                }

        payment_applications: List[Dict[str, Any]] = []
        application_offset = 0
        while True:
            application_page = (
                self.supabase.table("acumatica_payment_applications")
                .select("payment_external_key, payment_reference_nbr, payment_type, invoice_reference_nbr, invoice_type, amount_applied, resolved_project_code, resolution_method")
                .eq("invoice_type", "Bill")
                .range(application_offset, application_offset + 999)
                .execute()
            ).data or []
            payment_applications.extend(application_page)
            if len(application_page) < 1000:
                break
            application_offset += 1000

        for application in payment_applications:
            ref = application.get("invoice_reference_nbr")
            if not ref:
                continue
            invoice = invoice_by_ref.get(str(ref))
            if not invoice:
                continue
            payment_external_key = application.get("payment_external_key")
            payment_ref = application.get("payment_reference_nbr")
            check = (
                check_by_external_key.get(payment_external_key)
                if payment_external_key
                else None
            ) or check_by_ref.get(payment_ref)
            amount = _num(application.get("amount_applied"))
            if amount is None:
                continue

            doc_type = application.get("invoice_type") or invoice.get("acumatica_doc_type") or "Bill"
            external_key = f"{payment_external_key or f'Payment|{payment_ref}'}|{doc_type}|{ref}"
            rows_by_external_key[external_key] = {
                "external_key": external_key,
                "project_id": invoice["project_id"],
                "subcontract_id": invoice.get("subcontract_id"),
                "purchase_order_id": invoice.get("purchase_order_id"),
                "subcontractor_invoice_id": invoice["id"],
                "acumatica_check_id": check.get("id") if check else None,
                "acumatica_ap_bill_id": invoice.get("acumatica_ap_bill_id"),
                "payment_number": check.get("reference_nbr") if check else payment_ref,
                "payment_ref": check.get("payment_ref") if check else payment_ref,
                "payment_method": check.get("payment_method") if check else application.get("payment_type"),
                "payment_date": check.get("application_date") if check else None,
                "vendor_id": check.get("vendor_id") if check else None,
                "vendor_name": check.get("vendor_name") if check else None,
                "amount": amount,
                "status": check.get("status") if check else None,
                "source": "acumatica",
                "raw_payload": application,
                "acumatica_sync_at": check.get("acumatica_sync_at") if check else _now_iso(),
                "updated_at": _now_iso(),
            }

        rows = list(rows_by_external_key.values())
        if not rows:
            return 0

        for chunk in _chunked(rows):
            self.supabase.table("commitment_payments").upsert(list(chunk), on_conflict="external_key").execute()

        ambiguous_legacy_keys = sorted(
            {
                f"Payment|{row.get('payment_number')}"
                for row in rows
                if row.get("payment_number")
                and str(row.get("external_key") or "").startswith("Payment|")
                and str(row.get("external_key") or "").count("|") >= 3
            }
        )
        if ambiguous_legacy_keys:
            self.supabase.table("commitment_payments").delete().in_(
                "external_key",
                ambiguous_legacy_keys,
            ).execute()

        return len(rows)

    def _sync_change_orders(self, last_cursor: Optional[str]) -> EntitySyncResult:
        result = EntitySyncResult(entity="change_orders")
        records = self.session.fetch_entity("ChangeOrder", top=100, modified_after=last_cursor)
        result.fetched = len(records)
        result.cursor = self._max_cursor(records) or _now_iso()

        if not records:
            return result

        synced_at = _now_iso()
        rows: List[Dict[str, Any]] = []

        for change_order in records:
            reference_nbr = change_order.get("RefNbr")
            if not reference_nbr:
                result.skipped += 1
                continue

            project_code = _first_text(change_order, ("ProjectID", "Project", "ProjectCD"))
            project_row = self._resolve_project_row(project_code)

            rows.append(
                {
                    "external_key": f"ChangeOrder|{reference_nbr}",
                    "reference_nbr": reference_nbr,
                    "project_code": project_code,
                    "project_id": project_row.get("id") if project_row else None,
                    "company_id": project_row.get("company_id") if project_row else None,
                    "customer_id": change_order.get("Customer"),
                    "class": change_order.get("Class"),
                    "status": change_order.get("Status"),
                    "reverse_status": change_order.get("ReverseStatus"),
                    "revenue_change_nbr": change_order.get("RevenueChangeNbr"),
                    "description": change_order.get("Description"),
                    "detailed_description": change_order.get("DetailedDescription"),
                    "external_ref_nbr": change_order.get("ExternalRefNbr"),
                    "original_co_ref_nbr": change_order.get("OriginalCORefNbr"),
                    "change_date": _iso_to_date(change_order.get("ChangeDate")),
                    "completion_date": _iso_to_date(change_order.get("CompletionDate")),
                    "hold": change_order.get("Hold"),
                    "contract_time_change_days": _int(change_order.get("ContractTimeChangeDays")),
                    "commitments_change_total": _num(change_order.get("CommitmentsChangeTotal")),
                    "cost_budget_change_total": _num(change_order.get("CostBudgetChangeTotal")),
                    "revenue_budget_change_total": _num(change_order.get("RevenueBudgetChangeTotal")),
                    "gross_margin": _num(change_order.get("GrossMargin")),
                    "gross_margin_amount": _num(change_order.get("GrossMarginAmount")),
                    "last_modified_at": _iso_timestamp(change_order.get("LastModifiedDateTime")),
                    "acumatica_sync_at": synced_at,
                    "raw_payload": change_order,
                    "updated_at": synced_at,
                }
            )

        for chunk in _chunked(rows):
            self.supabase.table("acumatica_change_orders").upsert(list(chunk), on_conflict="external_key").execute()

        result.upserted = len(rows)
        return result

    def _sync_subcontracts(self, last_cursor: Optional[str]) -> EntitySyncResult:
        result = EntitySyncResult(entity="subcontracts")
        records = self.session.fetch_entity("Subcontract", top=100, expand="Details", modified_after=last_cursor)
        result.fetched = len(records)
        result.cursor = self._max_cursor(records) or _now_iso()

        if not records:
            return result

        synced_at = _now_iso()
        rows: List[Dict[str, Any]] = []

        for subcontract in records:
            subcontract_nbr = subcontract.get("SubcontractNbr")
            if not subcontract_nbr:
                result.skipped += 1
                continue

            project_code = _subcontract_project_code(subcontract)
            project_row = self._resolve_project_row(project_code)
            vendor_acumatica_id = subcontract.get("VendorID")
            vendor_row = self.vendor_map.get(vendor_acumatica_id) if vendor_acumatica_id else None

            rows.append(
                {
                    "external_key": f"Subcontract|{subcontract_nbr}",
                    "subcontract_nbr": subcontract_nbr,
                    "project_code": project_code,
                    "project_id": project_row.get("id") if project_row else None,
                    "company_id": project_row.get("company_id") if project_row else None,
                    "vendor_id": vendor_acumatica_id,
                    "vendor_acumatica_id": vendor_acumatica_id,
                    "vendor_uuid": vendor_row.get("id") if vendor_row else None,
                    "vendor_ref": subcontract.get("VendorRef"),
                    "owner": subcontract.get("Owner"),
                    "status": subcontract.get("Status"),
                    "description": subcontract.get("Description"),
                    "terms": subcontract.get("Terms"),
                    "date": _iso_to_date(subcontract.get("Date")),
                    "start_date": _iso_to_date(subcontract.get("StartDate")),
                    "currency_id": subcontract.get("CurrencyID"),
                    "apply_retainage": subcontract.get("ApplyRetainage"),
                    "retainage_pct": _num(subcontract.get("RetainagePct")),
                    "retainage_total": _num(subcontract.get("RetainageTotal")),
                    "control_total": _num(subcontract.get("ControlTotal")),
                    "line_total": _num(subcontract.get("LineTotal")),
                    "discount_total": _num(subcontract.get("DiscountTotal")),
                    "tax_total": _num(subcontract.get("TaxTotal")),
                    "subcontract_total": _num(subcontract.get("SubcontractTotal")),
                    "last_modified_at": _iso_timestamp(subcontract.get("LastModifiedDateTime")),
                    "acumatica_sync_at": synced_at,
                    "raw_payload": subcontract,
                    "updated_at": synced_at,
                }
            )

        for chunk in _chunked(rows):
            self.supabase.table("acumatica_subcontracts").upsert(list(chunk), on_conflict="external_key").execute()

        result.upserted = len(rows)
        return result

    def _sync_purchase_orders(self, last_cursor: Optional[str]) -> EntitySyncResult:
        result = EntitySyncResult(entity="purchase_orders")
        records = self.session.fetch_entity("PurchaseOrder", top=100, expand="Details", modified_after=last_cursor)
        result.fetched = len(records)
        result.cursor = self._max_cursor(records) or _now_iso()

        if not records:
            return result

        synced_at = _now_iso()
        rows: List[Dict[str, Any]] = []

        for purchase_order in records:
            order_nbr = purchase_order.get("OrderNbr")
            if not order_nbr:
                result.skipped += 1
                continue

            project_code = _purchase_order_project_code(purchase_order)
            project_row = self._resolve_project_row(project_code)
            vendor_acumatica_id = purchase_order.get("VendorID")
            vendor_row = self.vendor_map.get(vendor_acumatica_id) if vendor_acumatica_id else None

            rows.append(
                {
                    "external_key": f"{purchase_order.get('Type') or 'PurchaseOrder'}|{order_nbr}",
                    "order_nbr": order_nbr,
                    "order_type": purchase_order.get("Type"),
                    "project_code": project_code,
                    "project_id": project_row.get("id") if project_row else None,
                    "company_id": project_row.get("company_id") if project_row else None,
                    "vendor_id": vendor_acumatica_id,
                    "vendor_acumatica_id": vendor_acumatica_id,
                    "vendor_uuid": vendor_row.get("id") if vendor_row else None,
                    "vendor_ref": purchase_order.get("VendorRef"),
                    "status": purchase_order.get("Status"),
                    "description": purchase_order.get("Description"),
                    "terms": purchase_order.get("Terms"),
                    "date": _iso_to_date(purchase_order.get("Date")),
                    "promised_on": _iso_to_date(purchase_order.get("PromisedOn")),
                    "currency_id": purchase_order.get("CurrencyID"),
                    "hold": purchase_order.get("Hold"),
                    "control_total": _num(purchase_order.get("ControlTotal")),
                    "line_total": _num(purchase_order.get("LineTotal")),
                    "order_total": _num(purchase_order.get("OrderTotal")),
                    "tax_total": _num(purchase_order.get("TaxTotal")),
                    "last_modified_at": _iso_timestamp(purchase_order.get("LastModifiedDateTime")),
                    "acumatica_sync_at": synced_at,
                    "raw_payload": purchase_order,
                    "updated_at": synced_at,
                }
            )

        for chunk in _chunked(rows):
            self.supabase.table("acumatica_purchase_orders").upsert(list(chunk), on_conflict="external_key").execute()

        result.upserted = len(rows)
        return result

    # ------------------------------------------------------------------
    # Projection: acumatica raw tables → domain commitment tables
    # ------------------------------------------------------------------

    def _sync_change_orders_projection(self, last_cursor: Optional[str]) -> EntitySyncResult:
        """Wrapper so _run_entity_sync can call project_change_orders as part of sync_all."""
        projection = self.project_change_orders()
        prime = projection["prime_change_orders_projected"]
        commit = projection["commitment_change_orders_projected"]
        result = EntitySyncResult(entity="change_orders_projection")
        result.fetched = prime["fetched"] + commit["fetched"]
        result.upserted = prime["upserted"] + commit["upserted"]
        result.skipped = prime["skipped"] + commit["skipped"]
        result.errors = prime["errors"] + commit["errors"]
        result.cursor = last_cursor
        return result

    def _sync_commitments_projection(self, last_cursor: Optional[str]) -> EntitySyncResult:
        """Wrapper so _run_entity_sync can call project_commitments as part of sync_all."""
        projection = self.project_commitments()
        sc = projection["subcontracts_projected"]
        po = projection["purchase_orders_projected"]
        result = EntitySyncResult(entity="commitments_projection")
        result.fetched = sc["fetched"] + po["fetched"]
        result.upserted = sc["upserted"] + po["upserted"]
        result.skipped = sc["skipped"] + po["skipped"]
        result.errors = sc["errors"] + po["errors"]
        result.cursor = last_cursor  # projection is stateless — no cursor needed
        return result

    _ACUMATICA_STATUS_MAP: Dict[str, str] = {
        "on hold": "Draft",
        "open": "Approved",
        "pending approval": "Out for Signature",
        "pending receipt": "Approved",
        "closed": "Complete",
        "canceled": "Terminated",
        "completed": "Complete",
    }

    def _map_commitment_status(self, acumatica_status: Optional[str]) -> str:
        if not acumatica_status:
            return "Draft"
        return self._ACUMATICA_STATUS_MAP.get(acumatica_status.lower(), "Draft")

    def _get_vendor_company_map(self) -> Dict[str, str]:
        """Returns {vendor_company_uuid_str: company_uuid_str} for company-backed vendors."""
        resp = self.supabase.table("companies").select("id").eq("is_vendor", True).execute()
        return {v["id"]: v["id"] for v in (resp.data or []) if v.get("id")}

    def _map_co_status_prime(self, acumatica_status: Optional[str]) -> str:
        """Map Acumatica CO status to prime_contract_change_orders.status (free-text)."""
        if not acumatica_status:
            return "Proposed"
        mapping = {
            "on hold": "Proposed",
            "open": "Proposed",
            "pending approval": "Pending",
            "closed": "Approved",
            "canceled": "Void",
            "balanced": "Approved",
        }
        return mapping.get(acumatica_status.lower(), "Proposed")

    def _map_co_status_commitment(self, acumatica_status: Optional[str]) -> str:
        """Map Acumatica CO status to contract_change_orders.status.
        The valid_approval_date constraint requires approved_by (user UUID) for
        approved/rejected rows — since we don't have that, everything maps to 'pending'.
        """
        return "pending"

    def _get_primary_prime_contract_by_project(self) -> Dict[int, str]:
        """Returns {project_id: prime_contract_uuid} using the first prime contract per project."""
        resp = (
            self.supabase.table("prime_contracts")
            .select("id,project_id")
            .order("created_at", desc=False)
            .execute()
        )
        result: Dict[int, str] = {}
        for row in resp.data or []:
            pid = row.get("project_id")
            if pid and pid not in result:
                result[pid] = row["id"]
        return result

    def project_change_orders(self) -> Dict[str, Any]:
        """
        Project acumatica_change_orders into domain change order tables:
          - revenue_budget_change_total != 0 → prime_contract_change_orders
          - commitments_change_total != 0    → contract_change_orders (Commitments tab)
        Safe to run multiple times (upserts on acumatica_external_key).
        """
        prime_result = self._project_prime_change_orders()
        commit_result = self._project_commitment_change_orders()
        return {
            "prime_change_orders_projected": prime_result.as_dict(),
            "commitment_change_orders_projected": commit_result.as_dict(),
        }

    def _project_prime_change_orders(self) -> EntitySyncResult:
        """Project Acumatica revenue-side COs → prime_contract_change_orders."""
        result = EntitySyncResult(entity="prime_change_orders_domain")

        rows_resp = (
            self.supabase.table("acumatica_change_orders")
            .select("*")
            .not_.is_("project_id", "null")
            .neq("revenue_budget_change_total", 0)
            .execute()
        )
        acumatica_rows: List[Dict[str, Any]] = rows_resp.data or []
        result.fetched = len(acumatica_rows)

        if not acumatica_rows:
            return result

        synced_at = _now_iso()
        rows: List[Dict[str, Any]] = []

        for row in acumatica_rows:
            rows.append(
                {
                    "project_id": row["project_id"],
                    "pcco_number": row["reference_nbr"],
                    "title": row.get("description") or row["reference_nbr"],
                    "status": self._map_co_status_prime(row.get("status")),
                    "executed": row.get("status", "").lower() == "closed",
                    "total_amount": row.get("revenue_budget_change_total") or 0,
                    "submitted_at": row.get("change_date"),
                    "acumatica_external_key": row["external_key"],
                }
            )

        # Upsert on acumatica_external_key
        for chunk in _chunked(rows):
            self.supabase.table("prime_contract_change_orders").upsert(
                list(chunk), on_conflict="acumatica_external_key"
            ).execute()

        result.upserted = len(rows)
        return result

    def _project_commitment_change_orders(self) -> EntitySyncResult:
        """Project Acumatica cost/commitment-side COs → contract_change_orders."""
        result = EntitySyncResult(entity="commitment_change_orders_domain")
        valid_commitment_ids = {
            row["id"]
            for row in (
                self.supabase.table("commitments_unified")
                .select("id")
                .is_("deleted_at", "null")
                .execute()
                .data
                or []
            )
            if row.get("id")
        }
        existing_commitment_cos = (
            self.supabase.table("contract_change_orders")
            .select("acumatica_external_key, contract_id")
            .not_.is_("acumatica_external_key", "null")
            .execute()
            .data
            or []
        )
        contract_id_by_external_key = {
            row["acumatica_external_key"]: row["contract_id"]
            for row in existing_commitment_cos
            if row.get("acumatica_external_key") and row.get("contract_id") in valid_commitment_ids
        }

        rows_resp = (
            self.supabase.table("acumatica_change_orders")
            .select("*")
            .not_.is_("project_id", "null")
            .neq("commitments_change_total", 0)
            .execute()
        )
        acumatica_rows: List[Dict[str, Any]] = rows_resp.data or []
        result.fetched = len(acumatica_rows)

        if not acumatica_rows:
            return result

        synced_at = _now_iso()
        rows: List[Dict[str, Any]] = []

        for row in acumatica_rows:
            external_key = row["external_key"]
            contract_id = contract_id_by_external_key.get(external_key)
            if not contract_id:
                logger.warning(
                    "[AcumaticaSync] Skipping commitment CO projection for %s because no active commitment mapping exists yet",
                    external_key,
                )
                result.skipped += 1
                continue

            rows.append(
                {
                    "contract_id": contract_id,
                    "change_order_number": row["reference_nbr"],
                    "description": row.get("description") or row["reference_nbr"],
                    "amount": row.get("commitments_change_total") or 0,
                    "status": self._map_co_status_commitment(row.get("status")),
                    "requested_date": row.get("change_date"),
                    "acumatica_external_key": external_key,
                    "updated_at": synced_at,
                }
            )

        # Upsert on acumatica_external_key
        for chunk in _chunked(rows):
            self.supabase.table("contract_change_orders").upsert(
                list(chunk), on_conflict="acumatica_external_key"
            ).execute()

        result.upserted = len(rows)
        return result

    def project_commitments(self) -> Dict[str, Any]:
        """
        One-shot or scheduled: project acumatica_subcontracts + acumatica_purchase_orders
        into the domain subcontracts / purchase_orders tables, including SOV line items.
        Safe to run multiple times (upserts on acumatica_external_key).
        """
        sc_result = self._project_subcontracts()
        po_result = self._project_purchase_orders()
        return {
            "subcontracts_projected": sc_result.as_dict(),
            "purchase_orders_projected": po_result.as_dict(),
        }

    def _project_subcontracts(self) -> EntitySyncResult:
        result = EntitySyncResult(entity="subcontracts_domain")

        rows_resp = (
            self.supabase.table("acumatica_subcontracts")
            .select("*")
            .not_.is_("project_id", "null")
            .execute()
        )
        acumatica_rows: List[Dict[str, Any]] = rows_resp.data or []
        result.fetched = len(acumatica_rows)

        if not acumatica_rows:
            return result

        synced_at = _now_iso()
        sc_rows: List[Dict[str, Any]] = []

        for row in acumatica_rows:
            vendor_uuid = row.get("vendor_uuid")
            # subcontracts.contract_company_id → vendors(id)
            sc_rows.append(
                {
                    "contract_number": row["subcontract_nbr"],
                    "project_id": row["project_id"],
                    "contract_company_id": vendor_uuid,
                    "title": row.get("description") or row["subcontract_nbr"],
                    "status": self._map_commitment_status(row.get("status")),
                    "default_retainage_percent": row.get("retainage_pct"),
                    "contract_date": row.get("date"),
                    "start_date": row.get("start_date"),
                    "description": row.get("description"),
                    "acumatica_external_key": row["external_key"],
                    "updated_at": synced_at,
                }
            )

        # Upsert on acumatica_external_key because the table now enforces that
        # unique key directly and reruns can otherwise fail before the natural
        # business-key conflict path is evaluated.
        for chunk in _chunked(sc_rows):
            self.supabase.table("subcontracts").upsert(
                list(chunk), on_conflict="acumatica_external_key"
            ).execute()

        result.upserted = len(sc_rows)

        # Resolve subcontract UUIDs for SOV line item insertion
        sc_id_resp = (
            self.supabase.table("subcontracts")
            .select("id,acumatica_external_key")
            .in_("acumatica_external_key", [r["acumatica_external_key"] for r in sc_rows])
            .execute()
        )
        sc_id_map = {r["acumatica_external_key"]: r["id"] for r in (sc_id_resp.data or [])}

        # Project SOV line items from raw_payload Details
        for row in acumatica_rows:
            subcontract_id = sc_id_map.get(row["external_key"])
            if not subcontract_id:
                continue

            raw_payload = row.get("raw_payload") or {}
            details = raw_payload.get("Details") or []
            if not isinstance(details, list) or not details:
                continue

            sov_items: List[Dict[str, Any]] = []
            for detail in details:
                if not isinstance(detail, dict):
                    continue
                line_nbr = _unwrap(detail.get("LineNbr")) or _unwrap(detail.get("LineNumber"))
                if line_nbr is None:
                    continue
                # Use the GROSS extended line value. In Acumatica, `ExtendedCost`
                # sums across all detail lines (including negative adjustment
                # lines) to the subcontract total, whereas `Amount` is net of
                # retainage. Retainage must NOT be baked into the SOV value —
                # it is applied at invoicing via retainage_percent. Using
                # `Amount` understated every retained line by the retainage %.
                raw_amount = _unwrap(detail.get("ExtendedCost"))
                if raw_amount is None:
                    raw_amount = _unwrap(detail.get("ExtCost"))
                if raw_amount is None:
                    raw_amount = _unwrap(detail.get("Amount"))
                # Negative lines are legitimate deductive adjustments and are
                # kept as-is so the SOV reconciles to the subcontract total.
                amount = _num(raw_amount) or 0
                description = _unwrap(detail.get("Description")) or _unwrap(
                    detail.get("TransactionDescription")
                )
                sov_items.append(
                    {
                        "subcontract_id": subcontract_id,
                        "line_number": int(line_nbr),
                        "acumatica_line_nbr": int(line_nbr),
                        "description": description,
                        "budget_code": _unwrap(detail.get("CostCode")),
                        "amount": amount,
                        "quantity": _num(_unwrap(detail.get("OrderQty")))
                        or _num(_unwrap(detail.get("Qty"))),
                        "unit_cost": _num(_unwrap(detail.get("UnitCost"))),
                        "unit_of_measure": _unwrap(detail.get("UOM")),
                        "retainage_percent": _num(_unwrap(detail.get("RetainagePct"))),
                        "updated_at": synced_at,
                    }
                )

            if sov_items:
                for chunk in _chunked(sov_items, size=100):
                    self.supabase.table("subcontract_sov_items").upsert(
                        list(chunk), on_conflict="subcontract_id,line_number"
                    ).execute()
                # Guardrail: the SOV must reconcile to the Acumatica subcontract
                # total. Surface drift instead of silently shipping wrong money.
                sov_sum = round(sum(item["amount"] for item in sov_items), 2)
                contract_total = _num(row.get("subcontract_total")) or 0
                if abs(sov_sum - contract_total) > 0.01:
                    result.errors += 1
                    logger.warning(
                        "[AcumaticaSync] SOV reconciliation drift for %s: "
                        "sov_sum=%.2f subcontract_total=%.2f (delta=%.2f)",
                        row["external_key"],
                        sov_sum,
                        contract_total,
                        sov_sum - contract_total,
                    )

        return result

    def _project_purchase_orders(self) -> EntitySyncResult:
        result = EntitySyncResult(entity="purchase_orders_domain")
        vendor_company_map = self._get_vendor_company_map()

        rows_resp = (
            self.supabase.table("acumatica_purchase_orders")
            .select("*")
            .not_.is_("project_id", "null")
            .execute()
        )
        acumatica_rows: List[Dict[str, Any]] = rows_resp.data or []
        result.fetched = len(acumatica_rows)

        if not acumatica_rows:
            return result

        synced_at = _now_iso()
        po_rows: List[Dict[str, Any]] = []

        for row in acumatica_rows:
            vendor_uuid = row.get("vendor_uuid")
            company_id = vendor_company_map.get(vendor_uuid) if vendor_uuid else None

            po_rows.append(
                {
                    "contract_number": row["order_nbr"],
                    "project_id": row["project_id"],
                    "contract_company_id": company_id,
                    "title": row.get("description") or row["order_nbr"],
                    "status": self._map_commitment_status(row.get("status")),
                    "payment_terms": row.get("terms"),
                    "contract_date": row.get("date"),
                    "delivery_date": row.get("promised_on"),
                    "description": row.get("description"),
                    "acumatica_external_key": row["external_key"],
                    "updated_at": synced_at,
                }
            )

        # Upsert on acumatica_external_key for the same reason as subcontracts:
        # the table's unique ERP key must be the first-class sync conflict target.
        for chunk in _chunked(po_rows):
            self.supabase.table("purchase_orders").upsert(
                list(chunk), on_conflict="acumatica_external_key"
            ).execute()

        result.upserted = len(po_rows)

        # Resolve purchase order UUIDs for SOV line item insertion
        po_id_resp = (
            self.supabase.table("purchase_orders")
            .select("id,acumatica_external_key")
            .in_("acumatica_external_key", [r["acumatica_external_key"] for r in po_rows])
            .execute()
        )
        po_id_map = {r["acumatica_external_key"]: r["id"] for r in (po_id_resp.data or [])}

        # Project SOV line items from raw_payload Details
        for row in acumatica_rows:
            po_id = po_id_map.get(row["external_key"])
            if not po_id:
                continue

            raw_payload = row.get("raw_payload") or {}
            details = raw_payload.get("Details") or []
            if not isinstance(details, list) or not details:
                continue


            sov_items: List[Dict[str, Any]] = []
            for detail in details:
                if not isinstance(detail, dict):
                    continue
                line_nbr = _unwrap(detail.get("LineNbr")) or _unwrap(detail.get("LineNumber"))
                if line_nbr is None:
                    continue
                # Gross extended line value (sums to the order total); `Amount`
                # is net of retainage and must not be used for the SOV value.
                amount = (
                    _num(_unwrap(detail.get("ExtendedCost")))
                    or _num(_unwrap(detail.get("ExtCost")))
                    or _num(_unwrap(detail.get("Amount")))
                    or 0
                )
                description = _unwrap(detail.get("Description")) or _unwrap(
                    detail.get("TransactionDescription")
                )
                sov_items.append(
                    {
                        "purchase_order_id": po_id,
                        "line_number": int(line_nbr),
                        "acumatica_line_nbr": int(line_nbr),
                        "description": description,
                        "budget_code": _unwrap(detail.get("CostCode")),
                        "quantity": _num(_unwrap(detail.get("OrderQty"))) or _num(_unwrap(detail.get("Qty"))),
                        "uom": _unwrap(detail.get("UOM")),
                        "unit_cost": _num(_unwrap(detail.get("UnitCost"))),
                        "amount": amount,
                        "updated_at": synced_at,
                    }
                )

            if sov_items:
                # No unique constraint on (purchase_order_id, line_number) for POs
                # — delete acumatica-sourced items and re-insert fresh
                self.supabase.table("purchase_order_sov_items").delete().eq(
                    "purchase_order_id", po_id
                ).not_.is_("acumatica_line_nbr", "null").execute()
                for chunk in _chunked(sov_items, size=100):
                    self.supabase.table("purchase_order_sov_items").insert(list(chunk)).execute()

        return result

    def _sync_payments(self, last_cursor: Optional[str]) -> EntitySyncResult:
        result = EntitySyncResult(entity="ar_payments")
        records = self.session.fetch_entity("Payment", top=100, modified_after=last_cursor)
        result.fetched = len(records)
        result.cursor = self._max_cursor(records) or _now_iso()

        if not records:
            return result

        synced_at = _now_iso()
        rows: List[Dict[str, Any]] = []

        for payment in records:
            reference_nbr = payment.get("ReferenceNbr")
            if not reference_nbr:
                result.skipped += 1
                continue

            project_code = _first_text(payment, ("Project", "ProjectID", "ProjectCD"))
            project_row = self._resolve_project_row(project_code)

            rows.append(
                {
                    "external_key": f"{payment.get('Type') or 'Payment'}|{reference_nbr}",
                    "reference_nbr": reference_nbr,
                    "document_type": payment.get("Type"),
                    "project_code": project_code,
                    "project_id": project_row.get("id") if project_row else None,
                    "company_id": project_row.get("company_id") if project_row else None,
                    "customer_id": payment.get("CustomerID") or payment.get("Customer"),
                    "status": payment.get("Status"),
                    "description": payment.get("Description"),
                    "payment_method": payment.get("PaymentMethod"),
                    "payment_ref": payment.get("PaymentRef"),
                    "external_ref": payment.get("ExternalRef"),
                    "cash_account": payment.get("CashAccount"),
                    "currency_id": payment.get("CurrencyID"),
                    "application_date": _iso_to_date(payment.get("ApplicationDate")),
                    "hold": payment.get("Hold"),
                    "payment_amount": _num(payment.get("PaymentAmount")),
                    "available_balance": _num(payment.get("AvailableBalance")),
                    "last_modified_at": _iso_timestamp(payment.get("LastModifiedDateTime")),
                    "acumatica_sync_at": synced_at,
                    "raw_payload": payment,
                    "updated_at": synced_at,
                }
            )

        for chunk in _chunked(rows):
            self.supabase.table("acumatica_payments").upsert(list(chunk), on_conflict="external_key").execute()

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
            project_row = self._resolve_project_row(project_code)
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


    # ------------------------------------------------------------------
    # Reference data syncs
    # ------------------------------------------------------------------

    def _sync_accounts(self, last_cursor: Optional[str]) -> EntitySyncResult:
        """Sync GL accounts into acumatica_accounts."""
        result = EntitySyncResult(entity="accounts")
        records = self.session.fetch_entity(
            "Account",
            top=500,
            select="AccountID,AccountCD,Description,Type,Active,CurrencyID,LastModifiedDateTime",
            modified_after=last_cursor,
        )
        result.fetched = len(records)
        result.cursor = self._max_cursor(records) or _now_iso()

        if not records:
            return result

        synced_at = _now_iso()
        rows: List[Dict[str, Any]] = []
        for account in records:
            account_id = account.get("AccountID")
            if not account_id:
                result.skipped += 1
                continue
            rows.append(
                {
                    "external_key": f"Account:{account_id}",
                    "account_id": account_id,
                    "account_cd": account.get("AccountCD"),
                    "description": account.get("Description"),
                    "type": account.get("Type"),
                    "active": account.get("Active"),
                    "currency_id": account.get("CurrencyID"),
                    "last_modified_at": _iso_timestamp(account.get("LastModifiedDateTime")),
                    "acumatica_sync_at": synced_at,
                    "updated_at": synced_at,
                }
            )

        for chunk in _chunked(rows):
            self.supabase.table("acumatica_accounts").upsert(
                list(chunk), on_conflict="external_key"
            ).execute()

        result.upserted = len(rows)
        return result

    def _sync_customers(self, last_cursor: Optional[str]) -> EntitySyncResult:
        """Sync AR customers into acumatica_customers."""
        result = EntitySyncResult(entity="customers")
        records = self.session.fetch_entity(
            "Customer",
            top=200,
            select="CustomerID,CustomerName,Status,CurrencyID,Terms,TaxZone,Email,Phone1,LastModifiedDateTime",
            modified_after=last_cursor,
        )
        result.fetched = len(records)
        result.cursor = self._max_cursor(records) or _now_iso()

        if not records:
            return result

        synced_at = _now_iso()
        rows: List[Dict[str, Any]] = []
        for customer in records:
            customer_id = customer.get("CustomerID")
            if not customer_id:
                result.skipped += 1
                continue
            rows.append(
                {
                    "external_key": f"Customer:{customer_id}",
                    "customer_id": customer_id,
                    "customer_name": customer.get("CustomerName") or customer_id,
                    "status": customer.get("Status"),
                    "currency_id": customer.get("CurrencyID"),
                    "terms": customer.get("Terms"),
                    "tax_zone": customer.get("TaxZone"),
                    "email": customer.get("Email"),
                    "phone": customer.get("Phone1"),
                    "last_modified_at": _iso_timestamp(customer.get("LastModifiedDateTime")),
                    "acumatica_sync_at": synced_at,
                    "raw_payload": customer,
                    "updated_at": synced_at,
                }
            )

        for chunk in _chunked(rows):
            self.supabase.table("acumatica_customers").upsert(
                list(chunk), on_conflict="external_key"
            ).execute()

        result.upserted = len(rows)
        return result

    def _sync_project_tasks(self, last_cursor: Optional[str]) -> EntitySyncResult:
        """Sync project tasks into acumatica_project_tasks."""
        result = EntitySyncResult(entity="project_tasks")
        records = self.session.fetch_entity(
            "ProjectTask",
            top=200,
            select="ProjectID,ProjectTaskID,Description,Status,Default,ExternalRefNbr,LastModifiedDateTime",
            modified_after=last_cursor,
        )
        result.fetched = len(records)
        result.cursor = self._max_cursor(records) or _now_iso()

        if not records:
            return result

        synced_at = _now_iso()
        rows: List[Dict[str, Any]] = []
        for task in records:
            project_id = task.get("ProjectID")
            project_task_id = task.get("ProjectTaskID")
            if not project_id or not project_task_id:
                result.skipped += 1
                continue
            rows.append(
                {
                    "external_key": f"ProjectTask:{project_id}:{project_task_id}",
                    "project_id": project_id,
                    "project_task_id": project_task_id,
                    "description": task.get("Description"),
                    "status": task.get("Status"),
                    "is_default": task.get("Default"),
                    "external_ref_nbr": task.get("ExternalRefNbr"),
                    "last_modified_at": _iso_timestamp(task.get("LastModifiedDateTime")),
                    "acumatica_sync_at": synced_at,
                    "updated_at": synced_at,
                }
            )

        for chunk in _chunked(rows):
            self.supabase.table("acumatica_project_tasks").upsert(
                list(chunk), on_conflict="external_key"
            ).execute()

        result.upserted = len(rows)
        return result

    def _sync_ap_payment_applications(self, last_cursor: Optional[str]) -> EntitySyncResult:
        """Sync AP bill-to-payment application rows from the APBillsToPayments OData inquiry."""
        _ = last_cursor
        result = EntitySyncResult(entity="ap_payment_applications")
        records = self.session.fetch_odata_entity("APBillsToPayments", top=1000)
        result.fetched = len(records)
        result.cursor = _now_iso()

        if not records:
            return result

        bill_refs = sorted({row.get("ReferenceNbr") for row in records if row.get("ReferenceNbr")})
        bill_by_ref: Dict[str, Dict[str, Any]] = {}
        for chunk in _chunked([{"reference_nbr": ref} for ref in bill_refs], size=500):
            refs = [row["reference_nbr"] for row in chunk]
            rows = (
                self.supabase.table("acumatica_ap_bills")
                .select("reference_nbr,project_code")
                .in_("reference_nbr", refs)
                .execute()
            ).data or []
            bill_by_ref.update({row["reference_nbr"]: row for row in rows if row.get("reference_nbr")})

        rows_to_upsert: List[Dict[str, Any]] = []
        seen_keys: set[tuple[str, str, str, str]] = set()
        for row in records:
            payment_ref = row.get("ReferenceNbr_2") or row.get("ReferenceNbr_3")
            invoice_ref = row.get("ReferenceNbr") or row.get("ReferenceNbr_4") or row.get("ReferenceNbr_5")
            payment_type = row.get("Type") or "Payment"
            invoice_type = row.get("DocumentType") or row.get("Type_3") or row.get("Type_4") or "Bill"
            if not payment_ref or not invoice_ref:
                result.skipped += 1
                continue

            unique_key = (payment_ref, payment_type, invoice_ref, invoice_type)
            if unique_key in seen_keys:
                result.skipped += 1
                continue
            seen_keys.add(unique_key)

            bill = bill_by_ref.get(invoice_ref) or {}
            rows_to_upsert.append(
                {
                    "payment_external_key": f"{payment_type}|{payment_ref}",
                    "payment_reference_nbr": payment_ref,
                    "payment_type": payment_type,
                    "invoice_reference_nbr": invoice_ref,
                    "invoice_type": invoice_type,
                    "customer_id": None,
                    "amount_applied": _num(row.get("APAdjust_curyAdjdAmt") or row.get("AmountPaid")),
                    "balance": None,
                    "resolved_project_code": bill.get("project_code"),
                    "resolution_method": "ap_bill_lookup" if bill.get("project_code") else "ap_bills_to_payments_odata",
                }
            )

        for chunk in _chunked(rows_to_upsert):
            self.supabase.table("acumatica_payment_applications").upsert(
                list(chunk),
                on_conflict="payment_reference_nbr,payment_type,invoice_reference_nbr,invoice_type",
            ).execute()

        result.upserted = len(rows_to_upsert)
        result.projected = self._project_commitment_payments_from_checks()
        return result

    def _ar_payment_application_row_from_odata(self, row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        payment_ref = self._first_text_from_aliases(
            row,
            (
                "PaymentReferenceNbr",
                "PaymentRefNbr",
                "PaymentNbr",
                "PaymentReference",
                "PaymentRef",
                "AdjgRefNbr",
                "ReferenceNbr_2",
            ),
        )
        invoice_ref = self._first_text_from_aliases(
            row,
            (
                "InvoiceReferenceNbr",
                "InvoiceRefNbr",
                "AppliedInvoiceRefNbr",
                "AppliedToDocRef",
                "AdjdRefNbr",
                "DocRefNbr",
                "DocumentRefNbr",
                "ReferenceNbr",
            ),
        )
        if not payment_ref or not invoice_ref:
            return None

        payment_type = self._first_text_from_aliases(
            row,
            (
                "PaymentType",
                "PaymentDocType",
                "AdjgDocType",
                "Type_2",
                "Type_3",
            ),
        ) or "Payment"
        invoice_type = self._first_text_from_aliases(
            row,
            (
                "InvoiceType",
                "InvoiceDocType",
                "AppliedInvoiceType",
                "AppliedToDocType",
                "AdjdDocType",
                "DocType",
                "DocumentType",
                "TranType",
                "Type",
            ),
        ) or "Invoice"

        explicit_project_code = self._first_text_from_aliases(
            row,
            (
                "Project",
                "ProjectID",
                "ProjectCD",
                "ProjectCode",
                "JobNumber",
            ),
        )
        resolved_project_code = explicit_project_code
        resolution_method = "ar_payment_applications_odata"
        if not resolved_project_code:
            ar_invoice_rows = (
                self.supabase.table("acumatica_ar_invoices")
                .select("project")
                .eq("reference_nbr", invoice_ref)
                .limit(1)
                .execute()
            ).data or []
            if ar_invoice_rows and ar_invoice_rows[0].get("project"):
                resolved_project_code = ar_invoice_rows[0]["project"]
                resolution_method = "ar_invoice_lookup"

        return {
            "payment_external_key": f"{payment_type}|{payment_ref}",
            "payment_reference_nbr": payment_ref,
            "payment_type": payment_type,
            "invoice_reference_nbr": invoice_ref,
            "invoice_type": invoice_type,
            "customer_id": self._first_text_from_aliases(row, ("CustomerID", "Customer", "CustomerCD")),
            "amount_applied": self._first_num_from_aliases(
                row,
                (
                    "AmountApplied",
                    "AppliedAmount",
                    "AmountPaid",
                    "PaymentAmount",
                    "CuryAdjdAmt",
                    "CuryAdjgAmt",
                    "ARAdjust_curyAdjdAmt",
                ),
            ),
            "balance": self._first_num_from_aliases(
                row,
                (
                    "Balance",
                    "DocumentBalance",
                    "InvoiceBalance",
                    "CuryAdjdBilledAmt",
                ),
            ),
            "resolved_project_code": resolved_project_code,
            "resolution_method": resolution_method,
        }

    def _sync_payment_applications_from_odata(self, entity_set_name: str) -> EntitySyncResult:
        result = EntitySyncResult(entity="payment_applications")
        records = self.session.fetch_odata_entity(entity_set_name, top=1000)
        result.fetched = len(records)
        result.cursor = _now_iso()

        rows: List[Dict[str, Any]] = []
        seen_keys: set[tuple[str, str, str, str]] = set()
        for record in records:
            row = self._ar_payment_application_row_from_odata(record)
            if not row:
                result.skipped += 1
                continue
            unique_key = (
                row["payment_reference_nbr"],
                row.get("payment_type") or "",
                row["invoice_reference_nbr"],
                row.get("invoice_type") or "",
            )
            if unique_key in seen_keys:
                result.skipped += 1
                continue
            seen_keys.add(unique_key)
            rows.append(row)

        if rows:
            for chunk in _chunked(rows):
                self.supabase.table("acumatica_payment_applications").upsert(
                    list(chunk),
                    on_conflict="payment_reference_nbr,payment_type,invoice_reference_nbr,invoice_type",
                ).execute()

        result.upserted = len(rows)
        result.projected = self._project_prime_contract_payments_from_applications()
        return result

    def _project_prime_contract_payments_from_applications(self) -> int:
        applications = (
            self.supabase.table("acumatica_payment_applications")
            .select(
                "payment_external_key, payment_reference_nbr, payment_type, invoice_reference_nbr, "
                "invoice_type, amount_applied, resolved_project_code, customer_id"
            )
            .neq("invoice_type", "Bill")
            .execute()
        ).data or []
        if not applications:
            return 0

        payments = (
            self.supabase.table("acumatica_payments")
            .select("external_key, reference_nbr, document_type, payment_method, payment_ref, application_date, description")
            .execute()
        ).data or []
        payment_by_external_key = {row.get("external_key"): row for row in payments if row.get("external_key")}
        payment_by_ref = {row.get("reference_nbr"): row for row in payments if row.get("reference_nbr")}

        projects = (
            self.supabase.table("projects")
            .select("id, acumatica_project_id")
            .not_.is_("acumatica_project_id", "null")
            .execute()
        ).data or []
        project_by_alias: Dict[str, int] = {}
        for project in projects:
            project_id = project.get("id")
            if project_id is None:
                continue
            for alias in _project_code_aliases(project.get("acumatica_project_id")):
                project_by_alias[alias] = project_id

        prime_contracts = (
            self.supabase.table("prime_contracts")
            .select("id, project_id")
            .execute()
        ).data or []
        contract_by_project_id: Dict[int, str] = {}
        for contract in prime_contracts:
            project_id = contract.get("project_id")
            if project_id is not None and project_id not in contract_by_project_id:
                contract_by_project_id[project_id] = contract["id"]

        grouped: Dict[tuple[str, str, int], Dict[str, Any]] = {}
        for application in applications:
            payment_ref = application.get("payment_reference_nbr")
            payment_type = application.get("payment_type") or "Payment"
            project_code = application.get("resolved_project_code")
            amount = _num(application.get("amount_applied"))
            if not payment_ref or not project_code or amount is None:
                continue

            project_id = next(
                (project_by_alias[alias] for alias in _project_code_aliases(project_code) if alias in project_by_alias),
                None,
            )
            if project_id is None:
                continue

            key = (payment_ref, payment_type, project_id)
            payment = payment_by_external_key.get(application.get("payment_external_key")) or payment_by_ref.get(payment_ref)
            current = grouped.setdefault(
                key,
                {
                    "payment_ref": payment_ref,
                    "payment_type": payment_type,
                    "project_id": project_id,
                    "amount": 0.0,
                    "payment": payment or {},
                    "invoice_refs": [],
                },
            )
            current["amount"] += amount
            current["invoice_refs"].append(application.get("invoice_reference_nbr"))
            if payment and not current.get("payment"):
                current["payment"] = payment

        now = _now_iso()
        rows: List[Dict[str, Any]] = []
        for grouped_row in grouped.values():
            project_id = grouped_row["project_id"]
            contract_id = contract_by_project_id.get(project_id)
            if not contract_id:
                continue
            payment = grouped_row.get("payment") or {}
            payment_ref = grouped_row["payment_ref"]
            payment_type = grouped_row["payment_type"]
            rows.append(
                {
                    "contract_id": contract_id,
                    "project_id": project_id,
                    "payment_number": payment_ref,
                    "amount": grouped_row["amount"],
                    "payment_date": payment.get("application_date") or now.split("T")[0],
                    "method": self._normalize_prime_payment_method(payment.get("payment_method")),
                    "reference_number": payment.get("payment_ref"),
                    "notes": payment.get("description")
                    or f"Imported from Acumatica payment applications for invoices {', '.join(sorted(set(grouped_row['invoice_refs'])))}",
                    "updated_at": now,
                    "acumatica_ref_nbr": payment_ref,
                    "acumatica_doc_type": payment_type,
                    "acumatica_sync_at": now,
                }
            )

        existing = (
            self.supabase.table("prime_contract_payments")
            .select("id, acumatica_ref_nbr")
            .not_.is_("acumatica_ref_nbr", "null")
            .execute()
        ).data or []
        existing_by_ref = {row.get("acumatica_ref_nbr"): row.get("id") for row in existing if row.get("acumatica_ref_nbr")}

        for row in rows:
            existing_id = existing_by_ref.get(row["acumatica_ref_nbr"])
            if existing_id:
                self.supabase.table("prime_contract_payments").update(row).eq("id", existing_id).execute()
            else:
                self.supabase.table("prime_contract_payments").insert(row).execute()

        return len(rows)

    def _sync_payment_applications(self, last_cursor: Optional[str]) -> EntitySyncResult:
        """Sync AR payment application lines into acumatica_payment_applications.

        Each AR Payment can be applied against multiple invoices. Prefer an
        Acumatica OData Generic Inquiry because the Default endpoint's
        ApplicationHistory sub-entity fails in this tenant on BQL delegate
        fields. Fall back to the REST sub-entity only when no GI is exposed.

        Unique constraint: (payment_reference_nbr, payment_type,
                             invoice_reference_nbr, invoice_type)
        """
        entity_set_name = self._find_ar_payment_applications_odata_entity()
        if entity_set_name:
            return self._sync_payment_applications_from_odata(entity_set_name)

        result = EntitySyncResult(entity="payment_applications")
        try:
            records = self._fetch_payment_application_records(last_cursor)
        except RuntimeError as exc:
            raise RuntimeError(f"{self._available_ar_payment_application_entity_message()} REST fallback error: {exc}") from exc
        result.fetched = len(records)
        result.cursor = self._max_cursor(records) or _now_iso()

        if not records:
            return result

        rows: List[Dict[str, Any]] = []
        for payment in records:
            payment_ref = payment.get("ReferenceNbr")
            payment_type = payment.get("Type") or "Payment"
            customer_id = payment.get("CustomerID") or payment.get("Customer")
            payment_external_key = f"{payment_type}|{payment_ref}"

            for app in self._payment_application_lines(payment):
                invoice_ref = (
                    app.get("AdjRefNbr")
                    or app.get("DocRefNbr")
                    or app.get("ReferenceNbr")
                    or app.get("AppliedToDocRef")
                    or app.get("DocumentRefNbr")
                )
                invoice_type = (
                    app.get("AdjDocType")
                    or app.get("DocType")
                    or app.get("Type")
                    or app.get("DocumentType")
                    or "Invoice"
                )
                if not invoice_ref:
                    result.skipped += 1
                    continue

                # Resolve project from AR invoice table if available (best-effort)
                resolved_project_code: Optional[str] = None
                resolution_method: Optional[str] = None
                ar_invoice_rows = (
                    self.supabase.table("acumatica_ar_invoices")
                    .select("project")
                    .eq("reference_nbr", invoice_ref)
                    .limit(1)
                    .execute()
                ).data or []
                if ar_invoice_rows and ar_invoice_rows[0].get("project"):
                    resolved_project_code = ar_invoice_rows[0]["project"]
                    resolution_method = "ar_invoice_lookup"

                rows.append(
                    {
                        "payment_external_key": payment_external_key,
                        "payment_reference_nbr": payment_ref,
                        "payment_type": payment_type,
                        "invoice_reference_nbr": invoice_ref,
                        "invoice_type": invoice_type,
                        "customer_id": customer_id,
                        "amount_applied": _num(
                            app.get("AmountApplied")
                            or app.get("AdjAmt")
                            or app.get("AmountPaid")
                            or app.get("AppliedAmount")
                        ),
                        "balance": _num(app.get("Balance") or app.get("CuryAdjdBilledAmt")),
                        "resolved_project_code": resolved_project_code,
                        "resolution_method": resolution_method,
                    }
                )

        if not rows:
            return result

        # Upsert on composite unique constraint
        for chunk in _chunked(rows):
            self.supabase.table("acumatica_payment_applications").upsert(
                list(chunk),
                on_conflict="payment_reference_nbr,payment_type,invoice_reference_nbr,invoice_type",
            ).execute()

        result.upserted = len(rows)
        result.projected = self._project_prime_contract_payments_from_applications()
        return result


def run_acumatica_financial_sync() -> Dict[str, Any]:
    service = AcumaticaFinancialSyncService()
    return service.sync_all()
