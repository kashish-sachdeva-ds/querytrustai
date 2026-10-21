import time
import json
import threading
from typing import Any, Optional, Dict, Tuple
from functools import wraps

class InMemoryTTLCache:
    """Thread-safe in-memory cache with TTL expiration and cache-busting support."""

    def __init__(self, default_ttl: int = 60):
        self._cache: Dict[str, Tuple[Any, float]] = {}
        self._lock = threading.Lock()
        self.default_ttl = default_ttl

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._cache.get(key)
            if not entry:
                return None
            val, expire_at = entry
            if time.time() > expire_at:
                del self._cache[key]
                return None
            return val

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        ttl_seconds = ttl if ttl is not None else self.default_ttl
        expire_at = time.time() + ttl_seconds
        with self._lock:
            self._cache[key] = (value, expire_at)

    def delete(self, key: str) -> None:
        with self._lock:
            self._cache.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

    def cleanup_expired(self) -> int:
        now = time.time()
        count = 0
        with self._lock:
            expired_keys = [k for k, (_, exp) in self._cache.items() if now > exp]
            for k in expired_keys:
                del self._cache[k]
                count += 1
        return count


# Global cache instance for analytics and dashboards
ttl_cache = InMemoryTTLCache(default_ttl=60)
