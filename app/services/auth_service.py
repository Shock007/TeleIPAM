"""Hash de contraseñas (scrypt, stdlib) y tokens JWT."""
import base64
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

try:
    import jwt
except ModuleNotFoundError:  # pragma: no cover - depende de la instalación del paquete PyJWT.
    jwt = None

ALGORITHM = "HS256"
TOKEN_HOURS = 12
# Si JWT_SECRET no está en .env, se usa una clave aleatoria: las sesiones caducan al reiniciar.
_FALLBACK_SECRET = secrets.token_urlsafe(48)


def _secret() -> str:
    return os.getenv("JWT_SECRET") or _FALLBACK_SECRET


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return f"scrypt${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, salt_b64, hash_b64 = stored.split("$")
        salt, expected = base64.b64decode(salt_b64), base64.b64decode(hash_b64)
    except ValueError:
        return False
    dk = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return hmac.compare_digest(dk, expected)


def create_access_token(user_id: int) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS)
    return jwt.encode({"sub": str(user_id), "exp": exp}, _secret(), algorithm=ALGORITHM)


def decode_access_token(token: str) -> int | None:
    try:
        return int(jwt.decode(token, _secret(), algorithms=[ALGORITHM])["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None