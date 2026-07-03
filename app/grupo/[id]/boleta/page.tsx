"use client";

import { useRouter } from "next/navigation";
import { useGroup } from "@/lib/store";
import { fmt, groupAverage, subjectGrade, isAtRisk } from "@/lib/calc";
import { PageHeader } from "@/components/ui";
import styles from "./boleta.module.css";

// A few deterministic "manually edited" grades for the demo indicator.
const EDITED: Record<string, number> = {
  "matematicas-2": 7.8,
  "espanol-10": 8.4,
};

export default function BoletaPage() {
  const { data, cells } = useGroup();
  const router = useRouter();
  const base = `/grupo/${data.id}`;
  const groupAvg = groupAverage(data, cells);

  return (
    <div>
      <PageHeader
        title="Boleta del grupo"
        subtitle={`${data.label} · ${data.trimester} · resumen de calificaciones`}
      />

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
            {data.students.map((student) => {
              const risk = isAtRisk(data, student.id, cells);
              const studentGrades = data.subjects.map((s) =>
                subjectGrade(s, student.id, cells)
              );
              const avg =
                studentGrades.reduce((a, b) => a + b, 0) / studentGrades.length;
              return (
                <tr
                  key={student.id}
                  className={styles.row}
                  onClick={() => router.push(`${base}/alumno/${student.id}`)}
                >
                  <td
                    className={styles.nameCell}
                    data-risk={risk}
                    title={student.name}
                  >
                    {risk && <span className={styles.riskDot} />}
                    <span className={styles.studentName}>{student.name}</span>
                  </td>
                  {data.subjects.map((s, i) => {
                    const grade = studentGrades[i];
                    const failed = grade < 6;
                    const editKey = `${s.slug}-${student.id}`;
                    const edited = EDITED[editKey];
                    return (
                      <td
                        key={s.slug}
                        className={`${styles.gradeCell} tabular`}
                        data-failed={failed}
                      >
                        {fmt(grade)}
                        {edited !== undefined && (
                          <span
                            className={styles.editDot}
                            title={`Editado manualmente · Calculado: ${fmt(edited)}`}
                          />
                        )}
                      </td>
                    );
                  })}
                  <td className={`${styles.avgCell} tabular`}>{fmt(avg)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendFail}>5.4</span> Menor a 6.0
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendEdit} /> Editado manualmente
        </span>
        <span className={styles.groupPill}>
          Prom. grupo <strong>{fmt(groupAvg)}</strong>
        </span>
      </div>
    </div>
  );
}
