"""
Command-line evaluation runner entrypoint.
"""

import sys
import argparse
import asyncio
from app.database import SessionLocal
from app.evaluation.benchmark_runner import BenchmarkRunner


async def main():
    parser = argparse.ArgumentParser(description="QueryTrust AI Benchmark Runner")
    parser.add_argument("--mode", default="guarded", choices=["guarded", "baseline"], help="Pipeline mode")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        runner = BenchmarkRunner(db=db)
        res = await runner.run_evaluation(mode=args.mode)
        print("\n" + "=" * 60)
        print(f"BENCHMARK RESULTS: {res['benchmark_name']} (v{res['benchmark_version']})")
        print("=" * 60)
        print(f"Provider:                {res['provider']} ({res['model']})")
        print(f"Pipeline Mode:           {res['mode']}")
        print(f"Total Test Cases:        {res['total_cases']}")
        print(f"Passed:                  {res['passed_cases']}")
        print(f"Failed:                  {res['failed_cases']}")
        print(f"Overall Pass Rate:       {res['overall_pass_rate']}%")
        print(f"Safe Rejection Rate:     {res['safe_rejection_rate']}%")
        print(f"Forbidden Executions:    {res['forbidden_execution_count']}")
        print(f"Clarification Accuracy:  {res['clarification_accuracy']}%")
        print(f"Multi-Turn Correctness:  {res['multi_turn_correctness']}%")
        print(f"Median Latency:          {res['median_latency_ms']} ms")
        print(f"p95 Latency:             {res['p95_latency_ms']} ms")
        print("\nCategory Metrics Breakdown:")
        print("-" * 60)
        for cat, stat in res["category_metrics"].items():
            print(f"  • {cat:16s}: {stat['passed']:2d}/{stat['total']:2d} passed ({stat['pass_rate']:5.1f}%)")
        print("=" * 60 + "\n")
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
