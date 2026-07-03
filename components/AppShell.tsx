"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import {
  BookIcon,
  CalendarIcon,
  ChartIcon,
  CheckIcon,
  DownloadIcon,
  FileTextIcon,
  GridIcon,
  HomeIcon,
  SlidersIcon,
} from "./icons";
import { BackupModal } from "./BackupModal";
import styles from "./AppShell.module.css";

const NAV = [
  { key: "boleta", label: "Boleta", icon: FileTextIcon },
  { key: "bitacoras", label: "Bitácoras", icon: BookIcon },
  { key: "asistencia", label: "Asistencia", icon: CalendarIcon },
  { key: "analitica", label: "Analítica", icon: ChartIcon },
  { key: "configuracion", label: "Configuración", icon: SlidersIcon },
];

const SYNC_LABEL: Record<string, string> = {
  loading: "Cargando…",
  online: "Sincronizado",
  offline: "Sin conexión · local",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data, sync } = useStore();
  const pathname = usePathname() ?? "/";
  const [backupOpen, setBackupOpen] = useState(false);

  const onDashboard = pathname === "/";
  const base = `/grupo/${data.id}`;
  const activeNav = NAV.find((n) => pathname.includes(`${base}/${n.key}`))?.key;
  // "bitacora/[materia]" lives under the Bitácoras nav item.
  const isBitacoraDetail = pathname.includes(`${base}/bitacora/`);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand}>
          <span className={styles.logo}>
            <CheckIcon size={21} stroke="var(--accent)" strokeWidth={2.7} />
          </span>
          <span className={styles.brandText}>
            <span className={styles.brandName}>Tiza</span>
            <span className={styles.brandSub}>Bitácora docente</span>
          </span>
        </Link>

        <Link
          href="/"
          className={`${styles.navItem} ${onDashboard ? styles.navActive : ""}`}
        >
          <HomeIcon size={18} />
          <span>Inicio</span>
        </Link>

        {!onDashboard && (
          <>
            <div className={styles.sectionLabel}>
              <span className={styles.dot} />
              Grupo activo
            </div>
            <Link href={`${base}/boleta`} className={styles.groupCard}>
              <div className={styles.groupTitle}>{data.label}</div>
              <div className={styles.groupSub}>
                {data.students.length} alumnos · {data.trimester}
              </div>
            </Link>

            <nav className={styles.nav}>
              {NAV.map((item) => {
                const Icon = item.icon;
                const active =
                  activeNav === item.key ||
                  (item.key === "bitacoras" && isBitacoraDetail);
                return (
                  <Link
                    key={item.key}
                    href={`${base}/${item.key}`}
                    className={`${styles.navItem} ${
                      active ? styles.navActive : ""
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </>
        )}

        <div className={styles.spacer} />

        <button className={styles.backup} onClick={() => setBackupOpen(true)}>
          <DownloadIcon size={18} />
          <span className={styles.backupText}>
            <span className={styles.backupLabel}>Descargar respaldo</span>
            <span className={styles.backupHint} data-sync={sync}>
              <span className={styles.syncDot} data-sync={sync} />
              {SYNC_LABEL[sync]}
            </span>
          </span>
        </button>

        <div className={styles.user}>
          <div className={styles.avatar}>MB</div>
          <div className={styles.userText}>
            <span className={styles.userName}>Profe Marisol</span>
            <span className={styles.userSchool}>Esc. Prim. Benito Juárez</span>
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <Breadcrumb pathname={pathname} />
          <div className={styles.cyclePill}>
            <span className={styles.greenDot} />
            Ciclo {data.cycle} · 2° trim.
          </div>
        </header>
        <div className={styles.scroll}>
          <div className={styles.content}>{children}</div>
        </div>
      </main>

      {backupOpen && <BackupModal onClose={() => setBackupOpen(false)} />}
    </div>
  );
}

function Breadcrumb({ pathname }: { pathname: string }) {
  const { data } = useStore();
  const parts: string[] = [];

  if (pathname === "/") {
    parts.push("Inicio");
  } else {
    parts.push(data.label);
    const seg = pathname.split("/").filter(Boolean); // ["grupo","3b",...]
    const section = seg[2];
    const labelMap: Record<string, string> = {
      boleta: "Boleta",
      bitacoras: "Bitácoras",
      bitacora: "Bitácoras",
      asistencia: "Asistencia",
      analitica: "Analítica",
      configuracion: "Configuración",
      alumno: "Alumno",
    };
    if (section) parts.push(labelMap[section] ?? section);
    if (section === "bitacora" && seg[3]) {
      const subj = data.subjects.find((s) => s.slug === seg[3]);
      if (subj) parts.push(subj.name);
    }
    if (section === "alumno" && seg[3]) {
      const st = data.students.find((s) => String(s.id) === seg[3]);
      if (st) parts.push(st.name.split(" ").slice(0, 2).join(" "));
    }
  }

  return (
    <div className={styles.breadcrumb}>
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && <span className={styles.crumbSep}>›</span>}
          <span className={i === parts.length - 1 ? styles.crumbActive : ""}>
            {p}
          </span>
        </span>
      ))}
    </div>
  );
}
