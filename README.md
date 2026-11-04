# TeleIPAM - Sistema de Gestión, Monitoreo y Auditoría de Direcciones IP

**TeleIPAM** es una solución web integral diseñada para Proveedores de Servicios de Internet (ISP) y administradores de red. Su objetivo principal es automatizar la auditoría de redes, la gestión del inventario de direcciones IP y la detección proactiva de inconsistencias entre los registros del sistema y el tráfico real en la red (IPs no autorizadas o intrusas), integrando verificaciones ICMP/TCP asíncronas y sincronización con plataformas de gestión como **WispHub**.

---

## 🟢 Estados de las Direcciones IP.

El sistema clasifica las direcciones IP según la correlación entre la asignación administrativa y la actividad detectada en la red:

* **`FREE` (Libre - Verde):** Dirección IP que no tiene cliente asignado formalmente en el sistema y tampoco genera respuesta a pruebas ICMP/TCP ni actividad en la red. Está lista para ser asignada.
* **`ASSIGNED` (Asignada - Rojo):** Dirección IP asignada oficialmente a un cliente o servicio en la base de datos.
* **`ACTIVE` (Activa / Conflicto - Amarillo):** Dirección IP que **no está asignada a ningún cliente** en el registro del sistema, pero responde a pings, tiene puertos TCP abiertos o reporta tráfico activo. Representa una alerta de seguridad, IP intrusa o inconsistencia de inventario.

---

## Arquitectura del Sistema

TeleIPAM emplea una arquitectura desacoplada basada en microservicios/capas para optimizar el rendimiento y la velocidad de escaneo masivo de subredes:

```
                      ┌────────────────────────────────────────┐
                      │            Interfaz Web SPA            │
                      │     (React + TypeScript + Vite)        │
                      └───────────────────┬────────────────────┘
                                          │
                                          │ REST API / JSON
                                          ▼
                      ┌────────────────────────────────────────┐
                      │            FastAPI Backend             │
                      │     (Core API, Logic & Schemas)        │
                      └───────┬────────────────┬───────────────┘
                              │                │
            ┌─────────────────┴──┐          ┌──┴────────────────────────┐
            ▼                    ▼          ▼                           ▼
    ┌──────────────┐      ┌─────────────┐ ┌───────────────────┐  ┌────────────┐
    │ Ping Runner  │      │ Socket TCP  │ │ Adapter WispHub   │  │ APScheduler│
    │ (ICMP Async) │      │  (Asyncio)  │ │ (API Externa ISP) │  │ (Auditoría)│
    └──────────────┘      └─────────────┘ └───────────────────┘  └────────────┘
            │                    │                  │                   │
            └────────────────────┼──────────────────┴───────────────────┘
                                 ▼
                  ┌──────────────────────────────┐
                  │ Base de Datos Relacional     │
                  │ (PostgreSQL / MySQL / SQLite)│
                  └──────────────────────────────┘
```

---

## Modelo de Datos

El esquema relacional refleja la estructura del inventario de red, la relación con los clientes y el registro histórico de auditorías:

```
 ┌──────────────────────┐         ┌──────────────────────┐
 │       Subnet         │         │        Client        │
 ├──────────────────────┤         ├──────────────────────┤
 │ id (PK)              │         │ id (PK)              │
 │ cidr                 │         │ name                 │
 │ vlan_id              │         │ document_id          │
 │ name                 │         │ wisphub_id           │
 │ description          │         │ phone                │
 └──────────┬───────────┘         │ email                │
            │ 1                   └──────────┬───────────┘
            │                                │ 1
            │ N                              │ N
 ┌──────────┴────────────────────────────────┴───────────┐
 │                      IPAddress                        │
 ├───────────────────────────────────────────────────────┤
 │ ip (PK)                                               │
 │ subnet_id (FK -> Subnet.id)                           │
 │ client_id (FK -> Client.id, Nullable)                 │
 │ status [FREE | ASSIGNED | ACTIVE]                     │
 │ description                                           │
 └──────────┬────────────────────────────┘
                            │ 1
                            │ N
 ┌──────────────────────────┴────────────────────────────┐
 │                   IPStateHistory                      │
 ├───────────────────────────────────────────────────────┤
 │ id (PK)                                               │
 │ ip (FK -> IPAddress.ip)                               │
 │ checked_at (Timestamp)                                │
 │ ping_responsive (Boolean)                             │
 │ open_ports (Array/JSON)                               │
 │ wisphub_active (Boolean)                              │
 │ calculated_status                                     │
 └───────────────────────────────────────────────────────┘
```

---

## 📂 Estructura del Proyecto

```
TeleIPAM/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── subnets.py       # Endpoints CRUD de Subredes
│   │   │       ├── clients.py       # Endpoints CRUD de Clientes
│   │   │       ├── ips.py           # Escaneos y gestión de IPs
│   │   │       └── scheduler.py     # Auditoría y tareas programadas
│   │   ├── core/
│   │   │   ├── config.py            # Carga de variables de entorno
│   │   │   └── database.py          # Configuración de ORM y BD
│   │   ├── models/                  # Modelos SQLAlchemy / Peewee
│   │   ├── scanner/                 # Motor de escaneo asíncrono
│   │   │   ├── ping_runner.py       # Verificación ICMP
│   │   │   ├── socket_checker.py    # Chequeo de puertos TCP
│   │   │   └── wisphub_adapter.py   # Adaptador de integración WispHub
│   │   ├── static/                  # Build servido del frontend
│   │   └── main.py                  # Punto de entrada FastAPI
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/              # Componentes de UI (Grid, Modales, Tables)
│   │   ├── hooks/                   # Custom Hooks y TanStack Query
│   │   ├── pages/                   # Vistas principales (Dashboard, Subnets, Clients)
│   │   ├── services/                # Cliente API HTTP (Axios/Fetch)
│   │   ├── types/                   # Definiciones TypeScript
│   │   ├── App.tsx                  # Enrutador principal
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── docker-compose.yml
└── README.md
```

---

## 🛠️ Stack Tecnológico

* **Backend:**
  * Python 3.11+
  * FastAPI
  * SQLAlchemy / Peewee ORM
  * Asyncio (Scanners TCP/ICMP)
  * APScheduler (Auditorías programadas)
* **Frontend:**
  * React 18
  * TypeScript
  * Vite
  * Tailwind CSS + shadcn/ui
  * TanStack Query (React Query v5)
* **Base de Datos & Despliegue:**
  * PostgreSQL / MySQL / SQLite
  * Docker & Docker Compose

---

## 📋 Requisitos del Sistema

Para ejecutar TeleIPAM localmente o en producción, asegúrate de contar con:

1. **Software Base:**
   * **Python 3.11+** y `pip`
   * **Node.js 18+** y `npm`
   * **Docker & Docker Compose** *(Opcional, para despliegue en contenedores)*
   * Servidor **PostgreSQL 14+** o **MySQL 8+** *(SQLite soportado para pruebas locales)*
2. **Permisos de Red:**
   * Permisos de red para envío de paquetes ICMP Ping (Socket RAW / priviligos administrativos en ejecuciones de escaneo en ciertos sistemas).
   * Acceso de salida hacia la API de WispHub *(si se habilita la integración)*.

---

## ⚙️ Variables de Entorno

Crea un archivo `.env` en el directorio `backend/` tomando como referencia `.env.example`:

```env
# Configuración del Servidor Backend
PROJECT_NAME="TeleIPAM"
API_V1_STR="/api/v1"
DEBUG=True

# Conexión a Base de Datos
DATABASE_URL="postgresql://usuario:password@localhost:5432/teleipam_db"
# Ejemplo SQLite: sqlite:///./teleipam.db

# Configuración de Auditoría y Scanner
DEFAULT_SCAN_TIMEOUT=2.0
MAX_CONCURRENT_SCANS=100
SCAN_INTERVAL_HOURS=6

# Integración WispHub
WISPHUB_API_URL="https://api.wisphub.net/api/v1"
WISPHUB_API_KEY="tu_api_key_de_wisphub"
```

En el directorio `frontend/`, si requiere ajustar el endpoint base:

```env
VITE_API_BASE_URL="http://localhost:8000/api/v1"
```

---

## Guía de Arranque

### Opción 1: Despliegue con Docker (Recomendado)

```bash
# 1. Clonar el repositorio
git clone https://github.com/Shock007/TeleIPAM.git
cd TeleIPAM

# 2. Iniciar servicios con Docker Compose
docker-compose up --build -d
```

Acceso:
* **Frontend SPA:** `http://localhost:8000/app/`
* **Swagger API Docs:** `http://localhost:8000/docs`

---

### Opción 2: Desarrollo Local Manual

#### 1. Backend (FastAPI)

```bash
cd backend

# Crear y activar entorno virtual
python -m venv venv
source venv/bin/activate   # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env

# Iniciar servidor de desarrollo
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend (React + Vite)

En una nueva terminal:

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo con Hot Reload
npm run dev
```

El frontend estará accesible en `http://localhost:5173/`.

#### 3. Build del Frontend para Producción

Para compilar la SPA y servirla desde el backend FastAPI en `/app/`:

```bash
cd frontend
npm run build
```

---

## 👀 Endpoints API Principales

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/v1/subnets` | Lista de subredes y rangos CIDR registrados. |
| `POST` | `/api/v1/subnets` | Creación de una nueva subred. |
| `GET` | `/api/v1/clients` | Obtiene el listado de clientes registrados. |
| `GET` | `/api/v1/ips` | Consulta de direcciones IP filtradas por subred o estado (`FREE`, `ASSIGNED`, `ACTIVE`). |
| `POST` | `/api/v1/ips/scan` | Dispara un escaneo manual sobre un rango de IPs o subred (Síncrono/Asíncrono). |
| `PUT` | `/api/v1/ips/{ip}/assign` | Asigna o libera una IP a un cliente específico. |
| `GET` | `/api/v1/scheduler/status` | Devuelve el estado de la tarea programada de auditoría. |
| `POST` | `/api/v1/scheduler/run-now` | Forzado manual de la auditoría global de la red. |

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Consulta el archivo `LICENSE` para obtener más información.
