export type CellStatus = "complete" | "incomplete" | "missing";

/** Attendance status: Presente / Retardo / Ausente */
export type AttStatus = "P" | "R" | "A";

export interface Student {
  id: number;
  name: string;
}

export interface Activity {
  /** Two-line short label shown in column headers */
  name: string;
  date: string;
}

export interface Rubro {
  name: string;
  /** weight % of the subject grade */
  pct: number;
  activities: Activity[];
}

export interface Subject {
  /** stable slug used in routes, e.g. "matematicas" */
  slug: string;
  name: string;
  /** abbreviated label for the boleta columns */
  abbr: string;
  /** single-letter glyph for the subject square */
  initial: string;
  bg: string;
  fg: string;
  rubros: Rubro[];
}

export interface GroupData {
  id: string;
  label: string;
  cycle: string;
  trimester: string;
  students: Student[];
  subjects: Subject[];
  /** seeded cell statuses, keyed by cellKey() */
  cellStatus: Record<string, CellStatus>;
}

/**
 * Mutable state persisted to the backend / localStorage. The static baseline
 * (students, subjects, seeded cells) lives in the frontend; this is only what
 * the teacher changes on top of it.
 */
export interface PersistedState {
  edits: Record<string, CellStatus>;
  notes: Record<string, string>;
  attendance: Record<string, AttStatus>;
  privNotes: Record<string, string>;
  crit: number[];
  umbral: number;
  materias: string[];
  extraActivities: Record<string, Activity[]>;
}
