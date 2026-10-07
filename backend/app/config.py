"""Explicit browser origins; credentials and wildcard CORS are not enabled."""
from urllib.parse import urlsplit


def parse_origins(value: str) -> list[str]:
    origins = []
    for item in value.split(","):
        origin = item.strip().rstrip("/")
        if not origin:
            continue
        parsed = urlsplit(origin)
        if "*" in origin or parsed.scheme not in ("http", "https") or not parsed.netloc or parsed.path or parsed.query or parsed.fragment or parsed.username:
            raise ValueError("ALLOWED_ORIGINS must contain comma-separated http(s) origins without paths or wildcards")
        if origin not in origins:
            origins.append(origin)
    if not origins:
        raise ValueError("ALLOWED_ORIGINS must include at least one frontend origin")
    return origins
