import { randomUUID } from "crypto";
import {
  CellStatus,
  GroupDoc,
  Student,
  Subject,
  emptyState,
} from "./types";

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
  ["#E5ECF1", "#41607B"],
  ["#E6EFE6", "#5E8A57"],
  ["#F2E8E3", "#B07A5E"],
  ["#EDE7DC", "#7A6A4E"],
  ["#E5EFEC", "#4E8A78"],
];

// Campos formativos del plan de estudios 2022 (SEP) + Educación Física.
const SUBJECT_DEFS = [
  { slug: "lenguajes", name: "Lenguajes", abbr: "Leng" },
  {
    slug: "saberes",
    name: "Saberes y Pensamiento Científico",
    abbr: "Saberes",
  },
  { slug: "etica", name: "Ética, Naturaleza y Sociedades", abbr: "Ética" },
  { slug: "humano", name: "De lo Humano y lo Comunitario", abbr: "Humano" },
  { slug: "fisica", name: "Educación Física", abbr: "Ed. Fís" },
];

const RUBRO_DEFS: Array<{
  name: string;
  pct: number;
  activities: string[];
  kind?: "exam";
}> = [
  {
    name: "Actividades en clase",
    pct: 40,
    activities: ["Ejercicio 1", "Ejercicio 2", "Trabajo en equipo", "Lectura guiada", "Repaso"],
  },
  {
    name: "Actividades en casa",
    pct: 20,
    activities: ["Tarea 1", "Tarea 2", "Proyecto"],
  },
  { name: "Examen", pct: 40, activities: ["Examen del periodo"], kind: "exam" },
];

const DEFAULT_PERIODS = 3;

/** Default campos-formativos catalog for any group. */
export function defaultSubjects(): Subject[] {
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
      kind: r.kind,
      activities: r.activities.map((name, ai) => ({
        name,
        date: `2026-02-${String(3 + ai * 2).padStart(2, "0")}`,
      })),
    })),
  }));
}

function cellKey(p: number, slug: string, ri: number, ai: number, sid: number) {
  return `${p}-${slug}-${ri}-${ai}-${sid}`;
}

/** The demo group (3° B) seeded on every new account. */
export function seedDemoGroup(userId: string): GroupDoc {
  const rand = mulberry32(99);
  const students: Student[] = STUDENT_NAMES.map((name, id) => ({ id, name }));
  const subjects = defaultSubjects();
  const state = emptyState();

  for (let p = 0; p < DEFAULT_PERIODS; p++) {
    for (const subject of subjects) {
      subject.rubros.forEach((rubro, ri) => {
        if (rubro.kind === "exam") {
          const total = 20;
          state.examTotals[`${p}-${subject.slug}`] = total;
          for (const student of students) {
            state.examAciertos[`${p}-${subject.slug}-${student.id}`] =
              Math.round(12 + rand() * 8); // 12–20 aciertos
          }
          return;
        }
        rubro.activities.forEach((_, ai) => {
          for (const student of students) {
            const roll = rand();
            let status: CellStatus = "complete";
            if (roll > 0.86) status = "missing";
            else if (roll > 0.7) status = "incomplete";
            state.cells[cellKey(p, subject.slug, ri, ai, student.id)] = status;
          }
        });
      });
    }
  }

  const now = Date.now();
  return {
    id: randomUUID(),
    userId,
    label: "3° B",
    gradeLevel: "3° Primaria",
    cycle: "2025–2026",
    trimester: "Periodo 1",
    periodCount: DEFAULT_PERIODS,
    rounding: "half",
    students,
    subjects,
    state,
    createdAt: now,
    updatedAt: now,
  };
}

/** A fresh empty group (created by the teacher). */
export function newGroup(
  userId: string,
  input: { label: string; gradeLevel?: string; cycle?: string; trimester?: string }
): GroupDoc {
  const now = Date.now();
  return {
    id: randomUUID(),
    userId,
    label: input.label,
    gradeLevel: input.gradeLevel || "Primaria",
    cycle: input.cycle || "2025–2026",
    trimester: input.trimester || "Periodo 1",
    periodCount: DEFAULT_PERIODS,
    rounding: "half",
    students: [],
    subjects: defaultSubjects(),
    state: emptyState(),
    createdAt: now,
    updatedAt: now,
  };
}
