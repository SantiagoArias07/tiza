import type { CellStatus } from "./types";

/** Cell key spanning the full subject space. */
export function cellKey(
  subjectSlug: string,
  rubroIdx: number,
  activityIdx: number,
  studentId: number
): string {
  return `${subjectSlug}-${rubroIdx}-${activityIdx}-${studentId}`;
}

/** Points awarded per cell status. */
export const POINTS: Record<CellStatus, number> = {
  complete: 10,
  incomplete: 6.5,
  missing: 0,
};
