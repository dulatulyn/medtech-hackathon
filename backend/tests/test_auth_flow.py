"""End-to-end auth flow over cookies."""
import pytest

REG = {"username": "alice", "email": "alice@example.com", "password": "Secur3pass"}


@pytest.mark.asyncio
async def test_register_me_refresh_logout(client):
    r = await client.post("/api/v1/auth/register", json=REG)
    assert r.status_code == 201
    assert "access_token" in client.cookies

    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 200
    assert r.json()["data"]["username"] == "alice"

    r = await client.post("/api/v1/auth/refresh")
    assert r.status_code == 200

    r = await client.post("/api/v1/auth/logout")
    assert r.status_code == 200

    client.cookies.clear()
    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post(
        "/api/v1/auth/register",
        json={"username": "bob", "email": "bob@example.com", "password": "Secur3pass"},
    )
    r = await client.post("/api/v1/auth/login", json={"username": "bob", "password": "wrong"})
    assert r.status_code == 400
