"use client";

import type { CellStatus } from "@/lib/types";
import styles from "./StatusCell.module.css";

const GLYPH: Record<CellStatus, string> = {
  complete: "✓",
  incomplete: "◑",
  missing: "✗",
};

export function StatusCell({
  status,
  hasNote,
  onCycle,
  onNote,
}: {
  status: CellStatus;
  hasNote: boolean;
  onCycle: () => void;
  onNote: (anchor: DOMRect) => void;
}) {
  return (
    <button
      className={styles.chip}
      data-status={status}
      onClick={onCycle}
      title="Clic para cambiar el estado"
    >
      {GLYPH[status]}
      <span
        className={styles.note}
        data-has={hasNote}
        title={hasNote ? "Ver nota" : "Agregar nota"}
        onClick={(e) => {
          e.stopPropagation();
          onNote(e.currentTarget.getBoundingClientRect());
        }}
      />
    </button>
  );
}
