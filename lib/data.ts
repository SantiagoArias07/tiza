import type { CellStatus } from "./types";

/** Cell key spanning period + subject space. */
export function cellKey(
  period: number,
  subjectSlug: string,
  rubroIdx: number,
  activityIdx: number,
  studentId: number
): string {
  return `${period}-${subjectSlug}-${rubroIdx}-${activityIdx}-${studentId}`;
}

export function extraKey(period: number, subjectSlug: string, rubroIdx: number) {
  return `${period}-${subjectSlug}-${rubroIdx}`;
}

export function examTotalKey(period: number, subjectSlug: string) {
  return `${period}-${subjectSlug}`;
}

export function examAciertoKey(
  period: number,
  subjectSlug: string,
  studentId: number
) {
  return `${period}-${subjectSlug}-${studentId}`;
}

/** Per-period, per-subject observation note for a student. */
export function subjectNoteKey(
  period: number,
  subjectSlug: string,
  studentId: number
) {
  return `${period}-${subjectSlug}-${studentId}`;
}

/** Manual override key at rubro level. */
export function overrideRubroKey(
  period: number,
  subjectSlug: string,
  rubroIdx: number,
  studentId: number
) {
  return `r-${period}-${subjectSlug}-${rubroIdx}-${studentId}`;
}

/** Manual override key at subject level. */
export function overrideSubjectKey(
  period: number,
  subjectSlug: string,
  studentId: number
) {
  return `s-${period}-${subjectSlug}-${studentId}`;
}

/** Cycle-level (all periods) override of a subject's final grade. */
export function overrideSubjectCycleKey(subjectSlug: string, studentId: number) {
  return `sc-${subjectSlug}-${studentId}`;
}

/** Cycle-level override of a student's overall final average. */
export function overrideFinalCycleKey(studentId: number) {
  return `fc-${studentId}`;
}

/** Points awarded per cell status. */
export const POINTS: Record<CellStatus, number> = {
  complete: 10,
  incomplete: 6.5,
  missing: 0,
};
