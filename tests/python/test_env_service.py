import pytest

from app.services import env_service


@pytest.fixture()
def env_file(monkeypatch, tmp_path):
    path = tmp_path / ".env"
    path.write_text(
        "DATABASE_URL=postgresql://u:p@localhost/db\nSCAN_TIMEOUT=2\n", encoding="utf-8"
    )
    monkeypatch.setattr(env_service, "ENV_PATH", path)
    monkeypatch.setattr("app.services.scheduler.apply_schedule", lambda: None)
    for k in env_service.MANAGED_KEYS:
        monkeypatch.delenv(k, raising=False)
    return path


def test_solo_scan_timeout_no_requiere_reinicio(env_file):
    _, _, restart = env_service.update_env_file({"scan_timeout": 5})
    assert restart is False


def test_cambiar_database_url_requiere_reinicio(env_file):
    _, _, restart = env_service.update_env_file(
        {"database_url": "postgresql://u:p@otro-host/db"}
    )
    assert restart is True
