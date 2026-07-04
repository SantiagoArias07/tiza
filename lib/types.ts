export type CellStatus = "complete" | "incomplete" | "missing";

/** Attendance status: Presente / Retardo / Ausente */
export type AttStatus = "P" | "R" | "A";

export interface User {
  id: string;
  email: string;
  name: string;
  school: string;
}

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
  /** "exam" rubros are scored by aciertos/total instead of ✓◑✗ cells. */
  kind?: "exam";
}

export interface Subject {
  /** stable slug used in cell keys, e.g. "matematicas" */
  slug: string;
  name: string;
  abbr: string;
  initial: string;
  bg: string;
  fg: string;
  rubros: Rubro[];
}

/**
 * Mutable per-group state. Grade keys are period-prefixed. See lib/data.
 */
export type RoundingMode = "half" | "sixty" | "none";

export interface GroupState {
  cells: Record<string, CellStatus>;
  notes: Record<string, string>;
  /** student status per period+day, key `${period}-${day}-${studentId}` */
  attendance: Record<string, AttStatus>;
  /** days where lista was taken, key `${period}-${day}` */
  attDays: Record<string, boolean>;
  privNotes: Record<string, string>;
  crit: number[];
  umbral: number;
  extraActivities: Record<string, Activity[]>;
  examTotals: Record<string, number>;
  examAciertos: Record<string, number>;
  overrides: Record<string, number>;
}

/** A full group document (students + subjects + state). */
export interface GroupDoc {
  id: string;
  userId: string;
  label: string;
  gradeLevel: string;
  cycle: string;
  trimester: string;
  periodCount: number;
  rounding: RoundingMode;
  students: Student[];
  subjects: Subject[];
  state: GroupState;
  createdAt: number;
  updatedAt: number;
}

/** Lightweight group summary for lists. */
export interface GroupMeta {
  id: string;
  label: string;
  gradeLevel: string;
  cycle: string;
  trimester: string;
  periodCount: number;
  studentCount: number;
  avg: number;
  risk: number;
  attendance: number;
}

export function emptyState(): GroupState {
  return {
    cells: {},
    notes: {},
    attendance: {},
    attDays: {},
    privNotes: {},
    crit: [40, 20, 40],
    umbral: 3,
    extraActivities: {},
    examTotals: {},
    examAciertos: {},
    overrides: {},
  };
}

export function periodLabel(index: number): string {
  return `Periodo ${index + 1}`;
}
