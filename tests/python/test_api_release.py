def test_release_a_libre(client, seed):
    r = client.put(f"/api/v1/ips/{seed['ip_assigned'].ip_address}/release", json={"status": "FREE"})
    assert r.status_code == 200
    assert r.json()["status"] == "FREE" and r.json()["client_id"] is None


def test_release_a_activa_sin_registrar_y_historial(client, seed):
    ip = seed["ip_assigned"].ip_address
    r = client.put(f"/api/v1/ips/{ip}/release", json={"status": "ACTIVE"})
    assert r.json()["status"] == "ACTIVE"
    h = client.get(f"/api/v1/ips/{ip}/history").json()
    assert h[0]["method"] == "MANUAL" and h[0]["previous_status"] == "ASSIGNED"


def test_release_ip_no_asignada_409(client, seed):
    r = client.put(f"/api/v1/ips/{seed['ip_free'].ip_address}/release", json={"status": "FREE"})
    assert r.status_code == 409


def test_release_status_invalido_422(client, seed):
    r = client.put(f"/api/v1/ips/{seed['ip_assigned'].ip_address}/release", json={"status": "ASSIGNED"})
    assert r.status_code == 422