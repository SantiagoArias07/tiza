"use client";

import { useMemo, useState } from "react";
import { useGroup } from "@/lib/store";
import { attKey, attendancePct } from "@/lib/calc";
import type { AttStatus } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import styles from "./asistencia.module.css";

const WEEK = ["L", "M", "M", "J", "V", "S", "D"];
const MONTH_DAYS = 28; // February 2026
const FIRST_WEEKDAY = 6; // Feb 1 2026 is a Sunday → index 6 (L=0…D=6)

function dayStr(d: number) {
  return `2026-02-${String(d).padStart(2, "0")}`;
}
function weekdayIndex(d: number) {
  return (FIRST_WEEKDAY + (d - 1)) % 7;
}
function isSchoolDay(d: number) {
  const w = weekdayIndex(d);
  return w < 5; // Mon–Fri
}

const SEGMENTS: { key: AttStatus; glyph: string; tone: string }[] = [
  { key: "P", glyph: "✓", tone: "ok" },
  { key: "R", glyph: "◑", tone: "warn" },
  { key: "A", glyph: "✗", tone: "risk" },
];

export default function AsistenciaPage() {
  const { data, attendance, setAtt, umbral } = useGroup();
  const [selected, setSelected] = useState(9);

  const schoolDays = useMemo(() => {
    const out: string[] = [];
    for (let d = 1; d <= MONTH_DAYS; d++) if (isSchoolDay(d)) out.push(dayStr(d));
    return out;
  }, []);

  const selStr = dayStr(selected);
  const dayLabel = new Date(2026, 1, selected).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const counts = data.students.reduce(
    (acc, s) => {
      const v = attendance[attKey(selStr, s.id)] ?? "P";
      acc[v]++;
      return acc;
    },
    { P: 0, R: 0, A: 0 } as Record<AttStatus, number>
  );

  return (
    <div>
      <PageHeader
        title="Asistencia"
        subtitle={`${data.label} · registra la asistencia diaria del grupo`}
      />

      <div className={styles.grid}>
        <div className={styles.calendar}>
          <div className={styles.calHeader}>Febrero 2026</div>
          <div className={styles.weekRow}>
            {WEEK.map((w, i) => (
              <span key={i} className={styles.weekday} data-weekend={i > 4}>
                {w}
              </span>
            ))}
          </div>
          <div className={styles.days}>
            {Array.from({ length: FIRST_WEEKDAY }).map((_, i) => (
              <span key={`pad-${i}`} />
            ))}
            {Array.from({ length: MONTH_DAYS }).map((_, i) => {
              const d = i + 1;
              const school = isSchoolDay(d);
              return (
                <button
                  key={d}
                  className={styles.day}
                  data-school={school}
                  data-selected={school && d === selected}
                  disabled={!school}
                  onClick={() => school && setSelected(d)}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <p className={styles.calNote}>
            Se marca alerta al alcanzar {umbral} faltas en el trimestre.
          </p>
        </div>

        <div className={styles.roster}>
          <div className={styles.rosterHead}>
            <span className={styles.date}>{dayLabel}</span>
            <span className={styles.counts}>
              <span data-tone="ok">{counts.P} presentes</span>
              <span data-tone="warn">{counts.R} retardos</span>
              <span data-tone="risk">{counts.A} faltas</span>
            </span>
          </div>

          <div className={styles.list}>
            {data.students.map((s) => {
              const status = attendance[attKey(selStr, s.id)] ?? "P";
              const att = attendancePct(s.id, schoolDays, attendance);
              const overThreshold = att.absent >= umbral;
              return (
                <div key={s.id} className={styles.studentRow}>
                  <span className={styles.studentName}>{s.name}</span>
                  {overThreshold && (
                    <span className={styles.alert}>{att.absent} f.</span>
                  )}
                  <span className={`${styles.pct} tabular`}>
                    {att.pct.toFixed(0)}% asist.
                  </span>
                  <span className={styles.segments}>
                    {SEGMENTS.map((seg) => (
                      <button
                        key={seg.key}
                        className={styles.segment}
                        data-tone={seg.tone}
                        data-active={status === seg.key}
                        onClick={() => setAtt(attKey(selStr, s.id), seg.key)}
                        aria-label={seg.key}
                      >
                        {seg.glyph}
                      </button>
                    ))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
