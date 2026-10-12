import pytest
from fastapi.testclient import TestClient

from app.api.security import pin_limiter
from app.main import app


@pytest.fixture()
def local_client(monkeypatch, tmp_path):
    monkeypatch.setenv("PROVIDER_PIN", "1234")
    monkeypatch.setattr("app.services.env_service.ENV_PATH", tmp_path / ".env")
    pin_limiter.clear()
    with TestClient(app, client=("127.0.0.1", 50000)) as c:
        yield c
    pin_limiter.clear()


def test_env_sin_header_403(local_client):
    assert local_client.get("/api/v1/env").status_code == 403


def test_env_pin_incorrecto_403(local_client):
    r = local_client.get("/api/v1/env", headers={"X-Admin-PIN": "0000"})
    assert r.status_code == 403


def test_env_pin_correcto_200(local_client):
    r = local_client.get("/api/v1/env", headers={"X-Admin-PIN": "1234"})
    assert r.status_code == 200
