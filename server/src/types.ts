/**
 * Mutable group state persisted by the backend. The frontend owns the static
 * demo baseline (students, subjects, seeded cells); the backend only stores
 * what the teacher changes on top of it.
 */
export interface GroupState {
  /** cellKey -> "complete" | "incomplete" | "missing" (overrides seed) */
  edits: Record<string, string>;
  /** cellKey -> note text */
  notes: Record<string, string>;
  /** `${day}-${studentId}` -> "P" | "R" | "A" */
  attendance: Record<string, string>;
  /** studentId -> private note text */
  privNotes: Record<string, string>;
  /** weight % per rubro */
  crit: number[];
  /** absence alert threshold */
  umbral: number;
  /** subject names shown in Configuración */
  materias: string[];
  /** rubroIdx -> extra activities added via "Nueva actividad" */
  extraActivities: Record<string, { name: string; date: string }[]>;
  /** last write timestamp (ms) */
  updatedAt: number;
}

export function emptyState(): GroupState {
  return {
    edits: {},
    notes: {},
    attendance: {},
    privNotes: {},
    crit: [40, 20, 40],
    umbral: 3,
    materias: [],
    extraActivities: {},
    updatedAt: 0,
  };
}
