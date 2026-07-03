"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGroup, useStore } from "@/lib/store";
import { PageHeader } from "@/components/ui";
import { PlusIcon, TrashIcon } from "@/components/icons";
import styles from "./configuracion.module.css";

const RUBRO_NAMES = ["Actividades en clase", "Actividades en casa", "Examen"];

export default function ConfiguracionPage() {
  const {
    data,
    crit,
    setCrit,
    umbral,
    setUmbral,
    periodCount,
    setPeriodCount,
    addStudent,
    removeStudent,
    renameStudent,
    renameGroup,
  } = useGroup();
  const { deleteGroup } = useStore();
  const router = useRouter();

  const [newStudent, setNewStudent] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const sum = crit.reduce((a, b) => a + b, 0);
  const sumTone = sum === 100 ? "ok" : sum < 100 ? "warn" : "risk";

  const stepCrit = (i: number, delta: number) =>
    setCrit(
      crit.map((v, idx) =>
        idx === i ? Math.max(0, Math.min(100, v + delta)) : v
      )
    );

  function addStudentSubmit() {
    if (!newStudent.trim()) return;
    addStudent(newStudent);
    setNewStudent("");
  }

  return (
    <div className={styles.wrap}>
      <PageHeader
        title="Configuración del grupo"
        subtitle={`${data.gradeLevel} · Ciclo ${data.cycle}`}
      />

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Nombre del grupo</h2>
        <input
          className={styles.groupNameInput}
          value={data.label}
          onChange={(e) => renameGroup(e.target.value)}
        />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          Alumnos <span className={styles.count}>{data.students.length}</span>
        </h2>

        <div className={styles.addRow}>
          <input
            className={styles.addInput}
            value={newStudent}
            placeholder="Nombre del alumno"
            onChange={(e) => setNewStudent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addStudentSubmit()}
          />
          <button
            className={styles.addBtn}
            onClick={addStudentSubmit}
            disabled={!newStudent.trim()}
          >
            <PlusIcon size={16} />
            Agregar
          </button>
        </div>

        {data.students.length === 0 ? (
          <p className={styles.noStudents}>
            Aún no hay alumnos. Agrega el primero arriba.
          </p>
        ) : (
          <div className={styles.students}>
            {data.students.map((s) => (
              <div key={s.id} className={styles.studentRow}>
                <input
                  className={styles.studentInput}
                  value={s.name}
                  onChange={(e) => renameStudent(s.id, e.target.value)}
                />
                <button
                  className={styles.removeBtn}
                  onClick={() => removeStudent(s.id)}
                  aria-label={`Quitar ${s.name}`}
                  title="Quitar alumno"
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Periodos de evaluación</h2>
        <p className={styles.umbralNote}>
          ¿En cuántos periodos se divide el ciclo? (aparecen como pestañas en las
          bitácoras).
        </p>
        <div className={styles.umbralStepper}>
          <button
            className={styles.umbralBtn}
            onClick={() => setPeriodCount(Math.max(1, periodCount - 1))}
          >
            −
          </button>
          <span className={styles.umbralValue}>{periodCount}</span>
          <button
            className={styles.umbralBtn}
            onClick={() => setPeriodCount(Math.min(6, periodCount + 1))}
          >
            +
          </button>
          <span className={styles.umbralUnit}>periodos</span>
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Criterios de evaluación</h2>
        <div className={styles.criteria}>
          {RUBRO_NAMES.map((name, i) => (
            <div key={name} className={styles.critRow}>
              <span className={styles.critName}>{name}</span>
              <div className={styles.stepper}>
                <button className={styles.stepBtn} onClick={() => stepCrit(i, -5)}>
                  −
                </button>
                <span className={styles.stepValue}>{crit[i] ?? 0}%</span>
                <button className={styles.stepBtn} onClick={() => stepCrit(i, 5)}>
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.sumTrack}>
          <span
            className={styles.sumFill}
            data-tone={sumTone}
            style={{ width: `${Math.min(sum, 100)}%` }}
          />
        </div>
        <div className={styles.sumLabel} data-tone={sumTone}>
          Suma {sum}%
          {sum !== 100 && (
            <span className={styles.sumHint}>
              {sum < 100 ? " · faltan puntos" : " · excede 100%"}
            </span>
          )}
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Umbral de asistencia</h2>
        <p className={styles.umbralNote}>
          Faltas en el trimestre antes de mostrar una alerta.
        </p>
        <div className={styles.umbralStepper}>
          <button
            className={styles.umbralBtn}
            onClick={() => setUmbral(Math.max(1, umbral - 1))}
          >
            −
          </button>
          <span className={styles.umbralValue}>{umbral}</span>
          <button
            className={styles.umbralBtn}
            onClick={() => setUmbral(Math.min(15, umbral + 1))}
          >
            +
          </button>
          <span className={styles.umbralUnit}>faltas</span>
        </div>
      </section>

      <section className={`${styles.card} ${styles.danger}`}>
        <h2 className={styles.cardTitle}>Eliminar grupo</h2>
        <p className={styles.umbralNote}>
          Se borrará el grupo con sus alumnos y calificaciones. No se puede
          deshacer.
        </p>
        {confirmDelete ? (
          <div className={styles.confirmRow}>
            <span className={styles.confirmText}>¿Seguro?</span>
            <button
              className={styles.deleteBtn}
              onClick={async () => {
                await deleteGroup(data.id);
                router.push("/");
              }}
            >
              Sí, eliminar
            </button>
            <button
              className={styles.cancelBtn}
              onClick={() => setConfirmDelete(false)}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            className={styles.deleteBtn}
            onClick={() => setConfirmDelete(true)}
          >
            <TrashIcon size={16} />
            Eliminar este grupo
          </button>
        )}
      </section>
    </div>
  );
}
