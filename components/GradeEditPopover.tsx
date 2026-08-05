"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./GradeEditPopover.module.css";

const WIDTH = 280;

/**
 * Edits a final grade (with manual override) plus an optional note, in one
 * popover. Empty grade clears the override. Mirrors the NotePopover look.
 */
export function GradeEditPopover({
  title,
  subtitle,
  initialGrade,
  initialNote,
  calc,
  anchor,
  onClose,
  onSave,
}: {
  title: string;
  subtitle: string;
  initialGrade: string;
  initialNote: string;
  calc: number;
  anchor: DOMRect;
  onClose: () => void;
  onSave: (grade: number | null, note: string) => void;
}) {
  const [grade, setGrade] = useState(initialGrade);
  const [note, setNote] = useState(initialNote);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: anchor.bottom + 8, left: anchor.left });

  useLayoutEffect(() => {
    const margin = 12;
    let left = anchor.left - WIDTH / 2 + anchor.width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - WIDTH - margin));
    let top = anchor.bottom + 8;
    const h = ref.current?.offsetHeight ?? 240;
    if (top + h > window.innerHeight - margin) {
      top = Math.max(margin, anchor.top - h - 8);
    }
    setPos({ top, left });
  }, [anchor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const commit = () => {
    const raw = grade.trim().replace(",", ".");
    let value: number | null = null;
    if (raw !== "") {
      const num = parseFloat(raw);
      value = Number.isNaN(num) ? null : Math.max(0, Math.min(10, num));
    }
    onSave(value, note);
    onClose();
  };

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div
        ref={ref}
        className={styles.popover}
        style={{ top: pos.top, left: pos.left, width: WIDTH }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.title}>{title}</div>
        <div className={styles.subtitle}>{subtitle}</div>

        <label className={styles.fieldLabel}>Calificación final</label>
        <input
          className={styles.gradeInput}
          value={grade}
          autoFocus
          inputMode="decimal"
          placeholder={calc.toFixed(1)}
          onChange={(e) => setGrade(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
          }}
        />
        <div className={styles.calc}>
          Calculado: {calc.toFixed(1)} · deja el campo vacío para quitar la edición
        </div>

        <textarea
          className={styles.textarea}
          value={note}
          placeholder="Nota sobre esta calificación…"
          onChange={(e) => setNote(e.target.value)}
        />
        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onClose}>
            Cancelar
          </button>
          <button className={styles.save} onClick={commit}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
