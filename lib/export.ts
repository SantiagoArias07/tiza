import { jsPDF } from "jspdf";
import {
  attendancePct,
  fmt,
  isAtRisk,
  rubroScore,
  studentAverage,
  subjectGrade,
} from "./calc";
import type { AttStatus, CellStatus, GroupDoc, Student, Subject } from "./types";

type Cells = Record<string, CellStatus>;

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

/** Weekdays of February 2026 (Feb 1 is a Sunday). */
export function schoolDays(): string[] {
  const out: string[] = [];
  for (let d = 1; d <= 28; d++) {
    if ((6 + (d - 1)) % 7 < 5) out.push(`2026-02-${String(d).padStart(2, "0")}`);
  }
  return out;
}

/* ---- CSV (backup) -------------------------------------------------------- */

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function boletaCsv(data: GroupDoc, cells: Cells): string {
  const header = [
    "Alumno",
    ...data.subjects.map((s) => s.name),
    "Promedio",
    "En riesgo",
  ];
  const rows = data.students.map((student) => {
    const grades = data.subjects.map((s) =>
      fmt(subjectGrade(s, student.id, cells))
    );
    const avg = fmt(studentAverage(data, student.id, cells));
    const risk = isAtRisk(data, student.id, cells) ? "Sí" : "No";
    return [student.name, ...grades, avg, risk];
  });
  return [header, ...rows]
    .map((r) => r.map((c) => csvCell(String(c))).join(","))
    .join("\n");
}

export function downloadBoletaCsv(data: GroupDoc, cells: Cells) {
  const csv = "﻿" + boletaCsv(data, cells); // BOM for Excel accents
  downloadBlob(`respaldo-${slug(data.label)}.csv`, csv, "text/csv;charset=utf-8");
}

/* ---- Grade breakdown per subject ---------------------------------------- */

interface Breakdown {
  examen: number; // weighted, max 4.0
  trabajo: number; // weighted, max 4.0
  tareas: number; // weighted, max 2.0
  decimal: number; // 0–10
  final: number; // rounded
}

// Rubro order from the seed: 0 = Actividades en clase (Trabajo en aula),
// 1 = Actividades en casa (Tareas), 2 = Examen.
function breakdown(
  group: GroupDoc,
  subject: Subject,
  studentId: number,
  cells: Cells
): Breakdown {
  const crit = group.state.crit;
  const trabajo = rubroScore(subject, 0, studentId, cells) * ((crit[0] ?? 40) / 100);
  const tareas = rubroScore(subject, 1, studentId, cells) * ((crit[1] ?? 20) / 100);
  const examen = rubroScore(subject, 2, studentId, cells) * ((crit[2] ?? 40) / 100);
  const decimal = subjectGrade(subject, studentId, cells);
  return { examen, trabajo, tareas, decimal, final: Math.round(decimal) };
}

function periodFromTrimester(trimester: string): 0 | 1 | 2 {
  if (trimester.startsWith("1")) return 0;
  if (trimester.startsWith("3")) return 2;
  return 1;
}

/* ---- Low-level table drawing -------------------------------------------- */

const INK = "#2E2C26";
const SLATE = "#43545F";
const MUTED = "#8A8475";
const RISK = "#C2705A";
const HEAD_BG = "#FBF9F3";
const BORDER = "#D9D2C3";

interface Col {
  label: string;
  w: number;
  align?: "left" | "center";
}

function drawTable(
  doc: jsPDF,
  x: number,
  y: number,
  cols: Col[],
  rows: Array<Array<{ text: string; color?: string; bold?: boolean }>>,
  opts: { rowH?: number; headerH?: number } = {}
): number {
  const rowH = opts.rowH ?? 22;
  const headerH = opts.headerH ?? 30;
  const totalW = cols.reduce((a, c) => a + c.w, 0);

  // Header
  doc.setFillColor(HEAD_BG);
  doc.setDrawColor(BORDER);
  doc.rect(x, y, totalW, headerH, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(SLATE);
  let cx = x;
  for (const col of cols) {
    const lines = col.label.split("\n");
    const ty = y + headerH / 2 - (lines.length - 1) * 4.5 + 3;
    const align = col.align ?? "center";
    lines.forEach((ln, i) => {
      if (align === "left") doc.text(ln, cx + 6, ty + i * 9);
      else doc.text(ln, cx + col.w / 2, ty + i * 9, { align: "center" });
    });
    cx += col.w;
    if (cx < x + totalW) doc.line(cx, y, cx, y + headerH);
  }

  // Rows
  let ry = y + headerH;
  doc.setFontSize(9);
  for (const row of rows) {
    doc.setDrawColor(BORDER);
    doc.rect(x, ry, totalW, rowH);
    cx = x;
    row.forEach((cell, i) => {
      const col = cols[i];
      doc.setFont("helvetica", cell.bold ? "bold" : "normal");
      doc.setTextColor(cell.color ?? INK);
      const align = col.align ?? "center";
      const ty = ry + rowH / 2 + 3;
      if (align === "left") {
        doc.text(cell.text, cx + 6, ty, { maxWidth: col.w - 10 });
      } else {
        doc.text(cell.text, cx + col.w / 2, ty, { align: "center" });
      }
      cx += col.w;
      if (i < row.length - 1) doc.line(cx, ry, cx, ry + rowH);
    });
    ry += rowH;
  }
  return ry;
}

/* ---- 1. Concentrado (formato interno de la maestra) --------------------- */

function drawConcentrado(
  doc: jsPDF,
  group: GroupDoc,
  student: Student,
  cells: Cells,
  teacher: string
) {
  const W = doc.internal.pageSize.getWidth();
  const mx = 40;
  let y = 52;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(INK);
  doc.text("CONCENTRADO DE CALIFICACIONES", W / 2, y, { align: "center" });
  y += 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(MUTED);
  doc.text(`CICLO ESCOLAR ${group.cycle}`, W / 2, y, { align: "center" });

  y += 28;
  doc.setFontSize(11);
  doc.setTextColor(INK);
  doc.setFont("helvetica", "bold");
  doc.text("NOMBRE DEL ALUMNO (A):", mx, y);
  doc.setFont("helvetica", "normal");
  doc.text(student.name, mx + 150, y);

  y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(SLATE);
  doc.text(
    `${group.label} · ${group.gradeLevel} · ${group.trimester}`,
    mx,
    y
  );

  y += 14;
  const cols: Col[] = [
    { label: "MATERIAS / CAMPOS", w: 170, align: "left" },
    { label: "EXAMEN\n(4.0)", w: 62 },
    { label: "TRABAJO EN\nAULA (4.0)", w: 66 },
    { label: "TAREAS\n(2.0)", w: 54 },
    { label: "CALIF. CON\nDECIMAL", w: 70 },
    { label: "CALIF.\nFINAL", w: 58 },
  ];
  const rows = group.subjects.map((s) => {
    const b = breakdown(group, s, student.id, cells);
    const low = b.decimal < 6;
    return [
      { text: s.name, align: "left", bold: true },
      { text: b.examen.toFixed(1) },
      { text: b.trabajo.toFixed(1) },
      { text: b.tareas.toFixed(1) },
      { text: b.decimal.toFixed(1), color: low ? RISK : SLATE },
      { text: String(b.final), bold: true, color: low ? RISK : INK },
    ];
  });
  y = drawTable(doc, mx, y, cols, rows);

  y += 30;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(SLATE);
  doc.text(`Mtro(a). ${teacher}`, mx, y);

  doc.setFontSize(8.5);
  doc.setTextColor(MUTED);
  doc.text(
    `Generado con Tiza · ${new Date().toLocaleDateString("es-MX")}`,
    mx,
    doc.internal.pageSize.getHeight() - 30
  );
}

export function downloadStudentConcentrado(
  group: GroupDoc,
  student: Student,
  teacher: string
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  drawConcentrado(doc, group, student, group.state.cells, teacher);
  doc.save(`concentrado-${slug(student.name)}.pdf`);
}

/* ---- 2. Boleta oficial (formato SEP) ------------------------------------ */

function drawBoleta(
  doc: jsPDF,
  group: GroupDoc,
  student: Student,
  cells: Cells,
  attendance: Record<string, AttStatus>,
  teacher: string
) {
  const W = doc.internal.pageSize.getWidth();
  const mx = 40;
  let y = 50;

  // Header band
  doc.setFillColor("#2C3D4C");
  doc.rect(0, 0, W, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(INK);
  doc.text("SISTEMA EDUCATIVO NACIONAL", mx, y);
  y += 15;
  doc.setFontSize(10);
  doc.setTextColor(SLATE);
  doc.text("BOLETA DE EVALUACIÓN", mx, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text(
    `${group.gradeLevel.toUpperCase()} · CICLO ESCOLAR ${group.cycle}`,
    W - mx,
    y,
    { align: "right" }
  );

  y += 26;
  doc.setFontSize(10);
  doc.setTextColor(INK);
  doc.setFont("helvetica", "bold");
  doc.text("ALUMNO(A):", mx, y);
  doc.setFont("helvetica", "normal");
  doc.text(student.name, mx + 66, y);
  y += 15;
  doc.setFont("helvetica", "bold");
  doc.text("ESCUELA:", mx, y);
  doc.setFont("helvetica", "normal");
  doc.text(group.label ? `Grupo ${group.label}` : "", W - mx, y, {
    align: "right",
  });
  doc.text("—", mx + 56, y);

  // Campos formativos = subjects excluding Educación Física, up to 4.
  const campos = group.subjects
    .filter((s) => s.slug !== "fisica")
    .slice(0, 4);
  const period = periodFromTrimester(group.trimester);
  const periodNames = ["PRIMERO", "SEGUNDO", "TERCERO"];

  y += 18;
  const nameCol = 132;
  const campoW = (W - mx * 2 - nameCol) / Math.max(campos.length, 1);
  const cols: Col[] = [
    { label: "PERIODO DE\nEVALUACIÓN", w: nameCol, align: "left" },
    ...campos.map((c) => ({ label: c.name.toUpperCase(), w: campoW })),
  ];

  const rows = periodNames.map((pName, pIdx) => {
    const isActive = pIdx === period;
    return [
      { text: pName, align: "left" as const, bold: true },
      ...campos.map((c) => {
        if (!isActive) return { text: "" };
        const g = subjectGrade(c, student.id, cells);
        return { text: String(Math.round(g)), color: g < 6 ? RISK : INK };
      }),
    ];
  });
  // Promedio final row
  rows.push([
    { text: "PROMEDIO FINAL", align: "left" as const, bold: true },
    ...campos.map((c) => {
      const g = subjectGrade(c, student.id, cells);
      return { text: g.toFixed(1), bold: true, color: g < 6 ? RISK : SLATE };
    }),
  ]);

  y = drawTable(doc, mx, y, cols, rows, { rowH: 26, headerH: 32 });

  // Summary boxes
  y += 22;
  const avg = studentAverage(group, student.id, cells);
  const att = attendancePct(student.id, schoolDays(), attendance);
  const promovido = avg >= 6;

  const boxW = (W - mx * 2 - 24) / 3;
  const boxY = y;
  const boxes = [
    { label: "ASISTENCIA", value: `${att.pct.toFixed(0)}%` },
    { label: promovido ? "PROMOVIDO" : "NO PROMOVIDO", value: promovido ? "Sí" : "No" },
    { label: "PROMEDIO FINAL DE GRADO", value: avg.toFixed(1) },
  ];
  boxes.forEach((b, i) => {
    const bx = mx + i * (boxW + 12);
    doc.setDrawColor(BORDER);
    doc.setFillColor("#FBF9F3");
    doc.rect(bx, boxY, boxW, 46, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(MUTED);
    doc.text(b.label, bx + boxW / 2, boxY + 14, { align: "center", maxWidth: boxW - 8 });
    doc.setFontSize(16);
    doc.setTextColor(i === 2 ? SLATE : INK);
    doc.text(b.value, bx + boxW / 2, boxY + 36, { align: "center" });
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
  doc.rect(mx, y, W - mx * 2, 90);

  // Signatures
  y += 108;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(INK);
  doc.text(`Nombre del docente: ${teacher}`, mx, y);

  const footY = doc.internal.pageSize.getHeight() - 40;
  const sigW = (W - mx * 2 - 20) / 3;
  ["Primer periodo", "Segundo periodo", "Tercer periodo"].forEach((lbl, i) => {
    const sx = mx + i * (sigW + 10);
    doc.setDrawColor(BORDER);
    doc.line(sx, footY, sx + sigW, footY);
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    doc.text(lbl, sx + sigW / 2, footY + 12, { align: "center" });
  });
  doc.setFontSize(8);
  doc.setTextColor(MUTED);
  doc.text(
    "Firma de la madre, padre, tutora o tutor",
    W / 2,
    footY - 8,
    { align: "center" }
  );
}

export function downloadStudentBoleta(
  group: GroupDoc,
  student: Student,
  attendance: Record<string, AttStatus>,
  teacher: string
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  drawBoleta(doc, group, student, group.state.cells, attendance, teacher);
  doc.save(`boleta-${slug(student.name)}.pdf`);
}

/** All students' boletas in a single multi-page PDF (group backup/report). */
export function downloadGroupBoletas(group: GroupDoc, teacher: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  group.students.forEach((student, i) => {
    if (i > 0) doc.addPage();
    drawBoleta(doc, group, student, group.state.cells, group.state.attendance, teacher);
  });
  doc.save(`boletas-${slug(group.label)}.pdf`);
}
