"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import * as api from "@/lib/api";
import {
  downloadBlob,
  downloadBoletaCsv,
  downloadGroupBoletas,
} from "@/lib/export";
import { Modal } from "./ui";
import { FileTextIcon, XIcon } from "./icons";
import styles from "./BackupModal.module.css";

export function BackupModal({ onClose }: { onClose: () => void }) {
  const { activeGroup, refreshGroups } = useStore();
  const { user } = useAuth();
  const [backups, setBackups] = useState<{ day: string; createdAt: number }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.listBackups().then(setBackups).catch(() => setBackups([]));
  }, []);

  if (!activeGroup) return null;
  const data = activeGroup;
  const teacher = user?.name ?? "Docente";

  async function downloadDaily(day: string) {
    const snap = await api.getBackup(day);
    downloadBlob(`tiza-respaldo-${day}.json`, JSON.stringify(snap, null, 2), "application/json");
  }

  async function restore(day: string) {
    if (!window.confirm(`Restaurar el respaldo del ${day}? Se reemplazan TODOS tus grupos con ese día.`))
      return;
    setBusy(true);
    try {
      await api.restoreBackup(day);
      await refreshGroups();
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal width={470} onClose={onClose}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Reportes y respaldo</h2>
          <p className={styles.sub}>
            Tus datos se guardan solos, y cada día se hace un respaldo automático.
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
            <span className={styles.optDesc}>Una boleta oficial por alumno.</span>
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
            <span className={styles.optDesc}>Calificaciones para Excel o Sheets.</span>
          </span>
        </button>

        <div className={styles.backupsSection}>
          <span className={styles.backupsTitle}>Respaldos automáticos (últimos 7 días)</span>
          {backups.length === 0 ? (
            <p className={styles.backupsEmpty}>
              Aún no hay respaldos. Se crea uno automáticamente cada día que usas la app.
            </p>
          ) : (
            <ul className={styles.backupsList}>
              {backups.map((b) => (
                <li key={b.day} className={styles.backupRow}>
                  <span className={styles.backupDay}>{b.day}</span>
                  <span className={styles.backupActions}>
                    <button className={styles.backupBtn} onClick={() => downloadDaily(b.day)}>
                      Descargar
                    </button>
                    <button
                      className={styles.backupBtnGhost}
                      disabled={busy}
                      onClick={() => restore(b.day)}
                    >
                      Restaurar
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
