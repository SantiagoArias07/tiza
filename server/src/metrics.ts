import { CellStatus, GroupDoc, Subject } from "./types";

const POINTS: Record<CellStatus, number> = {
  complete: 10,
  incomplete: 6.5,
  missing: 0,
};
const RISK_THRESHOLD = 6.0;

function cellKey(slug: string, ri: number, ai: number, sid: number) {
  return `${slug}-${ri}-${ai}-${sid}`;
}

function rubroScore(
  doc: GroupDoc,
  subject: Subject,
  ri: number,
  sid: number
): number {
  const rubro = subject.rubros[ri];
  const extra = doc.state.extraActivities[`${subject.slug}-${ri}`] ?? [];
  const total = rubro.activities.length + extra.length;
  if (!total) return 0;
  let sum = 0;
  for (let ai = 0; ai < total; ai++) {
    const status = doc.state.cells[cellKey(subject.slug, ri, ai, sid)] ?? "complete";
    sum += POINTS[status];
  }
  return sum / total;
}

export function subjectGrade(doc: GroupDoc, subject: Subject, sid: number): number {
  let g = 0;
  subject.rubros.forEach((r, ri) => {
    const pct = doc.state.crit[ri] ?? r.pct;
    g += rubroScore(doc, subject, ri, sid) * (pct / 100);
  });
  return g;
}

function studentAverage(doc: GroupDoc, sid: number): number {
  if (!doc.subjects.length) return 0;
  const grades = doc.subjects.map((s) => subjectGrade(doc, s, sid));
  return grades.reduce((a, b) => a + b, 0) / grades.length;
}

/** Weekdays of February 2026 (Feb 1 is a Sunday). */
function schoolDays(): string[] {
  const out: string[] = [];
  for (let d = 1; d <= 28; d++) {
    if ((6 + (d - 1)) % 7 < 5) out.push(`2026-02-${String(d).padStart(2, "0")}`);
  }
  return out;
}

export function computeMetrics(doc: GroupDoc): {
  avg: number;
  risk: number;
  attendance: number;
} {
  const students = doc.students;
  if (!students.length) return { avg: 0, risk: 0, attendance: 100 };

  const avgs = students.map((s) => studentAverage(doc, s.id));
  const avg = avgs.reduce((a, b) => a + b, 0) / avgs.length;
  const risk = students.filter((s) =>
    doc.subjects.some((subj) => subjectGrade(doc, subj, s.id) < RISK_THRESHOLD)
  ).length;

  const days = schoolDays();
  let present = 0;
  for (const s of students) {
    for (const d of days) {
      const v = doc.state.attendance[`${d}-${s.id}`] ?? "P";
      if (v !== "A") present++;
    }
  }
  const attendance = (present / (students.length * days.length)) * 100;

  return { avg, risk, attendance };
}
