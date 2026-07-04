import { jsPDF } from "jspdf";
import {
  attendancePct,
  fmt,
  isAtRisk,
  rubroPoints,
  studentAverageCycle,
  subjectGrade,
  subjectGradeCycle,
} from "./calc";
import type { GroupDoc, Student, Subject } from "./types";

/* ---- Generic download ---------------------------------------------------- */

export function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function schoolDays(): string[] {
  const out: string[] = [];
  for (let d = 1; d <= 28; d++) {
    if ((6 + (d - 1)) % 7 < 5) out.push(`2026-02-${String(d).padStart(2, "0")}`);
  }
  return out;
}

const INK = "#2E2C26";
const SLATE = "#43545F";
const MUTED = "#8A8475";
const RISK = "#C2705A";
const HEAD_BG = "#FBF9F3";
const BORDER = "#C9C0AD";

/* ---- CSV (backup) -------------------------------------------------------- */

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function boletaCsv(doc: GroupDoc): string {
  const header = ["Alumno", ...doc.subjects.map((s) => s.name), "Promedio", "En riesgo"];
  const rows = doc.students.map((student) => {
    const grades = doc.subjects.map((s) => fmt(subjectGradeCycle(doc, s, student.id)));
    const avg = fmt(studentAverageCycle(doc, student.id));
    const risk = isAtRisk(doc, student.id) ? "Sí" : "No";
    return [student.name, ...grades, avg, risk];
  });
  return [header, ...rows]
    .map((r) => r.map((c) => csvCell(String(c))).join(","))
    .join("\n");
}

export function downloadBoletaCsv(doc: GroupDoc) {
  const csv = "﻿" + boletaCsv(doc);
  downloadBlob(`respaldo-${slug(doc.label)}.csv`, csv, "text/csv;charset=utf-8");
}

/* ---- Per-subject breakdown ---------------------------------------------- */

interface Breakdown {
  trabajo: number; // weighted (Actividades en clase)
  tareas: number; // weighted (Actividades en casa)
  examen: number; // weighted (Examen)
  decimal: number;
  final: number;
}

function breakdown(
  doc: GroupDoc,
  subject: Subject,
  sid: number,
  period: number
): Breakdown {
  const examRi = subject.rubros.findIndex((r) => r.kind === "exam");
  const nonExam = subject.rubros
    .map((r, i) => ({ r, i }))
    .filter((x) => x.r.kind !== "exam");
  const trabajoRi = nonExam[0]?.i ?? 0;
  const tareasRi = nonExam[1]?.i ?? 1;
  const trabajo = rubroPoints(doc, subject, trabajoRi, sid, period);
  const tareas = rubroPoints(doc, subject, tareasRi, sid, period);
  const examen = examRi >= 0 ? rubroPoints(doc, subject, examRi, sid, period) : 0;
  const decimal = subjectGrade(doc, subject, sid, period);
  return { trabajo, tareas, examen, decimal, final: Math.round(decimal) };
}

/* ---- 1. Concentrado (horizontal, todos los periodos) -------------------- */

function drawConcentrado(
  doc: jsPDF,
  group: GroupDoc,
  student: Student,
  teacher: string
) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const mx = 40;
  let y = 56;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.setTextColor(INK);
  doc.text("CONCENTRADO DE CALIFICACIONES", W / 2, y, { align: "center" });
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(MUTED);
  doc.text(`Ciclo escolar ${group.cycle}`, W / 2, y, { align: "center" });

  y += 34;
  doc.setFontSize(13);
  doc.setTextColor(INK);
  doc.setFont("helvetica", "bold");
  doc.text("Alumno(a):", mx, y);
  doc.setFont("helvetica", "normal");
  doc.text(student.name, mx + 82, y);
  doc.setFont("helvetica", "bold");
  doc.text(`${group.label} · ${group.gradeLevel}`, W - mx, y, { align: "right" });

  y += 22;

  const periods = Math.max(1, group.periodCount || 1);
  const subCols = ["Ex", "Trab", "Tar", "Dec", "Fin"];
  const nameW = 190;
  const avail = W - mx * 2 - nameW;
  const groupW = avail / periods;
  const cellW = groupW / subCols.length;
  const headH1 = 26;
  const headH2 = 22;

  // Size rows so the whole table reaches roughly 3/4 of the page height.
  const bottomReserve = 70;
  const tableBottom = y + (H - bottomReserve - y) * 0.92;
  const nRows = Math.max(group.subjects.length, 1);
  const rowH = Math.max(30, Math.min(58, (tableBottom - (y + headH1 + headH2)) / nRows));

  // Header row 1: period group labels
  doc.setDrawColor(BORDER);
  doc.setFillColor(HEAD_BG);
  doc.rect(mx, y, nameW, headH1 + headH2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(SLATE);
  doc.text("Materia / Campo", mx + 10, y + headH1 + headH2 / 2 + 3);
  let x = mx + nameW;
  for (let p = 0; p < periods; p++) {
    doc.setFillColor(HEAD_BG);
    doc.rect(x, y, groupW, headH1, "FD");
    doc.setFontSize(11);
    doc.setTextColor(SLATE);
    doc.text(`Periodo ${p + 1}`, x + groupW / 2, y + 17, { align: "center" });
    let sx = x;
    subCols.forEach((sc) => {
      doc.setFillColor(HEAD_BG);
      doc.rect(sx, y + headH1, cellW, headH2, "FD");
      doc.setFontSize(8.5);
      doc.setTextColor(MUTED);
      doc.text(sc, sx + cellW / 2, y + headH1 + 15, { align: "center" });
      sx += cellW;
    });
    x += groupW;
  }
  y += headH1 + headH2;

  // Rows: subjects
  group.subjects.forEach((subject) => {
    doc.setDrawColor(BORDER);
    doc.rect(mx, y, nameW, rowH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(INK);
    doc.text(subject.name, mx + 10, y + rowH / 2 + 4, { maxWidth: nameW - 16 });
    let cx = mx + nameW;
    for (let p = 0; p < periods; p++) {
      const b = breakdown(group, subject, student.id, p);
      const vals = [
        b.examen.toFixed(1),
        b.trabajo.toFixed(1),
        b.tareas.toFixed(1),
        b.decimal.toFixed(1),
        String(b.final),
      ];
      let sx = cx;
      vals.forEach((v, i) => {
        doc.rect(sx, y, cellW, rowH);
        doc.setFont("helvetica", i >= 3 ? "bold" : "normal");
        doc.setTextColor(i === 3 && b.decimal < 6 ? RISK : i >= 3 ? INK : SLATE);
        doc.setFontSize(i >= 3 ? 12 : 10.5);
        doc.text(v, sx + cellW / 2, y + rowH / 2 + 4, { align: "center" });
        sx += cellW;
      });
      cx += groupW;
    }
    y += rowH;
  });

  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text(
    "Ex = Examen · Trab = Trabajo en aula · Tar = Tareas · Dec = Calif. con decimal · Fin = Calif. final",
    mx,
    y
  );
  doc.setFontSize(10);
  doc.setTextColor(SLATE);
  doc.text(`Mtro(a). ${teacher}`, W - mx, y, { align: "right" });
}

export function downloadStudentConcentrado(
  group: GroupDoc,
  student: Student,
  teacher: string
) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  drawConcentrado(doc, group, student, teacher);
  doc.save(`concentrado-${slug(student.name)}.pdf`);
}

/* ---- 2. Boleta oficial (vertical, formato SEP) -------------------------- */

function drawBoleta(doc: jsPDF, group: GroupDoc, student: Student, teacher: string) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const mx = 42;
  let y = 46;

  // Institutional header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor("#7A1F2B");
  doc.text("EDUCACIÓN", mx, y);
  doc.setTextColor(INK);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("SISTEMA EDUCATIVO NACIONAL", W - mx, y - 4, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("BOLETA DE EVALUACIÓN", W - mx, y + 9, { align: "right" });
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED);
  doc.text("Secretaría de Educación Pública", mx, y);
  y += 16;
  doc.setDrawColor("#7A1F2B");
  doc.setLineWidth(1.4);
  doc.line(mx, y, W - mx, y);
  doc.setLineWidth(1);
  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(SLATE);
  doc.text(
    `${group.gradeLevel.toUpperCase()} · CICLO ESCOLAR ${group.cycle}`,
    W - mx,
    y,
    { align: "right" }
  );

  // Student / school
  y += 22;
  doc.setFontSize(10);
  doc.setTextColor(INK);
  doc.setFont("helvetica", "bold");
  doc.text("NOMBRE DEL ALUMNO(A):", mx, y);
  doc.setFont("helvetica", "normal");
  doc.text(student.name, mx + 138, y);
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.text("ESCUELA:", mx, y);
  doc.setFont("helvetica", "normal");
  doc.text("________________________", mx + 54, y);
  doc.setFont("helvetica", "bold");
  doc.text("GRUPO:", W - mx - 80, y);
  doc.setFont("helvetica", "normal");
  doc.text(group.label, W - mx - 34, y);

  // Campos formativos table
  y += 22;
  const campos = group.subjects.filter((s) => s.slug !== "fisica").slice(0, 4);
  const periods = Math.max(1, group.periodCount || 1);
  const periodOrdinals = ["PRIMERO", "SEGUNDO", "TERCERO", "CUARTO", "QUINTO", "SEXTO"];

  const nameCol = 118;
  const campoW = (W - mx * 2 - nameCol) / Math.max(campos.length, 1);
  const headH = 40;
  const rowH = 26;

  // Header
  doc.setDrawColor(BORDER);
  doc.setFillColor(HEAD_BG);
  doc.rect(mx, y, nameCol, headH, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(SLATE);
  doc.text("PERIODO DE\nEVALUACIÓN", mx + nameCol / 2, y + headH / 2, {
    align: "center",
  });
  let cx = mx + nameCol;
  campos.forEach((c) => {
    doc.setFillColor(HEAD_BG);
    doc.rect(cx, y, campoW, headH, "FD");
    doc.setFontSize(7.5);
    doc.text(c.name.toUpperCase(), cx + campoW / 2, y + headH / 2, {
      align: "center",
      maxWidth: campoW - 6,
    });
    cx += campoW;
  });
  y += headH;

  // Period rows
  for (let p = 0; p < periods; p++) {
    doc.setDrawColor(BORDER);
    doc.rect(mx, y, nameCol, rowH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(INK);
    doc.text(periodOrdinals[p] ?? `PERIODO ${p + 1}`, mx + nameCol / 2, y + rowH / 2 + 3, {
      align: "center",
    });
    let px = mx + nameCol;
    campos.forEach((c) => {
      doc.rect(px, y, campoW, rowH);
      const g = subjectGrade(group, c, student.id, p);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(g < 6 ? RISK : INK);
      doc.text(String(Math.round(g)), px + campoW / 2, y + rowH / 2 + 4, {
        align: "center",
      });
      px += campoW;
    });
    y += rowH;
  }
  // Promedio final row
  doc.setDrawColor(BORDER);
  doc.setFillColor(HEAD_BG);
  doc.rect(mx, y, nameCol, rowH, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(SLATE);
  doc.text("PROMEDIO FINAL", mx + nameCol / 2, y + rowH / 2 + 3, { align: "center" });
  let fx = mx + nameCol;
  campos.forEach((c) => {
    doc.setFillColor(HEAD_BG);
    doc.rect(fx, y, campoW, rowH, "FD");
    const g = subjectGradeCycle(group, c, student.id);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(g < 6 ? RISK : SLATE);
    doc.text(g.toFixed(1), fx + campoW / 2, y + rowH / 2 + 4, { align: "center" });
    fx += campoW;
  });
  y += rowH;

  // Summary boxes
  y += 20;
  const avg = studentAverageCycle(group, student.id);
  const att = attendancePct(student.id, schoolDays(), group.state.attendance);
  const promovido = avg >= 6;
  const boxW = (W - mx * 2 - 24) / 3;
  const boxY = y;
  [
    { label: "ASISTENCIA", value: `${att.pct.toFixed(0)}%` },
    { label: promovido ? "PROMOVIDO" : "NO PROMOVIDO", value: promovido ? "✓" : "—" },
    { label: "PROMEDIO FINAL DE GRADO", value: avg.toFixed(1) },
  ].forEach((b, i) => {
    const bx = mx + i * (boxW + 12);
    doc.setDrawColor(BORDER);
    doc.setFillColor(HEAD_BG);
    doc.rect(bx, boxY, boxW, 46, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(MUTED);
    doc.text(b.label, bx + boxW / 2, boxY + 14, { align: "center", maxWidth: boxW - 8 });
    doc.setFontSize(17);
    doc.setTextColor(i === 2 ? SLATE : INK);
    doc.text(b.value, bx + boxW / 2, boxY + 37, { align: "center" });
  });
  y = boxY + 46;

  // Observaciones
  y += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(SLATE);
  doc.text("OBSERVACIONES Y SUGERENCIAS SOBRE LOS APRENDIZAJES", mx, y);
  y += 8;
  doc.setDrawColor(BORDER);
  doc.rect(mx, y, W - mx * 2, 96);

  // Signatures
  const footY = H - 54;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(INK);
  doc.text(`Nombre del docente: ${teacher}`, mx, footY - 16);

  const sigW = (W - mx * 2 - 20) / 3;
  doc.setFontSize(8);
  doc.setTextColor(MUTED);
  doc.text("FIRMA DE LA MADRE, PADRE, TUTORA O TUTOR", W / 2, footY - 2, {
    align: "center",
  });
  ["Primer periodo", "Segundo periodo", "Tercer periodo"].forEach((lbl, i) => {
    const sx = mx + i * (sigW + 10);
    doc.setDrawColor(BORDER);
    doc.line(sx, footY + 24, sx + sigW, footY + 24);
    doc.text(lbl, sx + sigW / 2, footY + 34, { align: "center" });
  });
}

export function downloadStudentBoleta(
  group: GroupDoc,
  student: Student,
  _attendance: unknown,
  teacher: string
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  drawBoleta(doc, group, student, teacher);
  doc.save(`boleta-${slug(student.name)}.pdf`);
}

/** All students' boletas in a single multi-page PDF. */
export function downloadGroupBoletas(group: GroupDoc, teacher: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  if (!group.students.length) {
    drawBoleta(doc, group, { id: -1, name: "—" }, teacher);
  } else {
    group.students.forEach((student, i) => {
      if (i > 0) doc.addPage();
      drawBoleta(doc, group, student, teacher);
    });
  }
  doc.save(`boletas-${slug(group.label)}.pdf`);
}
