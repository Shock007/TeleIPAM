"""
Punto de entrada de la API REST + SPA React + Dashboard estático.

    uvicorn app.main:app --reload
Docs: http://127.0.0.1:8000/docs   |   SPA: http://127.0.0.1:8000/app/
"""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routers.auth import router as auth_router
from app.api.routers.clients import router as clients_router
from app.api.routers.env import router as env_router
from app.api.routers.ips import router as ips_router
from app.api.routers.scheduler import router as scheduler_router
from app.api.routers.subnets import router as subnets_router
from app.api.security import get_current_user
from app.config import get_scheduler_enabled
from app.services.scheduler import shutdown_scheduler, start_scheduler
from app.spa import SPAStaticFiles

logger = logging.getLogger("ipam.main")

APP_DIST = Path(__file__).resolve().parent.parent / "static" / "app"


@asynccontextmanager
async def lifespan(app: FastAPI):
    if get_scheduler_enabled():
        start_scheduler()
    try:
        yield
    finally:
        shutdown_scheduler()


app = FastAPI(
    title="IPAM System API",
    description="API REST del sistema IPAM: IPs, subredes, clientes, escaneo (PING) y auditoría automática.",
    version="0.6.0",
    lifespan=lifespan,
)

# En producción restringir allow_origins a la URL real del frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173",
                   "http://localhost:8000", "http://127.0.0.1:8000"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],
)

protected = [Depends(get_current_user)]

app.include_router(auth_router)                              # público
app.include_router(env_router)                               # ya protegido por localhost + PIN
app.include_router(ips_router, dependencies=protected)
app.include_router(subnets_router, dependencies=protected)
app.include_router(clients_router, dependencies=protected)
app.include_router(scheduler_router, dependencies=protected)

# Dashboard HTML de respaldo (ver nota: ya no puede leer la API sin token).
app.mount("/dashboard", StaticFiles(directory="static/dashboard", html=True), name="dashboard")

if (APP_DIST / "index.html").is_file():
    app.mount("/app", SPAStaticFiles(directory=APP_DIST, html=True), name="spa")
else:
    logger.warning("static/app no existe: ejecuta 'npm run build' en frontend/ para servir /app.")


@app.get("/api/v1/health", tags=["health"])
def health_check() -> dict:
    return {"status": "ok"}