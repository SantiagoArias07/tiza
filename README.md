# Tiza · Bitácora Digital Docente

Bitácora digital para maestros de primaria: alumnos, calificaciones por
actividad (palomitas), asistencia y analítica. Tono premium y cálido.

- **Frontend:** Next.js 14 (App Router) + TypeScript → se despliega en **Vercel**
- **Backend:** Express + PostgreSQL → se despliega en **Render**
- **Datos:** el frontend trae la base de demo (24 alumnos, 8 materias); el
  backend guarda lo que el maestro cambia (calificaciones, notas, asistencia,
  criterios, actividades nuevas). Si el backend no responde, todo sigue
  funcionando y se guarda en el navegador (localStorage).

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
   dos cosas: el servicio web `tiza-server` y la base de datos `tiza-db`
   (Postgres, plan gratis). Dale **Apply**.
3. Cuando termine, copia la URL del servicio, por ejemplo
   `https://tiza-server.onrender.com`. Verifica que funciona abriendo
   `https://tiza-server.onrender.com/api/health` (debe responder
   `{"ok":true,"store":"postgres"}`).

> El `DATABASE_URL` se conecta solo gracias al blueprint. No tienes que copiar
> nada a mano.

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

- **Respaldo `.tiza`** y **CSV**: botón *Descargar respaldo* en la barra lateral.
- **PDF del alumno**: botón *Generar PDF del alumno* en la ficha de cada alumno.

Todas se generan en el navegador, así que funcionan aunque el backend esté
dormido (el plan gratis de Render suspende el servicio tras inactividad; la
primera petición después tarda ~30 s en despertar).

---

## Variables de entorno

| Dónde    | Variable              | Para qué                                   |
| -------- | --------------------- | ------------------------------------------ |
| Frontend | `NEXT_PUBLIC_API_URL` | URL del backend (Render)                   |
| Backend  | `DATABASE_URL`        | Postgres (lo pone el blueprint de Render)  |
| Backend  | `CORS_ORIGIN`         | URL del frontend (Vercel) permitida        |
| Backend  | `PORT`                | Puerto (lo pone Render automáticamente)    |

Ver `.env.example` (raíz) y `server/.env.example`.
