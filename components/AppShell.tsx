"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { Logo } from "./Logo";
import {
  BookIcon,
  CalendarIcon,
  ChartIcon,
  DownloadIcon,
  FileTextIcon,
  HomeIcon,
  MenuIcon,
  SlidersIcon,
  XIcon,
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
  idle: "Listo",
  saving: "Guardando…",
  online: "Sincronizado",
  offline: "Sin conexión · local",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { groups, activeId, activeGroup, sync } = useStore();
  const pathname = usePathname() ?? "/";
  const [backupOpen, setBackupOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const onDashboard = pathname === "/";
  const base = activeId ? `/grupo/${activeId}` : "";
  const activeMeta = groups.find((g) => g.id === activeId);
  const groupLabel = activeGroup?.label ?? activeMeta?.label ?? "Grupo";
  const studentCount = activeGroup?.students.length ?? activeMeta?.studentCount ?? 0;
  const activeNav = NAV.find((n) => pathname.includes(`${base}/${n.key}`))?.key;
  const isBitacoraDetail = base ? pathname.includes(`${base}/bitacora/`) : false;

  const initials = (user?.name ?? "T")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className={styles.shell}>
      {menuOpen && (
        <div className={styles.overlay} onClick={() => setMenuOpen(false)} />
      )}

      <aside className={styles.sidebar} data-open={menuOpen}>
        <Link href="/" className={styles.brand}>
          <Logo size={36} />
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

        {activeId && (
          <>
            <div className={styles.sectionLabel}>
              <span className={styles.dot} />
              Grupo activo
            </div>
            <Link href={`${base}/boleta`} className={styles.groupCard}>
              <div className={styles.groupTitle}>{groupLabel}</div>
              <div className={styles.groupSub}>
                {studentCount} alumnos · {activeGroup?.trimester ?? ""}
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

        {activeGroup && (
          <button className={styles.backup} onClick={() => setBackupOpen(true)}>
            <DownloadIcon size={18} />
            <span className={styles.backupText}>
              <span className={styles.backupLabel}>Descargar respaldo</span>
              <span className={styles.backupHint}>
                <span className={styles.syncDot} data-sync={sync} />
                {SYNC_LABEL[sync]}
              </span>
            </span>
          </button>
        )}

        <div className={styles.user}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.userText}>
            <span className={styles.userName}>{user?.name}</span>
            <span className={styles.userSchool}>{user?.school}</span>
          </div>
          <button
            className={styles.logout}
            onClick={logout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogoutIcon />
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <button
            className={styles.hamburger}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menú"
          >
            {menuOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
          </button>
          <Breadcrumb pathname={pathname} groupLabel={groupLabel} />
          <div className={styles.cyclePill}>
            <span className={styles.greenDot} />
            {activeGroup ? `Ciclo ${activeGroup.cycle}` : "Ciclo 2025–2026"}
          </div>
        </header>
        <div className={styles.scroll}>
          <div className={styles.content}>{children}</div>
        </div>
      </main>

      {backupOpen && activeGroup && (
        <BackupModal onClose={() => setBackupOpen(false)} />
      )}
    </div>
  );
}

function LogoutIcon() {
  return (
    <svg
      width={17}
      height={17}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

function Breadcrumb({
  pathname,
  groupLabel,
}: {
  pathname: string;
  groupLabel: string;
}) {
  const { activeGroup } = useStore();
  const parts: string[] = [];

  if (pathname === "/") {
    parts.push("Inicio");
  } else {
    parts.push(groupLabel);
    const seg = pathname.split("/").filter(Boolean);
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
    if (section === "bitacora" && seg[3] && activeGroup) {
      const subj = activeGroup.subjects.find((s) => s.slug === seg[3]);
      if (subj) parts.push(subj.name);
    }
    if (section === "alumno" && seg[3] && activeGroup) {
      const st = activeGroup.students.find((s) => String(s.id) === seg[3]);
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
