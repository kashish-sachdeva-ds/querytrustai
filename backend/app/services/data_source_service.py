import base64
import hashlib
import logging
import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from cryptography.fernet import Fernet
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from urllib.parse import quote_plus

from app.config import get_settings
from app.schemas.data_source import (
    DataSourceTestRequest,
    DataSourceTestResponse,
    DataSourceTableInfo,
    DataSourceColumnInfo,
    DataSourceSchemaCatalog,
)

logger = logging.getLogger("querytrust.data_source_service")
settings = get_settings()


def _get_cipher() -> Fernet:
    """Derive a Fernet encryption key deterministically from settings.SECRET_KEY."""
    raw_key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    b64_key = base64.urlsafe_b64encode(raw_key)
    return Fernet(b64_key)


def encrypt_secret(plain_text: str) -> str:
    """Encrypt a secret string into a safe stored token."""
    cipher = _get_cipher()
    return cipher.encrypt(plain_text.encode()).decode()


def decrypt_secret(cipher_token: str) -> str:
    """Decrypt a stored cipher token back into plaintext."""
    cipher = _get_cipher()
    return cipher.decrypt(cipher_token.encode()).decode()


def sanitize_db_error(error: Exception) -> str:
    """Sanitize database connection errors so passwords/secrets are never returned to clients or logged."""
    raw = str(error)
    # Common password scrubbing in connection strings
    import re
    scrubbed = re.sub(r":([^:@/]+)@", ":••••••••@", raw)
    # Return concise message
    if "password authentication failed" in scrubbed.lower():
        return "Authentication failed: invalid username or password."
    if "could not connect to server" in scrubbed.lower() or "connection refused" in scrubbed.lower():
        return "Connection refused: verify host, port, and network firewall accessibility."
    if "database" in scrubbed.lower() and "does not exist" in scrubbed.lower():
        return "Target database does not exist on the host."
    if "timeout" in scrubbed.lower():
        return "Connection timed out after 5 seconds. Host may be unreachable."
    # Return scrubbed first line
    first_line = scrubbed.splitlines()[0] if scrubbed.splitlines() else "Connection error"
    return first_line[:200]


def build_connection_uri(
    host: str,
    port: int,
    database_name: str,
    username: str,
    password: str,
    ssl_mode: str = "prefer",
) -> str:
    """Safely construct a PostgreSQL connection string with URL-encoded credentials."""
    safe_user = quote_plus(username)
    safe_pass = quote_plus(password)
    return f"postgresql://{safe_user}:{safe_pass}@{host}:{port}/{database_name}?sslmode={ssl_mode}"


def test_database_connection(req: DataSourceTestRequest) -> DataSourceTestResponse:
    """Test connectivity to an external PostgreSQL database with a strict 4-second timeout."""
    uri = build_connection_uri(
        host=req.host,
        port=req.port,
        database_name=req.database_name,
        username=req.username,
        password=req.password,
        ssl_mode=req.ssl_mode,
    )

    t0 = time.perf_counter()
    transient_engine = None
    try:
        transient_engine = create_engine(
            uri,
            connect_args={"connect_timeout": 4},
            pool_pre_ping=False,
        )

        with transient_engine.connect() as conn:
            # 1. Check version & latency
            version_res = conn.execute(text("SELECT version();")).scalar()
            t1 = time.perf_counter()
            latency = round((t1 - t0) * 1000, 2)

            # 2. Discover tables in public schema
            tables_query = text(
                """
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                  AND table_type = 'BASE TABLE'
                ORDER BY table_name;
                """
            )
            tables = [row[0] for row in conn.execute(tables_query).fetchall()]

            server_short = (version_res.split(",")[0] if version_res else "PostgreSQL").strip()

            return DataSourceTestResponse(
                success=True,
                latency_ms=latency,
                server_version=server_short,
                tables_found=len(tables),
                tables=tables[:20],
            )
    except Exception as exc:
        logger.warning(f"Connection test failed for host {req.host}: {type(exc).__name__}")
        return DataSourceTestResponse(
            success=False,
            error_message=sanitize_db_error(exc),
        )
    finally:
        if transient_engine is not None:
            transient_engine.dispose()


def introspect_database_schema(
    host: str,
    port: int,
    database_name: str,
    username: str,
    password: str,
    ssl_mode: str = "prefer",
) -> Dict[str, Any]:
    """Extract schema details (tables, columns, types) from an external PostgreSQL database."""
    uri = build_connection_uri(
        host=host,
        port=port,
        database_name=database_name,
        username=username,
        password=password,
        ssl_mode=ssl_mode,
    )

    transient_engine = None
    try:
        transient_engine = create_engine(
            uri,
            connect_args={"connect_timeout": 5},
            pool_pre_ping=False,
        )

        with transient_engine.connect() as conn:
            columns_query = text(
                """
                SELECT table_name, column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public'
                ORDER BY table_name, ordinal_position;
                """
            )
            rows = conn.execute(columns_query).fetchall()

            # Group columns by table
            tables_map: Dict[str, List[Dict[str, Any]]] = {}
            for row in rows:
                tbl = row[0]
                col_info = {
                    "name": row[1],
                    "data_type": row[2],
                    "is_nullable": (row[3] == "YES"),
                }
                if tbl not in tables_map:
                    tables_map[tbl] = []
                tables_map[tbl].append(col_info)

            table_list = [
                {
                    "table_name": tbl,
                    "columns": cols,
                }
                for tbl, cols in tables_map.items()
            ]

            total_columns = sum(len(cols) for cols in tables_map.values())

            return {
                "table_count": len(table_list),
                "column_count": total_columns,
                "tables": table_list,
                "table_names": list(tables_map.keys()),
                "introspected_at": datetime.now(timezone.utc).isoformat(),
            }
    finally:
        if transient_engine is not None:
            transient_engine.dispose()
