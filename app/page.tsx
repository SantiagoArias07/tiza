"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { SectionLabel } from "@/components/ui";
import { NewGroupModal } from "@/components/NewGroupModal";
import { PlusIcon, UsersIcon } from "@/components/icons";
import type { GroupMeta } from "@/lib/types";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  const { user } = useAuth();
  const { groups, groupsLoading, createGroup } = useStore();
  const router = useRouter();
  const [newOpen, setNewOpen] = useState(false);

  const firstName = (user?.name ?? "").split(" ")[0] || "";
  const hour = new Date().getHours();
  const salute =
    hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const greeting = firstName
    ? `${salute}, Profe ${firstName}`
    : `${salute}, Profe`;

  return (
    <div>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.greeting}>{greeting}</h1>
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
        <div className={styles.groupList}>
          {groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              onClick={() => router.push(`/grupo/${g.id}/boleta`)}
            />
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

function GroupCard({
  group,
  onClick,
}: {
  group: GroupMeta;
  onClick: () => void;
}) {
  const fmt = (n: number) => n.toFixed(1);
  return (
    <div
      className={styles.groupCard}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div className={styles.band}>
        <div>
          <div className={styles.bandTitle}>{group.label}</div>
          <div className={styles.bandSub}>
            {group.gradeLevel} · Ciclo {group.cycle}
          </div>
        </div>
        <span className={styles.badge}>{group.trimester}</span>
      </div>

      <div className={styles.metrics}>
        <Metric label="Alumnos" value={String(group.studentCount ?? 0)} tone="ink" />
        <Metric
          label="Promedio grupo"
          value={group.studentCount ? fmt(group.avg ?? 0) : "—"}
          tone="slate"
        />
        <Metric
          label="En riesgo"
          value={group.studentCount ? String(group.risk ?? 0) : "—"}
          tone="risk"
        />
        <Metric
          label="Asistencia"
          value={group.studentCount ? `${(group.attendance ?? 0).toFixed(0)}%` : "—"}
          tone="ok"
          last
        />
      </div>

      <div className={styles.footer}>
        <span className={styles.footerNote}>
          {group.studentCount
            ? "Registro de calificaciones y asistencia"
            : "Agrega alumnos para empezar"}
        </span>
        <span className={styles.cta}>Entrar al grupo →</span>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
  last,
}: {
  label: string;
  value: string;
  tone: "ink" | "slate" | "risk" | "ok";
  last?: boolean;
}) {
  return (
    <div className={styles.metric} data-last={last}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue} data-tone={tone}>
        {value}
      </div>
    </div>
  );
}
