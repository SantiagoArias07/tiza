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
import { makeData } from "./data";
import { fetchState, saveState } from "./api";
import type {
  Activity,
  AttStatus,
  CellStatus,
  GroupData,
  PersistedState,
} from "./types";

const CYCLE: CellStatus[] = ["complete", "incomplete", "missing"];
const LS_KEY = "tiza:state";

function defaultState(materias: string[]): PersistedState {
  return {
    edits: {},
    notes: {},
    attendance: {},
    privNotes: {},
    crit: [40, 20, 40],
    umbral: 3,
    materias,
    extraActivities: {},
  };
}

function mergeState(
  base: PersistedState,
  incoming: Partial<PersistedState> | null
): PersistedState {
  if (!incoming) return base;
  return {
    edits: incoming.edits ?? base.edits,
    notes: incoming.notes ?? base.notes,
    attendance: incoming.attendance ?? base.attendance,
    privNotes: incoming.privNotes ?? base.privNotes,
    crit: incoming.crit?.length ? incoming.crit : base.crit,
    umbral: typeof incoming.umbral === "number" ? incoming.umbral : base.umbral,
    materias: incoming.materias?.length ? incoming.materias : base.materias,
    extraActivities: incoming.extraActivities ?? base.extraActivities,
  };
}

export type SyncStatus = "loading" | "online" | "offline";

interface StoreValue {
  data: GroupData;
  state: PersistedState;
  cells: Record<string, CellStatus>;
  cycleCell: (key: string) => void;
  notes: Record<string, string>;
  setNote: (key: string, text: string) => void;
  attendance: Record<string, AttStatus>;
  setAtt: (key: string, status: AttStatus) => void;
  privNotes: Record<string, string>;
  setPrivNote: (studentId: number, text: string) => void;
  crit: number[];
  setCrit: (next: number[]) => void;
  umbral: number;
  setUmbral: (n: number) => void;
  materias: string[];
  setMaterias: (next: string[]) => void;
  extraActivities: Record<string, Activity[]>;
  addActivity: (subjectSlug: string, rubroIdx: number, activity: Activity) => void;
  sync: SyncStatus;
  resetAll: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function extraKey(subjectSlug: string, rubroIdx: number) {
  return `${subjectSlug}-${rubroIdx}`;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data] = useState<GroupData>(() => makeData(99));
  const initial = useMemo(
    () => defaultState(data.subjects.map((s) => s.name)),
    [data.subjects]
  );

  const [state, setState] = useState<PersistedState>(initial);
  const [sync, setSync] = useState<SyncStatus>("loading");
  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Hydrate: backend first, localStorage fallback --------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Instant offline paint from cache.
      let cached: Partial<PersistedState> | null = null;
      try {
        const raw = window.localStorage.getItem(LS_KEY);
        if (raw) cached = JSON.parse(raw);
      } catch {
        /* ignore */
      }

      const server = await fetchState(data.id);
      if (cancelled) return;

      if (server) {
        setState(mergeState(initial, { ...cached, ...server }));
        setSync("online");
      } else {
        setState(mergeState(initial, cached));
        setSync("offline");
      }
      hydrated.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [data.id, initial]);

  // ---- Persist: localStorage immediately + debounced backend PUT --------
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota */
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const ok = await saveState(data.id, state);
      setSync(ok ? "online" : "offline");
    }, 600);
  }, [state, data.id]);

  // ---- Mutators ---------------------------------------------------------
  const cycleCell = useCallback(
    (key: string) => {
      setState((prev) => {
        const current = prev.edits[key] ?? data.cellStatus[key] ?? "complete";
        const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
        return { ...prev, edits: { ...prev.edits, [key]: next } };
      });
    },
    [data.cellStatus]
  );

  const setNote = useCallback((key: string, text: string) => {
    setState((prev) => {
      const notes = { ...prev.notes };
      if (text.trim()) notes[key] = text;
      else delete notes[key];
      return { ...prev, notes };
    });
  }, []);

  const setAtt = useCallback((key: string, status: AttStatus) => {
    setState((prev) => ({
      ...prev,
      attendance: { ...prev.attendance, [key]: status },
    }));
  }, []);

  const setPrivNote = useCallback((studentId: number, text: string) => {
    setState((prev) => ({
      ...prev,
      privNotes: { ...prev.privNotes, [studentId]: text },
    }));
  }, []);

  const setCrit = useCallback((next: number[]) => {
    setState((prev) => ({ ...prev, crit: next }));
  }, []);

  const setUmbral = useCallback((n: number) => {
    setState((prev) => ({ ...prev, umbral: n }));
  }, []);

  const setMaterias = useCallback((next: string[]) => {
    setState((prev) => ({ ...prev, materias: next }));
  }, []);

  const addActivity = useCallback(
    (subjectSlug: string, rubroIdx: number, activity: Activity) => {
      const key = extraKey(subjectSlug, rubroIdx);
      setState((prev) => ({
        ...prev,
        extraActivities: {
          ...prev.extraActivities,
          [key]: [...(prev.extraActivities[key] ?? []), activity],
        },
      }));
    },
    []
  );

  const resetAll = useCallback(() => {
    setState(initial);
  }, [initial]);

  const cells = useMemo(
    () => ({ ...data.cellStatus, ...state.edits }),
    [data.cellStatus, state.edits]
  );

  const value: StoreValue = {
    data,
    state,
    cells,
    cycleCell,
    notes: state.notes,
    setNote,
    attendance: state.attendance,
    setAtt,
    privNotes: state.privNotes,
    setPrivNote,
    crit: state.crit,
    setCrit,
    umbral: state.umbral,
    setUmbral,
    materias: state.materias,
    setMaterias,
    extraActivities: state.extraActivities,
    addActivity,
    sync,
    resetAll,
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
