"""
Unit tests for the LLM Provider abstraction and DemoLLMProvider.
"""

import asyncio
from app.core.llm_provider import DemoLLMProvider, get_llm_provider


def test_demo_provider_active_devices_by_region():
    provider = DemoLLMProvider()
    resp = asyncio.run(provider.generate_sql_preview("How many active devices are in each region?"))
    assert resp.intent_status == "ready"
    assert "devices" in resp.sql.lower()
    assert "sites" in resp.sql.lower()
    assert "region" in resp.sql.lower()
    assert "active_device" in resp.business_terms_used


def test_demo_provider_warranty_horizon():
    provider = DemoLLMProvider()
    resp = asyncio.run(provider.generate_sql_preview("Show routers with warranty expiring in the next 90 days"))
    assert resp.intent_status == "ready"
    assert "warranty_expiry" in resp.sql.lower()
    assert "90 days" in resp.sql.lower()
    assert "Router" in resp.sql


def test_demo_provider_clarification_on_high_risk():
    provider = DemoLLMProvider()
    resp = asyncio.run(provider.generate_sql_preview("Show high-risk devices in New York"))
    assert resp.intent_status == "clarification_needed"
    assert resp.clarification_question is not None
    assert "How would you like to define 'high-risk devices'?" in resp.clarification_question
    assert resp.sql is None


def test_demo_provider_clarification_on_unhealthy():
    provider = DemoLLMProvider()
    resp = asyncio.run(provider.generate_sql_preview("Find unhealthy devices"))
    assert resp.intent_status == "clarification_needed"
    assert "unhealthy" in resp.clarification_question.lower()


def test_demo_provider_unsupported_revenue():
    provider = DemoLLMProvider()
    resp = asyncio.run(provider.generate_sql_preview("What is our total quarterly revenue?"))
    assert resp.intent_status == "unsupported"
    assert "revenue" in resp.interpreted_question.lower()
    assert resp.sql is None


def test_demo_provider_unsupported_churn():
    provider = DemoLLMProvider()
    resp = asyncio.run(provider.generate_sql_preview("Predict customer churn rate for next month"))
    assert resp.intent_status == "unsupported"
    assert resp.sql is None


def test_get_llm_provider_default():
    provider = get_llm_provider()
    assert provider.name == "demo"
    assert provider.is_demo is True
