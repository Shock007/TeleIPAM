"""Router: /api/v1/auth (registro, login, perfil)."""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.rate_limit import pin_limiter
from app.api.schemas import AuthResponse, LoginRequest, RegisterRequest, UserRead
from app.api.security import get_current_user
from app.crud import user as user_crud
from app.Models.user import User
from app.services.auth_service import create_access_token, hash_password, verify_password
from app.services.env_service import update_env_file

logger = logging.getLogger("ipam.auth")
router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if user_crud.get_by_email(db, payload.email):
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe una cuenta con ese correo.")

    first = user_crud.count_users(db) == 0  # la primera cuenta es admin
    try:
        user = user_crud.create_user(db, payload.email, hash_password(payload.password), is_admin=first)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe una cuenta con ese correo.") from exc

    saved = False
    if payload.wisphub_api_key and first:  # solo el primer usuario toca la configuración global
        try:
            update_env_file({"wisphub_api_key": payload.wisphub_api_key})
            saved = True
        except Exception:  # noqa: BLE001
            logger.exception("No se pudo guardar la API key de WispHub")

    return AuthResponse(access_token=create_access_token(user.id), user=user, wisphub_saved=saved)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    key = f"login:{request.client.host if request.client else 'unknown'}"
    pin_limiter.check(key)  # 5 fallos / 5 min -> 429

    user = user_crud.get_by_email(db, payload.email)
    if not user or not verify_password(payload.password, user.password_hash):
        pin_limiter.register_failure(key)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Correo o contraseña incorrectos.")

    pin_limiter.reset(key)
    return AuthResponse(access_token=create_access_token(user.id), user=user)


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_user)):
    return user