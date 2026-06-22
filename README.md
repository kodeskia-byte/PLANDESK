# SHEKINA S-MART LUB

Plataforma PWA para control, registro, trazabilidad y análisis de lubricación industrial (Arauco / Codex.cl).

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React + Vite + TypeScript + Tailwind CSS + PWA |
| Offline | Dexie.js (IndexedDB) + Service Worker |
| Backend | FastAPI + SQLAlchemy |
| Base de datos | PostgreSQL 16 |

## Requisitos

- Node.js 20+
- Python 3.11+
- Docker (para PostgreSQL)

## Inicio rápido

### 1. Backend (SQLite por defecto en desarrollo)

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload --port 8000
```

> **Producción:** usar PostgreSQL con `docker compose up -d` y configurar
> `DATABASE_URL=postgresql://shekina:shekina123@localhost:5432/shekina_db` en `.env`

API disponible en: http://localhost:8000/api/health

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App disponible en: http://localhost:5173

## Usuarios demo

| Perfil | RUT | PIN |
|--------|-----|-----|
| Mecánico | 22.222.222-2 | 1234 |
| Supervisor | 33.333.333-3 | 1234 |
| ITO | 44.444.444-4 | 1234 |
| Admin | 11.111.111-1 | admin1 |

## Módulos MVP implementados

- Login con RUT + PIN (JWT, bloqueo por intentos)
- Roles: mecánico, supervisor, ITO, admin
- Áreas y máquinas
- Registro de lubricación con evidencia fotográfica
- Modo offline + sincronización automática
- Historial de registros
- Validación por supervisor
- Reportes PDF y Excel
- Dashboard con KPIs y gráficos

## Estructura del proyecto

```
SHEKINA/
├── backend/          # API REST FastAPI
├── frontend/         # PWA React
├── docker-compose.yml
└── manual_tecnico_shekina_smart_lub_codex.txt
```

## Despliegue en Render (producción)

Ver guía completa: **[DEPLOY_RENDER.md](./DEPLOY_RENDER.md)**

Resumen:
1. Sube el repo a GitHub
2. En Render: **New → Blueprint** → selecciona el repo (`render.yaml` incluido)
3. Espera el deploy y abre la URL del servicio
4. Inicia sesión con las credenciales demo de la tabla anterior

El servicio incluye API (`/api`) y PWA (`/`) en la misma URL, con PostgreSQL y datos demo automáticos.

## Próximos pasos

- Módulo de administración completo (CRUD usuarios/áreas/máquinas)
- Planificación de lubricaciones y alertas
- QR por máquina
- Almacenamiento S3 para imágenes en producción
- Notificaciones push
