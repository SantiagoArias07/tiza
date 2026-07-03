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
import type {
  Activity,
  AttStatus,
  CellStatus,
  GroupDoc,
  GroupMeta,
  GroupState,
} from "./types";

const CYCLE: CellStatus[] = ["complete", "incomplete", "missing"];

export type SyncStatus = "idle" | "saving" | "online" | "offline";

export function extraKey(subjectSlug: string, rubroIdx: number) {
  return `${subjectSlug}-${rubroIdx}`;
}

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

  // Active-group mutators
  cycleCell: (key: string) => void;
  setNote: (key: string, text: string) => void;
  setAtt: (key: string, status: AttStatus) => void;
  setPrivNote: (studentId: number, text: string) => void;
  setCrit: (next: number[]) => void;
  setUmbral: (n: number) => void;
  addActivity: (subjectSlug: string, rubroIdx: number, activity: Activity) => void;
  addStudent: (name: string) => void;
  removeStudent: (studentId: number) => void;
  renameStudent: (studentId: number, name: string) => void;
  renameGroup: (label: string) => void;
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
        if (!cancelled) setDocs((p) => ({ ...p, [activeId]: doc }));
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
      const doc = await api.createGroup(input);
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

  const setAtt = useCallback(
    (key: string, status: AttStatus) =>
      patchState((s) => ({
        ...s,
        attendance: { ...s.attendance, [key]: status },
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

  const addActivity = useCallback(
    (subjectSlug: string, rubroIdx: number, activity: Activity) =>
      patchState((s) => {
        const key = extraKey(subjectSlug, rubroIdx);
        return {
          ...s,
          extraActivities: {
            ...s.extraActivities,
            [key]: [...(s.extraActivities[key] ?? []), activity],
          },
        };
      }),
    [patchState]
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
      cycleCell,
      setNote,
      setAtt,
      setPrivNote,
      setCrit,
      setUmbral,
      addActivity,
      addStudent,
      removeStudent,
      renameStudent,
      renameGroup,
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
      cycleCell,
      setNote,
      setAtt,
      setPrivNote,
      setCrit,
      setUmbral,
      addActivity,
      addStudent,
      removeStudent,
      renameStudent,
      renameGroup,
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
  return {
    data,
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
    setAtt: s.setAtt,
    setPrivNote: s.setPrivNote,
    setCrit: s.setCrit,
    setUmbral: s.setUmbral,
    addActivity: s.addActivity,
    addStudent: s.addStudent,
    removeStudent: s.removeStudent,
    renameStudent: s.renameStudent,
    renameGroup: s.renameGroup,
  };
}
