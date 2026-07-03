"use client";

import { useRouter } from "next/navigation";
import { useGroup } from "@/lib/store";
import {
  failedSubjects,
  fmt,
  groupAverage,
  isAtRisk,
  studentAverageCycle,
  subjectAverageCycle,
  subjectGrade,
} from "@/lib/calc";
import { PageHeader } from "@/components/ui";
import styles from "./analitica.module.css";

function gradeTone(v: number) {
  if (v < 6) return "var(--risk)";
  if (v < 7.5) return "var(--warn)";
  return "var(--ok)";
}

export default function AnaliticaPage() {
  const { data, cells, periodCount } = useGroup();
  const router = useRouter();
  const base = `/grupo/${data.id}`;

  const bySubject = data.subjects.map((s) => ({
    name: s.name,
    abbr: s.abbr,
    value: subjectAverageCycle(data, s),
  }));

  // Distribution buckets.
  const buckets = [
    { label: "<6", min: 0, max: 6, color: "var(--risk)" },
    { label: "6–7", min: 6, max: 7, color: "#C98F5A" },
    { label: "7–8", min: 7, max: 8, color: "var(--warn)" },
    { label: "8–9", min: 8, max: 9, color: "#7FA05E" },
    { label: "9–10", min: 9, max: 10.01, color: "var(--ok)" },
  ];
  const avgs = data.students.map((s) => studentAverageCycle(data, s.id));
  const dist = buckets.map(
    (b) => avgs.filter((a) => a >= b.min && a < b.max).length
  );
  const distMax = Math.max(...dist, 1);

  const risky = data.students.filter((s) => isAtRisk(data, s.id));

  // Delivery rate: entregadas (complete + incomplete) / total.
  let total = 0;
  let delivered = 0;
  for (const v of Object.values(cells)) {
    total++;
    if (v !== "missing") delivered++;
  }
  const deliveryRate = total ? (delivered / total) * 100 : 0;

  const groupAvg = groupAverage(data);

  // Group average per period, for the evolution chart.
  const periodAverages = Array.from({ length: periodCount }).map((_, p) => {
    if (!data.students.length || !data.subjects.length) return 0;
    let sum = 0;
    for (const s of data.students) {
      let sg = 0;
      for (const subj of data.subjects) sg += subjectGrade(data, subj, s.id, p);
      sum += sg / data.subjects.length;
    }
    return sum / data.students.length;
  });

  return (
    <div>
      <PageHeader
        title="Analítica"
        subtitle={`${data.label} · panorama del ${data.trimester}`}
      />

      <div className={styles.grid}>
        <Card title="Promedio por materia">
          <div className={styles.barList}>
            {bySubject.map((s) => (
              <div key={s.abbr} className={styles.barRow}>
                <span className={styles.barLabel}>{s.name}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${(s.value / 10) * 100}%`,
                      background: gradeTone(s.value),
                    }}
                  />
                </span>
                <span className={`${styles.barValue} tabular`}>
                  {fmt(s.value)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Distribución de promedios">
          <div className={styles.dist}>
            {buckets.map((b, i) => (
              <div key={b.label} className={styles.distCol}>
                <span className={styles.distCount}>{dist[i]}</span>
                <span
                  className={styles.distBar}
                  style={{
                    height: `${(dist[i] / distMax) * 120 + 4}px`,
                    background: b.color,
                  }}
                />
                <span className={styles.distLabel}>{b.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Alumnos en riesgo">
          {risky.length === 0 ? (
            <p className={styles.empty}>Ningún alumno en riesgo. ¡Bien!</p>
          ) : (
            <div className={styles.riskList}>
              {risky.map((s) => {
                const failed = failedSubjects(data, s.id);
                return (
                  <button
                    key={s.id}
                    className={styles.riskItem}
                    onClick={() => router.push(`${base}/alumno/${s.id}`)}
                  >
                    <span className={styles.riskName}>{s.name}</span>
                    <span className={styles.riskSubjects}>
                      {failed.map((f) => f.abbr).join(" · ")}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Tasa de entrega de actividades">
          <div className={styles.delivery}>
            <span className={styles.deliveryNum}>{deliveryRate.toFixed(0)}%</span>
            <span className={styles.deliveryTrack}>
              <span
                className={styles.deliveryFill}
                style={{ width: `${deliveryRate}%` }}
              />
            </span>
            <span className={styles.deliveryNote}>
              Actividades entregadas a tiempo o de forma incompleta.
            </span>
          </div>
        </Card>

        <Card title="Evolución del promedio por periodo" wide>
          <Evolution values={periodAverages} />
        </Card>
      </div>
    </div>
  );
}

function Card({
  title,
  children,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <section className={styles.card} data-wide={wide}>
      <h2 className={styles.cardTitle}>{title}</h2>
      {children}
    </section>
  );
}

function Evolution({ values }: { values: number[] }) {
  const w = 520;
  const h = 160;
  const pad = 30;
  const toY = (v: number) => h - pad - (Math.max(0, Math.min(10, v)) / 10) * (h - pad * 2);
  const n = values.length;
  const xAt = (i: number) =>
    n <= 1 ? w / 2 : pad + 40 + (i * (w - pad * 2 - 80)) / (n - 1);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={styles.chart}>
      {[0, 5, 10].map((g) => (
        <g key={g}>
          <line x1={pad} x2={w - pad} y1={toY(g)} y2={toY(g)} stroke="var(--border-3)" strokeWidth={1} />
          <text x={4} y={toY(g) + 4} fontSize={10} fill="var(--faint)">{g}</text>
        </g>
      ))}
      {values.length > 1 && (
        <polyline
          fill="none"
          stroke="var(--ok)"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={values.map((v, i) => `${xAt(i)},${toY(v)}`).join(" ")}
        />
      )}
      {values.map((v, i) => (
        <g key={i}>
          <circle cx={xAt(i)} cy={toY(v)} r={5} fill="var(--ok)" />
          <text x={xAt(i)} y={toY(v) - 12} fontSize={11} fontWeight={700} fill="var(--slate)" textAnchor="middle">
            {fmt(v)}
          </text>
          <text x={xAt(i)} y={h - 8} fontSize={11} fill="var(--muted)" textAnchor="middle">
            Periodo {i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}
