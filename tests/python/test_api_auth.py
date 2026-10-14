import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_db
from app.api.rate_limit import pin_limiter

BODY = {"email": "Admin@Example.com", "password": "secreto123"}


@pytest.fixture()
def auth_client(db_session):
    from app.main import app
    pin_limiter.clear()
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_register_primero_admin_y_segundo_no(auth_client):
    r = auth_client.post("/api/v1/auth/register", json=BODY)
    assert r.status_code == 201
    assert r.json()["user"]["is_admin"] is True and r.json()["user"]["email"] == "admin@example.com"
    r2 = auth_client.post("/api/v1/auth/register", json={"email": "b@x.com", "password": "secreto123"})
    assert r2.json()["user"]["is_admin"] is False


def test_register_duplicado_409_y_validaciones_422(auth_client):
    auth_client.post("/api/v1/auth/register", json=BODY)
    assert auth_client.post("/api/v1/auth/register", json=BODY).status_code == 409
    assert auth_client.post("/api/v1/auth/register",
                            json={"email": "c@x.com", "password": "corta"}).status_code == 422
    assert auth_client.post("/api/v1/auth/register",
                            json={"email": "mal", "password": "secreto123"}).status_code == 422


def test_login_ok_y_mal(auth_client):
    auth_client.post("/api/v1/auth/register", json=BODY)
    assert auth_client.post("/api/v1/auth/login", json=BODY).status_code == 200
    bad = {**BODY, "password": "otra-clave"}
    assert auth_client.post("/api/v1/auth/login", json=bad).status_code == 401


def test_endpoints_protegidos(auth_client):
    assert auth_client.get("/api/v1/ips").status_code == 401
    token = auth_client.post("/api/v1/auth/register", json=BODY).json()["access_token"]
    h = {"Authorization": f"Bearer {token}"}
    assert auth_client.get("/api/v1/ips", headers=h).status_code == 200
    assert auth_client.get("/api/v1/auth/me", headers=h).json()["email"] == "admin@example.com"