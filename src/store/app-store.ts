import type { ParsedFile, ParsedSheet } from "@/lib/excel";
import { useSyncExternalStore } from "react";

type Listener = () => void;

class SimpleStore<T> {
  private state: T;
  private listeners = new Set<Listener>();
  constructor(initial: T) {
    this.state = initial;
  }
  get = () => this.state;
  set = (partial: Partial<T> | ((s: T) => Partial<T>)) => {
    const p = typeof partial === "function" ? (partial as any)(this.state) : partial;
    this.state = { ...this.state, ...p };
    this.listeners.forEach((l) => l());
  };
  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
}

// ===== Specs (per project, applied everywhere) =====
export interface ProjectSpecs {
  lsl: number;
  usl: number;
  target: number;
  subgroupSize: number;
  unit: string;
  projectName: string;
}

// ===== Column mapping (validated by wizard) =====
export interface ColumnMapping {
  // SPC / Capability
  measureCols: string[];        // one or more numeric cols (subgroup measures or single value column)
  // MSA
  partCol: string | null;
  operatorCol: string | null;
  trialCol: string | null;
  valueCol: string | null;
  // Optional override of LSL/USL coming from the sheet itself
  lslCol: string | null;
  uslCol: string | null;
  validated: boolean;
}

export interface AppState {
  files: ParsedFile[];
  activeFileIndex: number | null;
  activeSheetIndex: number | null;
  specs: ProjectSpecs;
  mapping: ColumnMapping;
  mergedSheet: ParsedSheet | null; // result of multi-file merge
}

const DEFAULT_SPECS: ProjectSpecs = {
  lsl: 9.5,
  usl: 10.5,
  target: 10,
  subgroupSize: 5,
  unit: "mm",
  projectName: "Projet par défaut",
};

const DEFAULT_MAPPING: ColumnMapping = {
  measureCols: [],
  partCol: null,
  operatorCol: null,
  trialCol: null,
  valueCol: null,
  lslCol: null,
  uslCol: null,
  validated: false,
};

const STORAGE_KEY = "spc-app-state-v2";

function loadPersisted(): Partial<AppState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      specs: parsed.specs ?? DEFAULT_SPECS,
      mapping: parsed.mapping ?? DEFAULT_MAPPING,
    };
  } catch {
    return {};
  }
}

const persisted = loadPersisted();

const store = new SimpleStore<AppState>({
  files: [],
  activeFileIndex: null,
  activeSheetIndex: null,
  specs: { ...DEFAULT_SPECS, ...(persisted.specs || {}) },
  mapping: { ...DEFAULT_MAPPING, ...(persisted.mapping || {}) },
  mergedSheet: null,
});

function persist() {
  const s = store.get();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ specs: s.specs, mapping: s.mapping }));
  } catch {}
}

export function useAppStore<S>(selector: (s: AppState) => S): S {
  return useSyncExternalStore(store.subscribe, () => selector(store.get()), () => selector(store.get()));
}

// ===== Merge utility: union compatible columns across all sheets =====
export function mergeFiles(files: ParsedFile[]): ParsedSheet | null {
  if (files.length === 0) return null;
  // Take all sheets from all files
  const allSheets: ParsedSheet[] = files.flatMap((f) => f.sheets);
  if (allSheets.length === 0) return null;
  if (allSheets.length === 1) return allSheets[0];

  // Build union of headers
  const headerSet = new Set<string>();
  allSheets.forEach((s) => s.headers.forEach((h) => headerSet.add(h)));
  const headers = Array.from(headerSet);

  // Concatenate rows
  const rows: Record<string, any>[] = [];
  allSheets.forEach((s) => {
    s.rows.forEach((r) => {
      const row: Record<string, any> = {};
      headers.forEach((h) => (row[h] = r[h] ?? null));
      rows.push(row);
    });
  });

  const matrix: any[][] = [headers, ...rows.map((r) => headers.map((h) => r[h]))];
  return { name: "Fusion globale", headers, rows, matrix };
}

export const appActions = {
  addFile: (f: ParsedFile) => {
    const files = [...store.get().files, f];
    const merged = mergeFiles(files);
    store.set({ files, activeFileIndex: files.length - 1, activeSheetIndex: 0, mergedSheet: merged });
  },
  removeFile: (idx: number) => {
    const files = store.get().files.filter((_, i) => i !== idx);
    const merged = mergeFiles(files);
    store.set({
      files,
      activeFileIndex: files.length ? 0 : null,
      activeSheetIndex: files.length ? 0 : null,
      mergedSheet: merged,
    });
  },
  setActiveFile: (idx: number) => store.set({ activeFileIndex: idx, activeSheetIndex: 0 }),
  setActiveSheet: (idx: number) => store.set({ activeSheetIndex: idx }),
  getActiveSheet: (): ParsedSheet | null => {
    const s = store.get();
    if (s.activeFileIndex === null || s.activeSheetIndex === null) return null;
    return s.files[s.activeFileIndex]?.sheets[s.activeSheetIndex] ?? null;
  },
  // Returns the data sheet to use for analysis: merged if multiple files, else active sheet
  getAnalysisSheet: (): ParsedSheet | null => {
    const s = store.get();
    if (s.files.length > 1 && s.mergedSheet) return s.mergedSheet;
    return appActions.getActiveSheet();
  },
  setSpecs: (patch: Partial<ProjectSpecs>) => {
    store.set({ specs: { ...store.get().specs, ...patch } });
    persist();
  },
  setMapping: (patch: Partial<ColumnMapping>) => {
    store.set({ mapping: { ...store.get().mapping, ...patch } });
    persist();
  },
  resetMapping: () => {
    store.set({ mapping: { ...DEFAULT_MAPPING } });
    persist();
  },
};
