#!/usr/bin/env bash
# Deterministic database seeding script for QueryTrust AI
set -euo pipefail

echo "=========================================================="
echo "🌱 QueryTrust AI - Deterministic Synthetic Database Seeder"
echo "=========================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/../backend"

cd "${BACKEND_DIR}"

echo "1. Applying database migrations..."
alembic upgrade head

echo "2. Seeding deterministic synthetic networking assets..."
python -m app.seed.seed_data

echo "=========================================================="
echo "✅ Database seeding completed successfully!"
echo "   - 5,000 networking devices"
echo "   - 50 enterprise sites"
echo "   - 6,000 service incidents"
echo "   - 25,000 multi-metric telemetry readings"
echo "   - 3 default system user roles (Admin, Analyst, Viewer)"
echo "=========================================================="
