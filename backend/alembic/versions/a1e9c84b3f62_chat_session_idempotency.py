"""add chat session idempotency key

Revision ID: a1e9c84b3f62
Revises: fe2b7d4c6e11
Create Date: 2026-10-16
"""

from alembic import op
import sqlalchemy as sa


revision = "a1e9c84b3f62"
down_revision = "fe2b7d4c6e11"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("chat_sessions", sa.Column("request_key", sa.String(length=64), nullable=True))
    op.create_unique_constraint("uq_chat_session_user_request_key", "chat_sessions", ["user_id", "request_key"])


def downgrade() -> None:
    op.drop_constraint("uq_chat_session_user_request_key", "chat_sessions", type_="unique")
    op.drop_column("chat_sessions", "request_key")
