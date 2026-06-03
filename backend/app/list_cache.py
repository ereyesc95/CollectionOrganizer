"""In-memory cache for /api/records list responses."""

from __future__ import annotations

from app.schemas import RecordListOut

_LIST_EPOCH: str | None = None
_LIST_CACHE: dict[str, RecordListOut] = {}
_MAX_ENTRIES = 24


def list_cache_get(epoch: str, query_key: str) -> RecordListOut | None:
    global _LIST_EPOCH
    if epoch != _LIST_EPOCH:
        _LIST_CACHE.clear()
        _LIST_EPOCH = epoch
    return _LIST_CACHE.get(query_key)


def list_cache_set(epoch: str, query_key: str, value: RecordListOut) -> None:
    global _LIST_EPOCH
    if epoch != _LIST_EPOCH:
        _LIST_CACHE.clear()
        _LIST_EPOCH = epoch
    if len(_LIST_CACHE) >= _MAX_ENTRIES:
        _LIST_CACHE.pop(next(iter(_LIST_CACHE)))
    _LIST_CACHE[query_key] = value


def invalidate_list_cache() -> None:
    global _LIST_EPOCH
    _LIST_EPOCH = None
    _LIST_CACHE.clear()
