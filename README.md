# Tiza · Bitácora Digital Docente

Bitácora digital para maestros de primaria: alumnos, calificaciones por
actividad (palomitas), asistencia y analítica. Tono premium y cálido.

- **Frontend:** Next.js 14 (App Router) + TypeScript → se despliega en **Vercel**
- **Backend:** Express + PostgreSQL + autenticación (bcrypt + JWT) → se
  despliega en **Render**
- **Cuentas:** cada maestro se registra con correo y contraseña y ve solo sus
  grupos. Al registrarse recibe un grupo demo (3° B con 24 alumnos) para
  explorar, y puede crear más grupos, agregar/quitar alumnos, etc.
- **Datos:** el backend guarda todo (grupos, alumnos, calificaciones, notas,
  asistencia, criterios). Los cambios se sincronizan automáticamente.

---

## Correr en local

Necesitas dos terminales.

**1. Backend** (usa un archivo JSON local, sin base de datos):

```bash
cd server
npm install
npm run dev          # queda escuchando en http://localhost:4000
```

**2. Frontend:**

```bash
npm install
npm run dev          # abre http://localhost:3000
```

El frontend habla con `http://localhost:4000` por defecto. Para apuntar a otra
URL, crea un archivo `.env.local` en la raíz:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## Desplegar

### Paso 0 — Sube el repo a GitHub

```bash
git add .
git commit -m "Tiza inicial"
git push
```

### Paso 1 — Backend en Render

1. Entra a [render.com](https://render.com) → **New → Blueprint**.
2. Conecta este repositorio. Render detecta el archivo `render.yaml` y crea
   tres cosas: el servicio web `tiza-server` (con `rootDir: server`), la base
   de datos `tiza-db` (Postgres, plan gratis) y un `JWT_SECRET` aleatorio.
   Dale **Apply**.
3. Cuando termine, copia la URL del servicio, por ejemplo
   `https://tiza-server.onrender.com`. Verifica que funciona abriendo
   `https://tiza-server.onrender.com/api/health` (debe responder
   `{"ok":true,"store":"postgres"}`).

> `DATABASE_URL` y `JWT_SECRET` se configuran solos gracias al blueprint.
>
> **Si creaste el servicio a mano** (sin blueprint) y el build corre
> `next build` / falla con "Cannot find module 'express'", es porque apunta a
> la raíz. Arréglalo en **Settings** del servicio: **Root Directory** = `server`,
> **Build Command** = `npm install && npm run build`, **Start Command** =
> `npm start`. Guarda y vuelve a desplegar con "Clear build cache & deploy".

### Paso 2 — Frontend en Vercel

1. Entra a [vercel.com](https://vercel.com) → **Add New → Project** e importa
   este repositorio. Vercel detecta Next.js automáticamente.
2. En **Environment Variables** agrega:
   - `NEXT_PUBLIC_API_URL` = la URL de Render del paso 1
     (ej. `https://tiza-server.onrender.com`)
3. Deploy. Copia la URL final (ej. `https://tiza.vercel.app`).

### Paso 3 — Conecta los dos (CORS)

Para que el navegador pueda llamar al backend, en Render abre el servicio
`tiza-server` → **Environment** → edita `CORS_ORIGIN` y pon tu URL de Vercel:

```
CORS_ORIGIN=https://tiza.vercel.app
```

Guarda (Render reinicia solo). Listo: frontend en Vercel, backend + base de
datos en Render, todo sincronizado.

---

## Descargas

- **Respaldo `.json`** y **CSV**: botón *Descargar respaldo* en la barra lateral
  (dentro de un grupo). El `.json` se abre en cualquier editor; el `.csv` en
  Excel o Google Sheets.
- **PDF del alumno**: botón *Generar PDF del alumno* en la ficha de cada alumno.

Todas se generan en el navegador con extensiones estándar, así que funcionan
aunque el backend esté dormido (el plan gratis de Render suspende el servicio
tras inactividad; la primera petición después tarda ~30 s en despertar).

---

## Variables de entorno

| Dónde    | Variable              | Para qué                                   |
| -------- | --------------------- | ------------------------------------------ |
| Frontend | `NEXT_PUBLIC_API_URL` | URL del backend (Render)                   |
| Backend  | `DATABASE_URL`        | Postgres (lo pone el blueprint de Render)  |
| Backend  | `JWT_SECRET`          | Firma de sesiones (lo genera el blueprint) |
| Backend  | `CORS_ORIGIN`         | URL del frontend (Vercel) permitida        |
| Backend  | `PORT`                | Puerto (lo pone Render automáticamente)    |

Ver `.env.example` (raíz) y `server/.env.example`.
