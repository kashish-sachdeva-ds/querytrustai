"""prevent concurrent mutation runs

Revision ID: fe2b7d4c6e11
Revises: eb0d0621d6ec
Create Date: 2026-10-16
"""

from alembic import op
import sqlalchemy as sa


revision = "fe2b7d4c6e11"
down_revision = "eb0d0621d6ec"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "uq_data_quality_single_running_run",
        "data_quality_runs",
        ["status"],
        unique=True,
        postgresql_where=sa.text("status = 'running'"),
    )
    op.create_index(
        "uq_evaluation_single_running_mode",
        "evaluation_runs",
        ["mode"],
        unique=True,
        postgresql_where=sa.text("status = 'running'"),
    )


def downgrade() -> None:
    op.drop_index("uq_evaluation_single_running_mode", table_name="evaluation_runs")
    op.drop_index("uq_data_quality_single_running_run", table_name="data_quality_runs")
