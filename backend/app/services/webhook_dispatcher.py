import time
import hmac
import hashlib
import json
import logging
from datetime import datetime, timezone
from urllib.parse import urlparse
from typing import List, Dict, Any, Optional, Tuple
import httpx

from app.config import get_settings

logger = logging.getLogger("querytrust.services.webhook")


def validate_webhook_url(url: str) -> None:
    """Validate webhook URL and enforce SSRF protections against internal cloud metadata."""
    settings = get_settings()
    parsed = urlparse(url.strip())
    if parsed.scheme not in ("http", "https"):
        raise ValueError("Webhook URL must use http or https scheme.")

    hostname = (parsed.hostname or "").lower().strip()
    if not hostname:
        raise ValueError("Invalid webhook URL: missing hostname.")

    # Enforce cloud metadata & private SSRF protection
    blocked = settings.blocked_hosts_list
    if hostname in blocked or any(hostname.endswith("." + b) for b in blocked if not b.replace(".", "").isdigit()):
        raise ValueError(f"Prohibited webhook destination '{hostname}' (SSRF protection).")


def format_alert_payload(
    platform: str,
    alert_type: str,
    title: str,
    description: str,
    fields: List[Dict[str, str]],
    severity: str = "critical",
) -> Dict[str, Any]:
    """Format alert notification for the destination platform (Discord, Slack, or Generic JSON)."""
    now_iso = datetime.now(timezone.utc).isoformat()

    if platform == "discord":
        # Colors: Critical (Red #E74C3C), Warning (Orange #E67E22), Info/Success (Green #2ECC71)
        color = 15158332 if severity == "critical" else 15105570 if severity == "warning" else 3066993
        return {
            "content": f"🚨 **[QueryTrust AI Alert] {title}**",
            "embeds": [
                {
                    "title": title,
                    "description": description,
                    "color": color,
                    "fields": [{"name": f["name"], "value": str(f["value"]), "inline": True} for f in fields[:10]],
                    "footer": {"text": "QueryTrust AI • Enterprise Telemetry & Governance"},
                    "timestamp": now_iso,
                }
            ],
        }

    if platform == "slack":
        return {
            "text": f"🚨 [QueryTrust AI] {title}: {description}",
            "blocks": [
                {
                    "type": "header",
                    "text": {"type": "plain_text", "text": f"🚨 {title[:150]}"},
                },
                {
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": description},
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*{f['name']}*:\n{f['value']}"}
                        for f in fields[:8]
                    ],
                },
                {
                    "type": "context",
                    "elements": [
                        {"type": "mrkdwn", "text": f"Dispatched by QueryTrust AI • Severity: *{severity.upper()}*"}
                    ],
                },
            ],
        }

    # Default generic JSON payload
    return {
        "event": alert_type,
        "severity": severity,
        "title": title,
        "description": description,
        "fields": fields,
        "timestamp": now_iso,
    }


def compute_hmac_signature(payload_bytes: bytes, secret_token: str) -> Dict[str, str]:
    """Generate HMAC-SHA256 signature headers for webhook payload verification."""
    timestamp = str(int(time.time()))
    signature = hmac.new(
        secret_token.encode("utf-8"),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()
    return {
        "X-QueryTrust-Signature": f"sha256={signature}",
        "X-QueryTrust-Timestamp": timestamp,
    }


async def dispatch_webhook(
    url: str,
    platform: str,
    alert_type: str,
    title: str,
    description: str,
    fields: List[Dict[str, str]],
    severity: str = "critical",
    secret_token: Optional[str] = None,
    max_retries: int = 2,
) -> Tuple[bool, Optional[int], Optional[float], str]:
    """Asynchronously dispatch formatted alert payload with retries and timing telemetry.

    Returns: (success: bool, status_code: Optional[int], latency_ms: Optional[float], message: str)
    """
    try:
        validate_webhook_url(url)
    except ValueError as e:
        return False, None, None, str(e)

    payload = format_alert_payload(
        platform=platform,
        alert_type=alert_type,
        title=title,
        description=description,
        fields=fields,
        severity=severity,
    )
    payload_bytes = json.dumps(payload).encode("utf-8")

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "QueryTrust-AI-WebhookDispatcher/1.0",
    }
    if secret_token:
        headers.update(compute_hmac_signature(payload_bytes, secret_token))

    start_time = time.perf_counter()
    last_status = None
    last_error = "Unknown error"

    for attempt in range(max_retries + 1):
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.post(url, content=payload_bytes, headers=headers)
                latency = round((time.perf_counter() - start_time) * 1000, 2)
                last_status = resp.status_code

                # Discord returns 204 No Content or 200 OK; Slack returns 200 with text 'ok'
                if 200 <= resp.status_code < 300:
                    logger.info(f"Webhook dispatched successfully to {platform} (status={resp.status_code}, latency={latency}ms)")
                    return True, resp.status_code, latency, "Webhook dispatched successfully."

                last_error = f"HTTP {resp.status_code}: {resp.text[:200]}"
                if resp.status_code < 500:
                    # Client errors (4xx like bad webhook URL) shouldn't retry
                    break

        except httpx.RequestError as exc:
            last_error = f"Network connection error: {str(exc)}"

        if attempt < max_retries:
            time.sleep(0.3 * (attempt + 1))

    latency = round((time.perf_counter() - start_time) * 1000, 2)
    logger.warning(f"Webhook dispatch failed to {platform} after {attempt + 1} attempts: {last_error}")
    return False, last_status, latency, last_error
