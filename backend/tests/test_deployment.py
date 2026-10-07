import pytest
import asyncio
import httpx
from app.config import parse_origins
from app.main import app


def request(method, path, **kwargs):
    async def send():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
            return await client.request(method, path, **kwargs)
    return asyncio.run(send())


def test_production_origins():
    assert parse_origins(" https://quant.example/, http://localhost:3000,https://quant.example ") == ["https://quant.example", "http://localhost:3000"]


@pytest.mark.parametrize("origin", ["*", "https://*.example.com", "", "https://example.com/path", "https://user@example.com", "ftp://example.com"])
def test_invalid_origins(origin):
    with pytest.raises(ValueError):
        parse_origins(origin)


def test_docs_and_openapi():
    assert request("GET", "/docs").status_code == 200
    spec = request("GET", "/openapi.json").json()
    for endpoint in ("entanglement", "noise", "illumination", "compare"):
        operation = spec["paths"][f"/simulate/{endpoint}"]["post"]
        assert operation["summary"] and operation["description"]
        assert operation["requestBody"] and operation["responses"]["200"]


def test_cors_allow_and_deny():
    for origin, permitted in [("http://localhost:3000", True), ("https://unlisted.example", False)]:
        result = request("OPTIONS", "/simulate/compare", headers={"Origin": origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "Content-Type"})
        assert (result.headers.get("access-control-allow-origin") == origin) is permitted
        assert "access-control-allow-credentials" not in result.headers
