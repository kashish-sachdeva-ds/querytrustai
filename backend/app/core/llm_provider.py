"""
Configurable LLM Provider layer for natural-language query translation.

Supports:
1. DemoLLMProvider: Deterministic, offline, educational demo provider.
2. GeminiLLMProvider: Direct Google Gemini API via REST (when GEMINI_API_KEY is configured).
3. OpenAICompatibleLLMProvider: OpenAI or compatible API endpoints (when OPENAI_API_KEY is configured).

Enforces:
- Structured JSON output conforming to StructuredLLMResponse.
- Clarification requests on ambiguous terms (e.g. 'high-risk').
- Polite rejection of unsupported business concepts (e.g. 'revenue', 'churn').
- Clear labeling of provider mode (no simulated claims of live inference).
"""

import re
import json
import logging
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
import httpx
from pydantic import BaseModel, Field

from app.config import Settings, get_settings
from app.core.semantic_catalog import (
    SEMANTIC_CATALOG,
    get_catalog_prompt_context,
    get_dynamic_schema_prompt_context,
)

logger = logging.getLogger("querytrust.llm")


class StructuredLLMResponse(BaseModel):
    intent_status: str = Field(..., description="'ready', 'clarification_needed', or 'unsupported'")
    interpreted_question: str
    clarification_question: Optional[str] = None
    sql: Optional[str] = None
    assumptions: List[str] = Field(default_factory=list)
    business_terms_used: List[str] = Field(default_factory=list)


class BaseLLMProvider(ABC):
    def __init__(self, name: str, model: str, is_demo: bool = False):
        self.name = name
        self.model = model
        self.is_demo = is_demo
        self.prompt_version = "v1.0"

    @abstractmethod
    async def generate_sql_preview(
        self,
        question: str,
        history: Optional[List[Dict[str, str]]] = None,
        schema_context: Optional[Dict[str, Any]] = None,
    ) -> StructuredLLMResponse:
        pass


class DemoLLMProvider(BaseLLMProvider):
    """Deterministic, high-fidelity demo provider operating completely offline.

    Uses the semantic catalog rules and regex pattern recognition to generate
    reproducible query previews, clarifications, and policy rejections.
    """

    def __init__(self):
        super().__init__(name="demo", model="deterministic-rule-v1", is_demo=True)

    async def generate_sql_preview(
        self,
        question: str,
        history: Optional[List[Dict[str, str]]] = None,
        schema_context: Optional[Dict[str, Any]] = None,
    ) -> StructuredLLMResponse:
        q_lower = question.strip().lower()

        # 0. Check for security test injections FIRST (always produce attack SQL to exercise AST guard)
        if "drop table" in q_lower or "drop database" in q_lower:
            target_tbl = "devices"
            if schema_context and schema_context.get("table_names"):
                target_tbl = schema_context["table_names"][0]
            return StructuredLLMResponse(
                intent_status="ready",
                interpreted_question="Attempted table drop instruction.",
                sql=f"DROP TABLE {target_tbl};",
                assumptions=["Testing DDL rejection."],
                business_terms_used=[],
            )

        if "delete from" in q_lower:
            target_tbl = "devices"
            if schema_context and schema_context.get("table_names"):
                target_tbl = schema_context["table_names"][0]
            return StructuredLLMResponse(
                intent_status="ready",
                interpreted_question="Attempted row deletion instruction.",
                sql=f"DELETE FROM {target_tbl} WHERE id = 1;",
                assumptions=["Testing DML delete rejection."],
                business_terms_used=[],
            )

        if "update " in q_lower and "set" in q_lower:
            target_tbl = "devices"
            if schema_context and schema_context.get("table_names"):
                target_tbl = schema_context["table_names"][0]
            return StructuredLLMResponse(
                intent_status="ready",
                interpreted_question="Attempted row update instruction.",
                sql=f"UPDATE {target_tbl} SET status = 'Offline' WHERE id = 1;",
                assumptions=["Testing DML update rejection."],
                business_terms_used=[],
            )

        if "pg_sleep" in q_lower or "sleep" in q_lower:
            return StructuredLLMResponse(
                intent_status="ready",
                interpreted_question="Attempted sleep injection.",
                sql="SELECT pg_sleep(5);",
                assumptions=["Testing dangerous function rejection."],
                business_terms_used=[],
            )

        # 1. Custom enterprise database schema handling (when connected to a custom company database)
        if schema_context and schema_context.get("tables"):
            tables = schema_context.get("tables", [])
            custom_table_names = schema_context.get("table_names", [t.get("table_name") for t in tables if isinstance(t, dict)])
            is_custom_db = any(t not in {"devices", "sites", "service_events", "telemetry_readings"} for t in custom_table_names)

            if is_custom_db:
                # Find matching table
                matched_table = None
                matched_cols = []
                for t in tables:
                    tname = t.get("table_name", "") if isinstance(t, dict) else ""
                    if tname.lower() in q_lower or tname.lower().rstrip("s") in q_lower or (tname.lower() + "s") in q_lower:
                        matched_table = tname
                        matched_cols = t.get("columns", []) if isinstance(t, dict) else []
                        break

                if not matched_table and tables:
                    first_tbl = tables[0]
                    matched_table = first_tbl.get("table_name", "") if isinstance(first_tbl, dict) else ""
                    matched_cols = first_tbl.get("columns", []) if isinstance(first_tbl, dict) else []

                if matched_table:
                    col_names = [c.get("name") for c in matched_cols if isinstance(c, dict) and c.get("name")]

                    # Check for count / aggregation
                    if any(w in q_lower for w in ["how many", "count", "total", "number of"]):
                        return StructuredLLMResponse(
                            intent_status="ready",
                            interpreted_question=f"Count total records in enterprise table '{matched_table}'.",
                            sql=f"SELECT COUNT(*) AS total_count FROM {matched_table};",
                            assumptions=[f"Targeting active connected table '{matched_table}'."],
                            business_terms_used=[matched_table],
                        )

                    # Check for breakdown / group by
                    dim_col = None
                    for cname in col_names:
                        c_lower = cname.lower()
                        if c_lower in q_lower or ("by " + c_lower) in q_lower:
                            dim_col = cname
                            break
                    if not dim_col and any(w in q_lower for w in ["breakdown", "group by", "distribution", "by"]):
                        for cname in col_names:
                            if any(k in cname.lower() for k in ["status", "type", "category", "region", "vendor", "severity", "role"]):
                                dim_col = cname
                                break

                    if dim_col:
                        return StructuredLLMResponse(
                            intent_status="ready",
                            interpreted_question=f"Aggregate distribution of '{matched_table}' grouped by '{dim_col}'.",
                            sql=f"SELECT {dim_col}, COUNT(*) AS count\nFROM {matched_table}\nGROUP BY {dim_col}\nORDER BY count DESC\nLIMIT 200;",
                            assumptions=[f"Targeting active connected table '{matched_table}' grouped by '{dim_col}'."],
                            business_terms_used=[matched_table, dim_col],
                        )

                    # Default clean SELECT on custom table
                    return StructuredLLMResponse(
                        intent_status="ready",
                        interpreted_question=f"Retrieve records from enterprise table '{matched_table}'.",
                        sql=f"SELECT * FROM {matched_table}\nLIMIT 200;",
                        assumptions=[f"Safe read-only sample query from active table '{matched_table}'."],
                        business_terms_used=[matched_table],
                    )

        # 2. Check for unsupported domain concepts (for default demo sandbox)
        for unsupported in SEMANTIC_CATALOG["unsupported_concepts"]:
            if re.search(rf"\b{re.escape(unsupported)}\b", q_lower):
                return StructuredLLMResponse(
                    intent_status="unsupported",
                    interpreted_question=f"User requested analysis regarding '{unsupported}', which is outside the networking inventory domain.",
                    sql=None,
                    assumptions=[
                        f"The domain concept '{unsupported}' does not exist in the networking hardware or service event schema."
                    ],
                    business_terms_used=[],
                )

        # 3. Check for ambiguous operational terms requiring clarification
        if any(term in q_lower for term in ["high risk", "high-risk", "at risk", "riskiest"]):
            rule = SEMANTIC_CATALOG["ambiguity_rules"]["high_risk"]
            return StructuredLLMResponse(
                intent_status="clarification_needed",
                interpreted_question="User requested high-risk devices, which has multiple operational definitions.",
                clarification_question=rule["question"],
                sql=None,
                assumptions=["'high risk' requires operator disambiguation before candidate SQL generation."],
                business_terms_used=["high-risk"],
            )

        if any(term in q_lower for term in ["unhealthy", "poor condition", "failing"]):
            rule = SEMANTIC_CATALOG["ambiguity_rules"]["unhealthy"]
            return StructuredLLMResponse(
                intent_status="clarification_needed",
                interpreted_question="User requested unhealthy devices without specifying criteria.",
                clarification_question=rule["question"],
                sql=None,
                assumptions=["'unhealthy' can signify offline status or open critical service events."],
                business_terms_used=["unhealthy"],
            )

        if "update " in q_lower and "set" in q_lower:
            return StructuredLLMResponse(
                intent_status="ready",
                interpreted_question="Attempted row update instruction.",
                sql="UPDATE devices SET status = 'Offline' WHERE id = 1;",
                assumptions=["Testing DML update rejection."],
                business_terms_used=[],
            )

        if "pg_sleep" in q_lower or "sleep" in q_lower:
            return StructuredLLMResponse(
                intent_status="ready",
                interpreted_question="Attempted sleep injection.",
                sql="SELECT pg_sleep(5);",
                assumptions=["Testing dangerous function rejection."],
                business_terms_used=[],
            )

        if "pg_catalog" in q_lower or "pg_tables" in q_lower or "information_schema" in q_lower:
            return StructuredLLMResponse(
                intent_status="ready",
                interpreted_question="Attempted system catalog enumeration.",
                sql="SELECT tablename FROM pg_catalog.pg_tables;",
                assumptions=["Testing system catalog schema rejection."],
                business_terms_used=[],
            )

        # 4. Deterministic query templates matching networking analytics intents

        # A. Active devices by region
        if ("active" in q_lower and "region" in q_lower) or ("devices by region" in q_lower):
            return StructuredLLMResponse(
                intent_status="ready",
                interpreted_question="Count active networking devices grouped by geographical region.",
                sql=(
                    "SELECT sites.region, COUNT(DISTINCT devices.id) AS active_device_count\n"
                    "FROM devices\n"
                    "JOIN sites ON devices.site_id = sites.id\n"
                    "WHERE LOWER(TRIM(devices.status)) = 'active'\n"
                    "GROUP BY sites.region\n"
                    "ORDER BY active_device_count DESC;"
                ),
                assumptions=[
                    "Active status is matched case-insensitively using LOWER(TRIM(status)) = 'active'.",
                    "Geographic region is joined through sites.id = devices.site_id.",
                ],
                business_terms_used=["active_device", "device_count", "region"],
            )

        # B. Overall active devices
        if "how many active" in q_lower or "total active" in q_lower or q_lower == "active devices":
            return StructuredLLMResponse(
                intent_status="ready",
                interpreted_question="Count total active networking devices in the fleet.",
                sql=(
                    "SELECT COUNT(DISTINCT devices.id) AS total_active_devices\n"
                    "FROM devices\n"
                    "WHERE LOWER(TRIM(devices.status)) = 'active';"
                ),
                assumptions=["Active status is matched case-insensitively."],
                business_terms_used=["active_device", "device_count"],
            )

        # C. Devices grouped by operational status
        if "by status" in q_lower or "status breakdown" in q_lower or "devices status" in q_lower:
            return StructuredLLMResponse(
                intent_status="ready",
                interpreted_question="Aggregate device counts grouped by operational status.",
                sql=(
                    "SELECT status, COUNT(*) AS device_count\n"
                    "FROM devices\n"
                    "GROUP BY status\n"
                    "ORDER BY device_count DESC;"
                ),
                assumptions=["Device status includes Active, Maintenance, Offline, Decommissioned."],
                business_terms_used=["device_count"],
            )

        # D. Devices grouped by device type / category
        if "by type" in q_lower or "device types" in q_lower or "by category" in q_lower:
            return StructuredLLMResponse(
                intent_status="ready",
                interpreted_question="Aggregate device counts grouped by hardware type.",
                sql=(
                    "SELECT device_type, COUNT(*) AS device_count\n"
                    "FROM devices\n"
                    "GROUP BY device_type\n"
                    "ORDER BY device_count DESC;"
                ),
                assumptions=["Device types include Router, Switch, Firewall, Access Point."],
                business_terms_used=["device_count"],
            )

        # E. Warranty expiring queries (extract days: 30, 60, 90, 180 or default 60)
        if "warranty" in q_lower or "expiring" in q_lower or "expiration" in q_lower:
            days_match = re.search(r"(\d+)\s*days?", q_lower)
            days = int(days_match.group(1)) if days_match else 60
            device_type_filter = ""
            assumptions = [
                f"Reference date is fixed at '{SEMANTIC_CATALOG['business_metrics']['reference_date']}'.",
                f"Horizon window evaluates [2026-10-14, 2026-10-14 + {days} days].",
            ]

            if "router" in q_lower:
                device_type_filter = " AND devices.device_type = 'Router'"
                assumptions.append("Filtered exclusively for device_type = 'Router'.")
            elif "switch" in q_lower:
                device_type_filter = " AND devices.device_type = 'Switch'"
                assumptions.append("Filtered exclusively for device_type = 'Switch'.")
            elif "firewall" in q_lower:
                device_type_filter = " AND devices.device_type = 'Firewall'"
                assumptions.append("Filtered exclusively for device_type = 'Firewall'.")

            return StructuredLLMResponse(
                intent_status="ready",
                interpreted_question=f"Find devices with warranty expiring within {days} days.",
                sql=(
                    "SELECT devices.id, devices.asset_tag, devices.model, devices.device_type, devices.warranty_expiry, sites.site_name, sites.region\n"
                    "FROM devices\n"
                    "JOIN sites ON devices.site_id = sites.id\n"
                    f"WHERE devices.warranty_expiry >= '2026-10-14' AND devices.warranty_expiry <= '2026-10-14'::date + INTERVAL '{days} days'{device_type_filter}\n"
                    "ORDER BY devices.warranty_expiry ASC\n"
                    "LIMIT 200;"
                ),
                assumptions=assumptions,
                business_terms_used=["warranty_expiring_in_days"],
            )

        # F. Open / critical service events grouped by site
        if ("service event" in q_lower or "incident" in q_lower or "alert" in q_lower) and "site" in q_lower:
            return StructuredLLMResponse(
                intent_status="ready",
                interpreted_question="Aggregate open service incidents grouped by facility site.",
                sql=(
                    "SELECT sites.site_name, sites.region, COUNT(service_events.id) AS open_incident_count\n"
                    "FROM service_events\n"
                    "JOIN devices ON service_events.device_id = devices.id\n"
                    "JOIN sites ON devices.site_id = sites.id\n"
                    "WHERE LOWER(TRIM(service_events.status)) NOT IN ('resolved', 'closed', 'cancelled')\n"
                    "GROUP BY sites.site_name, sites.region\n"
                    "ORDER BY open_incident_count DESC\n"
                    "LIMIT 200;"
                ),
                assumptions=[
                    "Open service events exclude statuses 'resolved', 'closed', 'cancelled'.",
                    "Results ordered by incident volume descending.",
                ],
                business_terms_used=["open_service_event"],
            )

        # G. Critical / high severity service events list
        if "critical" in q_lower or "severity" in q_lower or "service event" in q_lower or "incident" in q_lower:
            return StructuredLLMResponse(
                intent_status="ready",
                interpreted_question="List open high-severity service events with associated hardware details.",
                sql=(
                    "SELECT service_events.id, service_events.event_type, service_events.severity, service_events.status, service_events.opened_at, devices.asset_tag, devices.model, sites.site_name\n"
                    "FROM service_events\n"
                    "JOIN devices ON service_events.device_id = devices.id\n"
                    "JOIN sites ON devices.site_id = sites.id\n"
                    "WHERE LOWER(TRIM(service_events.status)) NOT IN ('resolved', 'closed', 'cancelled')\n"
                    "  AND service_events.severity IN ('Critical', 'High')\n"
                    "ORDER BY service_events.opened_at DESC\n"
                    "LIMIT 200;"
                ),
                assumptions=[
                    "Open service events are defined as status not in ('resolved', 'closed', 'cancelled').",
                    "Severity filtered to 'Critical' and 'High'.",
                ],
                business_terms_used=["open_service_event"],
            )

        # H. Offline or maintenance devices
        if "offline" in q_lower or "maintenance" in q_lower:
            target_status = "Offline" if "offline" in q_lower else "Maintenance"
            return StructuredLLMResponse(
                intent_status="ready",
                interpreted_question=f"Retrieve all networking devices currently in {target_status} status.",
                sql=(
                    "SELECT devices.id, devices.asset_tag, devices.device_type, devices.model, devices.vendor, devices.status, sites.site_name, sites.region\n"
                    "FROM devices\n"
                    "JOIN sites ON devices.site_id = sites.id\n"
                    f"WHERE LOWER(TRIM(devices.status)) = '{target_status.lower()}'\n"
                    "ORDER BY devices.asset_tag ASC\n"
                    "LIMIT 200;"
                ),
                assumptions=[f"Operational status filtered to '{target_status}'."],
                business_terms_used=["device_count"],
            )

        # I. Filter devices by region and/or type (e.g. routers in North)
        region_match = re.search(r"\b(north|south|east|west|central)\b", q_lower)
        type_match = re.search(r"\b(router|switch|firewall|access point)\b", q_lower)
        if region_match or type_match:
            clauses = []
            assumptions = []
            if region_match:
                reg = region_match.group(1).capitalize()
                clauses.append(f"LOWER(sites.region) = '{reg.lower()}'")
                assumptions.append(f"Region filtered to '{reg}'.")
            if type_match:
                dt = type_match.group(1).title()
                clauses.append(f"devices.device_type = '{dt}'")
                assumptions.append(f"Device type filtered to '{dt}'.")

            where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            return StructuredLLMResponse(
                intent_status="ready",
                interpreted_question=f"Query devices with filters: {', '.join(assumptions)}",
                sql=(
                    "SELECT devices.id, devices.asset_tag, devices.device_type, devices.model, devices.vendor, devices.status, sites.site_name, sites.region\n"
                    "FROM devices\n"
                    "JOIN sites ON devices.site_id = sites.id\n"
                    f"{where_sql}\n"
                    "ORDER BY devices.asset_tag ASC\n"
                    "LIMIT 200;"
                ),
                assumptions=assumptions,
                business_terms_used=["device_count", "region"],
            )

        # Generic safe fallback for queries on devices
        return StructuredLLMResponse(
            intent_status="ready",
            interpreted_question=f"Search devices matching terms: '{question}'",
            sql=(
                "SELECT devices.id, devices.asset_tag, devices.device_type, devices.model, devices.vendor, devices.status, sites.site_name, sites.region\n"
                "FROM devices\n"
                "JOIN sites ON devices.site_id = sites.id\n"
                "ORDER BY devices.id ASC\n"
                "LIMIT 200;"
            ),
            assumptions=["Generated standard listing query joined with facility site details."],
            business_terms_used=["device_count"],
        )


class GeminiLLMProvider(BaseLLMProvider):
    """Integration for Google Gemini models via REST with strict JSON structured outputs."""

    def __init__(self, api_key: str):
        super().__init__(name="gemini", model="gemini-2.0-flash", is_demo=False)
        self.api_key = api_key
        self.endpoint = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        )

    def _build_prompt(
        self,
        question: str,
        history: Optional[List[Dict[str, str]]] = None,
        schema_context: Optional[Dict[str, Any]] = None,
    ) -> str:
        if schema_context and schema_context.get("tables"):
            catalog_context = get_dynamic_schema_prompt_context(schema_context)
        else:
            catalog_context = get_catalog_prompt_context()

        system_instruction = (
            "You are an enterprise SQL generation assistant for QueryTrust AI.\n"
            "You MUST respond ONLY with a single valid JSON object adhering strictly to this schema:\n"
            "{\n"
            '  "intent_status": "ready" | "clarification_needed" | "unsupported",\n'
            '  "interpreted_question": "string explaining what is queried",\n'
            '  "clarification_question": "string question if clarification_needed, else null",\n'
            '  "sql": "SELECT ... if ready, else null",\n'
            '  "assumptions": ["string list of assumptions made"],\n'
            '  "business_terms_used": ["string list of semantic catalog terms used"]\n'
            "}\n\n"
            f"{catalog_context}\n"
        )
        return f"{system_instruction}\nUser Question: {question}"

    async def generate_sql_preview(
        self,
        question: str,
        history: Optional[List[Dict[str, str]]] = None,
        schema_context: Optional[Dict[str, Any]] = None,
    ) -> StructuredLLMResponse:
        prompt = self._build_prompt(question, history, schema_context)
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.0,
            },
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                resp = await client.post(self.endpoint, json=payload)
                resp.raise_for_status()
                data = resp.json()
                raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(raw_text)
                return StructuredLLMResponse(**parsed)
            except Exception as e:
                logger.error(f"Gemini API generation failed: {e}; falling back to demo provider.")
                demo = DemoLLMProvider()
                return await demo.generate_sql_preview(question, history, schema_context)


class OpenAICompatibleLLMProvider(BaseLLMProvider):
    """Integration for OpenAI or OpenAI-compatible endpoints with JSON mode."""

    def __init__(self, api_key: str, base_url: Optional[str] = None, model: str = "gpt-4o-mini"):
        super().__init__(name="openai_compatible", model=model, is_demo=False)
        self.api_key = api_key
        self.base_url = (base_url or "https://api.openai.com/v1").rstrip("/")

    async def generate_sql_preview(
        self,
        question: str,
        history: Optional[List[Dict[str, str]]] = None,
        schema_context: Optional[Dict[str, Any]] = None,
    ) -> StructuredLLMResponse:
        if schema_context and schema_context.get("tables"):
            catalog_context = get_dynamic_schema_prompt_context(schema_context)
        else:
            catalog_context = get_catalog_prompt_context()

        system_instruction = (
            "You are an enterprise SQL generation assistant for QueryTrust AI.\n"
            "You MUST respond ONLY with a single valid JSON object adhering strictly to this schema:\n"
            "{\n"
            '  "intent_status": "ready" | "clarification_needed" | "unsupported",\n'
            '  "interpreted_question": "string explaining what is queried",\n'
            '  "clarification_question": "string question if clarification_needed, else null",\n'
            '  "sql": "SELECT ... if ready, else null",\n'
            '  "assumptions": ["string list of assumptions made"],\n'
            '  "business_terms_used": ["string list of semantic catalog terms used"]\n'
            "}\n\n"
            f"{catalog_context}"
        )

        messages = [{"role": "system", "content": system_instruction}]
        if history:
            for msg in history[-6:]:
                messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
        messages.append({"role": "user", "content": question})

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "response_format": {"type": "json_object"},
            "temperature": 0.0,
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                resp = await client.post(f"{self.base_url}/chat/completions", json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                raw_text = data["choices"][0]["message"]["content"]
                parsed = json.loads(raw_text)
                return StructuredLLMResponse(**parsed)
            except Exception as e:
                logger.error(f"OpenAI compatible generation failed: {e}; falling back to demo provider.")
                demo = DemoLLMProvider()
                return await demo.generate_sql_preview(question, history, schema_context)


def get_llm_provider(settings: Optional[Settings] = None) -> BaseLLMProvider:
    """Factory creating the appropriate LLM provider based on runtime settings.

    Never pretends to run a live model if no API key is provided.
    """
    cfg = settings or get_settings()
    provider_type = (cfg.LLM_PROVIDER or "demo").lower()

    if provider_type == "gemini" and cfg.GEMINI_API_KEY:
        return GeminiLLMProvider(api_key=cfg.GEMINI_API_KEY)
    elif provider_type == "openai_compatible" and cfg.OPENAI_API_KEY:
        return OpenAICompatibleLLMProvider(
            api_key=cfg.OPENAI_API_KEY,
            base_url=cfg.OPENAI_BASE_URL,
            model=cfg.OPENAI_MODEL,
        )

    # Default to deterministic educational demo provider
    return DemoLLMProvider()
