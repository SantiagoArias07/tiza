"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useGroup } from "@/lib/store";
import {
  fmt,
  finalCycleIsOverridden,
  groupAverage,
  isAtRisk,
  studentAverageCycle,
  studentAverageCycleCalculated,
  subjectCycleIsOverridden,
  subjectGradeCycle,
  subjectGradeCycleCalculated,
} from "@/lib/calc";
import { overrideFinalCycleKey, overrideSubjectCycleKey } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { GradeEditPopover } from "@/components/GradeEditPopover";
import styles from "./boleta.module.css";

type Sort = "nombre" | "nombre-desc" | "prom-desc" | "prom-asc";

interface EditState {
  studentId: number;
  /** subject slug, or null for the overall final average */
  slug: string | null;
  name: string;
  anchor: DOMRect;
}

export default function BoletaPage() {
  const g = useGroup();
  const { data } = g;
  const router = useRouter();
  const base = `/grupo/${data.id}`;
  const groupAvg = groupAverage(data);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("nombre");
  const [edit, setEdit] = useState<EditState | null>(null);

  const rows = useMemo(() => {
    const enriched = data.students.map((s) => ({
      student: s,
      avg: studentAverageCycle(data, s.id),
    }));
    const q = query.trim().toLowerCase();
    const filtered = q
      ? enriched.filter((r) => r.student.name.toLowerCase().includes(q))
      : enriched;
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sort === "nombre") return a.student.name.localeCompare(b.student.name);
      if (sort === "nombre-desc") return b.student.name.localeCompare(a.student.name);
      if (sort === "prom-desc") return b.avg - a.avg;
      return a.avg - b.avg;
    });
    return sorted;
  }, [data, query, sort]);

  // Derived values for the open editor.
  const editSubject = edit?.slug
    ? data.subjects.find((s) => s.slug === edit.slug) ?? null
    : null;
  const editStudent = edit
    ? data.students.find((s) => s.id === edit.studentId) ?? null
    : null;
  const editKey = edit
    ? edit.slug
      ? overrideSubjectCycleKey(edit.slug, edit.studentId)
      : overrideFinalCycleKey(edit.studentId)
    : "";
  const editCalc = edit
    ? edit.slug
      ? editSubject
        ? subjectGradeCycleCalculated(data, editSubject, edit.studentId)
        : 0
      : studentAverageCycleCalculated(data, edit.studentId)
    : 0;
  const editOverridden = edit
    ? typeof data.state.overrides[editKey] === "number"
    : false;
  const editCurrent = edit
    ? edit.slug
      ? editSubject
        ? subjectGradeCycle(data, editSubject, edit.studentId)
        : 0
      : studentAverageCycle(data, edit.studentId)
    : 0;

  return (
    <div>
      <PageHeader
        title="Boleta del grupo"
        subtitle={`${data.label} · promedio del ciclo (todos los periodos)`}
      />

      <div className={styles.controls}>
        <div className={styles.search}>
          <SearchIcon />
          <input
            className={styles.searchInput}
            value={query}
            placeholder="Buscar alumno…"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className={styles.sortSelect}
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
        >
          <option value="nombre">Nombre A–Z</option>
          <option value="nombre-desc">Nombre Z–A</option>
          <option value="prom-desc">Promedio mayor → menor</option>
          <option value="prom-asc">Promedio menor → mayor</option>
        </select>
      </div>

      <p className={styles.hint}>
        Clic en el nombre abre el perfil · clic en una calificación para editarla
        y dejar una nota.
      </p>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.nameHead}>Alumno</th>
              {data.subjects.map((s) => (
                <th key={s.slug} className={styles.subjHead} title={s.name}>
                  {s.abbr}
                </th>
              ))}
              <th className={styles.avgHead}>Prom.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ student, avg }) => {
              const risk = isAtRisk(data, student.id);
              const finalKey = overrideFinalCycleKey(student.id);
              const finalOv = finalCycleIsOverridden(data, student.id);
              const finalNote = Boolean(g.state.gradeNotes[finalKey]);
              return (
                <tr key={student.id} className={styles.row}>
                  <td
                    className={styles.nameCell}
                    data-risk={risk}
                    title={student.name}
                    onClick={() => router.push(`${base}/alumno/${student.id}`)}
                  >
                    {risk && <span className={styles.riskDot} />}
                    <span className={styles.studentName}>{student.name}</span>
                  </td>
                  {data.subjects.map((s) => {
                    const grade = subjectGradeCycle(data, s, student.id);
                    const key = overrideSubjectCycleKey(s.slug, student.id);
                    const overridden = subjectCycleIsOverridden(data, s, student.id);
                    const hasNote = Boolean(g.state.gradeNotes[key]);
                    return (
                      <td
                        key={s.slug}
                        className={`${styles.gradeCell} tabular`}
                        data-failed={grade < 6}
                      >
                        <button
                          className={styles.cellBtn}
                          title="Editar calificación"
                          onClick={(e) =>
                            setEdit({
                              studentId: student.id,
                              slug: s.slug,
                              name: s.name,
                              anchor: e.currentTarget.getBoundingClientRect(),
                            })
                          }
                        >
                          {fmt(grade)}
                          {overridden && <span className={styles.editDot} />}
                          {hasNote && (
                            <span className={styles.noteDot} title="Tiene nota" />
                          )}
                        </button>
                      </td>
                    );
                  })}
                  <td className={`${styles.avgCell} tabular`}>
                    <button
                      className={styles.cellBtn}
                      title="Editar promedio final"
                      onClick={(e) =>
                        setEdit({
                          studentId: student.id,
                          slug: null,
                          name: "Promedio final",
                          anchor: e.currentTarget.getBoundingClientRect(),
                        })
                      }
                    >
                      {fmt(avg)}
                      {finalOv && <span className={styles.editDot} />}
                      {finalNote && (
                        <span className={styles.noteDot} title="Tiene nota" />
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td className={styles.emptyRow} colSpan={data.subjects.length + 2}>
                  {data.students.length === 0
                    ? "Aún no hay alumnos. Agrégalos en Configuración."
                    : "Ningún alumno coincide con la búsqueda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendFail}>5.4</span> Menor a 6.0
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendEdit} /> Editada manualmente
        </span>
        <span className={styles.groupPill}>
          Prom. grupo <strong>{fmt(groupAvg)}</strong>
        </span>
      </div>

      {edit && editStudent && (
        <GradeEditPopover
          key={editKey}
          title={editStudent.name}
          subtitle={edit.name}
          initialGrade={editOverridden ? fmt(editCurrent) : ""}
          initialNote={g.state.gradeNotes[editKey] ?? ""}
          calc={editCalc}
          anchor={edit.anchor}
          onClose={() => setEdit(null)}
          onSave={(grade, note) => {
            g.setOverride(editKey, grade);
            g.setGradeNote(editKey, note);
          }}
        />
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
