"""
Business Strategist Agent Evaluation Pipeline

End-to-end evaluation of the Strategist Agent's ability to:
1. Retrieve relevant data across multiple sources
2. Identify problems, risks, and opportunities
3. Provide actionable strategic recommendations

Supports two modes:
- Hardcoded seed scenarios (default) — 5 core scenarios covering key capabilities
- Database scenarios — loads from eval_test_cases table (after Phase 1 mining)

Usage:
  cd backend && .venv/bin/python src/scripts/strategist_eval.py
  cd backend && .venv/bin/python src/scripts/strategist_eval.py --verbose
  cd backend && .venv/bin/python src/scripts/strategist_eval.py --dry-run
  cd backend && .venv/bin/python src/scripts/strategist_eval.py --from-db
  cd backend && .venv/bin/python src/scripts/strategist_eval.py --scenario 2
  cd backend && .venv/bin/python src/scripts/strategist_eval.py --output /tmp/strategist-eval.json
"""

import argparse
import asyncio
import json
import logging
import os
import sys
import time
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "../../../.env"))

from openai import OpenAI
from supabase import create_client, ClientOptions

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Seed eval scenarios — the 5 core test cases from the handoff doc
# ---------------------------------------------------------------------------

SEED_SCENARIOS: List[Dict[str, Any]] = [
    {
        "id": 1,
        "name": "Budget variance alert",
        "category": "proactive_alert",
        "query": (
            "I haven't checked the numbers in a while. How are our projects "
            "doing financially? Anything I should be worried about?"
        ),
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
        "good_answer_criteria": (
            "Must reference specific projects by name with actual dollar amounts from Acumatica. "
            "Should flag any project over 10% variance with specific cost codes. "
            "Must include trend analysis (improving/worsening). "
            "Recommendations should be specific and actionable, not generic."
        ),
    },
    {
        "id": 2,
        "name": "Margin compression detection",
        "category": "financial_analysis",
        "query": (
            "Walk me through our project margins. Are we actually making money "
            "on these jobs or just staying busy?"
        ),
        "should_identify": [
            "projects where earned revenue is trending below cost",
            "margin erosion compared to original estimates",
            "root causes of margin compression (labor, materials, change orders)",
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
        "good_answer_criteria": (
            "Must pull actual financial data from Acumatica (revenue, cost, margin %). "
            "Should compare original bid margin to current earned margin. "
            "Must identify specific root causes from project data, not generic advice. "
            "Recommendations should include concrete dollar-impact estimates where possible."
        ),
    },
    {
        "id": 3,
        "name": "Timeline risk from transcripts",
        "category": "cross_source_synthesis",
        "query": (
            "I keep hearing about delays on our projects in meetings. "
            "What's actually going on and should I be worried?"
        ),
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
        "good_answer_criteria": (
            "Must reference specific meetings where delays were discussed (dates, attendees). "
            "Should correlate transcript mentions with actual schedule data. "
            "Must identify patterns (same sub delayed on multiple projects, same trade always late). "
            "Should quantify impact in days/weeks, not just say 'there are delays'."
        ),
    },
    {
        "id": 4,
        "name": "Resource conflict detection",
        "category": "insight_quality",
        "query": (
            "We've got a lot going on right now. Are there any resource "
            "conflicts I should know about — people spread too thin?"
        ),
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
        "good_answer_criteria": (
            "Must reference actual project data and team assignments. "
            "Should cross-reference meeting transcripts for mentions of people being stretched. "
            "Should identify specific time windows of highest conflict risk. "
            "Recommendations should include specific trade-offs and priorities."
        ),
    },
    {
        "id": 5,
        "name": "Client escalation precursor",
        "category": "proactive_alert",
        "query": (
            "How are things going with our clients? Any relationship issues "
            "I should get ahead of before they become problems?"
        ),
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
            "deteriorating communication patterns (slower responses, escalation to senior leaders)",
        ],
        "good_answer_criteria": (
            "Must analyze email sentiment and meeting transcript tone for client interactions. "
            "Should reference specific emails/meetings where client concerns were raised. "
            "Must distinguish between routine project friction and escalation-risk situations. "
            "Recommendations should be relationship-focused, not just task-focused."
        ),
    },
]


# ---------------------------------------------------------------------------
# LLM-as-Judge scoring
# ---------------------------------------------------------------------------

JUDGE_SYSTEM_PROMPT = """You are evaluating an AI Business Strategist Agent's response for a commercial construction design-build firm called Alleato Group.

The agent should function as an AI Chief of Staff — synthesizing data from financial systems (Acumatica), meeting transcripts (Fireflies), emails, and project management tools to surface insights proactively.

Score the response on these dimensions (each 1-5):

1. **Data Grounding (1-5)**: Does the response reference actual data (project names, dollar amounts, dates, people) vs giving generic advice?
   - 1 = Entirely generic, no specific data
   - 3 = Some data references mixed with generic filler
   - 5 = Rich with specific data points from multiple sources

2. **Problem Identification (1-5)**: Does it correctly identify the issues it was expected to catch?
   - 1 = Misses all expected issues
   - 3 = Catches some issues, misses others
   - 5 = Catches all expected issues plus surfaces additional relevant ones

3. **Cross-Source Synthesis (1-5)**: Does it connect information across different data sources?
   - 1 = Only uses one source or no sources
   - 3 = References multiple sources but doesn't connect them
   - 5 = Actively synthesizes across sources to build a coherent picture

4. **Actionability (1-5)**: Are the recommendations specific and executable?
   - 1 = No recommendations or only "look into it"
   - 3 = Some actionable items but mostly vague
   - 5 = Clear, prioritized action items with specific next steps

5. **Proactiveness (1-5)**: Does it surface issues the user didn't specifically ask about?
   - 1 = Only answers exactly what was asked
   - 3 = Mentions related concerns briefly
   - 5 = Proactively surfaces important related issues with supporting data

6. **Overall (1-5)**: Overall quality as a strategic business advisor
   - 1 = Would damage trust in the AI system
   - 3 = Acceptable but not impressive
   - 5 = Excellent — like having a knowledgeable chief of staff

Additionally, evaluate against the specific expectations:
- Expected items to identify: {should_identify}
- Expected recommendations: {should_recommend}
- Critical items that must not be missed: {should_not_miss}

You MUST respond with valid JSON only, no markdown fences:
{{
  "data_grounding": <1-5>,
  "problem_identification": <1-5>,
  "cross_source_synthesis": <1-5>,
  "actionability": <1-5>,
  "proactiveness": <1-5>,
  "overall": <1-5>,
  "score": <0.0-1.0>,
  "passed": <boolean>,
  "missed_items": ["list of expected items the agent failed to identify"],
  "extra_insights": ["list of valuable insights the agent surfaced beyond expectations"],
  "reasoning": "<2-3 sentence explanation>"
}}

Set "passed" to true if overall >= 4 and no critical items were missed.
Set "score" to overall / 5.0."""


@dataclass
class JudgeScores:
    data_grounding: int = 0
    problem_identification: int = 0
    cross_source_synthesis: int = 0
    actionability: int = 0
    proactiveness: int = 0
    overall: int = 0
    score: float = 0.0
    passed: bool = False
    missed_items: List[str] = field(default_factory=list)
    extra_insights: List[str] = field(default_factory=list)
    reasoning: str = ""


@dataclass
class EvalResult:
    scenario_id: int
    scenario_name: str
    category: str
    query: str
    agent_response: str
    scores: JudgeScores
    latency_agent_ms: float = 0.0
    latency_judge_ms: float = 0.0
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Clients
# ---------------------------------------------------------------------------

def get_clients():
    """Initialize Supabase and OpenAI clients from environment."""
    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")

    if not url or not key:
        logger.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
        sys.exit(1)
    if not openai_key:
        logger.error("Missing OPENAI_API_KEY in .env")
        sys.exit(1)

    options = ClientOptions(postgrest_client_timeout=300)
    return create_client(url, key, options), OpenAI(api_key=openai_key)


# ---------------------------------------------------------------------------
# Agent invocation
# ---------------------------------------------------------------------------

async def run_strategist_agent(query: str) -> str:
    """Run the full agent workflow and capture the strategist's response."""
    # Import the workflow — this loads env and initializes agents
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

    try:
        from services.alleato_agent_workflow.alleato_agent_workflow import (
            run_workflow, WorkflowInput
        )
        result = await run_workflow(WorkflowInput(input_as_text=query))
        return result.get("output_text", str(result))
    except Exception as e:
        logger.error(f"Agent workflow failed: {e}")
        return f"[ERROR] Agent workflow failed: {e}"


# ---------------------------------------------------------------------------
# Judge
# ---------------------------------------------------------------------------

def judge_response(
    openai_client: OpenAI,
    scenario: Dict[str, Any],
    agent_response: str,
    pass_threshold: float = 0.70,
) -> JudgeScores:
    """Use GPT-4o to judge the strategist agent's response."""
    prompt = JUDGE_SYSTEM_PROMPT.format(
        should_identify=json.dumps(scenario.get("should_identify", []), indent=2),
        should_recommend=json.dumps(scenario.get("should_recommend", []), indent=2),
        should_not_miss=json.dumps(scenario.get("should_not_miss", []), indent=2),
    )

    response = openai_client.chat.completions.create(
        model="gpt-4o",
        temperature=0.0,
        max_tokens=1000,
        messages=[
            {"role": "system", "content": prompt},
            {
                "role": "user",
                "content": (
                    f"Test scenario: {scenario.get('name', 'Unknown')}\n\n"
                    f"Query sent to agent:\n{scenario['query']}\n\n"
                    f"Good answer criteria:\n{scenario.get('good_answer_criteria', 'N/A')}\n\n"
                    f"Agent's actual response:\n{agent_response}\n\n"
                    f"Score this response. Return JSON only."
                ),
            },
        ],
    )

    raw = response.choices[0].message.content or "{}"
    raw = raw.strip()
    if raw.startswith("```"):
        lines = raw.split("\n")
        lines = [line for line in lines if not line.strip().startswith("```")]
        raw = "\n".join(lines)

    try:
        data = json.loads(raw)
        return JudgeScores(
            data_grounding=int(data.get("data_grounding", 0)),
            problem_identification=int(data.get("problem_identification", 0)),
            cross_source_synthesis=int(data.get("cross_source_synthesis", 0)),
            actionability=int(data.get("actionability", 0)),
            proactiveness=int(data.get("proactiveness", 0)),
            overall=int(data.get("overall", 0)),
            score=float(data.get("score", 0.0)),
            passed=bool(data.get("passed", False)),
            missed_items=data.get("missed_items", []),
            extra_insights=data.get("extra_insights", []),
            reasoning=data.get("reasoning", ""),
        )
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning(f"Failed to parse judge response: {e}\nRaw: {raw[:300]}")
        return JudgeScores(reasoning=f"Parse error: {e}")


# ---------------------------------------------------------------------------
# Load scenarios from DB
# ---------------------------------------------------------------------------

def load_scenarios_from_db(supabase) -> List[Dict[str, Any]]:
    """Load enabled test cases from eval_test_cases table."""
    result = (
        supabase.table("eval_test_cases")
        .select("*")
        .eq("enabled", True)
        .order("created_at")
        .execute()
    )

    scenarios = []
    for i, row in enumerate(result.data or [], 1):
        scenarios.append({
            "id": i,
            "name": row["name"],
            "category": row["category"],
            "query": row["query"],
            "should_identify": row.get("should_identify", []),
            "should_recommend": row.get("should_recommend", []),
            "should_not_miss": row.get("should_not_miss", []),
            "good_answer_criteria": f"Should identify: {row.get('should_identify', [])}. "
                                    f"Should recommend: {row.get('should_recommend', [])}.",
            "pass_threshold": float(row.get("pass_threshold", 0.70)),
            "db_id": row["id"],
        })

    return scenarios


# ---------------------------------------------------------------------------
# Eval pipeline
# ---------------------------------------------------------------------------

async def evaluate_scenario(
    openai_client: OpenAI,
    scenario: Dict[str, Any],
    verbose: bool,
) -> EvalResult:
    """Run the full eval pipeline for a single scenario."""

    # Step 1: Run agent
    t0 = time.time()
    agent_response = await run_strategist_agent(scenario["query"])
    latency_agent = (time.time() - t0) * 1000

    # Step 2: Judge
    t1 = time.time()
    scores = judge_response(openai_client, scenario, agent_response)
    latency_judge = (time.time() - t1) * 1000

    result = EvalResult(
        scenario_id=scenario["id"],
        scenario_name=scenario["name"],
        category=scenario["category"],
        query=scenario["query"],
        agent_response=agent_response,
        scores=scores,
        latency_agent_ms=round(latency_agent, 1),
        latency_judge_ms=round(latency_judge, 1),
    )

    if verbose:
        label = "PASS" if scores.passed else "FAIL"
        logger.info(
            f"  S{scenario['id']:02d} [{label}] overall={scores.overall}/5 "
            f"score={scores.score:.2f} "
            f"dg={scores.data_grounding} pi={scores.problem_identification} "
            f"css={scores.cross_source_synthesis} act={scores.actionability} "
            f"pro={scores.proactiveness} "
            f"| {scenario['name']}"
        )
        if scores.missed_items:
            logger.info(f"       Missed: {', '.join(scores.missed_items[:3])}")

    return result


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def print_report(results: List[EvalResult]):
    """Print formatted eval report."""
    total = len(results)
    if total == 0:
        logger.info("No results to report.")
        return

    passed = sum(1 for r in results if r.scores.passed)
    dims = ["data_grounding", "problem_identification", "cross_source_synthesis",
            "actionability", "proactiveness", "overall"]

    logger.info("")
    logger.info("=" * 70)
    logger.info("STRATEGIST AGENT EVALUATION RESULTS")
    logger.info("=" * 70)
    logger.info(f"  Scenarios evaluated: {total}")
    logger.info(f"  Passed: {passed}/{total} ({passed/total*100:.0f}%)")
    logger.info(f"  Avg score: {sum(r.scores.score for r in results)/total:.2f}")
    logger.info("")

    logger.info("  Dimension averages (out of 5.0):")
    for d in dims:
        avg = sum(getattr(r.scores, d) for r in results) / total
        bar = "#" * int(avg * 4)
        logger.info(f"    {d:28s}: {avg:.2f}  {bar}")

    # Per-category breakdown
    categories = sorted(set(r.category for r in results))
    if len(categories) > 1:
        logger.info("")
        logger.info("  Per-category results:")
        for cat in categories:
            cat_results = [r for r in results if r.category == cat]
            cat_pass = sum(1 for r in cat_results if r.scores.passed)
            cat_avg = sum(r.scores.overall for r in cat_results) / len(cat_results)
            logger.info(f"    {cat:30s}: {cat_pass}/{len(cat_results)} passed, avg overall {cat_avg:.1f}/5")

    # Failed scenarios
    failed = [r for r in results if not r.scores.passed]
    if failed:
        logger.info("")
        logger.info("  FAILED scenarios:")
        for r in failed:
            logger.info(f"    S{r.scenario_id:02d} [{r.scenario_name}] overall={r.scores.overall}/5")
            logger.info(f"         {r.scores.reasoning[:120]}")
            if r.scores.missed_items:
                logger.info(f"         Missed: {', '.join(r.scores.missed_items[:3])}")

    # Latency
    avg_agent = sum(r.latency_agent_ms for r in results) / total
    avg_judge = sum(r.latency_judge_ms for r in results) / total
    logger.info("")
    logger.info("  Avg latency:")
    logger.info(f"    Agent:   {avg_agent:,.0f}ms")
    logger.info(f"    Judge:   {avg_judge:,.0f}ms")
    logger.info(f"    Total:   {avg_agent + avg_judge:,.0f}ms per scenario")
    logger.info("=" * 70)


def save_results(
    results: List[EvalResult],
    output_path: str,
    supabase=None,
    save_to_db: bool = False,
):
    """Save eval results to JSON file and optionally to Supabase."""
    total = len(results)
    dims = ["data_grounding", "problem_identification", "cross_source_synthesis",
            "actionability", "proactiveness", "overall"]

    output = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "eval_type": "strategist_agent",
        "num_scenarios": total,
        "passed": sum(1 for r in results if r.scores.passed),
        "failed": sum(1 for r in results if not r.scores.passed),
        "avg_score": round(sum(r.scores.score for r in results) / total, 3) if total else 0,
        "dimension_averages": {
            d: round(sum(getattr(r.scores, d) for r in results) / total, 2)
            for d in dims
        } if total else {},
        "scenarios": [
            {
                "id": r.scenario_id,
                "name": r.scenario_name,
                "category": r.category,
                "query": r.query,
                "agent_response": r.agent_response,
                "scores": {
                    "data_grounding": r.scores.data_grounding,
                    "problem_identification": r.scores.problem_identification,
                    "cross_source_synthesis": r.scores.cross_source_synthesis,
                    "actionability": r.scores.actionability,
                    "proactiveness": r.scores.proactiveness,
                    "overall": r.scores.overall,
                    "score": r.scores.score,
                    "passed": r.scores.passed,
                    "missed_items": r.scores.missed_items,
                    "extra_insights": r.scores.extra_insights,
                    "reasoning": r.scores.reasoning,
                },
                "latency_ms": {
                    "agent": r.latency_agent_ms,
                    "judge": r.latency_judge_ms,
                },
                "error": r.error,
            }
            for r in results
        ],
    }

    with open(output_path, "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    logger.info(f"\nResults saved to {output_path}")

    # Optionally save to eval_runs and eval_results tables
    if save_to_db and supabase:
        try:
            run_row = supabase.table("eval_runs").insert({
                "run_name": f"strategist-eval-{time.strftime('%Y%m%d-%H%M%S')}",
                "agent_version": "v1-classified-workflow",
                "model": "gpt-4o",
                "total_cases": total,
                "passed": output["passed"],
                "failed": output["failed"],
                "avg_score": output["avg_score"],
                "summary": json.dumps(output["dimension_averages"]),
            }).execute()

            run_id = run_row.data[0]["id"] if run_row.data else None
            if run_id:
                for r in results:
                    supabase.table("eval_results").insert({
                        "run_id": run_id,
                        "test_case_id": r.scores.__dict__.get("db_test_case_id"),
                        "agent_response": r.agent_response[:10000],
                        "score": r.scores.score,
                        "passed": r.scores.passed,
                        "missed_items": json.dumps(r.scores.missed_items),
                        "judge_reasoning": r.scores.reasoning,
                        "latency_ms": int(r.latency_agent_ms),
                        "metadata": json.dumps({
                            "scenario_name": r.scenario_name,
                            "category": r.category,
                        }),
                    }).execute()
                logger.info(f"Results saved to eval_runs (run_id: {run_id})")
        except Exception as e:
            logger.warning(f"Failed to save to DB (tables may not exist yet): {e}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def async_main():
    parser = argparse.ArgumentParser(
        description="Business Strategist Agent Evaluation Pipeline"
    )
    parser.add_argument("--verbose", action="store_true", help="Show per-scenario progress")
    parser.add_argument("--dry-run", action="store_true", help="Show scenarios without running")
    parser.add_argument("--from-db", action="store_true",
                        help="Load scenarios from eval_test_cases table instead of seeds")
    parser.add_argument("--scenario", type=int, default=None, metavar="N",
                        help="Run only scenario N")
    parser.add_argument("--save-to-db", action="store_true",
                        help="Save results to eval_runs/eval_results tables")
    parser.add_argument("--output", type=str, default="/tmp/strategist-eval.json",
                        help="Path to save JSON results")
    args = parser.parse_args()

    supabase, openai_client = get_clients()

    # Load scenarios
    if args.from_db:
        scenarios = load_scenarios_from_db(supabase)
        if not scenarios:
            logger.error("No enabled test cases found in eval_test_cases. Run seed insertion first.")
            return
        logger.info(f"Loaded {len(scenarios)} scenarios from database")
    else:
        scenarios = SEED_SCENARIOS
        logger.info(f"Using {len(scenarios)} seed scenarios")

    # Filter to single scenario if requested
    if args.scenario is not None:
        scenarios = [s for s in scenarios if s["id"] == args.scenario]
        if not scenarios:
            logger.error(f"Scenario {args.scenario} not found.")
            return

    # Dry run
    if args.dry_run:
        logger.info("=" * 70)
        logger.info("STRATEGIST EVAL — DRY RUN")
        logger.info("=" * 70)
        for s in scenarios:
            logger.info(f"\n  S{s['id']:02d} [{s['category']}] {s['name']}")
            logger.info(f"      Query: {s['query'][:80]}...")
            logger.info(f"      Should identify: {s['should_identify'][:2]}...")
            logger.info(f"      Should not miss: {s['should_not_miss'][:2]}...")
        logger.info(f"\nTotal: {len(scenarios)} scenarios")
        logger.info("Run without --dry-run to execute.")
        return

    # Run evaluation
    logger.info("=" * 70)
    logger.info("STRATEGIST AGENT EVALUATION")
    logger.info("=" * 70)
    logger.info(f"  Scenarios: {len(scenarios)}")
    logger.info(f"  Output: {args.output}")
    logger.info("")

    results = []
    for scenario in scenarios:
        logger.info(f"Evaluating S{scenario['id']:02d}: {scenario['name']}...")
        result = await evaluate_scenario(openai_client, scenario, args.verbose)
        results.append(result)

    # Report
    print_report(results)
    save_results(results, args.output, supabase, save_to_db=args.save_to_db)


def main():
    asyncio.run(async_main())


if __name__ == "__main__":
    main()
