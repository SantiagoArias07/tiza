"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "./auth";
import * as api from "./api";
import { cellKey, extraKey } from "./data";
import { emptyState } from "./types";
import type {
  Activity,
  AttStatus,
  CellStatus,
  GroupDoc,
  GroupMeta,
  GroupState,
  RoundingMode,
} from "./types";

const CYCLE: CellStatus[] = ["complete", "incomplete", "missing"];

/**
 * Guarantee a group doc has every field the app expects, even if it was saved
 * by an older backend version (prevents "cannot read undefined" crashes).
 */
function normalizeDoc(doc: GroupDoc): GroupDoc {
  return {
    ...doc,
    periodCount: doc.periodCount && doc.periodCount > 0 ? doc.periodCount : 3,
    rounding: doc.rounding ?? "half",
    students: Array.isArray(doc.students) ? doc.students : [],
    subjects: Array.isArray(doc.subjects) ? doc.subjects : [],
    state: { ...emptyState(), ...(doc.state ?? {}) },
  };
}

export type SyncStatus = "idle" | "saving" | "online" | "offline";

function activeIdFromPath(pathname: string | null): string | null {
  if (!pathname) return null;
  const seg = pathname.split("/").filter(Boolean);
  return seg[0] === "grupo" && seg[1] ? seg[1] : null;
}

interface StoreValue {
  groups: GroupMeta[];
  groupsLoading: boolean;
  refreshGroups: () => Promise<void>;
  createGroup: (input: {
    label: string;
    gradeLevel?: string;
    cycle?: string;
    trimester?: string;
  }) => Promise<GroupDoc>;
  deleteGroup: (id: string) => Promise<void>;

  activeId: string | null;
  activeGroup: GroupDoc | null;
  groupLoading: boolean;
  sync: SyncStatus;

  // Period selection (UI)
  activePeriod: number;
  setActivePeriod: (p: number) => void;

  // Active-group mutators
  cycleCell: (key: string) => void;
  setNote: (key: string, text: string) => void;
  markAttendance: (
    period: number,
    day: string,
    studentId: number,
    status: AttStatus
  ) => void;
  registerDay: (period: number, day: string) => void;
  setPrivNote: (studentId: number, text: string) => void;
  setCrit: (next: number[]) => void;
  setUmbral: (n: number) => void;
  setRounding: (mode: RoundingMode) => void;
  setPeriodCount: (n: number) => void;
  setExamTotal: (key: string, value: number) => void;
  setAcierto: (key: string, value: number) => void;
  setOverride: (key: string, value: number | null) => void;
  addActivity: (
    period: number,
    subjectSlug: string,
    rubroIdx: number,
    activity: Activity
  ) => void;
  renameActivity: (
    period: number,
    subjectSlug: string,
    rubroIdx: number,
    index: number,
    name: string
  ) => void;
  deleteActivity: (
    period: number,
    subjectSlug: string,
    rubroIdx: number,
    index: number
  ) => void;
  addStudent: (name: string) => void;
  removeStudent: (studentId: number) => void;
  renameStudent: (studentId: number, name: string) => void;
  renameGroup: (label: string) => void;
  // Criterios (rubros) — shared across all subjects
  setRubroName: (index: number, name: string) => void;
  addRubro: (name: string) => void;
  removeRubro: (index: number) => void;
  // Materias (subjects)
  setSubjectName: (slug: string, name: string) => void;
  addSubject: (name: string) => void;
  removeSubject: (slug: string) => void;
}

const SUBJECT_COLORS: Array<[string, string]> = [
  ["#E5ECF1", "#41607B"],
  ["#E6EFE6", "#5E8A57"],
  ["#F2E8E3", "#B07A5E"],
  ["#EDE7DC", "#7A6A4E"],
  ["#E5EFEC", "#4E8A78"],
  ["#EAEAF0", "#6A6A86"],
  ["#F1E9F0", "#876A86"],
  ["#F3EFE0", "#9A8A3E"],
];

/** Full per-period activity list, materialized from the template if needed. */
function materializeActs(
  doc: GroupDoc,
  period: number,
  slug: string,
  ri: number
): Activity[] {
  const key = extraKey(period, slug, ri);
  if (doc.state.acts?.[key]) return doc.state.acts[key].map((a) => ({ ...a }));
  const subj = doc.subjects.find((s) => s.slug === slug);
  const tmpl = subj?.rubros[ri]?.activities ?? [];
  const extra = doc.state.extraActivities?.[key] ?? [];
  return [...tmpl.map((a) => ({ ...a })), ...extra.map((a) => ({ ...a }))];
}

function slugify(name: string, taken: string[]): string {
  const bare = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")    .replace(/[^a-z0-9]/g, "");
  const base = bare || "materia";
  let slug = base;
  let n = 1;
  while (taken.includes(slug)) slug = `${base}${++n}`;
  return slug;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const activeId = activeIdFromPath(pathname);

  const [groups, setGroups] = useState<GroupMeta[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [docs, setDocs] = useState<Record<string, GroupDoc>>({});
  const [groupLoading, setGroupLoading] = useState(false);
  const [sync, setSync] = useState<SyncStatus>("idle");
  const [activePeriod, setActivePeriod] = useState(0);

  // Reset period selection when switching groups.
  useEffect(() => {
    setActivePeriod(0);
  }, [activeId]);

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ---- Load group list when the user changes ----------------------------
  const refreshGroups = useCallback(async () => {
    if (!user) {
      setGroups([]);
      return;
    }
    setGroupsLoading(true);
    try {
      setGroups(await api.listGroups());
    } catch {
      setGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) refreshGroups();
    else {
      setGroups([]);
      setDocs({});
    }
  }, [user, refreshGroups]);

  // ---- Load the active group doc ----------------------------------------
  useEffect(() => {
    if (!user || !activeId || docs[activeId]) return;
    let cancelled = false;
    setGroupLoading(true);
    (async () => {
      try {
        const doc = await api.fetchGroup(activeId);
        if (!cancelled) setDocs((p) => ({ ...p, [activeId]: normalizeDoc(doc) }));
      } catch {
        /* not found / offline */
      } finally {
        if (!cancelled) setGroupLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, activeId, docs]);

  const activeGroup = activeId ? docs[activeId] ?? null : null;

  // ---- Persist a doc (debounced) ----------------------------------------
  const scheduleSave = useCallback((doc: GroupDoc) => {
    setSync("saving");
    if (saveTimers.current[doc.id]) clearTimeout(saveTimers.current[doc.id]);
    saveTimers.current[doc.id] = setTimeout(async () => {
      try {
        window.localStorage.setItem(`tiza:group:${doc.id}`, JSON.stringify(doc));
      } catch {
        /* ignore quota */
      }
      const saved = await api
        .saveGroup(doc)
        .then(() => true)
        .catch(() => false);
      setSync(saved ? "online" : "offline");
    }, 600);
  }, []);

  const updateActive = useCallback(
    (fn: (doc: GroupDoc) => GroupDoc) => {
      if (!activeId) return;
      setDocs((prev) => {
        const current = prev[activeId];
        if (!current) return prev;
        const next = fn(current);
        scheduleSave(next);
        return { ...prev, [activeId]: next };
      });
    },
    [activeId, scheduleSave]
  );

  const patchState = useCallback(
    (fn: (s: GroupState) => GroupState) =>
      updateActive((doc) => ({ ...doc, state: fn(doc.state) })),
    [updateActive]
  );

  // ---- Group CRUD -------------------------------------------------------
  const createGroup = useCallback(
    async (input: {
      label: string;
      gradeLevel?: string;
      cycle?: string;
      trimester?: string;
    }) => {
      const doc = normalizeDoc(await api.createGroup(input));
      setDocs((p) => ({ ...p, [doc.id]: doc }));
      await refreshGroups();
      return doc;
    },
    [refreshGroups]
  );

  const deleteGroup = useCallback(
    async (id: string) => {
      await api.deleteGroup(id);
      setDocs((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
      setGroups((g) => g.filter((x) => x.id !== id));
    },
    []
  );

  // ---- Active-group mutators -------------------------------------------
  const cycleCell = useCallback(
    (key: string) =>
      patchState((s) => {
        const current = s.cells[key] ?? "complete";
        const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
        return { ...s, cells: { ...s.cells, [key]: next } };
      }),
    [patchState]
  );

  const setNote = useCallback(
    (key: string, text: string) =>
      patchState((s) => {
        const notes = { ...s.notes };
        if (text.trim()) notes[key] = text;
        else delete notes[key];
        return { ...s, notes };
      }),
    [patchState]
  );

  const markAttendance = useCallback(
    (period: number, day: string, studentId: number, status: AttStatus) =>
      patchState((s) => ({
        ...s,
        attendance: {
          ...s.attendance,
          [`${period}-${day}-${studentId}`]: status,
        },
        attDays: { ...s.attDays, [`${period}-${day}`]: true },
      })),
    [patchState]
  );

  const registerDay = useCallback(
    (period: number, day: string) =>
      patchState((s) => ({
        ...s,
        attDays: { ...s.attDays, [`${period}-${day}`]: true },
      })),
    [patchState]
  );

  const setPrivNote = useCallback(
    (studentId: number, text: string) =>
      patchState((s) => ({
        ...s,
        privNotes: { ...s.privNotes, [studentId]: text },
      })),
    [patchState]
  );

  const setCrit = useCallback(
    (next: number[]) => patchState((s) => ({ ...s, crit: next })),
    [patchState]
  );

  const setUmbral = useCallback(
    (n: number) => patchState((s) => ({ ...s, umbral: n })),
    [patchState]
  );

  const setRounding = useCallback(
    (mode: RoundingMode) => updateActive((doc) => ({ ...doc, rounding: mode })),
    [updateActive]
  );

  const setPeriodCount = useCallback(
    (n: number) =>
      updateActive((doc) => ({ ...doc, periodCount: Math.max(1, Math.min(6, n)) })),
    [updateActive]
  );

  const setExamTotal = useCallback(
    (key: string, value: number) =>
      patchState((s) => ({
        ...s,
        examTotals: { ...s.examTotals, [key]: value },
      })),
    [patchState]
  );

  const setAcierto = useCallback(
    (key: string, value: number) =>
      patchState((s) => ({
        ...s,
        examAciertos: { ...s.examAciertos, [key]: value },
      })),
    [patchState]
  );

  const setOverride = useCallback(
    (key: string, value: number | null) =>
      patchState((s) => {
        const overrides = { ...s.overrides };
        if (value === null || Number.isNaN(value)) delete overrides[key];
        else overrides[key] = value;
        return { ...s, overrides };
      }),
    [patchState]
  );

  const addActivity = useCallback(
    (period: number, subjectSlug: string, rubroIdx: number, activity: Activity) =>
      updateActive((doc) => {
        const ek = extraKey(period, subjectSlug, rubroIdx);
        const list = materializeActs(doc, period, subjectSlug, rubroIdx);
        list.push(activity);
        return {
          ...doc,
          state: { ...doc.state, acts: { ...doc.state.acts, [ek]: list } },
        };
      }),
    [updateActive]
  );

  const renameActivity = useCallback(
    (
      period: number,
      subjectSlug: string,
      rubroIdx: number,
      index: number,
      name: string
    ) =>
      updateActive((doc) => {
        const ek = extraKey(period, subjectSlug, rubroIdx);
        const list = materializeActs(doc, period, subjectSlug, rubroIdx);
        if (index < 0 || index >= list.length) return doc;
        list[index] = { ...list[index], name };
        return {
          ...doc,
          state: { ...doc.state, acts: { ...doc.state.acts, [ek]: list } },
        };
      }),
    [updateActive]
  );

  const deleteActivity = useCallback(
    (period: number, subjectSlug: string, rubroIdx: number, index: number) =>
      updateActive((doc) => {
        const ek = extraKey(period, subjectSlug, rubroIdx);
        const list = materializeActs(doc, period, subjectSlug, rubroIdx);
        const oldTotal = list.length;
        if (index < 0 || index >= oldTotal) return doc;
        list.splice(index, 1);

        // Reindex cells/notes for activity indices above the removed one.
        const cells = { ...doc.state.cells };
        const notes = { ...doc.state.notes };
        for (const st of doc.students) {
          for (let ai = index; ai < oldTotal - 1; ai++) {
            const cur = cellKey(period, subjectSlug, rubroIdx, ai, st.id);
            const nxt = cellKey(period, subjectSlug, rubroIdx, ai + 1, st.id);
            if (nxt in cells) cells[cur] = cells[nxt];
            else delete cells[cur];
            if (nxt in notes) notes[cur] = notes[nxt];
            else delete notes[cur];
          }
          const last = cellKey(period, subjectSlug, rubroIdx, oldTotal - 1, st.id);
          delete cells[last];
          delete notes[last];
        }
        return {
          ...doc,
          state: { ...doc.state, acts: { ...doc.state.acts, [ek]: list }, cells, notes },
        };
      }),
    [updateActive]
  );

  const addStudent = useCallback(
    (name: string) =>
      updateActive((doc) => {
        const nextId =
          doc.students.reduce((m, s) => Math.max(m, s.id), -1) + 1;
        return {
          ...doc,
          students: [...doc.students, { id: nextId, name: name.trim() }],
        };
      }),
    [updateActive]
  );

  const removeStudent = useCallback(
    (studentId: number) =>
      updateActive((doc) => ({
        ...doc,
        students: doc.students.filter((s) => s.id !== studentId),
      })),
    [updateActive]
  );

  const renameStudent = useCallback(
    (studentId: number, name: string) =>
      updateActive((doc) => ({
        ...doc,
        students: doc.students.map((s) =>
          s.id === studentId ? { ...s, name } : s
        ),
      })),
    [updateActive]
  );

  const renameGroup = useCallback(
    (label: string) => updateActive((doc) => ({ ...doc, label })),
    [updateActive]
  );

  // ---- Criterios (rubros), shared across all subjects -------------------
  const setRubroName = useCallback(
    (index: number, name: string) =>
      updateActive((doc) => ({
        ...doc,
        subjects: doc.subjects.map((s) => ({
          ...s,
          rubros: s.rubros.map((r, i) => (i === index ? { ...r, name } : r)),
        })),
      })),
    [updateActive]
  );

  const addRubro = useCallback(
    (name: string) =>
      updateActive((doc) => ({
        ...doc,
        subjects: doc.subjects.map((s) => ({
          ...s,
          rubros: [...s.rubros, { name: name.trim() || "Nuevo criterio", pct: 0, activities: [] }],
        })),
        state: { ...doc.state, crit: [...doc.state.crit, 0] },
      })),
    [updateActive]
  );

  const removeRubro = useCallback(
    (index: number) =>
      updateActive((doc) => {
        // Reindex all grade keys that reference a rubro index > `index`.
        const shiftKey = (key: string, rubroPos: number) => {
          const parts = key.split("-");
          const ri = parseInt(parts[rubroPos], 10);
          if (ri === index) return null; // drop
          if (ri > index) parts[rubroPos] = String(ri - 1);
          return parts.join("-");
        };
        const remap = (
          src: Record<string, unknown>,
          rubroPos: number
        ): Record<string, unknown> => {
          const out: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(src)) {
            const nk = shiftKey(k, rubroPos);
            if (nk) out[nk] = v;
          }
          return out;
        };
        const st = doc.state;
        return {
          ...doc,
          subjects: doc.subjects.map((s) => ({
            ...s,
            rubros: s.rubros.filter((_, i) => i !== index),
          })),
          state: {
            ...st,
            crit: st.crit.filter((_, i) => i !== index),
            // cells/notes: `${p}-${slug}-${ri}-${ai}-${sid}` → rubro at pos 2
            cells: remap(st.cells, 2) as typeof st.cells,
            notes: remap(st.notes, 2) as typeof st.notes,
            // extraActivities: `${p}-${slug}-${ri}` → rubro at pos 2
            extraActivities: remap(st.extraActivities, 2) as typeof st.extraActivities,
            // rubro overrides: `r-${p}-${slug}-${ri}-${sid}` → rubro at pos 3
            overrides: Object.fromEntries(
              Object.entries(st.overrides).flatMap(([k, v]) => {
                if (!k.startsWith("r-")) return [[k, v]];
                const nk = shiftKey(k, 3);
                return nk ? [[nk, v]] : [];
              })
            ),
          },
        };
      }),
    [updateActive]
  );

  // ---- Materias (subjects) ---------------------------------------------
  const setSubjectName = useCallback(
    (slug: string, name: string) =>
      updateActive((doc) => ({
        ...doc,
        subjects: doc.subjects.map((s) =>
          s.slug === slug ? { ...s, name, abbr: name.slice(0, 6) } : s
        ),
      })),
    [updateActive]
  );

  const addSubject = useCallback(
    (name: string) =>
      updateActive((doc) => {
        const slug = slugify(name, doc.subjects.map((s) => s.slug));
        const color = SUBJECT_COLORS[doc.subjects.length % SUBJECT_COLORS.length];
        // Mirror the existing rubro structure so crit stays consistent.
        const rubros =
          doc.subjects[0]?.rubros.map((r) => ({
            name: r.name,
            pct: r.pct,
            kind: r.kind,
            activities: r.activities.map((a) => ({ ...a })),
          })) ?? [
            { name: "Actividades en clase", pct: 40, activities: [] },
            { name: "Actividades en casa", pct: 20, activities: [] },
            { name: "Examen", pct: 40, kind: "exam" as const, activities: [] },
          ];
        return {
          ...doc,
          subjects: [
            ...doc.subjects,
            {
              slug,
              name: name.trim(),
              abbr: name.trim().slice(0, 6),
              initial: name.trim().charAt(0).toUpperCase(),
              bg: color[0],
              fg: color[1],
              rubros,
            },
          ],
        };
      }),
    [updateActive]
  );

  const removeSubject = useCallback(
    (slug: string) =>
      updateActive((doc) => ({
        ...doc,
        subjects: doc.subjects.filter((s) => s.slug !== slug),
      })),
    [updateActive]
  );

  const value = useMemo<StoreValue>(
    () => ({
      groups,
      groupsLoading,
      refreshGroups,
      createGroup,
      deleteGroup,
      activeId,
      activeGroup,
      groupLoading,
      sync,
      activePeriod,
      setActivePeriod,
      cycleCell,
      setNote,
      markAttendance,
      registerDay,
      setPrivNote,
      setCrit,
      setUmbral,
      setRounding,
      setPeriodCount,
      setExamTotal,
      setAcierto,
      setOverride,
      addActivity,
      renameActivity,
      deleteActivity,
      addStudent,
      removeStudent,
      renameStudent,
      renameGroup,
      setRubroName,
      addRubro,
      removeRubro,
      setSubjectName,
      addSubject,
      removeSubject,
    }),
    [
      groups,
      groupsLoading,
      refreshGroups,
      createGroup,
      deleteGroup,
      activeId,
      activeGroup,
      groupLoading,
      sync,
      activePeriod,
      cycleCell,
      setNote,
      markAttendance,
      registerDay,
      setPrivNote,
      setCrit,
      setUmbral,
      setRounding,
      setPeriodCount,
      setExamTotal,
      setAcierto,
      setOverride,
      addActivity,
      renameActivity,
      deleteActivity,
      addStudent,
      removeStudent,
      renameStudent,
      renameGroup,
      setRubroName,
      addRubro,
      removeRubro,
      setSubjectName,
      addSubject,
      removeSubject,
    ]
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

/**
 * Convenience for group screens: guarantees an active group is loaded and
 * exposes its data + state + the active-group mutators with non-null typing.
 * Screens are only rendered inside the group layout gate, so activeGroup is set.
 */
export function useGroup() {
  const s = useStore();
  if (!s.activeGroup) {
    throw new Error("useGroup used without an active group");
  }
  const data = s.activeGroup;
  const periodCount = Math.max(1, data.periodCount || 1);
  const activePeriod = Math.min(s.activePeriod, periodCount - 1);
  return {
    data,
    periodCount,
    activePeriod,
    setActivePeriod: s.setActivePeriod,
    cells: data.state.cells,
    notes: data.state.notes,
    attendance: data.state.attendance,
    privNotes: data.state.privNotes,
    crit: data.state.crit,
    umbral: data.state.umbral,
    extraActivities: data.state.extraActivities,
    state: data.state,
    sync: s.sync,
    cycleCell: s.cycleCell,
    setNote: s.setNote,
    markAttendance: s.markAttendance,
    registerDay: s.registerDay,
    setPrivNote: s.setPrivNote,
    setCrit: s.setCrit,
    setUmbral: s.setUmbral,
    setRounding: s.setRounding,
    setPeriodCount: s.setPeriodCount,
    setExamTotal: s.setExamTotal,
    setAcierto: s.setAcierto,
    setOverride: s.setOverride,
    addActivity: s.addActivity,
    renameActivity: s.renameActivity,
    deleteActivity: s.deleteActivity,
    addStudent: s.addStudent,
    removeStudent: s.removeStudent,
    renameStudent: s.renameStudent,
    renameGroup: s.renameGroup,
    setRubroName: s.setRubroName,
    addRubro: s.addRubro,
    removeRubro: s.removeRubro,
    setSubjectName: s.setSubjectName,
    addSubject: s.addSubject,
    removeSubject: s.removeSubject,
  };
}
