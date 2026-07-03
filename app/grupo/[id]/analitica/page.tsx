"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import {
  failedSubjects,
  fmt,
  groupAverage,
  isAtRisk,
  studentAverage,
  subjectAverage,
} from "@/lib/calc";
import { PageHeader } from "@/components/ui";
import styles from "./analitica.module.css";

function gradeTone(v: number) {
  if (v < 6) return "var(--risk)";
  if (v < 7.5) return "var(--warn)";
  return "var(--ok)";
}

export default function AnaliticaPage() {
  const { data, cells } = useStore();
  const router = useRouter();
  const base = `/grupo/${data.id}`;

  const bySubject = data.subjects.map((s) => ({
    name: s.name,
    abbr: s.abbr,
    value: subjectAverage(s, data.students, cells),
  }));

  // Distribution buckets.
  const buckets = [
    { label: "<6", min: 0, max: 6, color: "var(--risk)" },
    { label: "6–7", min: 6, max: 7, color: "#C98F5A" },
    { label: "7–8", min: 7, max: 8, color: "var(--warn)" },
    { label: "8–9", min: 8, max: 9, color: "#7FA05E" },
    { label: "9–10", min: 9, max: 10.01, color: "var(--ok)" },
  ];
  const avgs = data.students.map((s) => studentAverage(data, s.id, cells));
  const dist = buckets.map(
    (b) => avgs.filter((a) => a >= b.min && a < b.max).length
  );
  const distMax = Math.max(...dist, 1);

  const risky = data.students.filter((s) => isAtRisk(data, s.id, cells));

  // Delivery rate: entregadas (complete + incomplete) / total.
  let total = 0;
  let delivered = 0;
  for (const v of Object.values(cells)) {
    total++;
    if (v !== "missing") delivered++;
  }
  const deliveryRate = total ? (delivered / total) * 100 : 0;

  const groupAvg = groupAverage(data, cells);
  const trim1 = 7.9;

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
                const failed = failedSubjects(data, s.id, cells);
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

        <Card title="Evolución del promedio" wide>
          <Evolution trim1={trim1} trim2={groupAvg} />
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

function Evolution({ trim1, trim2 }: { trim1: number; trim2: number }) {
  const w = 520;
  const h = 150;
  const pad = 30;
  const toY = (v: number) => h - pad - ((v - 6) / 4) * (h - pad * 2);
  const x1 = pad + 60;
  const x2 = w - pad - 60;
  const y1 = toY(trim1);
  const y2 = toY(trim2);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={styles.chart}>
      {[6, 7, 8, 9, 10].map((g) => (
        <g key={g}>
          <line
            x1={pad}
            x2={w - pad}
            y1={toY(g)}
            y2={toY(g)}
            stroke="var(--border-3)"
            strokeWidth={1}
          />
          <text x={4} y={toY(g) + 4} fontSize={10} fill="var(--faint)">
            {g}
          </text>
        </g>
      ))}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="var(--ok)"
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <circle cx={x1} cy={y1} r={5} fill="var(--bg-card)" stroke="var(--ok)" strokeWidth={2.4} />
      <circle cx={x2} cy={y2} r={5} fill="var(--ok)" />
      <text x={x1} y={h - 8} fontSize={11} fill="var(--muted)" textAnchor="middle">
        1° trim · {fmt(trim1)}
      </text>
      <text x={x2} y={h - 8} fontSize={11} fill="var(--slate)" fontWeight={700} textAnchor="middle">
        2° trim · {fmt(trim2)}
      </text>
    </svg>
  );
}
