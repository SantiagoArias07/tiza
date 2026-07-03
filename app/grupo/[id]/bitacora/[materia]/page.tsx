"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { extraKey, useGroup } from "@/lib/store";
import { cellKey } from "@/lib/data";
import { activityAverage, fmt, rubroScore } from "@/lib/calc";
import type { Subject } from "@/lib/types";
import { StatusCell } from "@/components/StatusCell";
import { NotePopover } from "@/components/NotePopover";
import { NewActivityModal } from "@/components/NewActivityModal";
import { ChevronIcon, PlusIcon } from "@/components/icons";
import styles from "./materia.module.css";

interface PopState {
  ri: number;
  ai: number;
  studentId: number;
  anchor: DOMRect;
}

export default function MateriaPage() {
  const { data, cells, notes, setNote, cycleCell, crit, extraActivities, addActivity } =
    useGroup();
  const params = useParams<{ materia: string }>();
  const baseSubject = data.subjects.find((s) => s.slug === params.materia);
  if (!baseSubject) notFound();

  const [expanded, setExpanded] = useState<boolean[]>(
    baseSubject!.rubros.map((_, i) => i < 2)
  );
  const [pop, setPop] = useState<PopState | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  // Subject augmented with persisted added activities (keeps calc consistent).
  const subject: Subject = useMemo(
    () => ({
      ...baseSubject!,
      rubros: baseSubject!.rubros.map((r, i) => ({
        ...r,
        activities: [
          ...r.activities,
          ...(extraActivities[extraKey(baseSubject!.slug, i)] ?? []),
        ],
      })),
    }),
    [baseSubject, extraActivities]
  );

  const base = `/grupo/${data.id}`;
  const weights = subject.rubros.map((_, i) => crit[i] ?? subject.rubros[i].pct);

  const toggle = (i: number) =>
    setExpanded((prev) => prev.map((v, idx) => (idx === i ? !v : v)));

  const popStudent = pop ? data.students.find((s) => s.id === pop.studentId) : null;
  const popKey = pop
    ? cellKey(subject.slug, pop.ri, pop.ai, pop.studentId)
    : "";

  return (
    <div>
      <Link href={`${base}/bitacoras`} className={styles.back}>
        ‹ Todas las bitácoras
      </Link>

      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>{subject.name}</h1>
          <p className={styles.sub}>
            {data.trimester} · {data.students.length} alumnos · ponderación{" "}
            {weights.join("/")}
          </p>
        </div>
        <button className={styles.newBtn} onClick={() => setNewOpen(true)}>
          <PlusIcon size={17} />
          Nueva actividad
        </button>
      </div>

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.dot} data-status="complete">
            ✓
          </span>
          Completa
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dot} data-status="incomplete">
            ◑
          </span>
          Incompleta
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dot} data-status="missing">
            ✗
          </span>
          No entregó
        </span>
        <span className={styles.hint}>
          Clic en una celda para cambiar su estado
        </span>
      </div>

      <div className={styles.rubros}>
        {subject.rubros.map((rubro, ri) => {
          const open = expanded[ri];
          const avg =
            data.students.reduce(
              (acc, s) => acc + rubroScore(subject, ri, s.id, cells),
              0
            ) / data.students.length;
          return (
            <section key={ri} className={styles.rubro}>
              <button className={styles.rubroHead} onClick={() => toggle(ri)}>
                <ChevronIcon
                  size={17}
                  className={styles.chevron}
                  data-open={open}
                />
                <span className={styles.rubroName}>{rubro.name}</span>
                <span className={styles.pct}>{weights[ri]}%</span>
                <span className={styles.rubroAvg}>
                  Promedio rubro <strong>{fmt(avg)}</strong>
                </span>
              </button>

              {open && (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.nameHead}>Alumno</th>
                        {rubro.activities.map((a, ai) => (
                          <th key={ai} className={styles.actHead} title={a.name}>
                            {a.name}
                          </th>
                        ))}
                        <th className={styles.califHead}>Calif.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.students.map((student) => {
                        const score = rubroScore(
                          subject,
                          ri,
                          student.id,
                          cells
                        );
                        return (
                          <tr key={student.id} className={styles.row}>
                            <td className={styles.nameCell} title={student.name}>
                              {student.name}
                            </td>
                            {rubro.activities.map((_, ai) => {
                              const key = cellKey(
                                subject.slug,
                                ri,
                                ai,
                                student.id
                              );
                              const status = cells[key] ?? "complete";
                              return (
                                <td key={ai} className={styles.cell}>
                                  <StatusCell
                                    status={status}
                                    hasNote={Boolean(notes[key])}
                                    onCycle={() => cycleCell(key)}
                                    onNote={(anchor) =>
                                      setPop({
                                        ri,
                                        ai,
                                        studentId: student.id,
                                        anchor,
                                      })
                                    }
                                  />
                                </td>
                              );
                            })}
                            <td
                              className={`${styles.calif} tabular`}
                              data-low={score < 6}
                            >
                              {fmt(score)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className={styles.footLabel}>Promedio actividad</td>
                        {rubro.activities.map((_, ai) => (
                          <td key={ai} className={`${styles.footAvg} tabular`}>
                            {fmt(
                              activityAverage(
                                subject,
                                ri,
                                ai,
                                data.students,
                                cells
                              )
                            )}
                          </td>
                        ))}
                        <td className={styles.footPad} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {pop && popStudent && (
        <NotePopoverBinder
          popKey={popKey}
          studentName={popStudent.name}
          activityName={
            subject.rubros[pop.ri].activities[pop.ai]?.name ?? "Actividad"
          }
          anchor={pop.anchor}
          initial={notes[popKey] ?? ""}
          onClose={() => setPop(null)}
          onSave={(t) => setNote(popKey, t)}
        />
      )}

      {newOpen && (
        <NewActivityModal
          subject={subject}
          onClose={() => setNewOpen(false)}
          onCreate={(rubroIdx, name) => {
            addActivity(baseSubject!.slug, rubroIdx, {
              name,
              date: "2026-02-16",
            });
            setExpanded((prev) =>
              prev.map((v, i) => (i === rubroIdx ? true : v))
            );
            setNewOpen(false);
          }}
        />
      )}
    </div>
  );
}

function NotePopoverBinder({
  popKey,
  studentName,
  activityName,
  anchor,
  initial,
  onClose,
  onSave,
}: {
  popKey: string;
  studentName: string;
  activityName: string;
  anchor: DOMRect;
  initial: string;
  onClose: () => void;
  onSave: (text: string) => void;
}) {
  return (
    <NotePopover
      key={popKey}
      title={studentName.split(" ").slice(0, 2).join(" ")}
      subtitle={activityName}
      initial={initial}
      anchor={anchor}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
