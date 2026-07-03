import type { CellStatus, GroupData, Student, Subject } from "./types";

/** Build a cell key spanning the full subject space (boleta needs all 8). */
export function cellKey(
  subjectSlug: string,
  rubroIdx: number,
  activityIdx: number,
  studentId: number
): string {
  return `${subjectSlug}-${rubroIdx}-${activityIdx}-${studentId}`;
}

/** Deterministic mulberry32 PRNG so demo data is stable across reloads. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STUDENT_NAMES = [
  "Ana Sofía Hernández",
  "Diego Alejandro Martínez",
  "Valentina Ramírez López",
  "Mateo Sánchez Cruz",
  "Regina Torres Flores",
  "Santiago Gómez Reyes",
  "Camila Jiménez Vargas",
  "Emiliano Castro Morales",
  "Renata Ortiz Mendoza",
  "Sebastián Ruiz Aguilar",
  "Ximena Domínguez Peña",
  "Leonardo Vega Cabrera",
  "María José Guerrero Ríos",
  "Daniel Fuentes Navarro",
  "Isabella Ramos Delgado",
  "Ángel Gabriel Medina Soto",
  "Fernanda Cervantes Luna",
  "Adrián Rojas Campos",
  "Paulina Ríos Estrada",
  "Iker Salazar Ibarra",
  "Naomi Contreras Rivas",
  "Bruno Valdez Montoya",
  "Andrea Núñez Padilla",
  "Tadeo Espinoza Quintero",
];

const PALETTE: Array<[string, string]> = [
  ["#EDE7DC", "#7A6A4E"],
  ["#E5ECF1", "#41607B"],
  ["#E6EFE6", "#5E8A57"],
  ["#F2E8E3", "#B07A5E"],
  ["#EAEAF0", "#6A6A86"],
  ["#F3EFE0", "#9A8A3E"],
  ["#E5EFEC", "#4E8A78"],
  ["#F1E9F0", "#876A86"],
];

const SUBJECT_DEFS: Array<{ slug: string; name: string; abbr: string }> = [
  { slug: "espanol", name: "Español", abbr: "Esp" },
  { slug: "matematicas", name: "Matemáticas", abbr: "Mat" },
  { slug: "ciencias", name: "Ciencias Naturales", abbr: "C. Nat" },
  { slug: "historia", name: "Historia", abbr: "Hist" },
  { slug: "geografia", name: "Geografía", abbr: "Geo" },
  { slug: "civica", name: "Formación C. y É.", abbr: "FCyÉ" },
  { slug: "fisica", name: "Educación Física", abbr: "Ed. F" },
  { slug: "artes", name: "Artes", abbr: "Art" },
];

/** Activity labels per rubro index — kept short for 2-line column headers. */
const RUBRO_DEFS = [
  {
    name: "Actividades en clase",
    pct: 40,
    activities: [
      "Ejercicio 1",
      "Ejercicio 2",
      "Trabajo en equipo",
      "Lectura guiada",
      "Repaso",
    ],
  },
  {
    name: "Actividades en casa",
    pct: 20,
    activities: ["Tarea 1", "Tarea 2", "Proyecto"],
  },
  {
    name: "Examen",
    pct: 40,
    activities: ["Examen del trimestre"],
  },
];

function buildSubjects(): Subject[] {
  return SUBJECT_DEFS.map((def, i) => ({
    slug: def.slug,
    name: def.name,
    abbr: def.abbr,
    initial: def.name.charAt(0),
    bg: PALETTE[i][0],
    fg: PALETTE[i][1],
    rubros: RUBRO_DEFS.map((r) => ({
      name: r.name,
      pct: r.pct,
      activities: r.activities.map((name, ai) => ({
        name,
        date: `2026-02-${String(3 + ai * 2).padStart(2, "0")}`,
      })),
    })),
  }));
}

/**
 * Build the full demo group. Seeded so grades, risk flags and averages are
 * stable across reloads. Replace with real persistence in production.
 */
export function makeData(seed = 99): GroupData {
  const rand = mulberry32(seed);
  const students: Student[] = STUDENT_NAMES.map((name, id) => ({ id, name }));
  const subjects = buildSubjects();
  const cellStatus: Record<string, CellStatus> = {};

  for (const subject of subjects) {
    subject.rubros.forEach((rubro, ri) => {
      rubro.activities.forEach((_, ai) => {
        for (const student of students) {
          // Bias toward "complete" so the cohort looks healthy but real.
          const roll = rand();
          let status: CellStatus = "complete";
          if (roll > 0.86) status = "missing";
          else if (roll > 0.7) status = "incomplete";
          cellStatus[cellKey(subject.slug, ri, ai, student.id)] = status;
        }
      });
    });
  }

  return {
    id: "3b",
    label: "3° B",
    cycle: "2025–2026",
    trimester: "2° trimestre",
    students,
    subjects,
    cellStatus,
  };
}

export const POINTS: Record<CellStatus, number> = {
  complete: 10,
  incomplete: 6.5,
  missing: 0,
};
