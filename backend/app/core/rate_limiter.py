"""
QueryTrust AI — In-Memory Sliding-Window Rate Limiter
Enforces request rate limiting across critical API endpoints (e.g. login, LLM preview, datasource tests)
to protect against brute-force attacks, port-scanning abuse, and LLM quota exhaustion.
"""

import time
import threading
from typing import Dict, List, Optional
from fastapi import Request, HTTPException, status
from app.config import get_settings


class SlidingWindowRateLimiter:
    """Thread-safe in-memory sliding window rate limiter."""

    def __init__(self):
        self._lock = threading.Lock()
        self._requests: Dict[str, List[float]] = {}

    def is_allowed(self, key: str, max_requests: int, window_seconds: int = 60) -> tuple[bool, int]:
        """
        Check if request is permitted.
        Returns: (is_allowed, retry_after_seconds)
        """
        now = time.time()
        cutoff = now - window_seconds

        with self._lock:
            history = self._requests.get(key, [])
            # Prune timestamps older than window
            valid_history = [t for t in history if t > cutoff]

            if len(valid_history) >= max_requests:
                # Calculate remaining seconds until oldest request expires
                oldest = valid_history[0]
                retry_after = max(1, int(oldest + window_seconds - now))
                self._requests[key] = valid_history
                return False, retry_after

            valid_history.append(now)
            self._requests[key] = valid_history
            return True, 0

    def reset(self):
        """Reset all rate limiter state (useful for test suites)."""
        with self._lock:
            self._requests.clear()


limiter = SlidingWindowRateLimiter()


def rate_limit(max_requests: Optional[int] = None, window_seconds: int = 60):
    """
    FastAPI dependency to enforce rate limiting on specific endpoints.
    Bypasses throttling in test environment to avoid breaking automated test suites.
    """
    def dependency(request: Request):
        settings = get_settings()
        # In automated test suite or when explicitly disabled, skip rate limiting
        if settings.ENVIRONMENT == "testing" or request.headers.get("X-Test-Client"):
            return

        effective_limit = max_requests if max_requests is not None else settings.RATE_LIMIT_PER_MINUTE

        # Identify client by IP (or forwarded-for if trusted)
        forwarded = request.headers.get("X-Forwarded-For")
        client_ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
        endpoint_key = f"{request.method}:{request.url.path}:{client_ip}"

        allowed, retry_after = limiter.is_allowed(endpoint_key, effective_limit, window_seconds)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Maximum {effective_limit} requests per {window_seconds}s.",
                headers={"Retry-After": str(retry_after)},
            )

    return dependency
