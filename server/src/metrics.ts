import { CellStatus, GroupDoc, Subject } from "./types";

const POINTS: Record<CellStatus, number> = {
  complete: 10,
  incomplete: 6.5,
  missing: 0,
};
const RISK_THRESHOLD = 6.0;

function clamp(v: number) {
  return Math.max(0, Math.min(10, v));
}

function rubroScore(
  doc: GroupDoc,
  subject: Subject,
  ri: number,
  sid: number,
  p: number
): number {
  const ov = doc.state.overrides[`r-${p}-${subject.slug}-${ri}-${sid}`];
  if (typeof ov === "number") return ov;

  const rubro = subject.rubros[ri];
  if (rubro.kind === "exam") {
    const total = doc.state.examTotals[`${p}-${subject.slug}`];
    if (!total) return 0;
    const aciertos = doc.state.examAciertos[`${p}-${subject.slug}-${sid}`] ?? 0;
    return clamp((aciertos / total) * 10);
  }

  const extra = doc.state.extraActivities[`${p}-${subject.slug}-${ri}`] ?? [];
  const count = rubro.activities.length + extra.length;
  if (!count) return 0;
  let sum = 0;
  for (let ai = 0; ai < count; ai++) {
    const status =
      doc.state.cells[`${p}-${subject.slug}-${ri}-${ai}-${sid}`] ?? "complete";
    sum += POINTS[status];
  }
  return sum / count;
}

function subjectGradePeriod(
  doc: GroupDoc,
  subject: Subject,
  sid: number,
  p: number
): number {
  const ov = doc.state.overrides[`s-${p}-${subject.slug}-${sid}`];
  if (typeof ov === "number") return ov;
  let g = 0;
  subject.rubros.forEach((r, ri) => {
    const pct = doc.state.crit[ri] ?? r.pct;
    g += rubroScore(doc, subject, ri, sid, p) * (pct / 100);
  });
  return g;
}

function subjectGradeCycle(doc: GroupDoc, subject: Subject, sid: number): number {
  const n = Math.max(1, doc.periodCount || 1);
  let sum = 0;
  for (let p = 0; p < n; p++) sum += subjectGradePeriod(doc, subject, sid, p);
  return sum / n;
}

function studentAverage(doc: GroupDoc, sid: number): number {
  if (!doc.subjects.length) return 0;
  const grades = doc.subjects.map((s) => subjectGradeCycle(doc, s, sid));
  return grades.reduce((a, b) => a + b, 0) / grades.length;
}

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
    doc.subjects.some((subj) => subjectGradeCycle(doc, subj, s.id) < RISK_THRESHOLD)
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
