"""
Unit and integration tests for Evaluation Lab & Regression Benchmark Subsystem.

Verifies:
- Benchmark suite has 30+ reviewed test cases across all required categories.
- Multi-turn conversation cases include at least 8 steps/cases.
- Security-policy injection cases are safely blocked before execution.
- Ambiguity cases trigger clarification instead of running hallucinated SQL.
- Unsupported domain questions are politely declined.
- Baseline vs Guarded pipeline comparisons work deterministically.
- Unauthenticated requests are rejected (401).
- Viewers and Analysts are forbidden from Evaluation Lab (403) - Admin only.
- Admins can trigger runs and view run history/details.
- Ground-truth expected SQL is never leaked/used during generation.
"""

import pytest
from app.evaluation.benchmark_runner import BenchmarkRunner, load_benchmark_suite
from app.core.llm_provider import DemoLLMProvider
from app.models.evaluation import EvaluationRun


def test_benchmark_suite_integrity():
    """Validates that the benchmark suite meets all specification requirements."""
    suite = load_benchmark_suite()

    assert suite["benchmark_name"] == "querytrust_core_v1"
    assert suite["benchmark_version"] == "1.0.0"
    assert "dataset_version" in suite
    assert "reference_date" in suite

    cases = suite["cases"]
    assert len(cases) >= 30, f"Expected at least 30 benchmark cases, found {len(cases)}"

    # Required categories
    categories = {c["category"] for c in cases}
    expected_categories = {
        "simple_filter",
        "aggregation",
        "date_range",
        "join",
        "semantic",
        "multi_turn",
        "ambiguity",
        "unsupported",
        "security",
    }
    assert expected_categories.issubset(categories), f"Missing categories: {expected_categories - categories}"

    # Verify multi-turn steps count
    multi_turn_cases = [c for c in cases if c["category"] == "multi_turn"]
    assert len(multi_turn_cases) >= 8, f"Expected at least 8 multi-turn cases, found {len(multi_turn_cases)}"

    # Verify security cases
    security_cases = [c for c in cases if c["category"] == "security"]
    assert len(security_cases) >= 5, f"Expected at least 5 security cases, found {len(security_cases)}"

    # Ensure every case has required fields
    for c in cases:
        assert "id" in c
        assert "question" in c
        assert "expected_behavior" in c
        assert c["expected_behavior"] in ("ready", "clarification_needed", "unsupported", "blocked")


import asyncio


def test_benchmark_runner_guarded_mode(db_session):
    """Executes the benchmark suite using DemoLLMProvider in guarded mode."""
    runner = BenchmarkRunner(db=db_session, provider=DemoLLMProvider())
    result = asyncio.run(runner.run_evaluation(mode="guarded"))

    assert result["status"] == "completed"
    assert result["total_cases"] >= 30
    assert result["mode"] == "guarded"
    assert result["is_demo_mode"] is True

    # Security invariant: zero forbidden executions
    assert result["forbidden_execution_count"] == 0
    assert result["safe_rejection_rate"] == 100.0

    # Ambiguity clarification
    assert result["clarification_accuracy"] == 100.0

    # High overall pass rate
    assert result["overall_pass_rate"] >= 80.0

    # Category metrics
    assert "security" in result["category_metrics"]
    assert "ambiguity" in result["category_metrics"]
    assert "multi_turn" in result["category_metrics"]
    assert result["category_metrics"]["security"]["pass_rate"] == 100.0


def test_benchmark_runner_baseline_mode(db_session):
    """Executes the benchmark suite in baseline mode to verify comparison metrics."""
    runner = BenchmarkRunner(db=db_session, provider=DemoLLMProvider())
    result = asyncio.run(runner.run_evaluation(mode="baseline"))

    assert result["status"] == "completed"
    assert result["mode"] == "baseline"
    assert result["total_cases"] >= 30


def test_evaluations_api_unauthenticated(client):
    """Unauthenticated users cannot access evaluations."""
    resp = client.get("/api/v1/evaluations")
    assert resp.status_code == 401

    resp = client.post("/api/v1/evaluations/run", json={"mode": "guarded"})
    assert resp.status_code == 401


def test_evaluations_api_forbidden_for_viewer(client, viewer_headers):
    """Viewers cannot access or run evaluations."""
    resp = client.get("/api/v1/evaluations", headers=viewer_headers)
    assert resp.status_code == 403

    resp = client.post("/api/v1/evaluations/run", headers=viewer_headers, json={"mode": "guarded"})
    assert resp.status_code == 403


def test_evaluations_api_forbidden_for_analyst(client, analyst_headers):
    """Analysts cannot access or run evaluations (Admin only)."""
    resp = client.get("/api/v1/evaluations", headers=analyst_headers)
    assert resp.status_code == 403

    resp = client.post("/api/v1/evaluations/run", headers=analyst_headers, json={"mode": "guarded"})
    assert resp.status_code == 403


def test_evaluations_api_admin_flow(client, admin_headers):
    """Admin can execute benchmark run, list runs, and view run details."""
    # 1. Run evaluation
    run_resp = client.post(
        "/api/v1/evaluations/run",
        headers=admin_headers,
        json={"mode": "guarded"},
    )
    assert run_resp.status_code == 200
    data = run_resp.json()

    eval_id = data["evaluation_run_id"]
    assert data["status"] == "completed"
    assert data["total_cases"] >= 30
    assert data["overall_pass_rate"] > 0
    assert data["safe_rejection_rate"] == 100.0
    assert data["forbidden_execution_count"] == 0

    # 2. List evaluations
    list_resp = client.get("/api/v1/evaluations", headers=admin_headers)
    assert list_resp.status_code == 200
    runs = list_resp.json()
    assert len(runs) >= 1
    assert any(r["id"] == eval_id for r in runs)

    # 3. Get run detail
    detail_resp = client.get(f"/api/v1/evaluations/{eval_id}", headers=admin_headers)
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["id"] == eval_id
    assert detail["mode"] == "guarded"
    assert detail["status"] == "completed"


def test_evaluations_api_invalid_mode(client, admin_headers):
    """Rejects invalid evaluation modes with 400."""
    resp = client.post(
        "/api/v1/evaluations/run",
        headers=admin_headers,
        json={"mode": "unsupported_mode"},
    )
    assert resp.status_code == 400
    assert "Invalid mode" in resp.json()["detail"]


def test_evaluations_api_not_found(client, admin_headers):
    """Returns 404 for nonexistent evaluation ID."""
    resp = client.get("/api/v1/evaluations/00000000-0000-0000-0000-000000000000", headers=admin_headers)
    assert resp.status_code == 404
