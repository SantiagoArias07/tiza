import { randomUUID } from "crypto";
import express from "express";
import cors from "cors";
import { createStore } from "./store";
import {
  AuthedRequest,
  hashPassword,
  requireAuth,
  signToken,
  verifyPassword,
} from "./auth";
import { newGroup, seedDemoGroup } from "./seed";
import { computeMetrics } from "./metrics";
import { GroupDoc, GroupMeta, User, UserRecord, emptyState } from "./types";

/** Fill any fields missing from older saved docs so nothing reads undefined. */
function normalize(doc: GroupDoc): GroupDoc {
  return {
    ...doc,
    periodCount: doc.periodCount && doc.periodCount > 0 ? doc.periodCount : 3,
    students: Array.isArray(doc.students) ? doc.students : [],
    subjects: Array.isArray(doc.subjects) ? doc.subjects : [],
    state: { ...emptyState(), ...(doc.state ?? {}) },
  };
}

function toMeta(doc: GroupDoc): GroupMeta {
  const m = computeMetrics(doc);
  return {
    id: doc.id,
    label: doc.label,
    gradeLevel: doc.gradeLevel,
    cycle: doc.cycle,
    trimester: doc.trimester,
    periodCount: doc.periodCount ?? 3,
    studentCount: doc.students.length,
    avg: m.avg,
    risk: m.risk,
    attendance: m.attendance,
  };
}

const app = express();
const store = createStore();

const origins = (process.env.CORS_ORIGIN ?? "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({ origin: origins.includes("*") ? true : origins }));
app.use(express.json({ limit: "4mb" }));

const publicUser = (u: UserRecord): User => ({
  id: u.id,
  email: u.email,
  name: u.name,
  school: u.school,
});

// ---- Health --------------------------------------------------------------
app.get("/", (_req, res) => res.json({ name: "tiza-server", ok: true }));
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, store: store.kind })
);

// ---- Auth ----------------------------------------------------------------
app.post("/api/auth/register", async (req, res) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    const name = String(req.body?.name ?? "").trim() || "Docente";
    const school = String(req.body?.school ?? "").trim() || "Mi escuela";

    if (!email || !password) {
      return res.status(400).json({ error: "correo y contraseña requeridos" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "la contraseña debe tener al menos 6 caracteres" });
    }
    if (await store.getUserByEmail(email)) {
      return res.status(409).json({ error: "ese correo ya está registrado" });
    }

    const user: UserRecord = {
      id: randomUUID(),
      email,
      name,
      school,
      passwordHash: await hashPassword(password),
      createdAt: Date.now(),
    };
    await store.createUser(user);
    // Seed a demo group so the account isn't empty.
    await store.saveGroup(seedDemoGroup(user.id));

    res.json({ token: signToken(user.id), user: publicUser(user) });
  } catch (err) {
    console.error("register failed", err);
    res.status(500).json({ error: "no se pudo crear la cuenta" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    const user = await store.getUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: "correo o contraseña incorrectos" });
    }
    res.json({ token: signToken(user.id), user: publicUser(user) });
  } catch (err) {
    console.error("login failed", err);
    res.status(500).json({ error: "no se pudo iniciar sesión" });
  }
});

app.get("/api/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await store.getUserById(req.userId!);
  if (!user) return res.status(404).json({ error: "usuario no encontrado" });
  res.json({ user: publicUser(user) });
});

// ---- Groups --------------------------------------------------------------
app.get("/api/groups", requireAuth, async (req: AuthedRequest, res) => {
  const groups = await store.listGroups(req.userId!);
  res.json(groups.map(normalize).map(toMeta));
});

app.post("/api/groups", requireAuth, async (req: AuthedRequest, res) => {
  const label = String(req.body?.label ?? "").trim();
  if (!label) return res.status(400).json({ error: "el nombre es requerido" });
  const doc = newGroup(req.userId!, {
    label,
    gradeLevel: req.body?.gradeLevel,
    cycle: req.body?.cycle,
    trimester: req.body?.trimester,
  });
  const saved = await store.saveGroup(doc);
  res.json(saved);
});

async function ownedGroup(
  req: AuthedRequest,
  res: express.Response
): Promise<GroupDoc | null> {
  const doc = await store.getGroup(req.params.id);
  if (!doc || doc.userId !== req.userId) {
    res.status(404).json({ error: "grupo no encontrado" });
    return null;
  }
  return normalize(doc);
}

app.get("/api/groups/:id", requireAuth, async (req: AuthedRequest, res) => {
  const doc = await ownedGroup(req, res);
  if (doc) res.json(doc);
});

app.put("/api/groups/:id", requireAuth, async (req: AuthedRequest, res) => {
  const existing = await ownedGroup(req, res);
  if (!existing) return;
  const body = req.body as Partial<GroupDoc>;
  // Merge, keeping ownership + identity server-controlled.
  const next: GroupDoc = {
    ...existing,
    label: body.label ?? existing.label,
    gradeLevel: body.gradeLevel ?? existing.gradeLevel,
    cycle: body.cycle ?? existing.cycle,
    trimester: body.trimester ?? existing.trimester,
    periodCount:
      typeof body.periodCount === "number"
        ? body.periodCount
        : existing.periodCount ?? 3,
    students: Array.isArray(body.students) ? body.students : existing.students,
    subjects: Array.isArray(body.subjects) ? body.subjects : existing.subjects,
    state: body.state ? { ...emptyState(), ...body.state } : existing.state,
  };
  const saved = await store.saveGroup(next);
  res.json(saved);
});

app.delete("/api/groups/:id", requireAuth, async (req: AuthedRequest, res) => {
  const doc = await ownedGroup(req, res);
  if (!doc) return;
  await store.deleteGroup(doc.id);
  res.json({ ok: true });
});

// ---- Boot ----------------------------------------------------------------
const PORT = Number(process.env.PORT) || 4000;
store
  .init()
  .then(() => {
    app.listen(PORT, () =>
      console.log(`Tiza server on :${PORT} (store: ${store.kind})`)
    );
  })
  .catch((err) => {
    console.error("Failed to init store", err);
    process.exit(1);
  });
