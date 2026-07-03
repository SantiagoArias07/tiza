"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useGroup } from "@/lib/store";
import {
  cellKey,
  examAciertoKey,
  examTotalKey,
  extraKey,
  overrideRubroKey,
} from "@/lib/data";
import {
  activityAverage,
  activityCount,
  examScore,
  fmt,
  rubroAverage,
  rubroCalculated,
  rubroIsOverridden,
  rubroPoints,
  rubroScore,
} from "@/lib/calc";
import type { Subject } from "@/lib/types";
import { PeriodTabs } from "@/components/PeriodTabs";
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
  const g = useGroup();
  const { data, notes, setNote, cycleCell, crit } = g;
  const period = g.activePeriod;
  const params = useParams<{ materia: string }>();
  const baseSubject = data.subjects.find((s) => s.slug === params.materia);
  if (!baseSubject) notFound();

  const [expanded, setExpanded] = useState<boolean[]>(
    baseSubject!.rubros.map((_, i) => i < 2)
  );
  const [pop, setPop] = useState<PopState | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState<{ ri: number; sid: number } | null>(null);
  const [editVal, setEditVal] = useState("");

  // Subject augmented with the added activities of the ACTIVE period.
  const subject: Subject = useMemo(
    () => ({
      ...baseSubject!,
      rubros: baseSubject!.rubros.map((r, i) => ({
        ...r,
        activities: [
          ...r.activities,
          ...(g.extraActivities[extraKey(period, baseSubject!.slug, i)] ?? []),
        ],
      })),
    }),
    [baseSubject, g.extraActivities, period]
  );

  const base = `/grupo/${data.id}`;
  const weights = subject.rubros.map((_, i) => crit[i] ?? subject.rubros[i].pct);

  const toggle = (i: number) =>
    setExpanded((prev) => prev.map((v, idx) => (idx === i ? !v : v)));

  const commitEdit = (ri: number, sid: number) => {
    const key = overrideRubroKey(period, subject.slug, ri, sid);
    const num = parseFloat(editVal.replace(",", "."));
    if (editVal.trim() === "" || Number.isNaN(num)) g.setOverride(key, null);
    else g.setOverride(key, Math.max(0, Math.min(10, num)));
    setEditing(null);
  };

  const popStudent = pop ? data.students.find((s) => s.id === pop.studentId) : null;
  const popKey = pop ? cellKey(period, subject.slug, pop.ri, pop.ai, pop.studentId) : "";

  return (
    <div>
      <Link href={`${base}/bitacoras`} className={styles.back}>
        ‹ Todas las bitácoras
      </Link>

      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>{subject.name}</h1>
          <p className={styles.sub}>
            {data.students.length} alumnos · ponderación {weights.join("/")}
          </p>
        </div>
        <button className={styles.newBtn} onClick={() => setNewOpen(true)}>
          <PlusIcon size={17} />
          Nueva actividad
        </button>
      </div>

      <PeriodTabs
        count={g.periodCount}
        active={period}
        onChange={g.setActivePeriod}
      />

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.dot} data-status="complete">✓</span>
          Completa
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dot} data-status="incomplete">◑</span>
          Incompleta
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dot} data-status="missing">✗</span>
          No entregó
        </span>
        <span className={styles.hint}>
          Clic en una celda para cambiar su estado · clic en Calif. para editarla
        </span>
      </div>

      <div className={styles.rubros}>
        {subject.rubros.map((rubro, ri) => {
          const open = expanded[ri];
          const avg = rubroAverage(data, subject, ri, period);
          const isExam = rubro.kind === "exam";
          return (
            <section key={ri} className={styles.rubro}>
              <button className={styles.rubroHead} onClick={() => toggle(ri)}>
                <ChevronIcon size={17} className={styles.chevron} data-open={open} />
                <span className={styles.rubroName}>{rubro.name}</span>
                <span className={styles.pct}>{weights[ri]}%</span>
                <span className={styles.rubroAvg}>
                  Promedio rubro <strong>{fmt(avg)}</strong>
                </span>
              </button>

              {open && isExam && (
                <ExamTable
                  subject={subject}
                  rubroIdx={ri}
                  period={period}
                  editing={editing}
                  editVal={editVal}
                  setEditing={setEditing}
                  setEditVal={setEditVal}
                  commitEdit={commitEdit}
                />
              )}

              {open && !isExam && (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.nameHead}>Alumno</th>
                        {subject.rubros[ri].activities.map((a, ai) => (
                          <th key={ai} className={styles.actHead} title={a.name}>
                            {a.name}
                          </th>
                        ))}
                        <th className={styles.califHead}>Calif.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.students.map((student) => {
                        const score = rubroScore(data, subject, ri, student.id, period);
                        const overridden = rubroIsOverridden(data, subject, ri, student.id, period);
                        const calc = rubroCalculated(data, subject, ri, student.id, period);
                        const pts = rubroPoints(data, subject, ri, student.id, period);
                        const maxPts = weights[ri] / 10;
                        const isEditing = editing?.ri === ri && editing?.sid === student.id;
                        return (
                          <tr key={student.id} className={styles.row}>
                            <td className={styles.nameCell} title={student.name}>
                              {student.name}
                            </td>
                            {Array.from({ length: activityCount(data, subject, ri, period) }).map(
                              (_, ai) => {
                                const key = cellKey(period, subject.slug, ri, ai, student.id);
                                const status = g.cells[key] ?? "complete";
                                return (
                                  <td key={ai} className={styles.cell}>
                                    <StatusCell
                                      status={status}
                                      hasNote={Boolean(notes[key])}
                                      onCycle={() => cycleCell(key)}
                                      onNote={(anchor) =>
                                        setPop({ ri, ai, studentId: student.id, anchor })
                                      }
                                    />
                                  </td>
                                );
                              }
                            )}
                            <CalifCell
                              score={score}
                              pts={pts}
                              maxPts={maxPts}
                              overridden={overridden}
                              calc={calc}
                              isEditing={isEditing}
                              editVal={editVal}
                              onStart={() => {
                                setEditing({ ri, sid: student.id });
                                setEditVal(fmt(score));
                              }}
                              onChange={setEditVal}
                              onCommit={() => commitEdit(ri, student.id)}
                            />
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className={styles.footLabel}>Promedio actividad</td>
                        {subject.rubros[ri].activities.map((_, ai) => (
                          <td key={ai} className={`${styles.footAvg} tabular`}>
                            {fmt(activityAverage(data, subject, ri, ai, period))}
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
        <NotePopover
          key={popKey}
          title={popStudent.name.split(" ").slice(0, 2).join(" ")}
          subtitle={subject.rubros[pop.ri].activities[pop.ai]?.name ?? "Actividad"}
          initial={notes[popKey] ?? ""}
          anchor={pop.anchor}
          onClose={() => setPop(null)}
          onSave={(t) => setNote(popKey, t)}
        />
      )}

      {newOpen && (
        <NewActivityModal
          subject={subject}
          onClose={() => setNewOpen(false)}
          onCreate={(rubroIdx, name) => {
            g.addActivity(period, baseSubject!.slug, rubroIdx, {
              name,
              date: "2026-02-16",
            });
            setExpanded((prev) => prev.map((v, i) => (i === rubroIdx ? true : v)));
            setNewOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* ---- Editable Calif. cell (shows score + weighted points) --------------- */

function CalifCell({
  score,
  pts,
  maxPts,
  overridden,
  calc,
  isEditing,
  editVal,
  onStart,
  onChange,
  onCommit,
}: {
  score: number;
  pts: number;
  maxPts: number;
  overridden: boolean;
  calc: number;
  isEditing: boolean;
  editVal: string;
  onStart: () => void;
  onChange: (v: string) => void;
  onCommit: () => void;
}) {
  return (
    <td className={styles.calif} data-low={score < 6}>
      {isEditing ? (
        <input
          className={styles.califInput}
          value={editVal}
          autoFocus
          inputMode="decimal"
          onChange={(e) => onChange(e.target.value)}
          onBlur={onCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCommit();
            if (e.key === "Escape") onCommit();
          }}
        />
      ) : (
        <button className={styles.califBtn} onClick={onStart} title="Editar calificación">
          <span className={`${styles.califValue} tabular`}>{fmt(score)}</span>
          <span className={styles.califPts}>
            {pts.toFixed(1)}/{maxPts.toFixed(1)} pts
          </span>
          {overridden && (
            <span
              className={styles.editDot}
              title={`Editado manualmente · Calculado: ${fmt(calc)}`}
            />
          )}
        </button>
      )}
    </td>
  );
}

/* ---- Exam rubro (scored by aciertos) ------------------------------------ */

function ExamTable({
  subject,
  rubroIdx,
  period,
  editing,
  editVal,
  setEditing,
  setEditVal,
  commitEdit,
}: {
  subject: Subject;
  rubroIdx: number;
  period: number;
  editing: { ri: number; sid: number } | null;
  editVal: string;
  setEditing: (e: { ri: number; sid: number } | null) => void;
  setEditVal: (v: string) => void;
  commitEdit: (ri: number, sid: number) => void;
}) {
  const g = useGroup();
  const totalKey = examTotalKey(period, subject.slug);
  const total = g.state.examTotals[totalKey] ?? 0;
  const weight = g.crit[rubroIdx] ?? subject.rubros[rubroIdx].pct;
  const maxPts = weight / 10;

  return (
    <div className={styles.examWrap}>
      <div className={styles.examTotalRow}>
        <span className={styles.examTotalLabel}>Aciertos totales del examen</span>
        <input
          className={styles.examTotalInput}
          type="number"
          min={1}
          value={total || ""}
          placeholder="Ej. 20"
          onChange={(e) => g.setExamTotal(totalKey, Math.max(0, Number(e.target.value)))}
        />
        <span className={styles.examHint}>
          Se pone una vez; la calificación se saca sobre 10.
        </span>
      </div>

      {total > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.nameHead}>Alumno</th>
                <th className={styles.actHead}>Aciertos</th>
                <th className={styles.califHead}>Calif.</th>
              </tr>
            </thead>
            <tbody>
              {g.data.students.map((student) => {
                const aKey = examAciertoKey(period, subject.slug, student.id);
                const aciertos = g.state.examAciertos[aKey] ?? 0;
                const score = examScore(g.data, subject, student.id, period);
                const overridden = rubroIsOverridden(g.data, subject, rubroIdx, student.id, period);
                const pts = rubroPoints(g.data, subject, rubroIdx, student.id, period);
                const calc = rubroCalculated(g.data, subject, rubroIdx, student.id, period);
                const isEditing =
                  editing?.ri === rubroIdx && editing?.sid === student.id;
                return (
                  <tr key={student.id} className={styles.row}>
                    <td className={styles.nameCell} title={student.name}>
                      {student.name}
                    </td>
                    <td className={styles.cell}>
                      <input
                        className={styles.aciertoInput}
                        type="number"
                        min={0}
                        max={total}
                        value={aciertos || ""}
                        placeholder="0"
                        onChange={(e) =>
                          g.setAcierto(aKey, Math.max(0, Math.min(total, Number(e.target.value))))
                        }
                      />
                    </td>
                    <CalifCell
                      score={score}
                      pts={pts}
                      maxPts={maxPts}
                      overridden={overridden}
                      calc={calc}
                      isEditing={isEditing}
                      editVal={editVal}
                      onStart={() => {
                        setEditing({ ri: rubroIdx, sid: student.id });
                        setEditVal(fmt(score));
                      }}
                      onChange={setEditVal}
                      onCommit={() => commitEdit(rubroIdx, student.id)}
                    />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
