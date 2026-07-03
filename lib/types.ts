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

/** Mutable per-group state (grades, notes, attendance, config). */
export interface GroupState {
  cells: Record<string, CellStatus>;
  notes: Record<string, string>;
  attendance: Record<string, AttStatus>;
  privNotes: Record<string, string>;
  crit: number[];
  umbral: number;
  extraActivities: Record<string, Activity[]>;
}

/** A full group document (students + subjects + state). */
export interface GroupDoc {
  id: string;
  userId: string;
  label: string;
  gradeLevel: string;
  cycle: string;
  trimester: string;
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
  };
}
