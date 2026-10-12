# TeleIPAM — Administración y auditoría de direcciones IP para ISP

Sistema de gestión de direcciones IP para un proveedor de internet (ISP): inventario de subredes, clientes e IPs, verificación de red (ping y puertos TCP), integración con **WispHub** y auditoría programada. Backend en **FastAPI**, frontend en **React**.

## Contenido

- [Estados de una IP](#estados-de-una-ip)
- [Arquitectura](#arquitectura)
- [Modelo de datos](#modelo-de-datos)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Stack](#stack)
- [Puesta en marcha](#puesta-en-marcha)
- [Variables de entorno](#variables-de-entorno)
- [Endpoints principales](#endpoints-principales)
- [Pruebas](#pruebas)
- [Pendientes y deuda técnica](#pendientes-y-deuda-técnica)

## Estados de una IP

| Estado | Significado |
| :--- | :--- |
| `FREE` | Sin cliente asignado y sin respuesta en la red. |
| `ASSIGNED` | Asignada administrativamente a un cliente. |
| `ACTIVE` | Responde en la red (o está activa en WispHub) pero **sin registro administrativo**: posible IP intrusa. |

## Arquitectura

```
 React SPA (Vite)  ──REST/JSON──▶  FastAPI (app/)
                                     ├─ api/        routers + schemas + seguridad
                                     ├─ crud/       acceso a datos
                                     ├─ services/   ping, TCP, WispHub, evaluación, scheduler
                                     └─ Models/     SQLAlchemy 2.0
                                           │
                                  PostgreSQL / MySQL (Alembic)
```

La SPA compilada se sirve desde el propio backend en `/app/`; el dashboard HTML estático de respaldo, en `/dashboard/`.

## Modelo de datos

Definido en `app/Models/` (SQLAlchemy 2.0) y versionado con Alembic (`alembic/versions/0001_initial_schema.py`).

```
Subnet 1──N IPAddress N──1 Client (opcional)
                 │ 1
                 N
          IPStateHistory
```

**`Subnet`** (`subnets`): `id`, `cidr` (único), `name`, `description`, `vlan_id`, `created_at`, `updated_at`.

**`Client`** (`clients`): `id`, `full_name`, `document_id` (único), `email`, `phone`, `address`, `wisphub_client_id`, `is_active`, `created_at`, `updated_at`.

**`IPAddress`** (`ip_addresses`): `id`, `ip_address` (único), `subnet_id` → `subnets.id`, `client_id` → `clients.id` (nulo), `status` (`FREE | ASSIGNED | ACTIVE`), `description`, `created_at`, `updated_at`.

**`IPStateHistory`** (`ip_state_history`): bitácora de cambios de estado.

| Campo | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | int (PK) | |
| `ip_id` | int (FK → `ip_addresses.id`) | `ON DELETE CASCADE` |
| `previous_status` | texto, nulo | Estado anterior |
| `new_status` | texto | Estado detectado |
| `method` | enum `CheckMethod` | `PING`, `TCP`, `WISPHUB`, `MANUAL` |
| `details` | texto, nulo | Detalle de la verificación |
| `checked_at` | fecha/hora con zona | Momento de la verificación |

## Estructura del proyecto

```text
.
├── app/                      # Backend FastAPI (Python)
│   ├── main.py               # Entrypoint, routers, CORS, montaje de SPA y dashboard
│   ├── config.py             # DATABASE_URL, SQL_ECHO, PROVIDER_PIN, WISPHUB_* y funciones get_*
│   ├── database.py           # Engine y sesión SQLAlchemy
│   ├── spa.py                # StaticFiles con fallback a index.html
│   ├── api/
│   │   ├── routers/          # clients, ips, subnets, scheduler, env
│   │   ├── schemas.py        # Esquemas Pydantic
│   │   ├── security.py       # require_admin (X-Admin-PIN, solo localhost)
│   │   ├── rate_limit.py     # Límite de intentos de PIN
│   │   └── deps.py
│   ├── crud/                 # client, subnet, ip_address, ip_state_history
│   ├── Models/               # Subnet, Client, IPAddress, IPStateHistory
│   └── services/             # ping_service, tcp_scanner, wisphub_adapter, range_scanner,
│                             # evaluation, scan_commit, single_query, subnet_report,
│                             # scheduler, authorization, env_service
├── alembic/                  # Migraciones (alembic.ini en la raíz)
├── frontend/                 # SPA React + Vite + TypeScript
│   └── src/                  # api/, components/, lib/, pages/, types/, router.tsx
├── static/
│   ├── dashboard/            # Dashboard HTML/Bootstrap de respaldo
│   └── app/                  # Build de la SPA (generado, `npm run build`)
├── tests/python/             # Pruebas pytest de la API y servicios
├── demo_*.py                 # Scripts de demostración (CRUD, escaneo, consulta)
├── requirements.txt / requirements-dev.txt / pytest.ini / .env.example
└── (heredado Laravel)        # ver "Pendientes y deuda técnica"
```

## Stack

- **Backend:** Python 3.11+, FastAPI, SQLAlchemy 2, Alembic, Pydantic 2, APScheduler, openpyxl (exportación de subredes). Bases de datos: PostgreSQL (`psycopg2`) o MySQL (`PyMySQL`).
- **Verificación de red:** ping, sockets TCP asíncronos y adaptador de la API de WispHub.
- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS 4, shadcn/ui (base-ui), TanStack Query v5, React Hook Form + Zod, Sonner.

## Puesta en marcha

No existe configuración Docker en el repositorio; la ejecución es local.

### Backend

```bash
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                              # configurar DATABASE_URL
alembic upgrade head                              # crea el esquema
uvicorn app.main:app --reload --port 8000
```

Swagger: <http://localhost:8000/docs>

### Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173/ (proxy de /api hacia :8000)
npm run build        # compila a ../static/app, servido en http://localhost:8000/app/
```

## Variables de entorno

Se leen del `.env` en la raíz (ver `.env.example`) y también se pueden editar desde la página **Variables del entorno** de la SPA.

| Variable | Descripción |
| :--- | :--- |
| `DATABASE_URL` | `postgresql+psycopg2://…` o `mysql+pymysql://…` |
| `SQL_ECHO` | `true` para ver el SQL generado |
| `PROVIDER_PIN` | PIN que habilita las consultas TCP y protege la edición de variables |
| `SCHEDULER_ENABLED`, `SCAN_INTERVAL_HOURS`, `SCAN_CONCURRENCY`, `SCAN_TIMEOUT` | Auditoría programada. Se aplican en caliente |
| `WISPHUB_API_KEY`, `WISPHUB_BASE_URL` | Integración con WispHub (opcional) |

**Seguridad de `/api/v1/env`:** solo accesible desde localhost. Si `PROVIDER_PIN` está definido, se exige el header `X-Admin-PIN` (la SPA lo pide en el campo "PIN de administrador"); 5 fallos seguidos bloquean temporalmente (429). Cambiar `DATABASE_URL`, el PIN o WispHub requiere reiniciar el servidor; las claves del scheduler no.

## Endpoints principales

Prefijo `/api/v1`. Documentación completa en `/docs`.

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET/POST/PUT/DELETE` | `/subnets`, `/subnets/{id}` | CRUD de subredes |
| `GET` | `/subnets/{id}/export` | Exporta el reporte de la subred |
| `GET/POST/PUT/DELETE` | `/clients`, `/clients/{id}` | CRUD de clientes |
| `GET` / `POST` | `/ips` | Lista (filtros, paginación) / crea IPs |
| `GET` | `/ips/stats` | Métricas por estado |
| `POST` | `/ips/scan` | Escaneo de rango/subred (síncrono o asíncrono `202`) |
| `POST` | `/ips/scan/commit` | Guarda los resultados de un escaneo |
| `POST` | `/ips/query` | Consulta de una IP (ping; TCP solo con PIN) |
| `GET` | `/ips/{ip}/history` | Historial de estados |
| `PUT` | `/ips/{ip}/assign` | Asigna/desasigna cliente y estado |
| `GET` / `POST` | `/scheduler/status`, `/scheduler/run-now` | Estado y ejecución inmediata de la auditoría |
| `GET` / `PUT` | `/env` | Variables de entorno (admin, localhost) |
| `GET` | `/health` | Verificación de salud |

## Pruebas

```bash
pip install -r requirements-dev.txt
pytest tests/python -v
```

CI de Python: `.github/workflows/python-tests.yml` (3.11 y 3.12).

## Pendientes y deuda técnica

- **Laravel es un esqueleto heredado, no se usa.** El sistema real es 100 % FastAPI + React. Los siguientes archivos pertenecen al esqueleto y no participan en la aplicación: `composer.json`, `artisan`, `package.json` y `vite.config.js` de la raíz, `phpunit.xml`, `bootstrap/`, `config/`, `public/`, `routes/`, `resources/`, `database/`, `storage/`, `tests/Feature`, `tests/Unit`, `tests/TestCase.php`, `app/Http/`, `app/Providers/`, `app/Models/User.php` y `.github/workflows/tests.yml`. **Recomendación: eliminarlos** para reducir ruido (`app/Models/` se conserva: contiene los modelos Python). También conviene reemplazar `CLAUDE.md`/`AGENTS.md`, que describen Laravel.
- **Docker (Fase 6):** pendiente. No hay `Dockerfile` ni `docker-compose.yml`.
- `main.py` en la raíz es un stub sin uso; el entrypoint real es `app/main.py`.
- Falta archivo `LICENSE`.
