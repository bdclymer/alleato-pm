"""
Seed Eval Test Cases

Inserts the 5 core seed scenarios into the eval_test_cases table so they can be
loaded via --from-db in the strategist eval runner.

Also converts curated entries from eval_scenarios_raw into eval_test_cases.

Usage:
  cd backend && .venv/bin/python src/scripts/eval_seed_test_cases.py
  cd backend && .venv/bin/python src/scripts/eval_seed_test_cases.py --convert-curated
  cd backend && .venv/bin/python src/scripts/eval_seed_test_cases.py --dry-run
"""

import argparse
import json
import logging
import os
import sys

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "../../../.env"))

from supabase import create_client, ClientOptions

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# The 5 seed test cases from the handoff document
SEED_TEST_CASES = [
    {
        "name": "Budget variance alert",
        "category": "proactive_alert",
        "query": "I haven't checked the numbers in a while. How are our projects doing financially? Anything I should be worried about?",
        "should_identify": [
            "projects with budget variance exceeding 10%",
            "cost-to-complete projections that exceed remaining budget",
            "specific cost codes driving overruns",
        ],
        "should_recommend": [
            "review specific line items with highest variance",
            "schedule meeting with project team on at-risk projects",
            "consider change order or scope adjustment",
        ],
        "should_not_miss": [
            "any project significantly over budget (>15%)",
            "trend direction — is it getting worse or stabilizing",
        ],
        "scoring_method": "llm_judge",
        "pass_threshold": 0.70,
    },
    {
        "name": "Margin compression detection",
        "category": "financial_analysis",
        "query": "Walk me through our project margins. Are we actually making money on these jobs or just staying busy?",
        "should_identify": [
            "projects where earned revenue is trending below cost",
            "margin erosion compared to original estimates",
            "root causes of margin compression",
        ],
        "should_recommend": [
            "which projects need immediate margin recovery action",
            "where to negotiate with subs or adjust scope",
            "process improvements to prevent future compression",
        ],
        "should_not_miss": [
            "any project with negative or near-zero margin",
            "comparison of actual vs estimated margins",
        ],
        "scoring_method": "llm_judge",
        "pass_threshold": 0.70,
    },
    {
        "name": "Timeline risk from transcripts",
        "category": "cross_source_synthesis",
        "query": "I keep hearing about delays on our projects in meetings. What's actually going on and should I be worried?",
        "should_identify": [
            "specific delay mentions from meeting transcripts",
            "subcontractor performance patterns",
            "cascading schedule impacts across trades",
        ],
        "should_recommend": [
            "prioritize which delays have the highest impact",
            "schedule coordination meetings with underperforming subs",
            "consider acceleration options for critical path items",
        ],
        "should_not_miss": [
            "repeated subcontractor delays mentioned across multiple meetings",
            "any delay affecting project delivery date or owner milestones",
        ],
        "scoring_method": "llm_judge",
        "pass_threshold": 0.70,
    },
    {
        "name": "Resource conflict detection",
        "category": "insight_quality",
        "query": "We've got a lot going on right now. Are there any resource conflicts I should know about — people spread too thin?",
        "should_identify": [
            "overlapping project timelines with shared key personnel",
            "peak staffing periods where multiple projects need the same people",
            "specific individuals or roles that are over-committed",
        ],
        "should_recommend": [
            "adjust project timelines to reduce overlap",
            "bring in additional resources for peak periods",
            "prioritize which project gets the shared resource",
        ],
        "should_not_miss": [
            "any person assigned to 3+ active projects simultaneously",
            "critical-path activities that depend on the same person",
        ],
        "scoring_method": "llm_judge",
        "pass_threshold": 0.70,
    },
    {
        "name": "Client escalation precursor",
        "category": "proactive_alert",
        "query": "How are things going with our clients? Any relationship issues I should get ahead of before they become problems?",
        "should_identify": [
            "signs of client frustration from emails and meeting tone",
            "unresolved RFIs or submittals causing client delays",
            "communication gaps or missed follow-ups",
        ],
        "should_recommend": [
            "schedule proactive check-in with at-risk client relationships",
            "resolve specific outstanding items before next client meeting",
            "assign dedicated point person for high-touch clients",
        ],
        "should_not_miss": [
            "any direct client complaint or frustration expressed in emails",
            "deteriorating communication patterns",
        ],
        "scoring_method": "llm_judge",
        "pass_threshold": 0.70,
    },
]


def get_supabase():
    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        logger.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)
    return create_client(url, key, ClientOptions(postgrest_client_timeout=60))


def seed_test_cases(supabase, dry_run: bool = False) -> int:
    """Insert seed test cases into eval_test_cases table."""
    inserted = 0
    for tc in SEED_TEST_CASES:
        row = {
            "name": tc["name"],
            "category": tc["category"],
            "query": tc["query"],
            "should_identify": json.dumps(tc["should_identify"]),
            "should_recommend": json.dumps(tc["should_recommend"]),
            "should_not_miss": json.dumps(tc["should_not_miss"]),
            "scoring_method": tc["scoring_method"],
            "pass_threshold": tc["pass_threshold"],
            "enabled": True,
        }
        if dry_run:
            logger.info(f"  [DRY RUN] Would insert: {tc['name']} ({tc['category']})")
        else:
            try:
                supabase.table("eval_test_cases").insert(row).execute()
                logger.info(f"  Inserted: {tc['name']}")
                inserted += 1
            except Exception as e:
                logger.warning(f"  Failed to insert {tc['name']}: {e}")
    return inserted


def convert_curated_scenarios(supabase, dry_run: bool = False) -> int:
    """Convert curated raw scenarios to structured test cases."""
    result = (
        supabase.table("eval_scenarios_raw")
        .select("*")
        .eq("curated", True)
        .execute()
    )

    scenarios = result.data or []
    if not scenarios:
        logger.info("No curated scenarios found in eval_scenarios_raw.")
        return 0

    # Map problem types to eval categories
    category_map = {
        "cost_overrun": "financial_analysis",
        "margin_compression": "financial_analysis",
        "timeline_delay": "cross_source_synthesis",
        "client_escalation": "proactive_alert",
        "scope_creep": "insight_quality",
        "resource_conflict": "insight_quality",
        "safety_issue": "proactive_alert",
        "quality_issue": "insight_quality",
        "other": "data_retrieval",
    }

    converted = 0
    for s in scenarios:
        category = category_map.get(s.get("problem_type", "other"), "data_retrieval")

        # Build a natural query from the scenario
        query = _build_query_from_scenario(s)

        row = {
            "name": f"{s.get('project', 'Unknown')} — {s.get('problem_type', 'issue')}",
            "category": category,
            "query": query,
            "should_identify": json.dumps(s.get("early_warning_signals", [])),
            "should_recommend": json.dumps([s.get("ideal_agent_action", "")]),
            "should_not_miss": json.dumps([s.get("description", "")]),
            "scoring_method": "llm_judge",
            "pass_threshold": 0.70,
            "source_scenario_id": s["id"],
            "enabled": True,
        }

        if dry_run:
            logger.info(f"  [DRY RUN] Would convert: {row['name']}")
        else:
            try:
                supabase.table("eval_test_cases").insert(row).execute()
                logger.info(f"  Converted: {row['name']}")
                converted += 1
            except Exception as e:
                logger.warning(f"  Failed to convert {row['name']}: {e}")

    return converted


def _build_query_from_scenario(scenario: Dict) -> str:
    """Build a natural-sounding query from a raw scenario."""
    problem_type = scenario.get("problem_type", "issue")
    project = scenario.get("project", "our projects")

    query_templates = {
        "cost_overrun": f"How are we doing on budget for {project}? I'm worried we might be overspending.",
        "timeline_delay": f"What's the schedule situation on {project}? Are we on track?",
        "client_escalation": f"How's our relationship with the client on {project}? Any concerns?",
        "scope_creep": f"Has the scope been changing on {project}? Are we getting paid for the extra work?",
        "margin_compression": f"What are our margins looking like on {project}? Are we making money?",
        "resource_conflict": f"Do we have any staffing conflicts right now? Anyone spread too thin?",
        "safety_issue": f"Any safety concerns I should know about on {project}?",
        "quality_issue": f"How's the quality on {project}? Any rework or punch list issues piling up?",
    }

    return query_templates.get(problem_type,
        f"Give me an update on {project}. Anything I should be worried about?")


# Need this import for type hint
from typing import Dict


def main():
    parser = argparse.ArgumentParser(description="Seed eval test cases")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be inserted")
    parser.add_argument("--convert-curated", action="store_true",
                        help="Also convert curated raw scenarios to test cases")
    args = parser.parse_args()

    supabase = get_supabase()

    logger.info("=" * 70)
    logger.info("EVAL TEST CASE SEEDING")
    logger.info("=" * 70)

    # Seed core test cases
    logger.info("\nSeeding 5 core test cases...")
    count = seed_test_cases(supabase, dry_run=args.dry_run)
    logger.info(f"Inserted {count} seed test cases")

    # Convert curated raw scenarios
    if args.convert_curated:
        logger.info("\nConverting curated raw scenarios...")
        count = convert_curated_scenarios(supabase, dry_run=args.dry_run)
        logger.info(f"Converted {count} scenarios")

    logger.info("\nDone.")


if __name__ == "__main__":
    main()
