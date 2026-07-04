"use client";

import { useState } from "react";
import { Modal } from "./ui";
import { XIcon } from "./icons";
import styles from "./NewActivityModal.module.css";

export function NewGroupModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: {
    label: string;
    gradeLevel: string;
    cycle: string;
  }) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [gradeLevel, setGradeLevel] = useState("Primaria");
  const [cycle, setCycle] = useState("2025–2026");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!label.trim() || busy) return;
    setBusy(true);
    try {
      await onCreate({ label: label.trim(), gradeLevel, cycle });
    } catch {
      setBusy(false);
    }
  }

  return (
    <Modal width={480} onClose={onClose}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Nuevo grupo</h2>
          <p className={styles.sub}>Crea un grupo y luego agrega a tus alumnos.</p>
        </div>
        <button className={styles.close} onClick={onClose} aria-label="Cerrar">
          <XIcon size={18} />
        </button>
      </div>

      <div className={styles.body}>
        <label className={styles.field}>
          <span className={styles.label}>Nombre del grupo</span>
          <input
            className={styles.input}
            value={label}
            autoFocus
            placeholder="Ej. 4° A"
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </label>

        <div className={styles.row}>
          <label className={styles.field} style={{ flex: 1 }}>
            <span className={styles.label}>Grado</span>
            <input
              className={styles.input}
              value={gradeLevel}
              placeholder="4° Primaria"
              onChange={(e) => setGradeLevel(e.target.value)}
            />
          </label>
          <label className={styles.field} style={{ width: 150 }}>
            <span className={styles.label}>Ciclo</span>
            <input
              className={styles.input}
              value={cycle}
              onChange={(e) => setCycle(e.target.value)}
            />
          </label>
        </div>
        <p className={styles.periodsNote}>
          Los periodos de evaluación se configuran después (por defecto 3).
        </p>
      </div>

      <div className={styles.footer}>
        <button className={styles.cancel} onClick={onClose}>
          Cancelar
        </button>
        <button
          className={styles.create}
          disabled={!label.trim() || busy}
          onClick={submit}
        >
          {busy ? "Creando…" : "Crear grupo"}
        </button>
      </div>
    </Modal>
  );
}
