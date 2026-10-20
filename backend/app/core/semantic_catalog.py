"""
Central semantic catalog for QueryTrust AI natural language analytics.

Defines:
- Table schemas and column descriptions
- Valid join relationships
- Business metric definitions (active devices, open service events, warranty expiry)
- Ambiguity rules (e.g. 'high risk' requires explicit clarification)
- Unsupported domain concepts (e.g. revenue, financial churn)
"""

from typing import Dict, List, Any

# Explicit table allowlist for analytics queries
ALLOWED_TABLES = {"devices", "sites", "service_events"}

SEMANTIC_CATALOG: Dict[str, Any] = {
    "tables": {
        "devices": {
            "description": "Inventory of networking hardware assets across all enterprise sites",
            "columns": {
                "id": "Integer primary key",
                "asset_tag": "Unique asset identifier (e.g., ASSET-00001)",
                "device_type": "Hardware category: Router, Switch, Firewall, Access Point",
                "vendor": "Hardware manufacturer (e.g., NetEdge Systems, OmniNet, PacketFlow, SkyLink Networks)",
                "model": "Model designation (e.g., EdgeRouter-X4, OmniSwitch-500)",
                "firmware_version": "Installed firmware release version string",
                "site_id": "Foreign key reference to sites.id",
                "status": "Operational status: Active, Maintenance, Offline, Decommissioned",
                "installed_at": "Installation date (YYYY-MM-DD)",
                "warranty_expiry": "Hardware warranty expiration date (YYYY-MM-DD)",
                "serial_number": "Hardware serial number",
            },
        },
        "sites": {
            "description": "Geographical data center and office facility locations",
            "columns": {
                "id": "Integer primary key",
                "site_code": "Unique 3-character site code (e.g., NYC, BOS, SFO, DFW)",
                "site_name": "Full facility name (e.g., New York Metro DC)",
                "city": "Municipality or metropolitan area",
                "region": "Macro geographic region: North, South, East, West, Central",
            },
        },
        "service_events": {
            "description": "Operational incidents, maintenance logs, and hardware alerts",
            "columns": {
                "id": "Integer primary key",
                "device_id": "Foreign key reference to devices.id",
                "event_type": "Category: Firmware Upgrade, Interface Flapping, Configuration Drift, Hardware Fault",
                "severity": "Incident severity: Critical, High, Medium, Low",
                "status": "Event status: Open, In Progress, Pending Review, Resolved, Closed, Cancelled",
                "opened_at": "Timestamp when the event occurred/was opened",
                "closed_at": "Timestamp when the event was resolved/closed (or NULL if ongoing)",
                "description": "Free text summary describing the event details",
            },
        },
    },
    "relationships": [
        {
            "from_table": "devices",
            "from_column": "site_id",
            "to_table": "sites",
            "to_column": "id",
            "type": "many_to_one",
            "description": "Join devices.site_id = sites.id to get site location and region for a device",
        },
        {
            "from_table": "service_events",
            "from_column": "device_id",
            "to_table": "devices",
            "to_column": "id",
            "type": "many_to_one",
            "description": "Join service_events.device_id = devices.id to associate incidents with specific devices",
        },
    ],
    "business_metrics": {
        "device_count": "COUNT(DISTINCT devices.id)",
        "active_device": "LOWER(TRIM(devices.status)) = 'active'",
        "open_service_event": "LOWER(TRIM(service_events.status)) NOT IN ('resolved', 'closed', 'cancelled')",
        "warranty_expiring_in_days": "warranty_expiry >= '2026-10-14' AND warranty_expiry <= '2026-10-14'::date + INTERVAL '{N} days'",
        "reference_date": "2026-10-14",
    },
    "ambiguity_rules": {
        "high_risk": {
            "status": "clarification_needed",
            "question": "How would you like to define 'high-risk devices'? Please choose one of: (1) Imminent warranty expiry (within 30 days), (2) Devices with unresolved Critical/High service events, or (3) Repeated flapping incidents.",
        },
        "unhealthy": {
            "status": "clarification_needed",
            "question": "How would you like to filter unhealthy devices? By non-active operational status (Offline/Maintenance) or by open Critical service events?",
        },
    },
    "unsupported_concepts": [
        "revenue",
        "profit",
        "cost",
        "churn",
        "customer",
        "pricing",
        "billing",
        "salary",
        "employee",
    ],
}


def get_catalog_prompt_context() -> str:
    """Returns a formatted schema summary for inclusion in LLM prompt context."""
    lines = [
        "### APPROVED SCHEMA ALLOWLIST:",
        "You are strictly allowed to query ONLY the following PostgreSQL tables and columns:",
    ]
    for table_name, meta in SEMANTIC_CATALOG["tables"].items():
        lines.append(f"\nTable: {table_name} — {meta['description']}")
        for col, desc in meta["columns"].items():
            lines.append(f"  - {col}: {desc}")

    lines.append("\n### BUSINESS DEFINITIONS & JOIN PATHS:")
    for rel in SEMANTIC_CATALOG["relationships"]:
        lines.append(f"- {rel['description']}")

    metrics = SEMANTIC_CATALOG["business_metrics"]
    lines.append(f"- Device Count: {metrics['device_count']}")
    lines.append(f"- Active Device: {metrics['active_device']}")
    lines.append(f"- Open Service Event: {metrics['open_service_event']}")
    lines.append(f"- Reference Date for Time Queries: '{metrics['reference_date']}'")
    lines.append(
        "- Warranty Expiring in N Days: warranty_expiry >= '2026-10-14' AND warranty_expiry <= '2026-10-14'::date + INTERVAL 'N days'"
    )

    lines.append("\n### RESTRICTIONS:")
    lines.append("- Never access pg_catalog, information_schema, or tables other than devices, sites, service_events.")
    lines.append("- Generate a single read-only SELECT query.")
    lines.append("- For undefined concepts like 'high-risk', ask a clarification.")
    lines.append("- For unsupported concepts (revenue, churn, customer data), mark as unsupported.")

    return "\n".join(lines)


def get_dynamic_schema_prompt_context(schema_cache: Dict[str, Any]) -> str:
    """Format introspected external/company database tables and columns into a structured schema prompt for the LLM."""
    tables = schema_cache.get("tables", [])
    table_names = schema_cache.get("table_names", [t.get("table_name") for t in tables if isinstance(t, dict)])

    lines = [
        "### ACTIVE ENTERPRISE DATABASE SCHEMA:",
        f"The connected company database contains the following tables: {', '.join(table_names)}.",
        "You are strictly allowed to query ONLY these tables and their defined columns:\n",
    ]

    for tbl in tables:
        if isinstance(tbl, dict):
            tname = tbl.get("table_name", "")
            cols = tbl.get("columns", [])
            lines.append(f"Table: {tname}")
            for c in cols:
                cname = c.get("name", "") if isinstance(c, dict) else getattr(c, "name", str(c))
                dtype = c.get("data_type", "") if isinstance(c, dict) else getattr(c, "data_type", "")
                nullable = c.get("is_nullable", True) if isinstance(c, dict) else getattr(c, "is_nullable", True)
                null_str = "nullable" if nullable else "NOT NULL"
                lines.append(f"  - {cname} ({dtype}, {null_str})")
            lines.append("")

    lines.append("### SECURITY & QUERY RESTRICTIONS:")
    lines.append(f"- Strictly query ONLY from: {', '.join(table_names)}.")
    lines.append("- Never access pg_catalog, information_schema, or write/mutation statements.")
    lines.append("- Always generate a single safe read-only SELECT query.")
    lines.append("- Apply reasonable LIMIT (default 200) unless aggregating.")

    return "\n".join(lines)

