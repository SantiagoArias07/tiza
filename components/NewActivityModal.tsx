"use client";

import { useState } from "react";
import { Modal } from "./ui";
import { XIcon } from "./icons";
import type { Subject } from "@/lib/types";
import styles from "./NewActivityModal.module.css";

export function NewActivityModal({
  subject,
  onClose,
  onCreate,
}: {
  subject: Subject;
  onClose: () => void;
  onCreate: (rubroIdx: number, name: string) => void;
}) {
  const [name, setName] = useState("");
  const [rubroIdx, setRubroIdx] = useState(0);
  const [date, setDate] = useState("2026-02-16");
  const [note, setNote] = useState("");

  return (
    <Modal width={480} onClose={onClose}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Nueva actividad</h2>
          <p className={styles.sub}>
            {subject.name} · {subject.rubros[rubroIdx].name}
          </p>
        </div>
        <button className={styles.close} onClick={onClose} aria-label="Cerrar">
          <XIcon size={18} />
        </button>
      </div>

      <div className={styles.body}>
        <label className={styles.field}>
          <span className={styles.label}>Nombre</span>
          <input
            className={styles.input}
            value={name}
            autoFocus
            placeholder="Ej. Lectura del capítulo 4"
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <div className={styles.row}>
          <label className={styles.field} style={{ flex: 1 }}>
            <span className={styles.label}>Rubro</span>
            <select
              className={styles.input}
              value={rubroIdx}
              onChange={(e) => setRubroIdx(Number(e.target.value))}
            >
              {subject.rubros.map((r, i) => (
                <option key={i} value={i}>
                  {r.name} · {r.pct}%
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field} style={{ width: 150 }}>
            <span className={styles.label}>Fecha</span>
            <input
              type="date"
              className={styles.input}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Nota general (opcional)</span>
          <textarea
            className={styles.textarea}
            value={note}
            placeholder="Indicaciones o contexto de la actividad…"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </div>

      <div className={styles.footer}>
        <button className={styles.cancel} onClick={onClose}>
          Cancelar
        </button>
        <button
          className={styles.create}
          disabled={!name.trim()}
          onClick={() => onCreate(rubroIdx, name.trim() || "Nueva actividad")}
        >
          Crear actividad
        </button>
      </div>
    </Modal>
  );
}
