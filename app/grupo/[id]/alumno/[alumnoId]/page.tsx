"use client";

import { useMemo } from "react";
import { notFound, useParams } from "next/navigation";
import { useGroup } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import {
  attendancePct,
  fmt,
  isAtRisk,
  subjectGrade,
  subjectGradeCycle,
} from "@/lib/calc";
import { downloadStudentBoleta, downloadStudentConcentrado } from "@/lib/export";
import { FileTextIcon } from "@/components/icons";
import styles from "./alumno.module.css";

function schoolDaysFeb2026() {
  const out: string[] = [];
  const first = 6; // Feb 1 is Sunday
  for (let d = 1; d <= 28; d++) {
    if ((first + (d - 1)) % 7 < 5) out.push(`2026-02-${String(d).padStart(2, "0")}`);
  }
  return out;
}

export default function AlumnoPage() {
  const { data, attendance, privNotes, setPrivNote, periodCount } = useGroup();
  const { user } = useAuth();
  const teacher = user?.name ?? "Docente";
  const params = useParams<{ alumnoId: string }>();
  const student = data.students.find((s) => String(s.id) === params.alumnoId);
  if (!student) notFound();

  const days = useMemo(schoolDaysFeb2026, []);
  const risk = isAtRisk(data, student!.id);
  const att = attendancePct(student!.id, days, attendance);

  // Overall average per period.
  const perPeriod = Array.from({ length: periodCount }).map((_, p) => {
    if (!data.subjects.length) return 0;
    const sum = data.subjects.reduce(
      (a, s) => a + subjectGrade(data, s, student!.id, p),
      0
    );
    return sum / data.subjects.length;
  });

  const initials = student!.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.identity}>
          <span className={styles.avatar}>{initials}</span>
          <div>
            <div className={styles.nameRow}>
              <h1 className={styles.name}>{student!.name}</h1>
              {risk && <span className={styles.riskBadge}>En riesgo</span>}
            </div>
            <p className={styles.sub}>
              {data.label} · Ciclo {data.cycle}
            </p>
          </div>
        </div>
        <div className={styles.pdfActions}>
          <button
            className={styles.pdfBtn}
            onClick={() => downloadStudentBoleta(data, student!, attendance, teacher)}
          >
            <FileTextIcon size={17} />
            Boleta oficial
          </button>
          <button
            className={styles.pdfBtnGhost}
            onClick={() => downloadStudentConcentrado(data, student!, teacher)}
          >
            <FileTextIcon size={17} />
            Concentrado
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        <section className={styles.col}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Calificaciones por materia (ciclo)</h2>
            <div className={styles.subjects}>
              {data.subjects.map((s) => {
                const grade = subjectGradeCycle(data, s, student!.id);
                const failed = grade < 6;
                return (
                  <div key={s.slug} className={styles.subjRow}>
                    <span className={styles.subjName}>{s.name}</span>
                    <span className={styles.subjTrack}>
                      <span
                        className={styles.subjFill}
                        style={{
                          width: `${(grade / 10) * 100}%`,
                          background: failed ? "var(--risk)" : "var(--ok)",
                        }}
                      />
                    </span>
                    <span
                      className={`${styles.subjValue} tabular`}
                      data-failed={failed}
                    >
                      {fmt(grade)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Promedio por periodo</h2>
            <div className={styles.breakdown}>
              {perPeriod.map((v, p) => (
                <div key={p} className={styles.breakRow}>
                  <span className={styles.breakName}>Periodo {p + 1}</span>
                  <span className={`${styles.breakScore} tabular`} data-low={v < 6}>
                    {fmt(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.col}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Asistencia</h2>
            <div className={styles.attNum}>{att.pct.toFixed(0)}%</div>
            <p className={styles.attDetail}>
              {att.present} presentes · {att.delays} retardos · {att.absent}{" "}
              faltas (de {days.length} días)
            </p>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Notas privadas</h2>
            <p className={styles.privHint}>Solo para ti.</p>
            <textarea
              className={styles.privArea}
              value={privNotes[student!.id] ?? ""}
              placeholder="Observaciones sobre el alumno…"
              onChange={(e) => setPrivNote(student!.id, e.target.value)}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
