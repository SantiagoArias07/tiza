"use client";

import { useRouter } from "next/navigation";
import { useGroup } from "@/lib/store";
import {
  fmt,
  groupAverage,
  isAtRisk,
  studentAverageCycle,
  subjectGradeCycle,
} from "@/lib/calc";
import { PageHeader } from "@/components/ui";
import styles from "./boleta.module.css";

export default function BoletaPage() {
  const { data } = useGroup();
  const router = useRouter();
  const base = `/grupo/${data.id}`;
  const groupAvg = groupAverage(data);

  return (
    <div>
      <PageHeader
        title="Boleta del grupo"
        subtitle={`${data.label} · promedio del ciclo (todos los periodos)`}
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
              const risk = isAtRisk(data, student.id);
              const grades = data.subjects.map((s) =>
                subjectGradeCycle(data, s, student.id)
              );
              const avg = studentAverageCycle(data, student.id);
              return (
                <tr
                  key={student.id}
                  className={styles.row}
                  onClick={() => router.push(`${base}/alumno/${student.id}`)}
                >
                  <td className={styles.nameCell} data-risk={risk} title={student.name}>
                    {risk && <span className={styles.riskDot} />}
                    <span className={styles.studentName}>{student.name}</span>
                  </td>
                  {data.subjects.map((s, i) => {
                    const grade = grades[i];
                    return (
                      <td
                        key={s.slug}
                        className={`${styles.gradeCell} tabular`}
                        data-failed={grade < 6}
                      >
                        {fmt(grade)}
                      </td>
                    );
                  })}
                  <td className={`${styles.avgCell} tabular`}>{fmt(avg)}</td>
                </tr>
              );
            })}
            {data.students.length === 0 && (
              <tr>
                <td className={styles.emptyRow} colSpan={data.subjects.length + 2}>
                  Aún no hay alumnos. Agrégalos en Configuración.
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
        <span className={styles.groupPill}>
          Prom. grupo <strong>{fmt(groupAvg)}</strong>
        </span>
      </div>
    </div>
  );
}
