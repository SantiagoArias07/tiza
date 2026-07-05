#!/usr/bin/env node
/**
 * Rellena un grupo con datos simulados realistas (calificaciones variadas por
 * alumno/periodo + asistencia) para ver analíticas reales.
 *
 * Uso:
 *   node server/scripts/fill-group.mjs --email tu@correo.mx --password ****** \
 *        --group codex --url https://tiza-58m3.onrender.com
 *
 * Si omites --url usa http://localhost:4000.
 */

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const URL = (arg("url", "http://localhost:4000")).replace(/\/$/, "");
const EMAIL = arg("email");
const PASSWORD = arg("password");
const GROUP = (arg("group", "codex")).toLowerCase();

if (!EMAIL || !PASSWORD) {
  console.error("Faltan --email y/o --password");
  process.exit(1);
}

// Seeded PRNG (reproducible).
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(2024);

const NAMES = [
  "Ana Sofía Herrera", "Bruno Aguilar Mena", "Camila Ríos Duarte", "Diego Palacios León",
  "Elena Vázquez Cruz", "Fernando Ibáñez Soto", "Gabriela Nava Ríos", "Héctor Molina Paz",
  "Irene Castillo Vega", "Jorge Medina Lara", "Karla Sandoval Ruiz", "Luis Ángel Beltrán",
  "María Fernanda Ortega", "Néstor Cabrera Díaz", "Olivia Fuentes Marín", "Pablo Cordero Gil",
  "Quetzali Ramírez Sol", "Rodrigo Vargas Peña", "Sofía Miranda Cano", "Tadeo Rincón Bravo",
  "Ulises Guerra Mota", "Valeria Pineda Rojas", "Ximena Robles Cid", "Yael Domínguez Rico",
  "Zoe Espinoza Villa", "Alan Zúñiga Prieto",
];

async function api(method, path, token, body) {
  const res = await fetch(`${URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${data?.error ?? ""}`);
  return data;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

async function main() {
  console.log(`→ Conectando a ${URL} …`);
  const { token } = await api("POST", "/api/auth/login", null, {
    email: EMAIL,
    password: PASSWORD,
  });
  const groups = await api("GET", "/api/groups", token);
  const meta = groups.find((g) => g.label.toLowerCase() === GROUP);
  if (!meta) {
    console.error(`No encontré un grupo llamado "${GROUP}". Grupos: ${groups.map((g) => g.label).join(", ")}`);
    process.exit(1);
  }
  const doc = await api("GET", `/api/groups/${meta.id}`, token);
  console.log(`→ Grupo "${doc.label}" · ${doc.subjects.length} materias · ${doc.periodCount} periodos`);

  // 1) Alumnos
  if (!doc.students.length) {
    doc.students = NAMES.map((name, id) => ({ id, name }));
    console.log(`→ Agregué ${doc.students.length} alumnos`);
  }

  // 2) Habilidad por alumno (spread realista: algunos en riesgo, mayoría 7–9)
  const ability = {};
  const attRate = {};
  for (const s of doc.students) {
    ability[s.id] = Math.max(0.15, Math.min(1, 0.35 + rand() * 0.6));
    attRate[s.id] = 0.82 + rand() * 0.16;
  }
  // un par en riesgo claro
  doc.students.slice(0, 3).forEach((s) => (ability[s.id] = 0.2 + rand() * 0.15));

  const st = doc.state;
  st.cells = {}; st.notes = {}; st.attendance = {}; st.attDays = {};
  st.examTotals = {}; st.examAciertos = {}; st.overrides = {};

  const periods = Math.max(1, doc.periodCount || 3);
  for (let p = 0; p < periods; p++) {
    const drift = (p - 1) * 0.04; // leve mejora/declive entre periodos
    for (const subj of doc.subjects) {
      subj.rubros.forEach((r, ri) => {
        if (r.kind === "exam") {
          const total = 20;
          st.examTotals[`${p}-${subj.slug}`] = total;
          for (const s of doc.students) {
            const a = Math.max(0.1, Math.min(1, ability[s.id] + drift + (rand() - 0.5) * 0.15));
            st.examAciertos[`${p}-${subj.slug}-${s.id}`] = Math.round(8 + a * 12);
          }
          return;
        }
        const acts = r.activities.length || 1;
        for (let ai = 0; ai < acts; ai++) {
          for (const s of doc.students) {
            const a = Math.max(0.1, Math.min(1, ability[s.id] + drift + (rand() - 0.5) * 0.2));
            const roll = rand();
            let status = "complete";
            if (roll > 0.55 + a * 0.4) status = "missing";
            else if (roll > 0.35 + a * 0.4) status = "incomplete";
            st.cells[`${p}-${subj.slug}-${ri}-${ai}-${s.id}`] = status;
          }
        }
      });
    }
    // 3) Asistencia: ~18 días hábiles del periodo
    for (let d = 1; d <= 18; d++) {
      const day = `2026-0${p + 1}-${pad(d)}`;
      st.attDays[`${p}-${day}`] = true;
      for (const s of doc.students) {
        const roll = rand();
        let v = "P";
        if (roll > attRate[s.id] + 0.02) v = "A";
        else if (roll > attRate[s.id] - 0.05) v = "R";
        if (v !== "P") st.attendance[`${p}-${day}-${s.id}`] = v;
      }
    }
  }

  await api("PUT", `/api/groups/${doc.id}`, token, doc);
  const after = (await api("GET", "/api/groups", token)).find((g) => g.id === doc.id);
  console.log(`✓ Listo. Promedio del grupo: ${after.avg.toFixed(1)} · en riesgo: ${after.risk} · asistencia: ${after.attendance.toFixed(0)}%`);
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
