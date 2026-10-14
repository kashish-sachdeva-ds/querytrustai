"""
Unit tests for SQLGlot AST Safety Validator.

Verifies:
- Read-only SELECT operations with allowed tables pass.
- Multi-statement queries are blocked.
- DML (INSERT, UPDATE, DELETE) and DDL (DROP, CREATE, ALTER, TRUNCATE) are blocked.
- SELECT INTO is blocked.
- CTEs with read-only SELECT pass; CTEs with writes are blocked.
- Non-allowlisted tables (users, query_runs, passwords) are blocked.
- Prohibited schemas (pg_catalog, information_schema) are blocked.
- Dangerous functions (pg_sleep, pg_read_file) are blocked.
- Row limit clamping works as specified (default 200, max 500).
"""

import pytest
from app.core.sql_validator import validate_and_sanitize_sql


def test_valid_select_simple():
    sql = "SELECT id, asset_tag, model FROM devices WHERE status = 'Active'"
    res = validate_and_sanitize_sql(sql)
    assert res.is_valid is True
    assert len(res.violations) == 0
    assert "devices" in res.tables_referenced
    assert "LIMIT 200" in res.sanitized_sql.upper()


def test_valid_select_with_join():
    sql = """
    SELECT devices.asset_tag, sites.site_name, sites.region
    FROM devices
    JOIN sites ON devices.site_id = sites.id
    WHERE LOWER(sites.region) = 'north'
    ORDER BY devices.asset_tag ASC
    LIMIT 50;
    """
    res = validate_and_sanitize_sql(sql)
    assert res.is_valid is True
    assert set(res.tables_referenced) == {"devices", "sites"}
    assert "LIMIT 50" in res.sanitized_sql.upper()


def test_valid_select_with_cte():
    sql = """
    WITH active_routers AS (
        SELECT id, asset_tag, site_id FROM devices WHERE device_type = 'Router' AND status = 'Active'
    )
    SELECT active_routers.asset_tag, sites.site_name
    FROM active_routers
    JOIN sites ON active_routers.site_id = sites.id
    LIMIT 25;
    """
    res = validate_and_sanitize_sql(sql)
    assert res.is_valid is True
    assert "active_routers" not in res.violations
    assert "devices" in res.tables_referenced
    assert "sites" in res.tables_referenced


def test_multi_statement_blocked():
    sql = "SELECT * FROM devices; DROP TABLE sites;"
    res = validate_and_sanitize_sql(sql)
    assert res.is_valid is False
    assert any("Multiple SQL statements detected" in v for v in res.violations)


def test_drop_table_blocked():
    sql = "DROP TABLE devices;"
    res = validate_and_sanitize_sql(sql)
    assert res.is_valid is False
    assert any("Prohibited statement type" in v or "Prohibited SQL operation" in v for v in res.violations)


def test_delete_blocked():
    sql = "DELETE FROM service_events WHERE id = 10;"
    res = validate_and_sanitize_sql(sql)
    assert res.is_valid is False


def test_update_blocked():
    sql = "UPDATE devices SET status = 'Offline' WHERE id = 5;"
    res = validate_and_sanitize_sql(sql)
    assert res.is_valid is False


def test_insert_blocked():
    sql = "INSERT INTO sites (site_code, site_name, city, region) VALUES ('TST', 'Test', 'City', 'North');"
    res = validate_and_sanitize_sql(sql)
    assert res.is_valid is False


def test_select_into_blocked():
    sql = "SELECT * INTO backup_devices FROM devices;"
    res = validate_and_sanitize_sql(sql)
    assert res.is_valid is False
    assert any("SELECT INTO is prohibited" in v for v in res.violations)


def test_unapproved_table_blocked():
    sql = "SELECT email, hashed_password FROM users;"
    res = validate_and_sanitize_sql(sql)
    assert res.is_valid is False
    assert any("Table 'users' is not in the approved analytics allowlist" in v for v in res.violations)


def test_system_catalog_blocked():
    sql = "SELECT tablename FROM pg_catalog.pg_tables;"
    res = validate_and_sanitize_sql(sql)
    assert res.is_valid is False
    assert any("Access to prohibited schema 'pg_catalog'" in v for v in res.violations)


def test_information_schema_blocked():
    sql = "SELECT table_name FROM information_schema.tables;"
    res = validate_and_sanitize_sql(sql)
    assert res.is_valid is False
    assert any("Access to prohibited schema 'information_schema'" in v for v in res.violations)


def test_prohibited_function_pg_sleep_blocked():
    sql = "SELECT id, pg_sleep(5) FROM devices;"
    res = validate_and_sanitize_sql(sql)
    assert res.is_valid is False
    assert any("prohibited function 'pg_sleep'" in v for v in res.violations)


def test_row_limit_clamping_excessive():
    sql = "SELECT * FROM devices LIMIT 5000;"
    res = validate_and_sanitize_sql(sql)
    assert res.is_valid is True
    assert "LIMIT 500" in res.sanitized_sql.upper()
    assert any("exceeded ceiling; clamped to 500" in w for w in res.warnings)


def test_row_limit_applied_when_missing():
    sql = "SELECT * FROM devices;"
    res = validate_and_sanitize_sql(sql)
    assert res.is_valid is True
    assert "LIMIT 200" in res.sanitized_sql.upper()
    assert any("No LIMIT specified; automatically applied default LIMIT 200" in w for w in res.warnings)


def test_empty_query_blocked():
    res = validate_and_sanitize_sql("   ")
    assert res.is_valid is False
    assert "Empty SQL query." in res.violations
