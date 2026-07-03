export type CellStatus = "complete" | "incomplete" | "missing";
export type AttStatus = "P" | "R" | "A";

export interface User {
  id: string;
  email: string;
  name: string;
  school: string;
}

export interface UserRecord extends User {
  passwordHash: string;
  createdAt: number;
}

export interface Student {
  id: number;
  name: string;
}

export interface Activity {
  name: string;
  date: string;
}

export interface Rubro {
  name: string;
  pct: number;
  activities: Activity[];
  /** "exam" rubros are scored by aciertos/total instead of ✓◑✗ cells. */
  kind?: "exam";
}

export interface Subject {
  slug: string;
  name: string;
  abbr: string;
  initial: string;
  bg: string;
  fg: string;
  rubros: Rubro[];
}

/**
 * Mutable per-group state. Grade-related keys are period-prefixed
 * (e.g. "0-lenguajes-1-2-3" = period 0). See lib/data key helpers.
 */
export interface GroupState {
  cells: Record<string, CellStatus>;
  notes: Record<string, string>;
  attendance: Record<string, AttStatus>;
  privNotes: Record<string, string>;
  crit: number[];
  umbral: number;
  extraActivities: Record<string, Activity[]>;
  /** total questions per exam, key `${period}-${slug}` */
  examTotals: Record<string, number>;
  /** aciertos per student, key `${period}-${slug}-${studentId}` */
  examAciertos: Record<string, number>;
  /** manual grade overrides (0–10), rubro or subject level */
  overrides: Record<string, number>;
}

/** A full group document (students + subjects + state). */
export interface GroupDoc {
  id: string;
  userId: string;
  label: string;
  gradeLevel: string;
  cycle: string;
  /** label of the current/last-viewed period (kept for display) */
  trimester: string;
  /** number of evaluation periods in the cycle */
  periodCount: number;
  students: Student[];
  subjects: Subject[];
  state: GroupState;
  createdAt: number;
  updatedAt: number;
}

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
    privNotes: {},
    crit: [40, 20, 40],
    umbral: 3,
    extraActivities: {},
    examTotals: {},
    examAciertos: {},
    overrides: {},
  };
}

// toMeta is defined in index.ts where metrics are available (avoids a cycle).
