# Tiza — Digital Grade Book for Teachers

Tiza is a warm, premium web app that replaces the paper grade book used by
Mexican primary‑school teachers. It handles the full evaluation cycle —
students, activity tracking ("palomitas"), exams, attendance and analytics —
and generates the official **SEP evaluation report** and an internal
**concentrado** as print‑ready PDFs.

> Built around Mexico's current *campos formativos* curriculum (Plan 2022):
> Lenguajes · Saberes y Pensamiento Científico · Ética, Naturaleza y Sociedades ·
> De lo Humano y lo Comunitario · Educación Física.

**Stack:** Next.js 14 (App Router) + TypeScript · Express + PostgreSQL · JWT auth
· jsPDF. Frontend deploys to **Vercel**, backend to **Render**.

---

## Highlights

- **Accounts & multi‑group** — email/password auth (bcrypt + JWT); each teacher
  sees only their groups and starts with a seeded demo group.
- **Evaluation by period** — configurable number of periods shown as tabs; every
  period is fully independent (its own activities and grades).
- **Flexible criteria** — rename, add and remove evaluation criteria; weights are
  normalized to 100% automatically.
- **Three‑state activity cells** — ✓ complete / ◑ incomplete / ✗ not submitted,
  with per‑cell notes; grades recompute live.
- **Exam by correct answers** — set the exam's total questions once, enter each
  student's *aciertos*, and the grade is scored over 10.
- **Manual overrides** — any computed grade can be edited by hand, flagged as
  "edited" while keeping the calculated value in a tooltip.
- **Attendance** — navigable monthly calendar tied to each period, with a real
  "present / total registered days" ratio and absence‑threshold alerts.
- **Analytics** — group average, at‑risk students, grade distribution, delivery
  rate and average‑per‑period evolution.
- **PDF reports** — official SEP boleta (portrait) and a landscape concentrado,
  both filled with real grades and configurable rounding.
- **Automatic daily backups** — a point‑in‑time snapshot of every group is stored
  each day (last 7 kept), downloadable and restorable.
- **Offline‑resilient** — the app keeps working from `localStorage` if the API is
  briefly unreachable, then re‑syncs.
- **Responsive** — works on desktop and mobile (collapsible sidebar).

---

## Architecture

```
tiza/
├── app/                 # Next.js routes (dashboard, login, group screens)
├── components/          # UI: AppShell, PeriodTabs, StatusCell, modals, PDF-less UI
├── lib/                 # Domain logic
│   ├── types.ts         #   shared types (GroupDoc, GroupState, …)
│   ├── data.ts          #   key helpers (cells, exams, overrides)
│   ├── calc.ts          #   grade/attendance calculations (period + cycle)
│   ├── store.tsx        #   React context store (loads/saves group docs)
│   ├── auth.tsx         #   auth context
│   ├── api.ts           #   typed API client
│   └── export.ts        #   PDF/CSV generation (jsPDF)
└── server/              # Express API
    ├── src/index.ts     #   routes: auth, groups CRUD, backups
    ├── src/store.ts     #   Postgres (prod) or JSON file (dev) storage
    ├── src/metrics.ts   #   server-side metrics for group lists
    ├── src/seed.ts      #   demo group + default subjects
    └── scripts/         #   fill-group.mjs (demo data generator)
```

**Data model.** The frontend owns the static baseline (subject catalog, seeded
demo). Each group is a single document (`GroupDoc`) containing its students,
subjects and a mutable `state` (grades, notes, attendance, exam data, manual
overrides, per‑period activity lists). Grade keys are period‑prefixed
(`${period}-${subject}-${rubro}-${activity}-${student}`) so periods never
collide. Grades are computed per period and aggregated over the cycle.

---

## Getting started (local)

Two terminals.

**Backend** (uses a local JSON file, no database needed):

```bash
cd server
npm install
npm run dev            # http://localhost:4000
```

**Frontend:**

```bash
npm install
npm run dev            # http://localhost:3000
```

Point the frontend at another API by creating `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## Deployment

### Backend — Render

1. **New → Blueprint** and connect the repo. `render.yaml` provisions the web
   service (`rootDir: server`), a free **PostgreSQL** instance and a generated
   `JWT_SECRET`.
2. Verify `https://<your-backend>.onrender.com/api/health` returns
   `{"ok":true,"store":"postgres"}`.

> If `store` says `file`, data is ephemeral. Create a Postgres instance and set
> `DATABASE_URL` (plus `JWT_SECRET`) on the service.

### Frontend — Vercel

1. Import the repo (Next.js is auto‑detected).
2. Set `NEXT_PUBLIC_API_URL` to the Render URL.
3. On Render, set `CORS_ORIGIN` to the Vercel URL.

### Environment variables

| Where    | Variable              | Purpose                                  |
| -------- | --------------------- | ---------------------------------------- |
| Frontend | `NEXT_PUBLIC_API_URL` | Backend base URL                         |
| Backend  | `DATABASE_URL`        | Postgres connection (blank → JSON file)  |
| Backend  | `JWT_SECRET`          | Signs session tokens                     |
| Backend  | `CORS_ORIGIN`         | Allowed frontend origin(s)               |

---

## Reports & backups

- **Per student:** official **SEP boleta** (PDF) and **concentrado** (PDF).
- **Per group:** all boletas in one PDF, plus a **CSV** export.
- **Automatic:** a daily snapshot of all groups is kept server‑side (7 days),
  and can be downloaded or restored from the sidebar.

Demo data generator (fills a group with realistic, varied grades):

```bash
node server/scripts/fill-group.mjs \
  --email you@example.com --password ****** \
  --group codex --url https://<your-backend>.onrender.com
```

---

## License

MIT — see [LICENSE](LICENSE).
