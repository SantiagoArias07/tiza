"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { fmt, groupAverage, riskCount } from "@/lib/calc";
import { SectionLabel } from "@/components/ui";
import { ChevronIcon } from "@/components/icons";
import styles from "./dashboard.module.css";

const ARCHIVED = [
  { label: "3° A · Primaria", cycle: "Ciclo 2024–2025", avg: "8.4" },
  { label: "2° B · Primaria", cycle: "Ciclo 2023–2024", avg: "8.0" },
];

export default function DashboardPage() {
  const { data, cells } = useStore();
  const router = useRouter();
  const [archivedOpen, setArchivedOpen] = useState(false);

  const avg = groupAverage(data, cells);
  const risk = riskCount(data, cells);
  const base = `/grupo/${data.id}`;

  return (
    <div>
      <h1 className={styles.greeting}>Buenas tardes, Profe Marisol</h1>
      <p className={styles.date}>Lunes 9 de febrero de 2026 · Semana 24</p>

      <SectionLabel>Tus grupos</SectionLabel>

      <div
        className={styles.groupCard}
        onClick={() => router.push(`${base}/boleta`)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && router.push(`${base}/boleta`)}
      >
        <div className={styles.band}>
          <div>
            <div className={styles.bandTitle}>{data.label} · Primaria</div>
            <div className={styles.bandSub}>
              Ciclo escolar {data.cycle} · Grupo titular
            </div>
          </div>
          <span className={styles.badge}>2° trimestre activo</span>
        </div>

        <div className={styles.metrics}>
          <Metric label="Alumnos" value={String(data.students.length)} tone="ink" />
          <Metric label="Promedio grupo" value={fmt(avg)} tone="slate" />
          <Metric label="En riesgo" value={`${risk} alumnos`} tone="risk" />
          <Metric label="Asistencia" value="94%" tone="ok" last />
        </div>

        <div className={styles.footer}>
          <span className={styles.footerNote}>
            Última bitácora · Matemáticas, hoy 8:40
          </span>
          <span className={styles.cta}>Entrar al grupo →</span>
        </div>
      </div>

      <button
        className={styles.archivedToggle}
        onClick={() => setArchivedOpen((v) => !v)}
      >
        <ChevronIcon
          size={16}
          className={styles.chevron}
          data-open={archivedOpen}
        />
        <span>Archivos · Ciclos anteriores</span>
      </button>

      {archivedOpen && (
        <div className={styles.archivedGrid}>
          {ARCHIVED.map((a) => (
            <div key={a.label} className={styles.archivedCard}>
              <div>
                <div className={styles.archivedTitle}>{a.label}</div>
                <div className={styles.archivedCycle}>{a.cycle}</div>
              </div>
              <div className={styles.archivedAvg}>
                <span className={styles.archivedAvgLabel}>Prom.</span>
                <span className={styles.archivedAvgValue}>{a.avg}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
  last,
}: {
  label: string;
  value: string;
  tone: "ink" | "slate" | "risk" | "ok";
  last?: boolean;
}) {
  return (
    <div className={styles.metric} data-last={last}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue} data-tone={tone}>
        {value}
      </div>
    </div>
  );
}
