"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGroup, useStore } from "@/lib/store";
import { PageHeader } from "@/components/ui";
import { PlusIcon, TrashIcon } from "@/components/icons";
import styles from "./configuracion.module.css";

export default function ConfiguracionPage() {
  const {
    data,
    crit,
    setCrit,
    umbral,
    setUmbral,
    periodCount,
    setPeriodCount,
    setRounding,
    addStudent,
    removeStudent,
    renameStudent,
    renameGroup,
    setRubroName,
    addRubro,
    removeRubro,
    setSubjectName,
    addSubject,
    removeSubject,
  } = useGroup();
  const { deleteGroup } = useStore();
  const router = useRouter();

  const [newStudent, setNewStudent] = useState("");
  const [newCriterio, setNewCriterio] = useState("");
  const [newMateria, setNewMateria] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  const rubros = data.subjects[0]?.rubros ?? [];

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
        <p className={styles.umbralNote}>
          Aplican a todas las materias. El &quot;Examen&quot; se califica por
          aciertos.
        </p>
        <div className={styles.criteria}>
          {rubros.map((r, i) => (
            <div key={i} className={styles.critRow}>
              <input
                className={styles.critInput}
                value={r.name}
                onChange={(e) => setRubroName(i, e.target.value)}
              />
              <div className={styles.stepper}>
                <button className={styles.stepBtn} onClick={() => stepCrit(i, -5)}>
                  −
                </button>
                <span className={styles.stepValue}>{crit[i] ?? 0}%</span>
                <button className={styles.stepBtn} onClick={() => stepCrit(i, 5)}>
                  +
                </button>
              </div>
              <button
                className={styles.removeBtn}
                title="Quitar criterio"
                disabled={rubros.length <= 1}
                onClick={() => removeRubro(i)}
              >
                <TrashIcon size={15} />
              </button>
            </div>
          ))}
        </div>

        <div className={styles.addRow}>
          <input
            className={styles.addInput}
            value={newCriterio}
            placeholder="Nuevo criterio (ej. Participación)"
            onChange={(e) => setNewCriterio(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newCriterio.trim()) {
                addRubro(newCriterio);
                setNewCriterio("");
              }
            }}
          />
          <button
            className={styles.addBtn}
            disabled={!newCriterio.trim()}
            onClick={() => {
              addRubro(newCriterio);
              setNewCriterio("");
            }}
          >
            <PlusIcon size={16} />
            Agregar
          </button>
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
              {" "}· se ajusta a 100% automáticamente al calcular
            </span>
          )}
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          Materias <span className={styles.count}>{data.subjects.length}</span>
        </h2>
        <div className={styles.addRow}>
          <input
            className={styles.addInput}
            value={newMateria}
            placeholder="Nueva materia o campo formativo"
            onChange={(e) => setNewMateria(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newMateria.trim()) {
                addSubject(newMateria);
                setNewMateria("");
              }
            }}
          />
          <button
            className={styles.addBtn}
            disabled={!newMateria.trim()}
            onClick={() => {
              addSubject(newMateria);
              setNewMateria("");
            }}
          >
            <PlusIcon size={16} />
            Agregar
          </button>
        </div>
        <div className={styles.students}>
          {data.subjects.map((s) => (
            <div key={s.slug} className={styles.studentRow}>
              <span
                className={styles.materiaDot}
                style={{ background: s.bg, color: s.fg }}
              >
                {s.initial}
              </span>
              <input
                className={styles.studentInput}
                value={s.name}
                onChange={(e) => setSubjectName(s.slug, e.target.value)}
              />
              <button
                className={styles.removeBtn}
                title="Quitar materia"
                disabled={data.subjects.length <= 1}
                onClick={() => removeSubject(s.slug)}
              >
                <TrashIcon size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Redondeo de la calificación final</h2>
        <p className={styles.umbralNote}>
          Define cómo se convierte la calificación con decimal a la final (la que
          va en la boleta SEP).
        </p>
        <div className={styles.roundOpts}>
          {[
            { key: "half", label: "Sube desde .5", ex: "8.5 → 9" },
            { key: "sixty", label: "Sube desde .6", ex: "8.5 → 8 · 8.6 → 9" },
            { key: "none", label: "Sin redondeo", ex: "8.9 → 8" },
          ].map((o) => (
            <button
              key={o.key}
              className={styles.roundOpt}
              data-active={data.rounding === o.key}
              onClick={() => setRounding(o.key as "half" | "sixty" | "none")}
            >
              <span className={styles.roundLabel}>{o.label}</span>
              <span className={styles.roundEx}>{o.ex}</span>
            </button>
          ))}
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
          <div className={styles.confirmBox}>
            <p className={styles.confirmPrompt}>
              Escribe <strong>{data.label}</strong> para confirmar.
            </p>
            <input
              className={styles.confirmInput}
              value={deleteText}
              autoFocus
              placeholder={data.label}
              onChange={(e) => setDeleteText(e.target.value)}
            />
            <div className={styles.confirmRow}>
              <button
                className={styles.deleteBtn}
                disabled={deleteText.trim() !== data.label}
                onClick={async () => {
                  await deleteGroup(data.id);
                  router.push("/");
                }}
              >
                <TrashIcon size={16} />
                Eliminar permanentemente
              </button>
              <button
                className={styles.cancelBtn}
                onClick={() => {
                  setConfirmDelete(false);
                  setDeleteText("");
                }}
              >
                Cancelar
              </button>
            </div>
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
