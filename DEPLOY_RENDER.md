# Despliegue en Render — PlantDesk / SHEKINA S-MART LUB

Guía para publicar la app en [Render](https://render.com) con **un solo servicio web** (API + PWA) y **PostgreSQL**.

## Arquitectura en Render

| Componente | Render |
|------------|--------|
| API FastAPI | Web Service `plantdesk` |
| Frontend PWA | Servido por el mismo servicio (`/`) |
| Base de datos | PostgreSQL `plantdesk-db` |
| Archivos subidos | Carpeta `uploads/` en el disco del servicio* |

\* En el plan free los archivos subidos pueden perderse al redesplegar. Los datos demo usan URLs externas para fotos de máquinas.

## Paso 1 — Subir el código a GitHub

```bash
git init
git add .
git commit -m "Prepare Render deployment"
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

## Paso 2 — Crear el Blueprint en Render

1. Entra a [dashboard.render.com](https://dashboard.render.com)
2. **New** → **Blueprint**
3. Conecta el repositorio de GitHub
4. Render detectará `render.yaml` y creará:
   - Base de datos PostgreSQL `plantdesk-db`
   - Web Service `plantdesk`
5. Confirma y espera el **primer deploy** (5–10 min)

## Paso 3 — Verificar el deploy

1. Abre la URL del servicio, por ejemplo: `https://plantdesk-xxxx.onrender.com`
2. Comprueba la API: `https://plantdesk-xxxx.onrender.com/api/health`
   - Debe responder: `{"status":"ok", ...}`
3. Inicia sesión en la app con las credenciales demo:

| Perfil | RUT | PIN |
|--------|-----|-----|
| Mecánico | 22.222.222-2 | 1234 |
| Supervisor | 33.333.333-3 | 1234 |
| ITO | 44.444.444-4 | 1234 |
| Admin | 11.111.111-1 | admin1 |

> `SEED_DEMO=true` carga estos usuarios automáticamente la primera vez que la base está vacía.

## Variables de entorno (Render Dashboard)

Render configura la mayoría vía `render.yaml`. Puedes revisarlas en **plantdesk → Environment**:

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Inyectada desde PostgreSQL |
| `SECRET_KEY` | Generada automáticamente |
| `SEED_DEMO` | `true` — datos demo al primer arranque |
| `SERVE_STATIC` | `true` — sirve la PWA en `/` |
| `CORS_ORIGINS` | Solo necesario si separas frontend y API |

Opcional: añade la URL pública de Render a `CORS_ORIGINS` si usas otro dominio para el frontend.

## Plan free — consideraciones

- El servicio **se duerme** tras ~15 min sin tráfico; la primera carga puede tardar ~30–60 s.
- PostgreSQL free expira a los 90 días (Render envía aviso).
- Las fotos subidas por usuarios viven en disco efímero; para producción real conviene **Render Disk** o almacenamiento S3.

## Desarrollo local (sin cambios)

```bash
# Terminal 1 — API
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload --port 8001

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

## Probar build de producción en local

```bash
bash scripts/render-build.sh
cd backend
set SERVE_STATIC=true
set SEED_DEMO=true
uvicorn app.main:app --port 8001
```

Abre http://localhost:8001 — misma experiencia que en Render.

## Despliegue manual (sin Blueprint)

Si prefieres crear el servicio a mano:

1. **New → PostgreSQL** → nombre `plantdesk-db`
2. **New → Web Service** → conecta el repo
3. **Root Directory:** `backend`
4. **Build Command:** `bash ../scripts/render-build.sh`
5. **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. **Environment:**
   - `DATABASE_URL` → Internal Database URL de PostgreSQL
   - `SECRET_KEY` → generar valor aleatorio
   - `SEED_DEMO` → `true`
   - `SERVE_STATIC` → `true`
7. **Health Check Path:** `/api/health`

## Error: "cannot have more than one active free tier database"

Render **solo permite 1 base PostgreSQL gratuita activa** por cuenta. Si el Blueprint falla con ese mensaje, elige una opción:

### Opción A — Borrar la BD free que no uses (recomendado si es de otro proyecto viejo)

1. [dashboard.render.com](https://dashboard.render.com) → **PostgreSQL**
2. Identifica la base que **no necesitas** (otro proyecto, prueba antigua, etc.)
3. Abre esa BD → **Settings** → **Delete Database** (irreversible: se pierden los datos)
4. Vuelve a desplegar el Blueprint con `render.yaml` (o **Sync** en el Blueprint existente)

### Opción B — Reutilizar tu PostgreSQL existente (sin crear plantdesk-db)

1. Abre tu PostgreSQL existente en Render → copia **Internal Database URL**
2. Despliega **solo el Web Service** con `render-web-only.yaml` (no crea BD nueva)
3. En **plantdesk → Environment** → pega `DATABASE_URL` con la URL copiada
4. **Manual Deploy** o push al repo para redeploy

También puedes crear el Web Service a mano (sección "Despliegue manual" más abajo) y omitir el paso de crear PostgreSQL.

### Opción C — Plan de pago

En Render, upgrade de la BD a plan **Starter** (~7 USD/mes) si necesitas **dos** bases activas a la vez.

---

## Solución de problemas

| Problema | Solución |
|----------|----------|
| `cannot have more than one active free tier database` | Ver sección arriba (Opción A, B o C) |
| Blueprint: web service canceled | Suele ser consecuencia del fallo de la BD; arregla la BD primero y vuelve a sincronizar |
| Login 401 | Verifica RUT/PIN; ejecuta redeploy con `SEED_DEMO=true` |
| Login 403 bloqueado | Espera 15 min o borra usuarios bloqueados en BD |
| Pantalla en blanco | Revisa logs de build; debe existir `backend/static/index.html` |
| API no responde | Comprueba `/api/health` y logs del servicio |
| Build falla en npm | Node 20+ en Render (por defecto) |
