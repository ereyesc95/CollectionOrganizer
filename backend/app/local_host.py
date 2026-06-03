"""Friendly local URL hostname (no domain purchase or DNS setup)."""

# *.localhost is reserved and resolves to 127.0.0.1 in Chrome, Edge, and Firefox.
LOCAL_APP_HOST = "recordstack.localhost"


def app_url(port: int, path: str = "/") -> str:
    if not path.startswith("/"):
        path = "/" + path
    return f"http://{LOCAL_APP_HOST}:{port}{path}"
