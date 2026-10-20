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

import socket
import ipaddress

logger = logging.getLogger("querytrust.data_source_service")

# Cloud metadata and link-local endpoints that are unconditionally blocked in ALL environments
ALWAYS_BLOCKED_HOSTS = {
    "169.254.169.254",
    "metadata.google.internal",
    "169.254.169.253",
    "instance-data",
    "fd00::",
}


def validate_datasource_host(host: str) -> None:
    """Validates that a database host is not a dangerous SSRF target.

    Checks:
    1. Unconditionally blocks cloud instance metadata endpoints (169.254.169.254, GCP metadata, etc.)
    2. In production: blocks loopback, link-local, and reserved IP ranges.
    """
    clean_host = host.strip().lower()
    current_settings = get_settings()

    if clean_host in ALWAYS_BLOCKED_HOSTS:
        raise ValueError(f"Host '{host}' is a prohibited cloud metadata endpoint (SSRF protection).")

    # If configured in blocked_hosts_list
    if clean_host in current_settings.blocked_hosts_list:
        if current_settings.ENVIRONMENT == "production":
            raise ValueError(f"Host '{host}' is in the restricted hosts blocklist.")

    if current_settings.ENVIRONMENT == "production":
        try:
            addr_info = socket.getaddrinfo(clean_host, None)
            for item in addr_info:
                ip_str = item[4][0]
                ip_obj = ipaddress.ip_address(ip_str)
                if ip_obj.is_loopback or ip_obj.is_link_local or ip_obj.is_reserved:
                    raise ValueError(f"Host '{host}' resolves to restricted IP address '{ip_str}'.")
        except socket.gaierror:
            raise ValueError(f"Cannot resolve host '{host}': DNS lookup failed.")


def _derive_fernet_key(secret: str) -> bytes:
    raw_key = hashlib.sha256(secret.encode()).digest()
    return base64.urlsafe_b64encode(raw_key)


def _get_primary_cipher() -> Fernet:
    """Derive primary Fernet encryption key from dedicated DATA_SOURCE_ENCRYPTION_KEY (or ENCRYPTION_KEY or SECRET_KEY)."""
    current_settings = get_settings()
    key_src = (
        current_settings.DATA_SOURCE_ENCRYPTION_KEY
        or current_settings.ENCRYPTION_KEY
        or current_settings.SECRET_KEY
    )
    return Fernet(_derive_fernet_key(key_src))


def _get_all_ciphers() -> list[Fernet]:
    """Returns primary cipher followed by any fallback/rotation ciphers and legacy derivations."""
    current_settings = get_settings()
    ciphers = [_get_primary_cipher()]

    # Configured fallback keys for key rotation
    fallbacks = getattr(current_settings, "DATA_SOURCE_KEY_ROTATION_FALLBACKS", "")
    if fallbacks:
        for k in fallbacks.split(","):
            if k.strip():
                ciphers.append(Fernet(_derive_fernet_key(k.strip())))

    # Legacy derivations for backwards compatibility with pre-existing database rows
    for legacy_src in [
        current_settings.DATA_SOURCE_ENCRYPTION_KEY,
        current_settings.ENCRYPTION_KEY,
        current_settings.SECRET_KEY,
        f"datasource-cipher-{current_settings.SECRET_KEY}",
    ]:
        if legacy_src:
            ciphers.append(Fernet(_derive_fernet_key(legacy_src)))

    return ciphers


def encrypt_secret(plain_text: str) -> str:
    """Encrypt a secret string into a versioned stored token ('v1:...')."""
    cipher = _get_primary_cipher()
    encrypted = cipher.encrypt(plain_text.encode()).decode()
    return f"v1:{encrypted}"


def decrypt_secret(cipher_token: str) -> str:
    """Decrypt a stored cipher token back into plaintext, supporting version prefixes and rotation fallbacks."""
    token = cipher_token
    if token.startswith("v1:"):
        token = token[3:]

    # Attempt decryption across candidate ciphers (primary -> fallbacks -> legacy)
    last_err = None
    for cipher in _get_all_ciphers():
        try:
            return cipher.decrypt(token.encode()).decode()
        except Exception as e:
            last_err = e
            continue

    raise ValueError(f"Failed to decrypt stored credential with available keys: {last_err}")


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
    try:
        validate_datasource_host(req.host)
    except ValueError as val_err:
        return DataSourceTestResponse(
            success=False,
            error_message=str(val_err),
        )

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
    validate_datasource_host(host)
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


class DataSourceConnectionManager:
    """Maintains a bounded, cached connection pool for active external data sources.

    Eliminates socket exhaustion and TLS handshake overhead caused by
    instantiating new create_engine instances on every analytics query (ARCH-05).
    """
    _engines: Dict[str, Any] = {}

    @classmethod
    def get_engine(
        cls,
        host: str,
        port: int,
        database_name: str,
        username: str,
        password: str,
        ssl_mode: str = "prefer",
    ):
        key = f"{username}@{host}:{port}/{database_name}?sslmode={ssl_mode}"
        if key not in cls._engines:
            uri = build_connection_uri(host, port, database_name, username, password, ssl_mode)
            engine = create_engine(
                uri,
                connect_args={"connect_timeout": 5},
                pool_size=5,
                max_overflow=5,
                pool_recycle=1800,
                pool_pre_ping=True,
            )
            cls._engines[key] = engine
        return cls._engines[key]

    @classmethod
    def evict(cls, host: str, port: int, database_name: str, username: str):
        prefix = f"{username}@{host}:{port}/{database_name}"
        keys_to_remove = [k for k in cls._engines if k.startswith(prefix)]
        for k in keys_to_remove:
            eng = cls._engines.pop(k, None)
            if eng:
                try:
                    eng.dispose()
                except Exception:
                    pass

