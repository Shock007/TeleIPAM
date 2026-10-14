"""Protección de endpoints: administrativos (.env) y sesión de usuario (JWT)."""
import hmac
import os

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.rate_limit import pin_limiter
from app.crud import user as user_crud
from app.Models.user import User
from app.services.auth_service import decode_access_token

LOCAL_HOSTS = {"127.0.0.1", "::1", "localhost"}
bearer = HTTPBearer(auto_error=False)


def require_admin(request: Request, x_admin_pin: str | None = Header(default=None)) -> None:
    host = request.client.host if request.client else ""
    if host not in LOCAL_HOSTS:
        raise HTTPException(status.HTTP_403_FORBIDDEN,
                            "La configuración solo puede modificarse desde el propio servidor (localhost).")

    pin = os.getenv("PROVIDER_PIN")  # se lee en cada request: refleja cambios del PUT
    if not pin:
        return  # primera configuración: basta con localhost

    key = f"admin:{host}"
    pin_limiter.check(key)
    if not x_admin_pin or not hmac.compare_digest(x_admin_pin.encode(), pin.encode()):
        pin_limiter.register_failure(key)
        raise HTTPException(status.HTTP_403_FORBIDDEN, "PIN de administrador inválido.")
    pin_limiter.reset(key)


def get_current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer),
                     db: Session = Depends(get_db)) -> User:
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesión no válida o expirada.",
                                 headers={"WWW-Authenticate": "Bearer"})
    if not creds:
        raise unauthorized
    user_id = decode_access_token(creds.credentials)
    user = user_crud.get_user(db, user_id) if user_id is not None else None
    if not user:
        raise unauthorized
    return user