import { jsPDF } from "jspdf";
import {
  attendanceCycle,
  fmt,
  isAtRisk,
  roundFinal,
  rubroPoints,
  rubroWeightPct,
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
  const rubros = group.subjects[0]?.rubros ?? [];
  // One column per criterio + "Prom" (decimal) + "Final".
  const subCols = [
    ...rubros.map((r, i) => ({
      label: abbrevRubro(r.name),
      pct: Math.round(rubroWeightPct(group, i)),
    })),
    { label: "Prom.", pct: -1 },
    { label: "Final", pct: -1 },
  ];
  const nCols = subCols.length;
  const nameW = 172;
  const avail = W - mx * 2 - nameW;
  const groupW = avail / periods;
  const cellW = groupW / nCols;
  const headH1 = 24;
  const headH2 = 26;

  const bottomReserve = 64;
  const tableBottom = y + (H - bottomReserve - y) * 0.92;
  const nRows = Math.max(group.subjects.length, 1);
  const rowH = Math.max(28, Math.min(56, (tableBottom - (y + headH1 + headH2)) / nRows));

  // Header
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
    doc.setFontSize(10.5);
    doc.setTextColor(SLATE);
    doc.text(`Periodo ${p + 1}`, x + groupW / 2, y + 16, { align: "center" });
    let sx = x;
    subCols.forEach((sc) => {
      doc.setFillColor(HEAD_BG);
      doc.rect(sx, y + headH1, cellW, headH2, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(SLATE);
      doc.text(sc.label, sx + cellW / 2, y + headH1 + 11, {
        align: "center",
        maxWidth: cellW - 3,
      });
      if (sc.pct >= 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(MUTED);
        doc.text(`${sc.pct}%`, sx + cellW / 2, y + headH1 + 20, { align: "center" });
      }
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
    doc.setFontSize(10.5);
    doc.setTextColor(INK);
    doc.text(subject.name, mx + 10, y + rowH / 2 + 4, { maxWidth: nameW - 16 });
    let cx = mx + nameW;
    for (let p = 0; p < periods; p++) {
      const decimal = subjectGrade(group, subject, student.id, p);
      const vals = [
        ...subject.rubros.map((_, ri) =>
          rubroPoints(group, subject, ri, student.id, p).toFixed(1)
        ),
        decimal.toFixed(1),
        String(roundFinal(group, decimal)),
      ];
      let sx = cx;
      vals.forEach((v, i) => {
        const isProm = i === vals.length - 2;
        const isFinal = i === vals.length - 1;
        doc.rect(sx, y, cellW, rowH);
        doc.setFont("helvetica", isProm || isFinal ? "bold" : "normal");
        doc.setTextColor(
          (isProm || isFinal) && decimal < 6 ? RISK : isProm || isFinal ? INK : SLATE
        );
        doc.setFontSize(isProm || isFinal ? 11.5 : 9.5);
        doc.text(v, sx + cellW / 2, y + rowH / 2 + 4, { align: "center" });
        sx += cellW;
      });
      cx += groupW;
    }
    y += rowH;
  });

  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED);
  doc.text(
    "Cada columna muestra los puntos que aporta el criterio · Prom. = calificación con decimal · Final = calificación redondeada",
    mx,
    y
  );
  doc.setFontSize(10);
  doc.setTextColor(SLATE);
  doc.text(`Mtro(a). ${teacher}`, W - mx, y + 14, { align: "right" });
}

/** Short label for a criterio column (last significant word). */
function abbrevRubro(name: string): string {
  const words = name.trim().split(/\s+/);
  const w = words.length > 1 && words[words.length - 1].length <= 3
    ? words[words.length - 2]
    : words[words.length - 1];
  const cap = w.charAt(0).toUpperCase() + w.slice(1);
  return cap.length > 9 ? cap.slice(0, 9) : cap;
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
  const RED = "#7A1F2B";
  let y = 50;

  // ---- Institutional header (text-based; official seals need asset files) --
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(RED);
  doc.text("EDUCACIÓN", mx, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(MUTED);
  doc.text("SECRETARÍA DE EDUCACIÓN PÚBLICA", mx, y + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(RED);
  doc.text("SEV", mx + 150, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(MUTED);
  doc.text("Secretaría de Educación", mx + 150, y + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(INK);
  doc.text("SISTEMA EDUCATIVO NACIONAL", W - mx, y - 6, { align: "right" });
  doc.text("VERACRUZ DE IGNACIO DE LA LLAVE", W - mx, y + 3, { align: "right" });
  doc.text("BOLETA DE EVALUACIÓN", W - mx, y + 12, { align: "right" });

  y += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(RED);
  doc.text(`${group.gradeLevel.toUpperCase()} DE EDUCACIÓN PRIMARIA`, W - mx, y, {
    align: "right",
  });
  doc.setTextColor(SLATE);
  doc.text(`CICLO ESCOLAR ${group.cycle}`, W - mx, y + 10, { align: "right" });

  doc.setDrawColor(RED);
  doc.setLineWidth(1.2);
  doc.line(mx, y + 16, W - mx, y + 16);
  doc.setLineWidth(1);
  y += 34;

  // ---- Student / school ---------------------------------------------------
  doc.setFontSize(9.5);
  doc.setTextColor(INK);
  doc.setFont("helvetica", "bold");
  doc.text("NOMBRE DEL ALUMNO(A):", mx, y);
  doc.setFont("helvetica", "normal");
  doc.text(student.name, mx + 130, y);
  y += 15;
  doc.setFont("helvetica", "bold");
  doc.text("ESCUELA:", mx, y);
  doc.setFont("helvetica", "normal");
  doc.text("__________________________", mx + 48, y);
  doc.setFont("helvetica", "bold");
  doc.text("GRUPO:", W - mx - 70, y);
  doc.setFont("helvetica", "normal");
  doc.text(group.label, W - mx - 30, y);
  y += 18;

  // ---- Table (left) + side boxes (right) ----------------------------------
  const campos = group.subjects.filter((s) => s.slug !== "fisica").slice(0, 4);
  const periods = Math.max(1, group.periodCount || 1);
  const ORD = ["PRIMERO", "SEGUNDO", "TERCERO", "CUARTO", "QUINTO", "SEXTO"];
  const avg = studentAverageCycle(group, student.id);
  const att = attendanceCycle(group, student.id);
  const promovido = avg >= 6;

  const leftW = 336;
  const nameCol = 80;
  const campoW = (leftW - nameCol) / Math.max(campos.length, 1);
  const bandH = 14;
  const headH = 44;
  const rowH = 24;
  const tableTop = y;

  // "CAMPOS FORMATIVOS" band over the campo columns
  doc.setDrawColor(BORDER);
  doc.setFillColor(HEAD_BG);
  doc.rect(mx, y, nameCol, bandH + headH, "FD");
  doc.rect(mx + nameCol, y, leftW - nameCol, bandH, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(SLATE);
  doc.text("CAMPOS FORMATIVOS", mx + nameCol + (leftW - nameCol) / 2, y + 10, {
    align: "center",
  });
  doc.setFontSize(7);
  doc.text("PERIODO DE", mx + nameCol / 2, y + bandH + 24, { align: "center" });
  doc.text("EVALUACIÓN", mx + nameCol / 2, y + bandH + 33, { align: "center" });
  let cx = mx + nameCol;
  campos.forEach((c) => {
    // White (uncolored) cells, like the rest of the table.
    doc.rect(cx, y + bandH, campoW, headH, "S");
    doc.setFontSize(6);
    doc.setTextColor(INK);
    // Top-anchored + wrapped so long names stay inside the cell.
    const lines = doc.splitTextToSize(c.name.toUpperCase(), campoW - 6) as string[];
    lines.slice(0, 5).forEach((ln, li) => {
      doc.text(ln, cx + campoW / 2, y + bandH + 11 + li * 7.5, { align: "center" });
    });
    cx += campoW;
  });
  y += bandH + headH;

  const cellRow = (label: string, valueFor: (c: Subject) => string, fill: boolean, bold: boolean) => {
    doc.setDrawColor(BORDER);
    if (fill) doc.setFillColor(HEAD_BG);
    doc.rect(mx, y, nameCol, rowH, fill ? "FD" : "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(SLATE);
    doc.text(label, mx + nameCol / 2, y + rowH / 2 + 3, { align: "center", maxWidth: nameCol - 4 });
    let px = mx + nameCol;
    campos.forEach((c) => {
      if (fill) doc.setFillColor(HEAD_BG);
      doc.rect(px, y, campoW, rowH, fill ? "FD" : "S");
      const v = valueFor(c);
      const low = parseFloat(v) < 6;
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(bold ? 11 : 12);
      doc.setTextColor(low ? RISK : bold ? SLATE : INK);
      doc.text(v, px + campoW / 2, y + rowH / 2 + 4, { align: "center" });
      px += campoW;
    });
    y += rowH;
  };

  for (let p = 0; p < periods; p++) {
    cellRow(ORD[p] ?? `PERIODO ${p + 1}`, (c) => String(roundFinal(group, subjectGrade(group, c, student.id, p))), false, false);
  }
  cellRow("PROMEDIO\nFINAL", (c) => subjectGradeCycle(group, c, student.id).toFixed(1), true, true);
  const tableBottom = y;

  // Side boxes
  const sx = mx + leftW + 16;
  const sw = W - mx - sx;
  let sy = tableTop;
  const box = (label: string, value: string, h: number, big = false) => {
    doc.setDrawColor(BORDER);
    doc.setFillColor("#FFFFFF");
    doc.rect(sx, sy, sw, h, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(MUTED);
    doc.text(label, sx + 8, sy + 12, { maxWidth: sw - 16 });
    if (value) {
      doc.setFontSize(big ? 20 : 12);
      doc.setTextColor(SLATE);
      doc.text(value, sx + sw - 12, sy + h / 2 + 6, { align: "right" });
    }
    sy += h + 8;
  };
  box("LENGUA INDÍGENA", "", 34);
  box("ASISTENCIA", `${att.pct.toFixed(0)}%`, 34);
  // Promovido / No promovido
  doc.setDrawColor(BORDER);
  doc.rect(sx, sy, sw / 2 - 4, 34, "S");
  doc.rect(sx + sw / 2 + 4, sy, sw / 2 - 4, 34, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(MUTED);
  doc.text("PROMOVIDO", sx + 6, sy + 12);
  doc.text("NO PROMOVIDO", sx + sw / 2 + 10, sy + 12);
  doc.setFontSize(15);
  doc.setTextColor(SLATE);
  doc.text(promovido ? "✓" : "", sx + (sw / 2 - 4) / 2, sy + 27, { align: "center" });
  doc.text(promovido ? "" : "✓", sx + sw / 2 + 4 + (sw / 2 - 4) / 2, sy + 27, { align: "center" });
  sy += 34 + 8;
  box("PROMEDIO FINAL DE GRADO", avg.toFixed(1), 44, true);

  y = Math.max(tableBottom, sy) + 16;

  // ---- Observaciones (periodo column + area, fills down to the footer) ----
  const footY = H - 78;
  const obsHeadH = 18;
  const obsRows = Math.min(Math.max(periods, 1), 3);
  const obsRowH = Math.max(34, (footY - 14 - (y + obsHeadH)) / obsRows);
  doc.setDrawColor(BORDER);
  doc.setFillColor(HEAD_BG);
  doc.rect(mx, y, nameCol, obsHeadH, "FD");
  doc.rect(mx + nameCol, y, W - mx * 2 - nameCol, obsHeadH, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(SLATE);
  doc.text("PERIODO", mx + nameCol / 2, y + 11, { align: "center" });
  doc.setFontSize(8);
  doc.text("OBSERVACIONES Y SUGERENCIAS SOBRE LOS APRENDIZAJES", mx + nameCol + 8, y + 11);
  y += obsHeadH;
  for (let p = 0; p < obsRows; p++) {
    doc.rect(mx, y, nameCol, obsRowH);
    doc.rect(mx + nameCol, y, W - mx * 2 - nameCol, obsRowH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(SLATE);
    doc.text(ORD[p] ?? `P${p + 1}`, mx + nameCol / 2, y + 16, { align: "center" });
    y += obsRowH;
  }

  // ---- Footer: firmas + docente/directora --------------------------------
  doc.setDrawColor(BORDER);
  doc.setFillColor(HEAD_BG);
  const firmaX = mx + 250;
  const firmaW = W - mx - firmaX;
  doc.rect(firmaX, footY, firmaW, 14, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(SLATE);
  doc.text("FIRMA DE LA MADRE, PADRE, TUTORA O TUTOR", firmaX + firmaW / 2, footY + 10, {
    align: "center",
  });
  const sig3 = firmaW / 3;
  ["PRIMER", "SEGUNDO", "TERCER"].forEach((lbl, i) => {
    const bx = firmaX + i * sig3;
    doc.rect(bx, footY + 14, sig3, 40, "S");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(MUTED);
    doc.text(`${lbl} PERIODO`, bx + sig3 / 2, footY + 22, { align: "center" });
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(INK);
  doc.text("NOMBRE DEL DOCENTE: " + teacher, mx, footY + 18);
  doc.text("NOMBRE DE LA DIRECTORA: ______________________", mx, footY + 34);
  doc.text("LUGAR DE EXPEDICIÓN: ______________________", mx, footY + 50);
}

export function downloadStudentBoleta(
  group: GroupDoc,
  student: Student,
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
