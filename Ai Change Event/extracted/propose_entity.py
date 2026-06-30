"""
═══════════════════════════════════════════════════════════════════════════
GUIDED ENTITY CREATION TOOL  —  propose_entity
═══════════════════════════════════════════════════════════════════════════

ROLE
    The single, entity-agnostic tool the chat agent calls to create ANY
    record (change_event, prime_contract, budget_modification, ...). Written
    once. `entity_type` is a key into the manifest registry; the manifest
    supplies fields, validation, and which optionals to pursue.

WHY ONE TOOL, NOT ONE PER ENTITY
    The creation choreography is identical across entities. Only the field set
    differs, and that lives in data (the manifest), not code. Adding an entity
    = drop a manifest JSON + a skill resource. No new tool.

FLOW (confirm-gated — never a direct write)
    1. propose_entity(entity_type, draft)
         - loads manifest
         - derives system fields (number via sequence, status default,
           created_by_id from auth context)
         - validates required fields, computes recommended-still-empty
         - inserts a PENDING row in agent_actions (the audit ledger)
         - returns a CARD payload for the frontend generative-UI widget
       NOTHING is written to the entity table here.
    2. User edits the card, then confirms.
       Frontend (or commit_agent_action below) calls the approve RPC, which
       atomically inserts the entity row AND finalizes the ledger entry under
       RLS that forbids the AI role from writing the table directly.
    3. Agent runs postCreate (insight / route) from the manifest.

ALIGNMENT  (verify against AGENT_ACTION_LAYER_CONTRACT.md + the migration
           before wiring — names below mirror the contract, not asserted as
           verbatim):
    - agent_actions columns:        id, action_type, entity_type, status,
                                    payload(jsonb), proposed_by, created_at
    - propose RPC / insert path:    propose_agent_action(...)
    - approve RPC:                  approve_agent_action(action_id, final_payload)
    - reject RPC:                   reject_agent_action(action_id, reason)
    If the real names differ, change them in ONE place: _AGENT_ACTIONS_TABLE
    and the two rpc(...) calls.
═══════════════════════════════════════════════════════════════════════════
"""

import os
import json
from functools import lru_cache
from typing import Any, Optional

from agents import function_tool
from supabase import create_client, Client

# --- alignment constants (single edit point if contract names differ) -------
_AGENT_ACTIONS_TABLE = "agent_actions"
_PROPOSE_VIA_INSERT = True          # contract uses an RLS-guarded insert + trigger
_APPROVE_RPC = "approve_agent_action"
_REJECT_RPC = "reject_agent_action"

# Manifests are the shared source of truth (same JSON the TS renderer reads).
# Keep them in one dir; load by entity_type.
_MANIFEST_DIR = os.getenv(
    "ENTITY_MANIFEST_DIR",
    os.path.join(os.path.dirname(__file__), "..", "manifests"),
)


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    return create_client(url, key)


@lru_cache(maxsize=32)
def _load_manifest(entity_type: str) -> dict:
    path = os.path.join(_MANIFEST_DIR, f"{entity_type}.manifest.json")
    if not os.path.exists(path):
        raise ValueError(f"No manifest for entity_type '{entity_type}' at {path}")
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def _fields_by_priority(manifest: dict, priority: str) -> list[dict]:
    return [f for f in manifest["fields"] if f["priority"] == priority]


def _next_number(client: Client, manifest: dict) -> Optional[str]:
    """Sequence-derived number, e.g. CE-014. System-owned; agent never asks."""
    prefix = manifest.get("numberPrefix")
    if not prefix:
        return None
    table = manifest["table"]
    # count-based sequence; replace with a dedicated sequence/RPC if the
    # contract provides one (avoids race on concurrent creates).
    res = client.table(table).select("id", count="exact").execute()
    n = (res.count or 0) + 1
    return f"{prefix}-{n:03d}"


def _derive_system_fields(
    client: Client, manifest: dict, project_id: Optional[str], user_id: Optional[str]
) -> dict[str, Any]:
    derived: dict[str, Any] = {}
    for f in _fields_by_priority(manifest, "system"):
        src = f.get("derivedFrom")
        if src == "sequence":
            num = _next_number(client, manifest)
            if num:
                derived[f["key"]] = num
        elif src == "default":
            derived[f["key"]] = f.get("default")
        elif src == "auth.user":
            derived[f["key"]] = user_id
        elif src == "project":
            derived[f["key"]] = project_id
    return derived


def _missing_required(manifest: dict, payload: dict) -> list[str]:
    out = []
    for f in _fields_by_priority(manifest, "required"):
        v = payload.get(f["key"])
        if v is None or (isinstance(v, str) and not v.strip()):
            out.append(f["key"])
    return out


def _empty_recommended(manifest: dict, payload: dict) -> list[dict]:
    """Recommended fields the agent should still pursue, WITH their rationale."""
    out = []
    for f in _fields_by_priority(manifest, "recommended"):
        v = payload.get(f["key"])
        if v is None or (isinstance(v, str) and not v.strip()):
            out.append({"key": f["key"], "label": f["label"],
                        "whyItMatters": f.get("whyItMatters", "")})
    return out


@function_tool
async def propose_entity(
    entity_type: str,
    draft_json: str,
    project_id: Optional[str] = None,
    user_id: Optional[str] = None,
) -> str:
    """
    Stage a new record for confirm-gated creation and return the form card.

    Does NOT write the entity. Inserts a pending agent_actions row and returns
    a card spec for the user to review/edit/confirm.

    Args:
        entity_type: Manifest key, e.g. 'change_event'.
        draft_json: JSON object of field->value the agent has gathered so far.
                    Partial is fine; system fields are ignored if present.
        project_id: Active project context (for scoping + project-derived fields).
        user_id:    Authenticated user id (for created_by + ledger).

    Returns:
        JSON string: {
          action_id, entity_type, label,
          card: { sections, fields },        # render this as the generative UI
          prefilled,                         # values already known
          missing_required,                  # block confirm until empty
          pursue_recommended,                # agent: ask these next, w/ reasons
          schema_gaps                        # data the schema can't store (warn)
        }
    """
    try:
        draft = json.loads(draft_json) if draft_json else {}
    except json.JSONDecodeError as e:
        return json.dumps({"error": f"draft_json is not valid JSON: {e}"})

    try:
        manifest = _load_manifest(entity_type)
    except ValueError as e:
        return json.dumps({"error": str(e)})

    client = get_supabase_client()

    # strip any system fields the model tried to set; system is server-owned
    system_keys = {f["key"] for f in _fields_by_priority(manifest, "system")}
    user_payload = {k: v for k, v in draft.items() if k not in system_keys}

    derived = _derive_system_fields(client, manifest, project_id, user_id)
    full_payload = {**user_payload, **derived}

    missing_required = _missing_required(manifest, full_payload)
    pursue_recommended = _empty_recommended(manifest, full_payload)

    # stage a PENDING action in the ledger (no entity write yet)
    action_id = None
    try:
        ins = client.table(_AGENT_ACTIONS_TABLE).insert({
            "action_type": "create_entity",
            "entity_type": entity_type,
            "status": "pending",
            "payload": full_payload,
            "proposed_by": user_id,
        }).execute()
        if ins.data:
            action_id = ins.data[0].get("id")
    except Exception as e:  # surface, don't fabricate success
        return json.dumps({
            "error": f"could not stage agent_action (check RLS/contract names): {e}",
            "hint": "verify _AGENT_ACTIONS_TABLE + columns against AGENT_ACTION_LAYER_CONTRACT.md",
        })

    card = {
        "sections": manifest["sections"],
        "fields": [f for f in manifest["fields"] if f["priority"] != "system"],
    }

    return json.dumps({
        "action_id": action_id,
        "entity_type": entity_type,
        "label": manifest["label"],
        "card": card,
        "prefilled": full_payload,
        "missing_required": missing_required,
        "pursue_recommended": pursue_recommended,
        "schema_gaps": manifest.get("schemaGaps", []),
        "post_create": manifest.get("postCreate"),
    }, default=str)


@function_tool
async def commit_agent_action(action_id: str, final_payload_json: str) -> str:
    """
    Commit a staged action after the user confirms the card.

    Routes through the approve RPC, which performs the gated insert into the
    entity table AND finalizes the ledger atomically. The AI role cannot write
    the entity table directly — only this RPC can.

    Args:
        action_id: From propose_entity.
        final_payload_json: The confirmed payload (post user edits).
    """
    try:
        final_payload = json.loads(final_payload_json) if final_payload_json else {}
    except json.JSONDecodeError as e:
        return json.dumps({"error": f"final_payload_json invalid: {e}"})

    client = get_supabase_client()
    try:
        res = client.rpc(_APPROVE_RPC, {
            "action_id": action_id,
            "final_payload": final_payload,
        }).execute()
    except Exception as e:
        return json.dumps({
            "error": f"approve RPC failed: {e}",
            "hint": f"verify '{_APPROVE_RPC}' signature in the migration",
        })

    return json.dumps({"committed": True, "action_id": action_id,
                       "result": res.data}, default=str)


@function_tool
async def reject_agent_action(action_id: str, reason: str = "") -> str:
    """Discard a staged action the user declined."""
    client = get_supabase_client()
    try:
        client.rpc(_REJECT_RPC, {"action_id": action_id, "reason": reason}).execute()
    except Exception as e:
        return json.dumps({"error": f"reject RPC failed: {e}"})
    return json.dumps({"rejected": True, "action_id": action_id})
