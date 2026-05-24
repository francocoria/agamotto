# Agamotto · Deploy

Stack productivo:
- **DB**: Supabase Postgres (`nciwpsmupophvkzexjdt.supabase.co`)
- **Backend (API)**: contenedor en Render / Railway / Fly.io
- **Frontend (Web)**: Vercel
- **Repo**: https://github.com/francocoria/agamotto

---

## 0 · Seguridad (HACER PRIMERO)

El `service_role` key de Supabase fue compartido por chat. **Rotalo** antes del primer deploy real:

1. Supabase Dashboard → Settings → API → "Reset service_role"
2. Actualizá `.env.local` con el nuevo valor
3. En Vercel, actualizá la env var `SUPABASE_SERVICE_ROLE_KEY` con el nuevo valor

El `anon` (publishable) key es seguro de exponer al cliente.

---

## 1 · Supabase

### 1.1 Obtener la connection string

Dashboard → Project Settings → Database → Connection String → **Connection pooling** (modo Transaction).

Formato:
```
postgresql://postgres.nciwpsmupophvkzexjdt:[DB-PASSWORD]@aws-0-<region>.pooler.supabase.com:6543/postgres
```

La password de la DB es la que pusiste al crear el proyecto. Si no la recordás: Settings → Database → "Reset database password".

### 1.2 Migrar a Supabase

```bash
cd api
export AGAMOTTO_DATABASE_URL="postgresql+psycopg://postgres.nciwpsmupophvkzexjdt:PASSWORD@aws-0-<region>.pooler.supabase.com:6543/postgres"
alembic upgrade head
```

### 1.3 Cargar datos

```bash
agamotto ingest fifa-2026
agamotto ingest martj42
agamotto train all
agamotto simulate --runs 100000
```

---

## 2 · Backend (API) en Render

1. New Web Service → Connect Repo `francocoria/agamotto` → Root directory: `api/`
2. Build: `pip install -e .` · Start: `uvicorn agamotto.api.main:app --host 0.0.0.0 --port $PORT`
3. Env vars:
   - `AGAMOTTO_DATABASE_URL=...` (Supabase pooler URL)
   - `AGAMOTTO_API_CORS_ORIGINS=["https://agamotto.vercel.app"]`
4. Health check path: `/`

Alternativa: usar el `Dockerfile` ya incluido y desplegar en Fly.io o Railway.

---

## 3 · Frontend (Web) en Vercel

```bash
cd web
npx vercel --prod
```

O conectá el repo desde el dashboard:
1. Import Project → `francocoria/agamotto` → Root directory: `web/`
2. Framework preset: Next.js (auto)
3. Env vars:
   - `NEXT_PUBLIC_API_BASE=https://<tu-api>.onrender.com`
   - `NEXT_PUBLIC_SUPABASE_URL=https://nciwpsmupophvkzexjdt.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>`
4. Deploy.

---

## 4 · Cron de reentrenamiento (opcional)

En Render: añadir un Cron Job que corra `agamotto train all && agamotto simulate --runs 100000` cada 6h.

---

## 5 · Verificación

```bash
curl https://<tu-api>.onrender.com/         # service info
curl https://<tu-api>.onrender.com/teams    # 48 selecciones
curl https://<tu-api>.onrender.com/simulation/latest
```

Visitá `https://agamotto.vercel.app` y comprobá que el home carga el ranking de campeones.
