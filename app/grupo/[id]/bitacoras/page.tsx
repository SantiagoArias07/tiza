"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { fmt, subjectAverage } from "@/lib/calc";
import { PageHeader } from "@/components/ui";
import { ChevronIcon } from "@/components/icons";
import styles from "./bitacoras.module.css";

export default function BitacorasPage() {
  const { data, cells } = useStore();
  const base = `/grupo/${data.id}`;

  return (
    <div>
      <PageHeader
        title="Bitácoras"
        subtitle={`Registro de actividades por materia · ${data.trimester}`}
      />

      <div className={styles.grid}>
        {data.subjects.map((s) => {
          const activities = s.rubros.reduce(
            (n, r) => n + r.activities.length,
            0
          );
          const avg = subjectAverage(s, data.students, cells);
          return (
            <Link
              key={s.slug}
              href={`${base}/bitacora/${s.slug}`}
              className={styles.card}
            >
              <span
                className={styles.square}
                style={{ background: s.bg, color: s.fg }}
              >
                {s.initial}
              </span>
              <span className={styles.info}>
                <span className={styles.name}>{s.name}</span>
                <span className={styles.meta}>
                  {activities} actividades registradas
                </span>
              </span>
              <span className={styles.avg}>
                <span className={styles.avgValue}>{fmt(avg)}</span>
                <span className={styles.avgLabel}>prom.</span>
              </span>
              <ChevronIcon size={18} className={styles.chevron} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
