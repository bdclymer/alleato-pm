#!/usr/bin/env python3
"""
RAG End-to-End Evaluation (Level 3)

Tests the full AI system including SQL data retrieval, closing the L2 eval gap
for financial questions. The L2 eval (rag_answer_eval.py) only uses vector
search and scores financial questions at 2.33/5 because it bypasses SQL tools.

This script fixes that by:
  - Financial questions → fetch real data from budget_lines, commitments_unified,
    change_events_summary, and prime_contract_financial_summary (mirrors consultCFO)
  - Non-financial questions → vector search (same as L2)
  - LLM judge scores answers on the same 5 dimensions as L2
  - Reports per-category scores and compares financial delta vs L2 baseline

Requires:
  - Backend running OR just Supabase access (uses direct Supabase queries)
  - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY in .env

Usage:
  cd backend && .venv/bin/python src/scripts/rag_e2e_eval.py
  cd backend && .venv/bin/python src/scripts/rag_e2e_eval.py --project-id 67
  cd backend && .venv/bin/python src/scripts/rag_e2e_eval.py --verbose
  cd backend && .venv/bin/python src/scripts/rag_e2e_eval.py --question 13
  cd backend && .venv/bin/python src/scripts/rag_e2e_eval.py --output /tmp/rag-e2e.json
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "../../../.env"))

from openai import OpenAI
from supabase import create_client, ClientOptions

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# Default project for financial questions — Vermillion Rise Warehouse
DEFAULT_PROJECT_ID = 67
DEFAULT_PROJECT_NAME = "Vermillion Rise Warehouse"

# ---------------------------------------------------------------------------
# Eval questions — same 20 from rag_answer_eval.py, with retrieval_mode added
# ---------------------------------------------------------------------------

EVAL_QUESTIONS: List[Dict[str, Any]] = [
    # Meeting-based (vector search)
    {"id": 1,  "question": "What was discussed about drywall procurement timelines?",          "category": "meeting_detail", "retrieval_mode": "vector",    "good_answer_criteria": "Should reference specific meetings, mention dates or timelines"},
    {"id": 2,  "question": "What did the team decide about subcontractor pricing?",            "category": "meeting_detail", "retrieval_mode": "vector",    "good_answer_criteria": "Should mention specific pricing decisions, vendor names, dollar amounts if available"},
    {"id": 3,  "question": "What action items came out of the last OAC meeting?",              "category": "meeting_detail", "retrieval_mode": "vector",    "good_answer_criteria": "Should list specific action items with assignees and due dates where available"},
    {"id": 4,  "question": "What safety concerns were raised in recent meetings?",             "category": "meeting_detail", "retrieval_mode": "vector",    "good_answer_criteria": "Should identify specific safety issues, not generic safety advice"},
    {"id": 5,  "question": "What was discussed about the foundation pour schedule?",           "category": "meeting_detail", "retrieval_mode": "vector",    "good_answer_criteria": "Should reference specific dates, concrete work details, project context"},
    # Cross-source (vector)
    {"id": 6,  "question": "What decisions have been made about vendor selection?",            "category": "insight",        "retrieval_mode": "vector",    "good_answer_criteria": "Should list specific decisions with owners and rationale"},
    {"id": 7,  "question": "What are the biggest risks across our projects?",                  "category": "insight",        "retrieval_mode": "vector",    "good_answer_criteria": "Should identify specific risks by project with severity assessment"},
    {"id": 8,  "question": "What opportunities have we identified for cost savings?",          "category": "insight",        "retrieval_mode": "vector",    "good_answer_criteria": "Should mention specific opportunities from actual meetings/data"},
    {"id": 9,  "question": "What's the latest on the Vermillion Rise project?",               "category": "cross_source",   "retrieval_mode": "vector",    "good_answer_criteria": "Should synthesize recent activity from meetings, emails, tasks"},
    {"id": 10, "question": "What should I focus on this week as the owner?",                   "category": "cross_source",   "retrieval_mode": "vector",    "good_answer_criteria": "Should give specific, actionable priorities based on actual project data"},
    {"id": 11, "question": "What stresses Brandon out the most based on meeting discussions?", "category": "cross_source",   "retrieval_mode": "vector",    "good_answer_criteria": "Should reference specific issues Brandon has raised in meetings"},
    {"id": 12, "question": "How are our client relationships across projects?",                "category": "cross_source",   "retrieval_mode": "vector",    "good_answer_criteria": "Should reference specific client interactions from meetings"},
    # Financial (SQL tools) — these are the ones that score 2.33 in L2
    {"id": 13, "question": "What is the total budget for Vermillion Rise Warehouse?",          "category": "financial",      "retrieval_mode": "sql_budget",      "good_answer_criteria": "Should return a specific dollar amount from the budget table, not a vague estimate"},
    {"id": 14, "question": "Show me the change orders for Vermillion Rise",                    "category": "financial",      "retrieval_mode": "sql_change_events","good_answer_criteria": "Should list specific change orders with numbers, amounts, and statuses"},
    {"id": 15, "question": "What commitments do we have on the Vermillion Rise project?",      "category": "financial",      "retrieval_mode": "sql_commitments",  "good_answer_criteria": "Should list specific subcontracts/POs with vendor names and amounts"},
    # Strategic (vector)
    {"id": 16, "question": "Give me the state of the business right now",                      "category": "strategic",      "retrieval_mode": "vector",    "good_answer_criteria": "Should cover multiple dimensions: financial health, project status, risks, opportunities"},
    {"id": 17, "question": "What HR problems might I not be aware of?",                        "category": "strategic",      "retrieval_mode": "vector",    "good_answer_criteria": "Should surface HR-related discussions from meetings if any exist, or honestly say no data"},
    {"id": 18, "question": "How can we improve our scheduling process?",                       "category": "strategic",      "retrieval_mode": "vector",    "good_answer_criteria": "Should reference actual scheduling issues from meetings"},
    # Simple (vector)
    {"id": 19, "question": "What projects do we have?",                                        "category": "simple",         "retrieval_mode": "sql_projects",     "good_answer_criteria": "Should list actual project names from the database"},
    {"id": 20, "question": "Tell me about the last 3 meetings",                                "category": "simple",         "retrieval_mode": "vector",    "good_answer_criteria": "Should list actual meeting titles, dates, and brief summaries"},
]

# L2 baseline financial scores — used for comparison
L2_FINANCIAL_BASELINE = {
    "specificity": 1.67,
    "accuracy": 4.67,
    "completeness": 2.33,
    "actionability": 2.0,
    "overall": 2.33,
}


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

@dataclass
class JudgeScores:
    specificity: int = 0
    accuracy: int = 0
    completeness: int = 0
    actionability: int = 0
    overall: int = 0
    explanation: str = ""


@dataclass
class QuestionResult:
    question_id: int
    question: str
    category: str
    retrieval_mode: str
    good_answer_criteria: str
    context_summary: str
    generated_answer: str
    scores: JudgeScores
    latency_retrieval_ms: float = 0.0
    latency_generation_ms: float = 0.0
    latency_judging_ms: float = 0.0
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Client initialization
# ---------------------------------------------------------------------------

def get_clients():
    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY")
    openai_key = os.environ["OPENAI_API_KEY"]
    if not url or not key:
        logger.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)
    options = ClientOptions(postgrest_client_timeout=300)
    return create_client(url, key, options), OpenAI(api_key=openai_key)


# ---------------------------------------------------------------------------
# Retrieval: SQL-based financial data (mirrors consultCFO tools)
# ---------------------------------------------------------------------------

def _fmt_currency(val) -> str:
    try:
        n = float(val or 0)
        return f"${n:,.2f}"
    except (ValueError, TypeError):
        return str(val or "N/A")


def retrieve_budget_data(supabase, project_id: int) -> Tuple[str, str]:
    """Fetch budget_lines for a project. Returns (context_text, summary)."""
    result = (
        supabase.table("budget_lines")
        .select("description, original_amount, quantity, unit_cost, unit_of_measure")
        .eq("project_id", project_id)
        .order("original_amount", desc=True)
        .limit(100)
        .execute()
    )
    rows = result.data or []
    if not rows:
        return "(No budget data found for this project.)", "no data"

    total = sum(float(r.get("original_amount") or 0) for r in rows)
    lines = []
    for r in rows[:20]:  # Top 20 line items by amount
        desc = r.get("description") or "Untitled"
        amt = _fmt_currency(r.get("original_amount"))
        qty = r.get("quantity")
        uom = r.get("unit_of_measure") or ""
        qty_str = f" ({qty} {uom})".strip() if qty else ""
        lines.append(f"  • {desc}: {amt}{qty_str}")

    context = (
        f"Budget Summary for {DEFAULT_PROJECT_NAME} (project_id={project_id}):\n"
        f"  Total original budget: {_fmt_currency(total)}\n"
        f"  Line items ({len(rows)} total, showing top 20 by amount):\n"
        + "\n".join(lines)
    )
    return context, f"total={_fmt_currency(total)}, {len(rows)} line items"


def retrieve_change_events(supabase, project_id: int) -> Tuple[str, str]:
    """Fetch change_events_summary for a project."""
    result = (
        supabase.table("change_events_summary")
        .select("*")
        .eq("project_id", project_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    rows = result.data or []
    if not rows:
        return "(No change events found for this project.)", "no data"

    lines = []
    for r in rows:
        title = r.get("title") or r.get("name") or "Untitled"
        status = r.get("status") or "unknown"
        number = r.get("number") or r.get("change_event_number") or ""
        num_str = f" #{number}" if number else ""
        lines.append(f"  • CE{num_str}: {title} [{status}]")

    context = (
        f"Change Events for {DEFAULT_PROJECT_NAME} (project_id={project_id}):\n"
        f"  Total: {len(rows)} change events\n"
        + "\n".join(lines[:20])
    )
    return context, f"{len(rows)} change events"


def retrieve_commitments(supabase, project_id: int) -> Tuple[str, str]:
    """Fetch commitments_unified for a project."""
    result = (
        supabase.table("commitments_unified")
        .select("title, commitment_type, contract_number, status, executed, contract_date")
        .eq("project_id", project_id)
        .is_("deleted_at", "null")
        .order("created_at", desc=False)
        .limit(100)
        .execute()
    )
    rows = result.data or []
    if not rows:
        return "(No commitments found for this project.)", "no data"

    lines = []
    for r in rows[:30]:
        title = r.get("title") or "Untitled"
        ctype = r.get("commitment_type") or "unknown"
        status = r.get("status") or "unknown"
        contract_no = r.get("contract_number") or ""
        cn_str = f" [{contract_no}]" if contract_no else ""
        lines.append(f"  • {title}{cn_str} — {ctype}, {status}")

    context = (
        f"Commitments for {DEFAULT_PROJECT_NAME} (project_id={project_id}):\n"
        f"  Total: {len(rows)} commitments\n"
        + "\n".join(lines)
    )
    return context, f"{len(rows)} commitments"


def retrieve_projects(supabase) -> Tuple[str, str]:
    """Fetch list of active projects."""
    result = (
        supabase.table("projects")
        .select("id, name, phase, client, health_status, project_number")
        .order("name", desc=False)
        .limit(50)
        .execute()
    )
    rows = result.data or []
    if not rows:
        return "(No projects found.)", "no data"

    lines = []
    for r in rows:
        name = r.get("name") or "Untitled"
        phase = r.get("phase") or ""
        client = r.get("client") or ""
        health = r.get("health_status") or ""
        parts = [p for p in [phase, client, health] if p]
        meta = f" ({', '.join(parts)})" if parts else ""
        lines.append(f"  • {name}{meta}")

    context = f"Projects ({len(rows)} total):\n" + "\n".join(lines)
    return context, f"{len(rows)} projects"


# ---------------------------------------------------------------------------
# Retrieval: vector search (same as L2)
# ---------------------------------------------------------------------------

def embed_query(openai_client: OpenAI, query: str) -> List[float]:
    resp = openai_client.embeddings.create(
        model="text-embedding-3-large",
        dimensions=3072,
        input=query[:8000],
    )
    return resp.data[0].embedding


def vector_search(supabase, embedding: List[float], match_count: int = 10, threshold: float = 0.25) -> List[Dict]:
    try:
        result = supabase.rpc("search_document_chunks", {
            "query_embedding": json.dumps(embedding),
            "filter_source_types": None,
            "filter_project_id": None,
            "match_count": match_count,
            "match_threshold": threshold,
        }).execute()
        return result.data or []
    except Exception as e:
        logger.warning(f"Vector search failed: {e}")
        return []


def format_vector_context(chunks: List[Dict]) -> str:
    if not chunks:
        return "(No relevant documents found in the knowledge base.)"
    parts = []
    for i, chunk in enumerate(chunks, 1):
        source_type = chunk.get("source_type", "unknown")
        doc_title = chunk.get("doc_title", "Untitled")
        similarity = chunk.get("similarity", 0)
        text = chunk.get("chunk_text", "")
        parts.append(
            f"--- Source {i} [{source_type}] (relevance: {similarity:.2f}) ---\n"
            f"Title: {doc_title}\n{text}\n"
        )
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Context assembly
# ---------------------------------------------------------------------------

def retrieve_context(
    supabase, openai_client: OpenAI,
    q: Dict[str, Any], project_id: int
) -> Tuple[str, str]:
    """Retrieve context appropriate for the question's retrieval_mode."""
    mode = q.get("retrieval_mode", "vector")

    if mode == "sql_budget":
        return retrieve_budget_data(supabase, project_id)

    elif mode == "sql_change_events":
        return retrieve_change_events(supabase, project_id)

    elif mode == "sql_commitments":
        return retrieve_commitments(supabase, project_id)

    elif mode == "sql_projects":
        return retrieve_projects(supabase)

    else:  # vector
        embedding = embed_query(openai_client, q["question"])
        chunks = vector_search(supabase, embedding)
        context = format_vector_context(chunks)
        sources = [c.get("source_type", "?") for c in chunks[:5]]
        return context, f"{len(chunks)} chunks from {set(sources)}"


# ---------------------------------------------------------------------------
# Answer generation
# ---------------------------------------------------------------------------

ANSWER_SYSTEM_PROMPT = """You are Alleato AI — a senior construction project strategist and chief advisor
for Alleato Group, a commercial construction company.

You have been given relevant context from the company's database and knowledge base.
Use ONLY this context to answer the question. If the context contains specific financial data,
use those exact numbers — do not estimate or approximate.

Be specific: reference names, dates, dollar amounts, project names, and other concrete details.
Lead with the most important insight. Avoid generic advice — the user wants insights from THEIR data."""


def generate_answer(openai_client: OpenAI, question: str, context: str) -> str:
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        temperature=0.3,
        max_tokens=1500,
        messages=[
            {"role": "system", "content": ANSWER_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Context from company database:\n\n{context}\n\n"
                    f"---\n\n"
                    f"Question: {question}\n\n"
                    f"Answer based on the context above."
                ),
            },
        ],
    )
    return response.choices[0].message.content or "(empty response)"


# ---------------------------------------------------------------------------
# LLM Judge (same as rag_answer_eval.py)
# ---------------------------------------------------------------------------

JUDGE_SYSTEM_PROMPT = """You are an expert evaluator for a RAG system used by a construction project management company.
Score the AI-generated answer on 5 dimensions from 1 (worst) to 5 (best):

1. **Specificity**: Does it reference specific data (names, dates, numbers)?
   1=entirely generic, 5=rich with specific details
2. **Accuracy**: Is it grounded in the provided context, not hallucinated?
   1=mostly hallucinated, 5=fully grounded
3. **Completeness**: Does it address all aspects of the question?
   1=misses the question, 5=thoroughly addresses all aspects
4. **Actionability**: Does it give the user something they can act on?
   1=no actionable info, 5=clear actionable information
5. **Overall**: Overall quality as a strategic business advisor response
   1=damages trust, 5=excellent — feels like a knowledgeable assistant

Return ONLY valid JSON, no markdown:
{"specificity":<1-5>,"accuracy":<1-5>,"completeness":<1-5>,"actionability":<1-5>,"overall":<1-5>,"explanation":"<2-3 sentences>"}"""


def judge_answer(openai_client: OpenAI, question: str, answer: str, criteria: str) -> JudgeScores:
    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.0,
        max_tokens=500,
        messages=[
            {"role": "system", "content": JUDGE_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Question: {question}\n\n"
                    f"Good answer criteria: {criteria}\n\n"
                    f"AI answer:\n{answer}\n\n"
                    f"Score this on all 5 dimensions. Return JSON only."
                ),
            },
        ],
    )
    raw = (response.choices[0].message.content or "{}").strip()
    if raw.startswith("```"):
        raw = "\n".join(l for l in raw.split("\n") if not l.strip().startswith("```"))
    try:
        data = json.loads(raw)
        return JudgeScores(
            specificity=int(data.get("specificity", 0)),
            accuracy=int(data.get("accuracy", 0)),
            completeness=int(data.get("completeness", 0)),
            actionability=int(data.get("actionability", 0)),
            overall=int(data.get("overall", 0)),
            explanation=data.get("explanation", ""),
        )
    except Exception:
        return JudgeScores(explanation=f"parse error: {raw[:100]}")


# ---------------------------------------------------------------------------
# Per-question evaluation
# ---------------------------------------------------------------------------

def evaluate_question(
    supabase, openai_client: OpenAI, q: Dict[str, Any],
    project_id: int, verbose: bool
) -> QuestionResult:
    result = QuestionResult(
        question_id=q["id"],
        question=q["question"],
        category=q["category"],
        retrieval_mode=q.get("retrieval_mode", "vector"),
        good_answer_criteria=q.get("good_answer_criteria", ""),
        context_summary="",
        generated_answer="",
        scores=JudgeScores(),
    )

    try:
        # Step 1: Retrieval
        t0 = time.time()
        context, context_summary = retrieve_context(supabase, openai_client, q, project_id)
        result.latency_retrieval_ms = round((time.time() - t0) * 1000, 1)
        result.context_summary = context_summary

        # Step 2: Generation
        t1 = time.time()
        answer = generate_answer(openai_client, q["question"], context)
        result.latency_generation_ms = round((time.time() - t1) * 1000, 1)
        result.generated_answer = answer

        # Step 3: Judge
        t2 = time.time()
        scores = judge_answer(openai_client, q["question"], answer, q.get("good_answer_criteria", ""))
        result.latency_judging_ms = round((time.time() - t2) * 1000, 1)
        result.scores = scores

        if verbose:
            logger.info(
                f"  Q{q['id']:02d} [{q['category']:14s}] [{q.get('retrieval_mode','?'):18s}]  "
                f"overall={scores.overall}/5  spec={scores.specificity}  "
                f"acc={scores.accuracy}  complete={scores.completeness}  "
                f"act={scores.actionability}  | {q['question'][:50]}"
            )
        else:
            logger.info(
                f"  Q{q['id']:02d} [{q['category']:12s}] overall={scores.overall}/5  "
                f"({q.get('retrieval_mode','?')})  {q['question'][:55]}"
            )

    except Exception as exc:
        result.error = str(exc)
        logger.error(f"  Q{q['id']:02d} ERROR: {exc}")

    return result


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def compute_category_avg(results: List[QuestionResult], category: str) -> Dict[str, float]:
    cat_results = [r for r in results if r.category == category and not r.error]
    if not cat_results:
        return {}
    dims = ["specificity", "accuracy", "completeness", "actionability", "overall"]
    return {
        d: round(sum(getattr(r.scores, d) for r in cat_results) / len(cat_results), 2)
        for d in dims
    }


def print_report(results: List[QuestionResult]) -> None:
    ok = [r for r in results if not r.error]
    dims = ["specificity", "accuracy", "completeness", "actionability", "overall"]

    # Overall summary
    overall_avgs = {
        d: round(sum(getattr(r.scores, d) for r in ok) / len(ok), 2) if ok else 0
        for d in dims
    }

    logger.info("")
    logger.info("=" * 70)
    logger.info("RAG END-TO-END EVAL (L3) — RESULTS")
    logger.info("=" * 70)
    logger.info(f"  Questions: {len(results)} ({len(ok)} scored, {len(results)-len(ok)} errors)")
    logger.info("")
    logger.info(f"  {'Dimension':16s}  {'L3 Score':>9}  (L2 Baseline for reference)")

    # Get L2 overall baseline from the answer eval — approximate from category averages
    l2_approx = {"specificity": 3.7, "accuracy": 4.65, "completeness": 3.95, "actionability": 3.25, "overall": 4.0}
    for d in dims:
        l3 = overall_avgs[d]
        l2 = l2_approx.get(d, 0)
        delta = l3 - l2
        sign = "+" if delta >= 0 else ""
        logger.info(f"  {d:16s}  {l3:>9.2f}  (L2: {l2:.2f}, {sign}{delta:.2f})")

    # Per-category breakdown
    categories = sorted(set(r.category for r in ok))
    logger.info("")
    logger.info(f"  {'Category':16s}  {'Overall':>7}  {'Spec':>5}  {'Acc':>5}  {'Complete':>8}  {'Action':>6}  Mode")
    logger.info(f"  {'-'*16}  {'-'*7}  {'-'*5}  {'-'*5}  {'-'*8}  {'-'*6}  {'-'*16}")
    for cat in categories:
        avgs = compute_category_avg(results, cat)
        if not avgs:
            continue
        mode_sample = next((r.retrieval_mode for r in ok if r.category == cat), "?")
        logger.info(
            f"  {cat:16s}  {avgs['overall']:>7.2f}  {avgs['specificity']:>5.2f}  "
            f"{avgs['accuracy']:>5.2f}  {avgs['completeness']:>8.2f}  "
            f"{avgs['actionability']:>6.2f}  {mode_sample}"
        )

    # Financial improvement vs L2
    fin_avgs = compute_category_avg(results, "financial")
    if fin_avgs:
        logger.info("")
        logger.info("Financial questions (L3 SQL vs L2 vector-only):")
        for d in dims:
            l3_fin = fin_avgs.get(d, 0)
            l2_fin = L2_FINANCIAL_BASELINE.get(d, 0)
            delta = l3_fin - l2_fin
            sign = "+" if delta >= 0 else ""
            direction = "↑" if delta > 0.1 else ("↓" if delta < -0.1 else "→")
            logger.info(f"  {d:16s}  L3: {l3_fin:.2f}  L2: {l2_fin:.2f}  {sign}{delta:.2f} {direction}")

    logger.info("=" * 70)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="RAG End-to-End Evaluation (L3)")
    parser.add_argument("--project-id", type=int, default=DEFAULT_PROJECT_ID,
                        help=f"Project ID for financial questions (default: {DEFAULT_PROJECT_ID})")
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--question", type=int, default=None, help="Run only this question ID")
    parser.add_argument("--output", type=str, default=None)
    parser.add_argument("--dry-run", action="store_true",
                        help="Test retrieval only, skip generation and judging")
    args = parser.parse_args()

    supabase, openai_client = get_clients()

    questions = EVAL_QUESTIONS
    if args.question:
        questions = [q for q in questions if q["id"] == args.question]
        if not questions:
            logger.error(f"Question {args.question} not found")
            return 2

    logger.info("=" * 70)
    logger.info("RAG END-TO-END EVALUATION (L3)")
    logger.info(f"  Questions: {len(questions)}")
    logger.info(f"  Project for SQL questions: {args.project_id} ({DEFAULT_PROJECT_NAME})")
    logger.info(f"  SQL-mode questions: {sum(1 for q in questions if q.get('retrieval_mode','vector') != 'vector')}")
    logger.info(f"  Vector-mode questions: {sum(1 for q in questions if q.get('retrieval_mode','vector') == 'vector')}")
    logger.info("=" * 70)

    if args.dry_run:
        logger.info("[dry-run] Testing retrieval only...")
        for q in questions:
            t0 = time.time()
            try:
                ctx, summary = retrieve_context(supabase, openai_client, q, args.project_id)
                ms = (time.time() - t0) * 1000
                logger.info(f"  Q{q['id']:02d} [{q['category']:14s}] [{q.get('retrieval_mode'):18s}]  "
                             f"{ms:.0f}ms  {summary[:60]}")
            except Exception as e:
                logger.error(f"  Q{q['id']:02d} ERROR: {e}")
        return 0

    results: List[QuestionResult] = []
    for q in questions:
        r = evaluate_question(supabase, openai_client, q, args.project_id, args.verbose)
        results.append(r)

    print_report(results)

    if args.output:
        ok = [r for r in results if not r.error]
        dims = ["specificity", "accuracy", "completeness", "actionability", "overall"]
        categories = sorted(set(r.category for r in ok))
        output_data = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "eval_type": "level_3_e2e",
            "project_id": args.project_id,
            "num_questions": len(results),
            "summary": {
                d: round(sum(getattr(r.scores, d) for r in ok) / len(ok), 2) if ok else 0
                for d in dims
            },
            "category_averages": {
                cat: compute_category_avg(results, cat)
                for cat in categories
            },
            "l2_baseline_comparison": {
                "financial": {
                    d: {
                        "l3": compute_category_avg(results, "financial").get(d, 0),
                        "l2": L2_FINANCIAL_BASELINE.get(d, 0),
                    }
                    for d in dims
                }
            },
            "questions": [
                {
                    "id": r.question_id,
                    "question": r.question,
                    "category": r.category,
                    "retrieval_mode": r.retrieval_mode,
                    "context_summary": r.context_summary,
                    "generated_answer": r.generated_answer,
                    "scores": asdict(r.scores),
                    "latency_ms": {
                        "retrieval": r.latency_retrieval_ms,
                        "generation": r.latency_generation_ms,
                        "judging": r.latency_judging_ms,
                    },
                    "error": r.error,
                }
                for r in results
            ],
        }
        with open(args.output, "w") as f:
            json.dump(output_data, f, indent=2)
        logger.info(f"\nResults saved to {args.output}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
