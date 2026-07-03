import express from "express";
import cors from "cors";
import { createStore } from "./store";
import { emptyState, GroupState } from "./types";

const app = express();
const store = createStore();

// ---- CORS ----------------------------------------------------------------
// Allow the Vercel frontend (comma-separated origins in CORS_ORIGIN) or all.
const origins = (process.env.CORS_ORIGIN ?? "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: origins.includes("*") ? true : origins,
  })
);
app.use(express.json({ limit: "2mb" }));

// ---- Routes --------------------------------------------------------------
app.get("/", (_req, res) => {
  res.json({ name: "tiza-server", ok: true });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, store: store.kind });
});

app.get("/api/group/:id", async (req, res) => {
  try {
    const state = await store.get(req.params.id);
    res.json(state);
  } catch (err) {
    console.error("GET group failed", err);
    res.status(500).json({ error: "failed to read state" });
  }
});

app.put("/api/group/:id", async (req, res) => {
  try {
    const base = emptyState();
    const body = (req.body ?? {}) as Partial<GroupState>;
    // Whitelist fields so clients can't inject arbitrary keys.
    const next: GroupState = {
      edits: body.edits ?? base.edits,
      notes: body.notes ?? base.notes,
      attendance: body.attendance ?? base.attendance,
      privNotes: body.privNotes ?? base.privNotes,
      crit: Array.isArray(body.crit) ? body.crit : base.crit,
      umbral: typeof body.umbral === "number" ? body.umbral : base.umbral,
      materias: Array.isArray(body.materias) ? body.materias : base.materias,
      extraActivities: body.extraActivities ?? base.extraActivities,
      updatedAt: Date.now(),
    };
    const saved = await store.set(req.params.id, next);
    res.json(saved);
  } catch (err) {
    console.error("PUT group failed", err);
    res.status(500).json({ error: "failed to save state" });
  }
});

// ---- Boot ----------------------------------------------------------------
const PORT = Number(process.env.PORT) || 4000;

store
  .init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Tiza server listening on :${PORT} (store: ${store.kind})`);
    });
  })
  .catch((err) => {
    console.error("Failed to init store", err);
    process.exit(1);
  });
