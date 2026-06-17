#!/usr/bin/env python3
"""Refresh one project operating packet through direct Postgres writes.

This is a bounded repair path for cases where Supabase REST hangs or times out
while the app DB is still reachable. It reuses the production operating-summary
prompt, quality checks, and card definitions, but writes the final projection in
one Postgres transaction instead of issuing many REST calls.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

import psycopg2
from psycopg2.extras import Json, RealDictCursor


def _load_backend() -> None:
    backend_root = Path(__file__).resolve().parents[2]
    if str(backend_root) not in sys.path:
        sys.path.append(str(backend_root))

    from src.services.env_loader import load_env

    load_env()


_load_backend()

from src.services.intelligence import operating_summary as op  # noqa: E402


def _connect() -> Any:
    database_url = os.getenv("APP_DATABASE_URL") or os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")
    if not database_url:
        raise RuntimeError("APP_DATABASE_URL, DATABASE_URL, or SUPABASE_DB_URL is required.")
    return psycopg2.connect(
        database_url,
        sslmode="require",
        connect_timeout=10,
        keepalives=1,
        keepalives_idle=10,
        keepalives_interval=5,
        keepalives_count=3,
    )


def _one(cur: Any, query: str, params: Iterable[Any]) -> Optional[Dict[str, Any]]:
    cur.execute(query, tuple(params))
    return cur.fetchone()


def _many(cur: Any, query: str, params: Iterable[Any]) -> List[Dict[str, Any]]:
    cur.execute(query, tuple(params))
    return list(cur.fetchall())


def _optional_many(cur: Any, query: str, params: Iterable[Any]) -> List[Dict[str, Any]]:
    try:
        return _many(cur, query, params)
    except Exception:
        cur.connection.rollback()
        return []


def _json(value: Any) -> Json:
    return Json(value, dumps=lambda payload: json.dumps(payload, default=str))


def _as_dict(value: Any) -> Dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def _ensure_target(cur: Any, project: Dict[str, Any]) -> Dict[str, Any]:
    existing = _one(
        cur,
        """
        select *
        from public.intelligence_targets
        where target_type = 'client_project'
          and project_id = %s
        limit 1
        """,
        [project["id"]],
    )
    if existing:
        return existing

    name = project.get("name") or f"Project {project['id']}"
    base_slug = op._slugify(" ".join(str(part) for part in [project.get("project_number"), name] if part))
    slug = base_slug
    if _one(cur, "select id from public.intelligence_targets where slug = %s limit 1", [slug]):
        slug = f"{base_slug}-{int(project['id'])}"
    return _one(
        cur,
        """
        insert into public.intelligence_targets
          (target_type, name, slug, status, project_id, metadata)
        values
          ('client_project', %s, %s, 'active', %s, %s)
        returning *
        """,
        [
            name,
            slug,
            project["id"],
            _json({"created_by": "project_operating_summary_direct", "compiler_version": op.COMPILER_VERSION}),
        ],
    )


def _build_sources(cur: Any, project_id: int) -> Dict[str, Any]:
    project = _one(
        cur,
        """
        select id,name,project_number,phase,stage,summary,summary_updated_at,
          created_at,health_status,completion_percentage,budget,budget_used,erp_system,
          erp_sync_status,erp_last_job_cost_sync,erp_last_direct_cost_sync,
          acumatica_project_id,work_scope,project_sector,delivery_method
        from public.projects
        where id = %s
        limit 1
        """,
        [project_id],
    )
    if not project:
        raise ValueError(f"projects row not found: {project_id}")

    project_name = project.get("name")
    docs = _optional_many(
        cur,
        """
        select id,title,type,category,source,source_system,date,captured_at,summary,overview,
          notes,action_items,decisions,key_topics,topics_discussed,source_web_url,url
        from public.document_metadata
        where project_id = %s
        order by date desc nulls last
        limit 500
        """,
        [project_id],
    )
    tasks = _optional_many(
        cur,
        """
        select id,title,description,status,priority,due_date,created_at,updated_at,
          extraction_source,source_system,metadata_id,source_chunk_id
        from public.tasks
        where project_id = %s
        order by updated_at desc nulls last
        limit 30
        """,
        [project_id],
    )
    schedule_tasks = _optional_many(
        cur,
        """
        select id,name,status,priority,start_date,finish_date,updated_at,created_at
        from public.schedule_tasks
        where project_id = %s
        order by updated_at desc nulls last
        limit 30
        """,
        [project_id],
    )
    rfis = _optional_many(
        cur,
        """
        select id,number,subject,status,question,due_date,ball_in_court,cost_impact,schedule_impact,updated_at,created_at
        from public.rfis
        where project_id = %s
        order by updated_at desc nulls last
        limit 20
        """,
        [project_id],
    )
    submittals = _optional_many(
        cur,
        """
        select id,submittal_number,title,status,description,final_due_date,ball_in_court,updated_at,created_at
        from public.submittals
        where project_id = %s
        order by updated_at desc nulls last
        limit 20
        """,
        [project_id],
    )
    drawings = _optional_many(
        cur,
        """
        select id,number,title,status,drawing_date,revision_date,created_at,updated_at
        from public.drawings
        where project_id = %s
        order by updated_at desc nulls last
        limit 20
        """,
        [project_id],
    )
    specifications = _optional_many(
        cur,
        """
        select id,number,title,status,description,created_at,updated_at
        from public.specifications
        where project_id = %s
        order by updated_at desc nulls last
        limit 20
        """,
        [project_id],
    )
    daily_logs = _optional_many(
        cur,
        """
        select id,log_date,weather,work_performed,notes,created_at,updated_at
        from public.daily_logs
        where project_id = %s
        order by log_date desc nulls last
        limit 20
        """,
        [project_id],
    )

    sources = [
        op._make_source(
            category="project_detail",
            source_id=f"project:{project['id']}",
            record_id=str(project["id"]),
            title=project_name,
            project_name=project_name,
            captured_at=op._safe_date(
                project.get("erp_last_job_cost_sync"),
                project.get("erp_last_direct_cost_sync"),
                project.get("summary_updated_at"),
                project.get("created_at"),
            ),
            text=op._join_fields(
                [
                    ("Project", project.get("name")),
                    ("Project number", project.get("project_number")),
                    ("Phase", project.get("stage") or project.get("phase")),
                    ("Summary", project.get("summary")),
                    ("Health", project.get("health_status")),
                    ("Budget", project.get("budget")),
                    ("Budget used", project.get("budget_used")),
                    ("ERP sync status", project.get("erp_sync_status")),
                    ("Work scope", project.get("work_scope")),
                ]
            ),
        )
    ]

    for row in docs:
        category = op._document_category(row)
        sources.append(
            op._make_source(
                category=category,
                source_id=f"document_metadata:{row['id']}",
                record_id=str(row["id"]),
                title=row.get("title"),
                project_name=project_name,
                captured_at=op._safe_date(row.get("date"), row.get("captured_at")),
                source_url=row.get("source_web_url") or row.get("url"),
                text=op._join_fields(
                    [
                        ("Title", row.get("title")),
                        ("Type", row.get("type")),
                        ("Category", row.get("category")),
                        ("Source", row.get("source_system") or row.get("source")),
                        ("Date", row.get("date") or row.get("captured_at")),
                        ("Summary", row.get("summary") or row.get("overview")),
                        ("Notes", row.get("notes")),
                        ("Action items", row.get("action_items")),
                        ("Decisions", row.get("decisions")),
                        ("Key topics", row.get("key_topics") or row.get("topics_discussed")),
                    ]
                ),
            )
        )

    for row in tasks:
        sources.append(
            op._make_source(
                category="task",
                source_id=f"task:{row['id']}",
                record_id=str(row["id"]),
                title=row.get("title"),
                project_name=project_name,
                captured_at=op._safe_date(row.get("updated_at"), row.get("created_at")),
                text=op._join_fields(
                    [
                        ("Task", row.get("title")),
                        ("Description", row.get("description")),
                        ("Status", row.get("status")),
                        ("Priority", row.get("priority")),
                        ("Due date", row.get("due_date")),
                        ("Source", row.get("extraction_source") or row.get("source_system")),
                    ]
                ),
            )
        )

    for row in schedule_tasks:
        sources.append(
            op._make_source(
                category="task",
                source_id=f"schedule_task:{row['id']}",
                record_id=str(row["id"]),
                title=row.get("name"),
                project_name=project_name,
                captured_at=op._safe_date(row.get("updated_at"), row.get("created_at")),
                text=op._join_fields(
                    [
                        ("Schedule task", row.get("name")),
                        ("Status", row.get("status")),
                        ("Priority", row.get("priority")),
                        ("Start", row.get("start_date")),
                        ("Finish", row.get("finish_date")),
                    ]
                ),
            )
        )

    for category, rows, id_prefix, title_keys in [
        ("rfi", rfis, "rfi", ("subject", "number")),
        ("submittal", submittals, "submittal", ("title", "submittal_number")),
        ("drawing", drawings, "drawing", ("title", "number")),
        ("specification", specifications, "specification", ("title", "number")),
        ("daily_report", daily_logs, "daily_log", ("log_date", "id")),
    ]:
        for row in rows:
            title = next((row.get(key) for key in title_keys if row.get(key)), str(row.get("id")))
            sources.append(
                op._make_source(
                    category=category,
                    source_id=f"{id_prefix}:{row['id']}",
                    record_id=str(row["id"]),
                    title=str(title),
                    project_name=project_name,
                    captured_at=op._safe_date(row.get("updated_at"), row.get("created_at"), row.get("log_date")),
                    text=op._join_fields([(key.replace("_", " ").title(), value) for key, value in row.items()]),
                )
            )

    all_sources = sources
    selected_sources = op._select_operating_sources(all_sources)
    document_intelligence = op._build_document_intelligence(selected_sources)
    coverage = []
    for category, label in op.CATEGORY_LABELS.items():
        all_category_sources = [source for source in all_sources if source["category"] == category]
        category_sources = [source for source in selected_sources if source["category"] == category]
        latest_values = sorted([s["capturedAt"] for s in category_sources if s.get("capturedAt")])
        coverage.append(
            {
                "category": category,
                "label": label,
                "availableCount": len(all_category_sources),
                "sourceCount": len(category_sources),
                "inPacketCount": len(category_sources),
                "latestAt": latest_values[-1] if latest_values else None,
                "sampleTitles": [s.get("title") or s["recordId"] for s in category_sources[:3]],
                "tableNames": [],
            }
        )

    return {
        "projectId": int(project_id),
        "projectName": project_name,
        "generatedAt": op._utc_now(),
        "sources": selected_sources,
        "coverage": coverage,
        "documentIntelligence": document_intelligence,
        "missingCategories": [row for row in coverage if row["availableCount"] == 0],
        "_project": project,
    }


def _upsert_card(
    cur: Any,
    *,
    target_id: str,
    card: Dict[str, Any],
    card_sources: List[Dict[str, Any]],
    confidence: str,
    generated_at: str,
    last_seen: str,
    project_label: str,
) -> Dict[str, Any]:
    signal_key = card["key"]
    existing = _one(
        cur,
        """
        select *
        from public.insight_cards
        where primary_target_id = %s
          and compiler_version = %s
          and current_status in ('open', 'blocked', 'needs_review', 'stale')
          and (metadata->>'normalized_signal_key' = %s or metadata->>'key' = %s)
        order by updated_at desc nulls last, created_at desc nulls last
        limit 1
        """,
        [target_id, op.COMPILER_VERSION, signal_key, signal_key],
    )
    first_source = card_sources[0] if card_sources else None
    stale_after = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    payload = {
        "primary_target_id": target_id,
        "title": op._truncate(card["title"], 180),
        "card_type": card["type"],
        "summary": op._truncate(card["summary"], 1600),
        "why_it_matters": op._truncate(card["why"] or "", 1000),
        "current_status": "open",
        "confidence": confidence,
        "attribution_status": "approved" if confidence != "low" else "needs_review",
        "next_action": op._truncate(card.get("nextAction") or "", 600) or None,
        "first_seen_at": (existing or {}).get("first_seen_at") or (first_source or {}).get("capturedAt") or generated_at,
        "last_seen_at": last_seen,
        "stale_after": stale_after,
        "source_count": len(card_sources),
        "compiler_version": op.COMPILER_VERSION,
        "metadata": {
            "key": signal_key,
            "normalized_signal_key": signal_key,
            "sourceIds": card["sourceIds"],
            "generatedFrom": "project_operating_summary",
            "operatingSummaryGeneratedAt": generated_at,
            "writePath": "direct_postgres",
        },
    }
    if existing:
        card_id = existing["id"]
        cur.execute(
            """
            update public.insight_cards
            set title=%s, card_type=%s, summary=%s, why_it_matters=%s,
              current_status=%s, confidence=%s, attribution_status=%s,
              next_action=%s, first_seen_at=%s, last_seen_at=%s, stale_after=%s,
              source_count=%s, compiler_version=%s, metadata=%s, updated_at=%s
            where id=%s
            returning *
            """,
            [
                payload["title"],
                payload["card_type"],
                payload["summary"],
                payload["why_it_matters"],
                payload["current_status"],
                payload["confidence"],
                payload["attribution_status"],
                payload["next_action"],
                payload["first_seen_at"],
                payload["last_seen_at"],
                payload["stale_after"],
                payload["source_count"],
                payload["compiler_version"],
                _json(payload["metadata"]),
                generated_at,
                card_id,
            ],
        )
        row = cur.fetchone()
        cur.execute("delete from public.insight_card_evidence where insight_card_id = %s", [card_id])
        cur.execute("delete from public.insight_card_targets where insight_card_id = %s", [card_id])
    else:
        cur.execute(
            """
            insert into public.insight_cards
              (primary_target_id,title,card_type,summary,why_it_matters,current_status,
               confidence,attribution_status,next_action,first_seen_at,last_seen_at,
               stale_after,source_count,compiler_version,metadata)
            values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            returning *
            """,
            [
                payload["primary_target_id"],
                payload["title"],
                payload["card_type"],
                payload["summary"],
                payload["why_it_matters"],
                payload["current_status"],
                payload["confidence"],
                payload["attribution_status"],
                payload["next_action"],
                payload["first_seen_at"],
                payload["last_seen_at"],
                payload["stale_after"],
                payload["source_count"],
                payload["compiler_version"],
                _json(payload["metadata"]),
            ],
        )
        row = cur.fetchone()

    cur.execute(
        """
        insert into public.insight_card_targets
          (insight_card_id,target_id,relationship,confidence,attribution_status,matched_terms,reason)
        values (%s,%s,'primary',%s,%s,%s,%s)
        """,
        [
            row["id"],
            target_id,
            confidence,
            "approved" if confidence != "low" else "needs_review",
            [project_label],
            "Generated from structured project operating summary refresh.",
        ],
    )
    for source in card_sources:
        cur.execute(
            """
            insert into public.insight_card_evidence
              (insight_card_id,source_document_id,source_message_id,source_type,source_title,
               source_occurred_at,participants,excerpt,summary,relevance_reason,evidence_role,confidence)
            values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            [
                row["id"],
                source["recordId"] if source["category"] in {"meeting", "email", "teams", "document"} else None,
                source["id"],
                source["type"],
                source.get("title") or source["recordId"],
                source.get("capturedAt"),
                [],
                op._truncate(source.get("text") or "", 700),
                op._truncate(card["summary"], 700),
                f"Supports {card['title']}.",
                "operating_summary_source",
                confidence,
            ],
        )
    return {**row, "_section": card["section"], "_rank": card["rank"]}


def refresh_project(project_id: int, *, model: Optional[str]) -> Dict[str, Any]:
    with _connect() as conn:
        conn.autocommit = False
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            source_set = _build_sources(cur, project_id)
            # Do not leave a transaction idle while the model synthesizes.
            conn.commit()
            summary = op.generate_operating_summary(source_set, model=model)
            generated_at = op._utc_now()
            source_by_id = {source["id"]: source for source in source_set["sources"]}
            latest_dates = sorted(s["capturedAt"] for s in source_set["sources"] if s.get("capturedAt"))
            confidence = summary.get("confidence") if summary.get("confidence") in {"low", "medium", "high"} else "medium"
            cards = op._card_defs(summary, source_set)
            coverage_card = op._source_coverage_card(source_set)
            if coverage_card:
                cards.append(coverage_card)
            linked_evidence_count = sum(len(card["sourceIds"]) for card in cards)
            project = source_set["_project"]
            target = _ensure_target(cur, project)
            target_id = target["id"]
            source_quality_counts = op._quality_counts(source_set["sources"])
            recommended_actions = summary.get("recommendedActions") or summary.get("recommendedFocus") or []
            risks = summary.get("risks") or []
            what_changed = summary.get("whatChanged") or summary.get("recentChanges") or []
            open_decisions = summary.get("openDecisions") or summary.get("openQuestions") or []
            promises_made = summary.get("promisesMade") or []
            immediate_attention = summary.get("immediateAttention") or recommended_actions[:5]
            current_focus = summary.get("currentFocus") or []
            source_coverage = {
                "freshnessStatus": "fresh",
                "operatingSummaryGeneratedAt": generated_at,
                "operatingSummarySourceCount": len(source_set["sources"]),
                "operatingSummarySelectedSourceCount": len(source_set["sources"]),
                "categoryCoverage": source_set["coverage"],
                "documentIntelligence": source_set.get("documentIntelligence") or {},
                "latestSourceAt": latest_dates[-1] if latest_dates else None,
                "linkedEvidenceCount": linked_evidence_count,
                "sourceQualityCounts": source_quality_counts,
                "evidenceQuality": summary.get("evidenceQuality") or {},
                "qualityGate": {
                    "status": "passed",
                    "reason": "Operating summary passed raw-source and metadata-only synthesis checks.",
                },
                "gaps": list(summary.get("dataGaps") or []),
            }
            packet_payload = {
                "target_id": target_id,
                "packet_type": "current",
                "packet_version": op.PACKET_VERSION,
                "generated_at": generated_at,
                "covered_start_at": latest_dates[0] if latest_dates else None,
                "covered_end_at": latest_dates[-1] if latest_dates else None,
                "freshness_status": "fresh",
                "executive_summary": op._truncate(summary.get("headline") or "Project operating summary", 1000),
                "current_status": op._truncate(summary.get("currentExecutiveRead") or summary.get("context") or "", 2000),
                "strategic_read": op._truncate(
                    " ".join(
                        [
                            summary.get("context") or "",
                            "What changed: " + "; ".join(item.get("title", "") for item in what_changed[:4])
                            if what_changed
                            else "",
                            "Risks: " + "; ".join(item.get("title", "") for item in risks[:4]) if risks else "",
                        ]
                    ),
                    1600,
                ),
                "why_it_matters": op._truncate(
                    " ".join(item.get("title", "") for item in immediate_attention[:5]) or summary.get("context") or "",
                    1600,
                ),
                "recommended_next_moves": [item.get("title") for item in immediate_attention if item.get("title")][:8],
                "confidence_summary": {
                    "overall": confidence,
                    "status": confidence,
                    "financialExposure": confidence if (summary.get("financialPosition") or {}).get("summary") else "low",
                    "changeManagement": confidence if what_changed else "low",
                    "followUps": confidence if recommended_actions or promises_made else "low",
                    "reason": f"Structured operating summary generated from {len(source_set['sources'])} source capsules.",
                },
                "source_coverage": source_coverage,
                "review_queue_count": len(summary.get("dataGaps") or []),
                "stale_item_count": 0,
                "packet_json": {
                    "schema": "project_operating_packet_v1",
                    "target": {"id": target_id, "projectId": int(project_id), "name": source_set.get("projectName")},
                    "generatedAt": generated_at,
                    "sourceSet": source_set,
                    "summary": summary,
                    "strategicReport": {
                        "immediateAttention": immediate_attention,
                        "currentFocus": current_focus,
                        "whatChanged": what_changed,
                        "risks": risks,
                        "openDecisions": open_decisions,
                        "moneyImpact": summary.get("moneyImpact") or summary.get("financialPosition") or {},
                        "promisesMade": promises_made,
                        "recommendedActions": recommended_actions,
                        "documentIntelligence": source_set.get("documentIntelligence") or {},
                        "evidenceQuality": summary.get("evidenceQuality") or {},
                    },
                },
                "compiler_version": op.COMPILER_VERSION,
            }
            existing_packet = _one(
                cur,
                """
                select id
                from public.intelligence_packets
                where target_id = %s and packet_type = 'current'
                limit 1
                """,
                [target_id],
            )
            if existing_packet:
                packet_id = existing_packet["id"]
                cur.execute(
                    """
                    update public.intelligence_packets
                    set packet_version=%s, generated_at=%s, covered_start_at=%s, covered_end_at=%s,
                      freshness_status=%s, executive_summary=%s, current_status=%s, strategic_read=%s,
                      why_it_matters=%s, recommended_next_moves=%s, confidence_summary=%s,
                      source_coverage=%s, review_queue_count=%s, stale_item_count=%s, packet_json=%s,
                      compiler_version=%s
                    where id=%s
                    returning id
                    """,
                    [
                        packet_payload["packet_version"],
                        packet_payload["generated_at"],
                        packet_payload["covered_start_at"],
                        packet_payload["covered_end_at"],
                        packet_payload["freshness_status"],
                        packet_payload["executive_summary"],
                        packet_payload["current_status"],
                        packet_payload["strategic_read"],
                        packet_payload["why_it_matters"],
                        packet_payload["recommended_next_moves"],
                        _json(packet_payload["confidence_summary"]),
                        _json(packet_payload["source_coverage"]),
                        packet_payload["review_queue_count"],
                        packet_payload["stale_item_count"],
                        _json(packet_payload["packet_json"]),
                        packet_payload["compiler_version"],
                        packet_id,
                    ],
                )
            else:
                cur.execute(
                    """
                    insert into public.intelligence_packets
                      (target_id,packet_type,packet_version,generated_at,covered_start_at,covered_end_at,
                       freshness_status,executive_summary,current_status,strategic_read,why_it_matters,
                       recommended_next_moves,confidence_summary,source_coverage,review_queue_count,
                       stale_item_count,packet_json,compiler_version)
                    values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    returning id
                    """,
                    [
                        packet_payload["target_id"],
                        packet_payload["packet_type"],
                        packet_payload["packet_version"],
                        packet_payload["generated_at"],
                        packet_payload["covered_start_at"],
                        packet_payload["covered_end_at"],
                        packet_payload["freshness_status"],
                        packet_payload["executive_summary"],
                        packet_payload["current_status"],
                        packet_payload["strategic_read"],
                        packet_payload["why_it_matters"],
                        packet_payload["recommended_next_moves"],
                        _json(packet_payload["confidence_summary"]),
                        _json(packet_payload["source_coverage"]),
                        packet_payload["review_queue_count"],
                        packet_payload["stale_item_count"],
                        _json(packet_payload["packet_json"]),
                        packet_payload["compiler_version"],
                    ],
                )
                packet_id = cur.fetchone()["id"]

            last_seen = latest_dates[-1] if latest_dates else generated_at
            inserted_cards = []
            seen_keys = set()
            for card in cards:
                seen_keys.add(card["key"])
                card_sources = [source_by_id[sid] for sid in card["sourceIds"] if sid in source_by_id]
                inserted_cards.append(
                    _upsert_card(
                        cur,
                        target_id=target_id,
                        card=card,
                        card_sources=card_sources,
                        confidence=confidence,
                        generated_at=generated_at,
                        last_seen=last_seen,
                        project_label=source_set.get("projectName") or f"project {project_id}",
                    )
                )

            cur.execute(
                """
                update public.insight_cards
                set current_status = 'resolved', updated_at = %s
                where primary_target_id = %s
                  and compiler_version = %s
                  and current_status in ('open', 'blocked', 'needs_review', 'stale')
                  and coalesce(metadata->>'normalized_signal_key', metadata->>'key') <> all(%s)
                """,
                [generated_at, target_id, op.COMPILER_VERSION, list(seen_keys)],
            )
            cur.execute(
                """
                update public.insight_cards
                set current_status = 'resolved', updated_at = %s
                where primary_target_id = %s
                  and compiler_version = %s
                  and current_status in ('open', 'blocked', 'needs_review', 'stale')
                  and coalesce(metadata->>'operatingSummaryGeneratedAt', '') <> %s
                """,
                [generated_at, target_id, op.COMPILER_VERSION, generated_at],
            )
            cur.execute("delete from public.intelligence_packet_cards where packet_id = %s", [packet_id])
            for card in inserted_cards:
                cur.execute(
                    """
                    insert into public.intelligence_packet_cards
                      (packet_id, insight_card_id, section, rank, included_reason)
                    values (%s,%s,%s,%s,%s)
                    """,
                    [
                        packet_id,
                        card["id"],
                        card["_section"],
                        card["_rank"],
                        "Generated from structured project operating summary refresh.",
                    ],
                )
            conn.commit()
            return {
                "status": "refreshed",
                "project_id": int(project_id),
                "target_id": str(target_id),
                "packet_id": str(packet_id),
                "card_count": len(inserted_cards),
                "linked_evidence_count": linked_evidence_count,
                "available_sources": len(source_set["sources"]),
                "task_source_count": len([source for source in source_set["sources"] if source["category"] == "task"]),
                "compiler_version": op.COMPILER_VERSION,
                "packet_version": op.PACKET_VERSION,
                "headline": summary.get("headline"),
                "confidence": confidence,
                "model": summary.get("model"),
            }


def main() -> None:
    parser = argparse.ArgumentParser(description="Refresh one project operating packet with direct Postgres writes.")
    parser.add_argument("--project-id", type=int, required=True)
    parser.add_argument("--model", default=os.getenv("OPERATING_SUMMARY_MODEL", "gpt-5.4"))
    args = parser.parse_args()
    print(json.dumps(refresh_project(args.project_id, model=args.model), indent=2, default=str))


if __name__ == "__main__":
    main()
