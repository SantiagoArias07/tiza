"use client";

import { useMemo, useState } from "react";
import { useGroup } from "@/lib/store";
import { attKey, attendancePct } from "@/lib/calc";
import type { AttStatus } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { ChevronIcon } from "@/components/icons";
import styles from "./asistencia.module.css";

const WEEK = ["L", "M", "M", "J", "V", "S", "D"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const SEGMENTS: { key: AttStatus; glyph: string; tone: string }[] = [
  { key: "P", glyph: "✓", tone: "ok" },
  { key: "R", glyph: "◑", tone: "warn" },
  { key: "A", glyph: "✗", tone: "risk" },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
/** Monday-first weekday index (0=Mon … 6=Sun). */
function mondayIndex(year: number, month: number, day: number) {
  return (new Date(year, month, day).getDay() + 6) % 7;
}

export default function AsistenciaPage() {
  const { data, attendance, setAtt, umbral } = useGroup();

  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(today.getDate());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstIdx = mondayIndex(year, month, 1);
  const dayStr = (d: number) => `${year}-${pad(month + 1)}-${pad(d)}`;
  const isSchool = (d: number) => mondayIndex(year, month, d) < 5;

  const schoolDays = useMemo(() => {
    const out: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) if (isSchool(d)) out.push(dayStr(d));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, daysInMonth]);

  const goMonth = (delta: number) => {
    const dt = new Date(year, month + delta, 1);
    setYear(dt.getFullYear());
    setMonth(dt.getMonth());
    setSelected(1);
  };
  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelected(today.getDate());
  };

  const selStr = dayStr(selected);
  const dayLabel = new Date(year, month, selected).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

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
          <div className={styles.calNav}>
            <button className={styles.calNavBtn} onClick={() => goMonth(-1)} aria-label="Mes anterior">
              <ChevronIcon size={16} style={{ transform: "rotate(180deg)" }} />
            </button>
            <span className={styles.monthLabel}>
              {MONTHS[month]} {year}
            </span>
            <button className={styles.calNavBtn} onClick={() => goMonth(1)} aria-label="Mes siguiente">
              <ChevronIcon size={16} />
            </button>
          </div>
          <button className={styles.todayBtn} onClick={goToday}>
            Ir a hoy
          </button>

          <div className={styles.weekRow}>
            {WEEK.map((w, i) => (
              <span key={i} className={styles.weekday} data-weekend={i > 4}>
                {w}
              </span>
            ))}
          </div>
          <div className={styles.days}>
            {Array.from({ length: firstIdx }).map((_, i) => (
              <span key={`pad-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const school = isSchool(d);
              return (
                <button
                  key={d}
                  className={styles.day}
                  data-school={school}
                  data-selected={d === selected}
                  data-today={isToday(d)}
                  disabled={!school}
                  onClick={() => school && setSelected(d)}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <p className={styles.calNote}>
            Se marca alerta al alcanzar {umbral} faltas en el mes.
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
            {data.students.length === 0 && (
              <p className={styles.emptyList}>
                Agrega alumnos en Configuración para pasar lista.
              </p>
            )}
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
