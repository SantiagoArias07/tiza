"use client";

import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { downloadBoletaCsv, downloadGroupBoletas } from "@/lib/export";
import { Modal } from "./ui";
import { FileTextIcon, XIcon } from "./icons";
import styles from "./BackupModal.module.css";

export function BackupModal({ onClose }: { onClose: () => void }) {
  const { activeGroup } = useStore();
  const { user } = useAuth();
  if (!activeGroup) return null;
  const data = activeGroup;
  const teacher = user?.name ?? "Docente";

  return (
    <Modal width={460} onClose={onClose}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Descargar del grupo</h2>
          <p className={styles.sub}>
            Reportes y respaldo. Tus datos ya se guardan solos en la nube.
          </p>
        </div>
        <button className={styles.close} onClick={onClose} aria-label="Cerrar">
          <XIcon size={18} />
        </button>
      </div>

      <div className={styles.body}>
        <button
          className={styles.option}
          onClick={() => {
            downloadGroupBoletas(data, teacher);
            onClose();
          }}
        >
          <span className={styles.optIcon} data-variant="full">
            <FileTextIcon size={20} />
          </span>
          <span className={styles.optText}>
            <span className={styles.optTitle}>Boletas de todo el grupo (PDF)</span>
            <span className={styles.optDesc}>
              Una boleta oficial por alumno, en un solo archivo.
            </span>
          </span>
        </button>

        <button
          className={styles.option}
          onClick={() => {
            downloadBoletaCsv(data);
            onClose();
          }}
        >
          <span className={styles.optIcon} data-variant="csv">
            <FileTextIcon size={20} />
          </span>
          <span className={styles.optText}>
            <span className={styles.optTitle}>Respaldo en CSV</span>
            <span className={styles.optDesc}>
              Tabla de calificaciones para Excel o Google Sheets.
            </span>
          </span>
        </button>
      </div>
    </Modal>
  );
}
