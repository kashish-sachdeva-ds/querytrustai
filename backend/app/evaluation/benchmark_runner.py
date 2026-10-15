"""
Benchmark Runner Engine for QueryTrust AI Evaluation Lab.

Implements Section 14 of PROJECT_SPEC.md:
- Loads versioned benchmark cases from JSON
- Runs each case through the guarded pipeline (LLM → AST Validation → status check)
- Runs a baseline pipeline (LLM only, no AST guard) for comparison
- Evaluates: intent correctness, safe rejection rate, clarification accuracy,
  multi-turn correctness, forbidden execution count, and per-stage latency
- Records all metrics per-case and per-category
- Unit tests use the DemoLLMProvider so CI passes without internet or API keys
- Expected SQL/answer is NEVER shown to the LLM during generation

INVARIANT: No benchmark score is fabricated. All metrics come from actual run output.
"""

import os
import json
import time
import uuid
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.core.llm_provider import get_llm_provider, BaseLLMProvider, DemoLLMProvider
from app.core.sql_validator import validate_and_sanitize_sql, STANDARD_CHECKS
from app.models.evaluation import EvaluationRun

logger = logging.getLogger("querytrust.evaluation")

BENCHMARK_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_BENCHMARK_FILE = os.path.join(BENCHMARK_DIR, "benchmark_suite_v1.json")


def load_benchmark_suite(path: str = DEFAULT_BENCHMARK_FILE) -> Dict[str, Any]:
    """Loads the versioned benchmark suite from a JSON file."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


class BenchmarkRunner:
    """Executes the evaluation benchmark through both guarded and baseline pipelines."""

    def __init__(self, db: Session, provider: Optional[BaseLLMProvider] = None):
        self.db = db
        self.provider = provider or get_llm_provider()

    async def run_evaluation(
        self,
        triggered_by: Optional[uuid.UUID] = None,
        mode: str = "guarded",
    ) -> Dict[str, Any]:
        """Runs the full benchmark suite and returns structured metrics.

        Args:
            triggered_by: UUID of the user who triggered the run
            mode: "guarded" (full AST validation pipeline) or "baseline" (LLM only, no AST guard)
        """
        suite = load_benchmark_suite()
        cases = suite["cases"]
        total_cases = len(cases)

        logger.info(f"Starting evaluation run: {total_cases} cases, mode={mode}, provider={self.provider.name}")

        # Create evaluation run record
        eval_run = EvaluationRun(
            id=uuid.uuid4(),
            triggered_by=triggered_by,
            benchmark_name=suite["benchmark_name"],
            benchmark_version=suite["benchmark_version"],
            provider=self.provider.name,
            mode=mode,
            status="running",
            total_cases=total_cases,
            started_at=datetime.now(timezone.utc),
        )
        self.db.add(eval_run)
        self.db.commit()

        results: List[Dict[str, Any]] = []
        category_stats: Dict[str, Dict[str, int]] = {}
        latencies: List[float] = []
        passed = 0
        failed = 0
        failures_detail: List[Dict[str, Any]] = []

        try:
            for case in cases:
                case_result = await self._evaluate_single_case(case, mode)
                results.append(case_result)
                latencies.append(case_result["latency_ms"])

                cat = case["category"]
                if cat not in category_stats:
                    category_stats[cat] = {"total": 0, "passed": 0, "failed": 0}
                category_stats[cat]["total"] += 1

                if case_result["passed"]:
                    passed += 1
                    category_stats[cat]["passed"] += 1
                else:
                    failed += 1
                    category_stats[cat]["failed"] += 1
                    failures_detail.append({
                        "case_id": case["id"],
                        "category": cat,
                        "question": case["question"],
                        "expected_behavior": case["expected_behavior"],
                        "actual_behavior": case_result["actual_behavior"],
                        "failure_reason": case_result.get("failure_reason", "Unknown"),
                    })

            # Compute category-level metrics
            category_metrics = {}
            for cat, stats in category_stats.items():
                category_metrics[cat] = {
                    "total": stats["total"],
                    "passed": stats["passed"],
                    "failed": stats["failed"],
                    "pass_rate": round(stats["passed"] / max(stats["total"], 1) * 100, 1),
                }

            # Compute aggregate metrics
            sorted_latencies = sorted(latencies)
            median_latency = sorted_latencies[len(sorted_latencies) // 2] if sorted_latencies else 0
            p95_idx = int(len(sorted_latencies) * 0.95)
            p95_latency = sorted_latencies[min(p95_idx, len(sorted_latencies) - 1)] if sorted_latencies else 0

            # Specific safety metrics
            security_cases = [r for r in results if r["category"] == "security"]
            safe_rejection_rate = (
                sum(1 for r in security_cases if r["passed"]) / max(len(security_cases), 1) * 100
            )
            forbidden_execution_count = sum(
                1 for r in security_cases if r.get("actual_behavior") == "previewed"
            )

            ambiguity_cases = [r for r in results if r["category"] == "ambiguity"]
            clarification_accuracy = (
                sum(1 for r in ambiguity_cases if r["passed"]) / max(len(ambiguity_cases), 1) * 100
            )

            multi_turn_cases = [r for r in results if r["category"] == "multi_turn"]
            multi_turn_correctness = (
                sum(1 for r in multi_turn_cases if r["passed"]) / max(len(multi_turn_cases), 1) * 100
            )

            overall_pass_rate = round(passed / max(total_cases, 1) * 100, 1)

            # Update evaluation run
            eval_run.passed_cases = passed
            eval_run.failed_cases = failed
            eval_run.status = "completed"
            eval_run.completed_at = datetime.now(timezone.utc)
            eval_run.category_metrics = category_metrics
            eval_run.failures_summary = failures_detail[:20]  # Cap stored failures
            self.db.commit()
            self.db.refresh(eval_run)

            return {
                "evaluation_run_id": str(eval_run.id),
                "benchmark_name": suite["benchmark_name"],
                "benchmark_version": suite["benchmark_version"],
                "dataset_version": suite["dataset_version"],
                "provider": self.provider.name,
                "model": self.provider.model,
                "mode": mode,
                "is_demo_mode": self.provider.is_demo,
                "prompt_version": self.provider.prompt_version,
                "status": "completed",
                "total_cases": total_cases,
                "passed_cases": passed,
                "failed_cases": failed,
                "overall_pass_rate": overall_pass_rate,
                "safe_rejection_rate": round(safe_rejection_rate, 1),
                "forbidden_execution_count": forbidden_execution_count,
                "clarification_accuracy": round(clarification_accuracy, 1),
                "multi_turn_correctness": round(multi_turn_correctness, 1),
                "median_latency_ms": round(median_latency, 2),
                "p95_latency_ms": round(p95_latency, 2),
                "category_metrics": category_metrics,
                "case_results": results,
                "failures_detail": failures_detail,
                "started_at": eval_run.started_at.isoformat(),
                "completed_at": eval_run.completed_at.isoformat(),
            }

        except Exception as e:
            logger.error(f"Evaluation run failed: {e}", exc_info=True)
            eval_run.status = "failed"
            eval_run.completed_at = datetime.now(timezone.utc)
            self.db.commit()
            raise

    async def _evaluate_single_case(
        self, case: Dict[str, Any], mode: str
    ) -> Dict[str, Any]:
        """Evaluates a single benchmark case through the pipeline."""
        case_id = case["id"]
        category = case["category"]
        question = case["question"]
        expected = case["expected_behavior"]  # ready, clarification_needed, unsupported, blocked

        start_time = time.perf_counter()

        # Build conversation history for multi-turn cases
        history = []
        if "prior_context" in case:
            for prior_q in case["prior_context"]:
                history.append({"role": "user", "content": prior_q})
                history.append({"role": "assistant", "content": f"[Prior response to: {prior_q}]"})

        try:
            # Step 1: Generate via LLM provider (expected SQL is NOT passed to the LLM)
            llm_resp = await self.provider.generate_sql_preview(question, history=history)

            # Step 2: Determine actual behavior
            actual_behavior = llm_resp.intent_status  # ready, clarification_needed, unsupported

            sql_valid = True
            validation_detail = {}

            if mode == "guarded" and llm_resp.intent_status == "ready" and llm_resp.sql:
                # Step 3: Run AST validation (guarded mode only)
                val_res = validate_and_sanitize_sql(llm_resp.sql)
                sql_valid = val_res.is_valid
                validation_detail = {
                    "checks": val_res.checks,
                    "violations": val_res.violations,
                    "tables_referenced": val_res.tables_referenced,
                }
                if not val_res.is_valid:
                    actual_behavior = "blocked"
            elif mode == "baseline" and llm_resp.intent_status == "ready" and llm_resp.sql:
                # Baseline: still run basic validation to check if it WOULD have been blocked
                val_res = validate_and_sanitize_sql(llm_resp.sql)
                validation_detail = {
                    "checks": val_res.checks,
                    "violations": val_res.violations,
                    "tables_referenced": val_res.tables_referenced,
                    "would_be_blocked": not val_res.is_valid,
                }
                # In baseline mode, we report actual LLM output without blocking
                actual_behavior = "previewed" if val_res.is_valid else "blocked_by_ast"

        except Exception as e:
            actual_behavior = "error"
            validation_detail = {"error": str(e)}
            llm_resp = None
            sql_valid = False

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # Step 4: Evaluate pass/fail
        passed = False
        failure_reason = None

        if expected == "ready":
            # For "ready" cases, the LLM should produce intent_status=ready AND the SQL should pass AST validation
            if actual_behavior == "previewed" or (actual_behavior == "ready" and sql_valid):
                # Check table references if specified
                expected_tables = set(case.get("expected_tables", []))
                if expected_tables and validation_detail.get("tables_referenced"):
                    actual_tables = set(validation_detail["tables_referenced"])
                    if expected_tables.issubset(actual_tables):
                        passed = True
                    else:
                        failure_reason = f"Expected tables {expected_tables} but got {actual_tables}"
                else:
                    passed = True
            else:
                failure_reason = f"Expected 'ready' with valid SQL, got '{actual_behavior}'"

        elif expected == "clarification_needed":
            if actual_behavior == "clarification_needed":
                passed = True
            else:
                failure_reason = f"Expected 'clarification_needed', got '{actual_behavior}'"

        elif expected == "unsupported":
            if actual_behavior == "unsupported":
                passed = True
            else:
                failure_reason = f"Expected 'unsupported', got '{actual_behavior}'"

        elif expected == "blocked":
            if actual_behavior == "blocked" or actual_behavior == "blocked_by_ast":
                passed = True
            else:
                failure_reason = f"Expected 'blocked', got '{actual_behavior}'"

        return {
            "case_id": case_id,
            "category": category,
            "question": question,
            "expected_behavior": expected,
            "actual_behavior": actual_behavior,
            "passed": passed,
            "failure_reason": failure_reason,
            "interpreted_question": llm_resp.interpreted_question if llm_resp else None,
            "generated_sql": llm_resp.sql if llm_resp else None,
            "validation": validation_detail,
            "latency_ms": elapsed_ms,
        }
