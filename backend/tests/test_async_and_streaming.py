from app.database import async_engine, async_readonly_engine, AsyncSessionLocal


def test_process_time_header(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert "x-process-time-ms" in response.headers
    duration = float(response.headers["x-process-time-ms"])
    assert duration >= 0.0


def test_dashboard_caching_and_refresh(client, admin_headers):
    # First call populates cache
    r1 = client.get("/api/v1/dashboard/summary", headers=admin_headers)
    assert r1.status_code == 200
    data1 = r1.json()

    # Second call returns from cache
    r2 = client.get("/api/v1/dashboard/summary", headers=admin_headers)
    assert r2.status_code == 200
    assert r2.json() == data1

    # Cache-busting refresh
    r3 = client.get("/api/v1/dashboard/summary?refresh=true", headers=admin_headers)
    assert r3.status_code == 200
    assert r3.json()["total_devices"] == data1["total_devices"]


def test_chat_stream_sse_endpoint(client, analyst_headers):
    response = client.post(
        "/api/v1/chat/stream",
        json={"question": "Show all active routers"},
        headers=analyst_headers,
    )
    assert response.status_code == 200
    assert "text/event-stream" in response.headers.get("content-type", "")
    text = response.text
    assert "parsing_intent" in text
    assert "generating_sql" in text
    assert "validating_sqlglot_ast" in text
    assert "complete" in text


def test_async_database_engine_config():
    assert async_engine is not None
    assert async_readonly_engine is not None
    assert AsyncSessionLocal is not None
