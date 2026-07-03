"use client";

import { useStore } from "@/lib/store";
import { downloadBackup, downloadBoletaCsv } from "@/lib/export";
import { Modal } from "./ui";
import { DownloadIcon, FileTextIcon, XIcon } from "./icons";
import styles from "./BackupModal.module.css";

export function BackupModal({ onClose }: { onClose: () => void }) {
  const { activeGroup } = useStore();
  if (!activeGroup) return null;
  const data = activeGroup;
  const cells = activeGroup.state.cells;

  return (
    <Modal width={440} onClose={onClose}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Descargar respaldo</h2>
          <p className={styles.sub}>Guarda una copia de la bitácora del grupo.</p>
        </div>
        <button className={styles.close} onClick={onClose} aria-label="Cerrar">
          <XIcon size={18} />
        </button>
      </div>

      <div className={styles.body}>
        <button
          className={styles.option}
          onClick={() => {
            downloadBackup(data);
            onClose();
          }}
        >
          <span className={styles.optIcon} data-variant="full">
            <DownloadIcon size={20} />
          </span>
          <span className={styles.optText}>
            <span className={styles.optTitle}>Respaldo completo (.json)</span>
            <span className={styles.optDesc}>
              Todo el grupo: alumnos, calificaciones, notas y asistencia.
            </span>
          </span>
        </button>

        <button
          className={styles.option}
          onClick={() => {
            downloadBoletaCsv(data, cells);
            onClose();
          }}
        >
          <span className={styles.optIcon} data-variant="csv">
            <FileTextIcon size={20} />
          </span>
          <span className={styles.optText}>
            <span className={styles.optTitle}>Exportar a CSV</span>
            <span className={styles.optDesc}>
              Tabla de calificaciones para abrir en hojas de cálculo.
            </span>
          </span>
        </button>
      </div>
    </Modal>
  );
}
