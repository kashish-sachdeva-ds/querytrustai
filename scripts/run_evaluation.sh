#!/usr/bin/env bash
# Offline evaluation benchmark CLI runner for QueryTrust AI
set -euo pipefail

MODE="${1:-guarded}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/../backend"

cd "${BACKEND_DIR}"
python -m app.evaluation.run_cli --mode "${MODE}"
