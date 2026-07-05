"use client";

import { useMemo, useState } from "react";
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

type Sort = "nombre" | "nombre-desc" | "prom-desc" | "prom-asc";

export default function BoletaPage() {
  const { data } = useGroup();
  const router = useRouter();
  const base = `/grupo/${data.id}`;
  const groupAvg = groupAverage(data);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("nombre");

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
                  {data.subjects.map((s) => {
                    const grade = subjectGradeCycle(data, s, student.id);
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
        <span className={styles.groupPill}>
          Prom. grupo <strong>{fmt(groupAvg)}</strong>
        </span>
      </div>
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
