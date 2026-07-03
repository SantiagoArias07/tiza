"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { SectionLabel } from "@/components/ui";
import { NewGroupModal } from "@/components/NewGroupModal";
import { PlusIcon, UsersIcon } from "@/components/icons";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  const { user } = useAuth();
  const { groups, groupsLoading, createGroup } = useStore();
  const router = useRouter();
  const [newOpen, setNewOpen] = useState(false);

  const firstName = (user?.name ?? "").split(" ")[0] || "Profe";

  return (
    <div>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.greeting}>Hola, {firstName}</h1>
          <p className={styles.date}>
            {new Date().toLocaleDateString("es-MX", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <button className={styles.newGroupBtn} onClick={() => setNewOpen(true)}>
          <PlusIcon size={17} />
          Nuevo grupo
        </button>
      </div>

      <SectionLabel>Tus grupos</SectionLabel>

      {groupsLoading && groups.length === 0 ? (
        <p className={styles.loading}>Cargando grupos…</p>
      ) : groups.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>
            <UsersIcon size={26} />
          </span>
          <p className={styles.emptyTitle}>Aún no tienes grupos</p>
          <p className={styles.emptyHint}>
            Crea tu primer grupo para empezar a registrar calificaciones.
          </p>
          <button className={styles.newGroupBtn} onClick={() => setNewOpen(true)}>
            <PlusIcon size={17} />
            Crear grupo
          </button>
        </div>
      ) : (
        <div className={styles.groupGrid}>
          {groups.map((g) => (
            <button
              key={g.id}
              className={styles.groupCard}
              onClick={() => router.push(`/grupo/${g.id}/boleta`)}
            >
              <div className={styles.band}>
                <div>
                  <div className={styles.bandTitle}>{g.label}</div>
                  <div className={styles.bandSub}>{g.gradeLevel}</div>
                </div>
                <span className={styles.badge}>{g.trimester}</span>
              </div>
              <div className={styles.cardFooter}>
                <span className={styles.footStat}>
                  <UsersIcon size={15} />
                  {g.studentCount} alumnos
                </span>
                <span className={styles.footCta}>Entrar →</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {newOpen && (
        <NewGroupModal
          onClose={() => setNewOpen(false)}
          onCreate={async (input) => {
            const doc = await createGroup(input);
            setNewOpen(false);
            router.push(`/grupo/${doc.id}/configuracion`);
          }}
        />
      )}
    </div>
  );
}
