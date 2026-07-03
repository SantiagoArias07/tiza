"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { Logo } from "@/components/Logo";
import styles from "./group-layout.module.css";

export default function GroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { activeGroup, groupLoading, activeId } = useStore();

  if (activeGroup) return <>{children}</>;

  if (groupLoading || !activeId) {
    return (
      <div className={styles.center}>
        <Logo size={40} />
        <span className={styles.hint}>Cargando grupo…</span>
      </div>
    );
  }

  // Loaded but no group (deleted or not owned).
  return (
    <div className={styles.center}>
      <Logo size={40} />
      <p className={styles.title}>No encontramos este grupo</p>
      <p className={styles.hint}>Puede que se haya eliminado.</p>
      <Link href="/" className={styles.back}>
        ← Volver al inicio
      </Link>
    </div>
  );
}
