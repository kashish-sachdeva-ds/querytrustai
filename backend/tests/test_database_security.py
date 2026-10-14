import pytest
from sqlalchemy import text
from app.database import readonly_engine


def test_analytics_reader_cannot_write():
    """Verify that the dedicated read-only role is strictly prohibited from mutating data."""
    with readonly_engine.connect() as conn:
        # Read operations must succeed
        result = conn.execute(text("SELECT COUNT(*) FROM devices;")).scalar()
        assert result == 5000

        # Attempting INSERT must fail at the database engine level
        with pytest.raises(Exception) as exc_info:
            conn.execute(
                text(
                    "INSERT INTO sites (site_code, site_name, city, region) VALUES ('HACK-01', 'Hacked', 'Nowhere', 'None');"
                )
            )
        # Check error message indicates permission denial
        assert "permission denied" in str(exc_info.value).lower()

        # Attempting DELETE must fail
        with pytest.raises(Exception) as exc_info:
            conn.execute(text("DELETE FROM devices WHERE id = 1;"))
        assert "permission denied" in str(exc_info.value).lower()
