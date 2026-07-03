import { jsPDF } from "jspdf";
import {
  attendancePct,
  fmt,
  isAtRisk,
  studentAverage,
  subjectGrade,
} from "./calc";
import type { AttStatus, CellStatus, GroupData, Student } from "./types";

type Cells = Record<string, CellStatus>;

/** Trigger a browser download for arbitrary text/blob content. */
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

/** Weekdays of February 2026 (Feb 1 is a Sunday). */
export function schoolDays(): string[] {
  const out: string[] = [];
  for (let d = 1; d <= 28; d++) {
    if ((6 + (d - 1)) % 7 < 5) out.push(`2026-02-${String(d).padStart(2, "0")}`);
  }
  return out;
}

/* ---- CSV ----------------------------------------------------------------- */

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function boletaCsv(data: GroupData, cells: Cells): string {
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

export function downloadBoletaCsv(data: GroupData, cells: Cells) {
  const csv = "﻿" + boletaCsv(data, cells); // BOM for Excel accents
  downloadBlob(`tiza-boleta-${data.id}.csv`, csv, "text/csv;charset=utf-8");
}

/* ---- Full backup (.tiza) ------------------------------------------------- */

export function downloadBackup(data: GroupData, state: unknown) {
  const payload = {
    format: "tiza-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    group: {
      id: data.id,
      label: data.label,
      cycle: data.cycle,
      trimester: data.trimester,
    },
    state,
  };
  downloadBlob(
    `respaldo-${data.id}-${data.cycle}.tiza`,
    JSON.stringify(payload, null, 2),
    "application/json"
  );
}

/* ---- Student PDF --------------------------------------------------------- */

export function downloadStudentPdf(
  data: GroupData,
  student: Student,
  cells: Cells,
  attendance: Record<string, AttStatus>,
  privateNote?: string
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 48;
  let y = 60;

  const ink = "#2E2C26";
  const muted = "#8A8475";
  const slate = "#43545F";
  const risk = "#C2705A";
  const ok = "#5E8A57";

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(ink);
  doc.text("Tiza", marginX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(muted);
  doc.text("Reporte del alumno", marginX + 52, y);

  y += 34;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(ink);
  doc.text(student.name, marginX, y);

  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(muted);
  doc.text(
    `${data.label} · Ciclo ${data.cycle} · ${data.trimester}`,
    marginX,
    y
  );

  const risky = isAtRisk(data, student.id, cells);
  if (risky) {
    doc.setTextColor(risk);
    doc.setFont("helvetica", "bold");
    doc.text("En riesgo", pageW - marginX, y, { align: "right" });
  }

  // Divider
  y += 20;
  doc.setDrawColor(236, 230, 217);
  doc.line(marginX, y, pageW - marginX, y);
  y += 26;

  // Grades table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(ink);
  doc.text("Calificaciones por materia", marginX, y);
  y += 18;

  doc.setFontSize(10.5);
  data.subjects.forEach((s) => {
    const g = subjectGrade(s, student.id, cells);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(slate);
    doc.text(s.name, marginX, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(g < 6 ? risk : ink);
    doc.text(fmt(g), pageW - marginX, y, { align: "right" });
    y += 18;
  });

  // Average
  y += 6;
  doc.setDrawColor(236, 230, 217);
  doc.line(marginX, y, pageW - marginX, y);
  y += 20;
  const avg = studentAverage(data, student.id, cells);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(ink);
  doc.text("Promedio general", marginX, y);
  doc.setTextColor(avg < 6 ? risk : ok);
  doc.setFontSize(13);
  doc.text(fmt(avg), pageW - marginX, y, { align: "right" });

  // Attendance
  y += 30;
  const att = attendancePct(student.id, schoolDays(), attendance);
  doc.setFontSize(11);
  doc.setTextColor(ink);
  doc.text("Asistencia", marginX, y);
  y += 17;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(muted);
  doc.text(
    `${att.pct.toFixed(0)}%  ·  ${att.present} presentes · ${att.delays} retardos · ${att.absent} faltas (de ${schoolDays().length} días)`,
    marginX,
    y
  );

  // Private note
  if (privateNote && privateNote.trim()) {
    y += 30;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(ink);
    doc.text("Notas", marginX, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(slate);
    const lines = doc.splitTextToSize(privateNote, pageW - marginX * 2);
    doc.text(lines, marginX, y);
  }

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(muted);
  doc.text(
    `Generado con Tiza · ${new Date().toLocaleDateString("es-MX")}`,
    marginX,
    doc.internal.pageSize.getHeight() - 30
  );

  const safeName = student.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  doc.save(`reporte-${safeName}.pdf`);
}
