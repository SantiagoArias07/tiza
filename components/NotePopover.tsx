"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./NotePopover.module.css";

const WIDTH = 288;

export function NotePopover({
  title,
  subtitle,
  initial,
  anchor,
  onClose,
  onSave,
}: {
  title: string;
  subtitle: string;
  initial: string;
  anchor: DOMRect;
  onClose: () => void;
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState(initial);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: anchor.bottom + 8, left: anchor.left });

  // Clamp inside the viewport.
  useLayoutEffect(() => {
    const margin = 12;
    let left = anchor.left - WIDTH / 2 + anchor.width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - WIDTH - margin));
    let top = anchor.bottom + 8;
    const h = ref.current?.offsetHeight ?? 200;
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
        <textarea
          className={styles.textarea}
          value={text}
          autoFocus
          placeholder="Escribe una nota sobre esta entrega…"
          onChange={(e) => setText(e.target.value)}
        />
        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onClose}>
            Cancelar
          </button>
          <button
            className={styles.save}
            onClick={() => {
              onSave(text);
              onClose();
            }}
          >
            Guardar nota
          </button>
        </div>
      </div>
    </div>
  );
}
