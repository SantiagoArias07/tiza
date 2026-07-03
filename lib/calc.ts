import {
  POINTS,
  cellKey,
  examAciertoKey,
  examTotalKey,
  extraKey,
  overrideRubroKey,
  overrideSubjectKey,
} from "./data";
import type { AttStatus, GroupDoc, Subject } from "./types";

const RISK_THRESHOLD = 6.0;

function clamp(v: number) {
  return Math.max(0, Math.min(10, v));
}

/** Number of activities in a rubro for a period (template + added). */
export function activityCount(
  doc: GroupDoc,
  subject: Subject,
  ri: number,
  period: number
): number {
  const extra = doc.state.extraActivities[extraKey(period, subject.slug, ri)] ?? [];
  return subject.rubros[ri].activities.length + extra.length;
}

/** Exam score 0–10 from aciertos / total. */
export function examScore(
  doc: GroupDoc,
  subject: Subject,
  studentId: number,
  period: number
): number {
  const total = doc.state.examTotals[examTotalKey(period, subject.slug)];
  if (!total) return 0;
  const aciertos =
    doc.state.examAciertos[examAciertoKey(period, subject.slug, studentId)] ?? 0;
  return clamp((aciertos / total) * 10);
}

/** Rubro score 0–10 ignoring any manual override (for tooltips). */
export function rubroCalculated(
  doc: GroupDoc,
  subject: Subject,
  ri: number,
  studentId: number,
  period: number
): number {
  const rubro = subject.rubros[ri];
  if (rubro.kind === "exam") return examScore(doc, subject, studentId, period);

  const count = activityCount(doc, subject, ri, period);
  if (!count) return 0;
  let sum = 0;
  for (let ai = 0; ai < count; ai++) {
    const status =
      doc.state.cells[cellKey(period, subject.slug, ri, ai, studentId)] ??
      "complete";
    sum += POINTS[status];
  }
  return sum / count;
}

/** Rubro score honoring manual override. */
export function rubroScore(
  doc: GroupDoc,
  subject: Subject,
  ri: number,
  studentId: number,
  period: number
): number {
  const ov =
    doc.state.overrides[overrideRubroKey(period, subject.slug, ri, studentId)];
  if (typeof ov === "number") return ov;
  return rubroCalculated(doc, subject, ri, studentId, period);
}

export function rubroIsOverridden(
  doc: GroupDoc,
  subject: Subject,
  ri: number,
  studentId: number,
  period: number
): boolean {
  return (
    typeof doc.state.overrides[
      overrideRubroKey(period, subject.slug, ri, studentId)
    ] === "number"
  );
}

/** Weighted contribution of a rubro to the subject grade (e.g. max 4.0). */
export function rubroPoints(
  doc: GroupDoc,
  subject: Subject,
  ri: number,
  studentId: number,
  period: number
): number {
  const pct = doc.state.crit[ri] ?? subject.rubros[ri].pct;
  return rubroScore(doc, subject, ri, studentId, period) * (pct / 100);
}

/** Average rubro score across students, for one period. */
export function rubroAverage(
  doc: GroupDoc,
  subject: Subject,
  ri: number,
  period: number
): number {
  if (!doc.students.length) return 0;
  const sum = doc.students.reduce(
    (a, s) => a + rubroScore(doc, subject, ri, s.id, period),
    0
  );
  return sum / doc.students.length;
}

/** Average activity points across students (table footer). */
export function activityAverage(
  doc: GroupDoc,
  subject: Subject,
  ri: number,
  ai: number,
  period: number
): number {
  if (!doc.students.length) return 0;
  let sum = 0;
  for (const s of doc.students) {
    const status =
      doc.state.cells[cellKey(period, subject.slug, ri, ai, s.id)] ?? "complete";
    sum += POINTS[status];
  }
  return sum / doc.students.length;
}

/** Subject grade for one period, ignoring subject-level override. */
export function subjectGradeCalculated(
  doc: GroupDoc,
  subject: Subject,
  studentId: number,
  period: number
): number {
  let g = 0;
  subject.rubros.forEach((_, ri) => {
    g += rubroPoints(doc, subject, ri, studentId, period);
  });
  return g;
}

/** Subject grade for one period, honoring override. */
export function subjectGrade(
  doc: GroupDoc,
  subject: Subject,
  studentId: number,
  period: number
): number {
  const ov =
    doc.state.overrides[overrideSubjectKey(period, subject.slug, studentId)];
  if (typeof ov === "number") return ov;
  return subjectGradeCalculated(doc, subject, studentId, period);
}

export function subjectIsOverridden(
  doc: GroupDoc,
  subject: Subject,
  studentId: number,
  period: number
): boolean {
  return (
    typeof doc.state.overrides[
      overrideSubjectKey(period, subject.slug, studentId)
    ] === "number"
  );
}

const periods = (doc: GroupDoc) => Math.max(1, doc.periodCount || 1);

/** Subject grade across the whole cycle (average of periods). */
export function subjectGradeCycle(
  doc: GroupDoc,
  subject: Subject,
  studentId: number
): number {
  const n = periods(doc);
  let sum = 0;
  for (let p = 0; p < n; p++) sum += subjectGrade(doc, subject, studentId, p);
  return sum / n;
}

export function studentAverageCycle(doc: GroupDoc, studentId: number): number {
  if (!doc.subjects.length) return 0;
  const grades = doc.subjects.map((s) => subjectGradeCycle(doc, s, studentId));
  return grades.reduce((a, b) => a + b, 0) / grades.length;
}

export function isAtRisk(doc: GroupDoc, studentId: number): boolean {
  return doc.subjects.some(
    (s) => subjectGradeCycle(doc, s, studentId) < RISK_THRESHOLD
  );
}

export function failedSubjects(doc: GroupDoc, studentId: number): Subject[] {
  return doc.subjects.filter(
    (s) => subjectGradeCycle(doc, s, studentId) < RISK_THRESHOLD
  );
}

export function groupAverage(doc: GroupDoc): number {
  if (!doc.students.length) return 0;
  const avgs = doc.students.map((s) => studentAverageCycle(doc, s.id));
  return avgs.reduce((a, b) => a + b, 0) / avgs.length;
}

export function riskCount(doc: GroupDoc): number {
  return doc.students.filter((s) => isAtRisk(doc, s.id)).length;
}

/** Average of a subject across students, whole cycle. */
export function subjectAverageCycle(doc: GroupDoc, subject: Subject): number {
  if (!doc.students.length) return 0;
  const grades = doc.students.map((s) => subjectGradeCycle(doc, subject, s.id));
  return grades.reduce((a, b) => a + b, 0) / grades.length;
}

/* ---- Attendance (unchanged; by day) ------------------------------------- */

export function attKey(day: string, studentId: number): string {
  return `${day}-${studentId}`;
}

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
