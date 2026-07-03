import { POINTS, cellKey } from "./data";
import type {
  AttStatus,
  CellStatus,
  GroupData,
  Student,
  Subject,
} from "./types";

const RISK_THRESHOLD = 6.0;

type CellMap = Record<string, CellStatus>;

/** Average activity points for a single rubro → 0–10 score. */
export function rubroScore(
  subject: Subject,
  rubroIdx: number,
  studentId: number,
  cells: CellMap
): number {
  const rubro = subject.rubros[rubroIdx];
  if (!rubro.activities.length) return 0;
  let sum = 0;
  rubro.activities.forEach((_, ai) => {
    const status =
      cells[cellKey(subject.slug, rubroIdx, ai, studentId)] ?? "complete";
    sum += POINTS[status];
  });
  return sum / rubro.activities.length;
}

/** Weighted subject grade for a student, 0–10. */
export function subjectGrade(
  subject: Subject,
  studentId: number,
  cells: CellMap,
  crit?: number[]
): number {
  let total = 0;
  subject.rubros.forEach((rubro, ri) => {
    const pct = crit ? crit[ri] : rubro.pct;
    total += rubroScore(subject, ri, studentId, cells) * (pct / 100);
  });
  return total;
}

/** Average per activity column (table footer). */
export function activityAverage(
  subject: Subject,
  rubroIdx: number,
  activityIdx: number,
  students: Student[],
  cells: CellMap
): number {
  if (!students.length) return 0;
  let sum = 0;
  for (const s of students) {
    const status =
      cells[cellKey(subject.slug, rubroIdx, activityIdx, s.id)] ?? "complete";
    sum += POINTS[status];
  }
  return sum / students.length;
}

export function studentAverage(
  data: GroupData,
  studentId: number,
  cells: CellMap
): number {
  const grades = data.subjects.map((s) => subjectGrade(s, studentId, cells));
  return grades.reduce((a, b) => a + b, 0) / grades.length;
}

export function isAtRisk(
  data: GroupData,
  studentId: number,
  cells: CellMap
): boolean {
  return data.subjects.some(
    (s) => subjectGrade(s, studentId, cells) < RISK_THRESHOLD
  );
}

export function failedSubjects(
  data: GroupData,
  studentId: number,
  cells: CellMap
): Subject[] {
  return data.subjects.filter(
    (s) => subjectGrade(s, studentId, cells) < RISK_THRESHOLD
  );
}

export function groupAverage(data: GroupData, cells: CellMap): number {
  const avgs = data.students.map((s) => studentAverage(data, s.id, cells));
  return avgs.reduce((a, b) => a + b, 0) / avgs.length;
}

export function riskCount(data: GroupData, cells: CellMap): number {
  return data.students.filter((s) => isAtRisk(data, s.id, cells)).length;
}

export function subjectAverage(
  subject: Subject,
  students: Student[],
  cells: CellMap
): number {
  const grades = students.map((s) => subjectGrade(subject, s.id, cells));
  return grades.reduce((a, b) => a + b, 0) / grades.length;
}

/* ---- Attendance ---------------------------------------------------------- */

export function attKey(day: string, studentId: number): string {
  return `${day}-${studentId}`;
}

/** % attendance = (present + delays) / school days seen for the student. */
export function attendancePct(
  studentId: number,
  days: string[],
  att: Record<string, AttStatus>
): { pct: number; present: number; delays: number; absent: number } {
  let present = 0;
  let delays = 0;
  let absent = 0;
  for (const d of days) {
    const v = att[attKey(d, studentId)] ?? "P";
    if (v === "P") present++;
    else if (v === "R") delays++;
    else absent++;
  }
  const total = days.length || 1;
  return { pct: ((present + delays) / total) * 100, present, delays, absent };
}

export function fmt(n: number, digits = 1): string {
  return n.toFixed(digits);
}
