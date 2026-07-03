"use client";

import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/ui";
import { XIcon, PlusIcon } from "@/components/icons";
import styles from "./configuracion.module.css";

const RUBRO_NAMES = ["Actividades en clase", "Actividades en casa", "Examen"];

export default function ConfiguracionPage() {
  const { data, crit, setCrit, umbral, setUmbral, materias, setMaterias } =
    useStore();

  const sum = crit.reduce((a, b) => a + b, 0);
  const sumTone = sum === 100 ? "ok" : sum < 100 ? "warn" : "risk";

  const stepCrit = (i: number, delta: number) =>
    setCrit(
      crit.map((v, idx) =>
        idx === i ? Math.max(0, Math.min(100, v + delta)) : v
      )
    );

  return (
    <div className={styles.wrap}>
      <PageHeader
        title="Configuración del grupo"
        subtitle={`${data.label} · ${data.cycle}`}
      />

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Materias del grupo</h2>
        <div className={styles.chips}>
          {materias.map((m) => (
            <span key={m} className={styles.chip}>
              {m}
              <button
                className={styles.chipX}
                onClick={() => setMaterias(materias.filter((x) => x !== m))}
                aria-label={`Quitar ${m}`}
              >
                <XIcon size={13} />
              </button>
            </span>
          ))}
          <button
            className={styles.addChip}
            onClick={() =>
              setMaterias([...materias, `Materia ${materias.length + 1}`])
            }
          >
            <PlusIcon size={14} />
            Agregar materia
          </button>
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Criterios de evaluación</h2>
        <div className={styles.criteria}>
          {RUBRO_NAMES.map((name, i) => (
            <div key={name} className={styles.critRow}>
              <span className={styles.critName}>{name}</span>
              <div className={styles.stepper}>
                <button
                  className={styles.stepBtn}
                  onClick={() => stepCrit(i, -5)}
                >
                  −
                </button>
                <span className={styles.stepValue}>{crit[i] ?? 0}%</span>
                <button
                  className={styles.stepBtn}
                  onClick={() => stepCrit(i, 5)}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.sumTrack}>
          <span
            className={styles.sumFill}
            data-tone={sumTone}
            style={{ width: `${Math.min(sum, 100)}%` }}
          />
        </div>
        <div className={styles.sumLabel} data-tone={sumTone}>
          Suma {sum}%
          {sum !== 100 && (
            <span className={styles.sumHint}>
              {sum < 100 ? " · faltan puntos" : " · excede 100%"}
            </span>
          )}
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Umbral de asistencia</h2>
        <p className={styles.umbralNote}>
          Faltas en el trimestre antes de mostrar una alerta.
        </p>
        <div className={styles.umbralStepper}>
          <button
            className={styles.umbralBtn}
            onClick={() => setUmbral(Math.max(1, umbral - 1))}
          >
            −
          </button>
          <span className={styles.umbralValue}>{umbral}</span>
          <button
            className={styles.umbralBtn}
            onClick={() => setUmbral(Math.min(15, umbral + 1))}
          >
            +
          </button>
          <span className={styles.umbralUnit}>faltas</span>
        </div>
      </section>
    </div>
  );
}
