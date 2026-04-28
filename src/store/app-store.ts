import type { ParsedFile, ParsedSheet } from "@/lib/excel";
import { useSyncExternalStore } from "react";
import { detectSheet, type DetectedKind } from "@/lib/auto-detect";

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

// ===== Per-column specs (override global) =====
export interface ColumnSpec {
  lsl: number;
  usl: number;
  target: number;
}
export type PerColumnSpecs = Record<string, ColumnSpec>;

// ===== Column mapping (validated by wizard) =====
export interface ColumnMapping {
  measureCols: string[];
  partCol: string | null;
  operatorCol: string | null;
  trialCol: string | null;
  valueCol: string | null;
  lslCol: string | null;
  uslCol: string | null;
  validated: boolean;
}

// ===== Import plan (which sheets/fields are merged) =====
export interface ImportPlan {
  // sheetKey = `${fileIndex}::${sheetIndex}` → enabled
  enabledSheets: Record<string, boolean>;
  // column rename map: original header → canonical name (after compatibility check)
  columnAliases: Record<string, string>;
  // explicitly excluded canonical column names
  excludedColumns: string[];
}

export interface AppState {
  files: ParsedFile[];
  activeFileIndex: number | null;
  activeSheetIndex: number | null;
  specs: ProjectSpecs;
  perColumnSpecs: PerColumnSpecs;
  mapping: ColumnMapping;
  mergedSheet: ParsedSheet | null;
  importPlan: ImportPlan;
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

const DEFAULT_PLAN: ImportPlan = {
  enabledSheets: {},
  columnAliases: {},
  excludedColumns: [],
};

const STORAGE_KEY = "spc-app-state-v3";

function loadPersisted(): Partial<AppState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      specs: parsed.specs ?? DEFAULT_SPECS,
      mapping: parsed.mapping ?? DEFAULT_MAPPING,
      perColumnSpecs: parsed.perColumnSpecs ?? {},
      importPlan: parsed.importPlan ?? DEFAULT_PLAN,
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
  perColumnSpecs: persisted.perColumnSpecs || {},
  mapping: { ...DEFAULT_MAPPING, ...(persisted.mapping || {}) },
  mergedSheet: null,
  importPlan: { ...DEFAULT_PLAN, ...(persisted.importPlan || {}) },
});

function persist() {
  const s = store.get();
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        specs: s.specs,
        mapping: s.mapping,
        perColumnSpecs: s.perColumnSpecs,
        importPlan: s.importPlan,
      })
    );
  } catch {}
}

export function useAppStore<S>(selector: (s: AppState) => S): S {
  return useSyncExternalStore(store.subscribe, () => selector(store.get()), () => selector(store.get()));
}

// ===== Compatibility analysis between sheets =====
export interface CompatibilityReport {
  unionHeaders: string[];
  commonHeaders: string[];
  perSheetUnique: { sheetLabel: string; unique: string[] }[];
  ignored: string[]; // headers excluded
  renamed: { from: string; to: string }[];
}

function sheetLabel(fileIdx: number, sheetIdx: number, files: ParsedFile[]) {
  const f = files[fileIdx];
  return `${f?.name ?? "?"} / ${f?.sheets[sheetIdx]?.name ?? "?"}`;
}

export function analyzeCompatibility(files: ParsedFile[], plan: ImportPlan): CompatibilityReport {
  const selected: { sheet: ParsedSheet; label: string }[] = [];
  files.forEach((f, fi) =>
    f.sheets.forEach((s, si) => {
      const key = `${fi}::${si}`;
      if (plan.enabledSheets[key] !== false) {
        selected.push({ sheet: s, label: sheetLabel(fi, si, files) });
      }
    })
  );
  const allHeaders = new Set<string>();
  const headerCount = new Map<string, number>();
  selected.forEach(({ sheet }) => {
    sheet.headers.forEach((h) => {
      const canonical = plan.columnAliases[h] ?? h;
      allHeaders.add(canonical);
      headerCount.set(canonical, (headerCount.get(canonical) ?? 0) + 1);
    });
  });
  const unionHeaders = Array.from(allHeaders).filter((h) => !plan.excludedColumns.includes(h));
  const commonHeaders = unionHeaders.filter((h) => (headerCount.get(h) ?? 0) === selected.length);
  const perSheetUnique = selected.map(({ sheet, label }) => {
    const cols = sheet.headers.map((h) => plan.columnAliases[h] ?? h);
    const unique = cols.filter((c) => (headerCount.get(c) ?? 0) === 1);
    return { sheetLabel: label, unique };
  });
  const ignored = plan.excludedColumns.slice();
  const renamed = Object.entries(plan.columnAliases).map(([from, to]) => ({ from, to }));
  return { unionHeaders, commonHeaders, perSheetUnique, ignored, renamed };
}

// ===== Merge utility (respecting import plan) =====
export function mergeFiles(files: ParsedFile[], plan?: ImportPlan): ParsedSheet | null {
  if (files.length === 0) return null;
  const aliases = plan?.columnAliases ?? {};
  const excluded = new Set(plan?.excludedColumns ?? []);

  const allSheets: { sheet: ParsedSheet; label: string }[] = [];
  files.forEach((f, fi) =>
    f.sheets.forEach((s, si) => {
      const key = `${fi}::${si}`;
      if (!plan || plan.enabledSheets[key] !== false) {
        allSheets.push({ sheet: s, label: sheetLabel(fi, si, files) });
      }
    })
  );
  if (allSheets.length === 0) return null;
  if (allSheets.length === 1 && Object.keys(aliases).length === 0 && excluded.size === 0) {
    return allSheets[0].sheet;
  }

  const headerSet = new Set<string>();
  allSheets.forEach(({ sheet }) =>
    sheet.headers.forEach((h) => {
      const canonical = aliases[h] ?? h;
      if (!excluded.has(canonical)) headerSet.add(canonical);
    })
  );
  const headers = Array.from(headerSet);

  const rows: Record<string, any>[] = [];
  allSheets.forEach(({ sheet, label }) => {
    sheet.rows.forEach((r) => {
      const row: Record<string, any> = { __source: label };
      headers.forEach((h) => (row[h] = null));
      sheet.headers.forEach((h) => {
        const canonical = aliases[h] ?? h;
        if (!excluded.has(canonical)) row[canonical] = r[h];
      });
      rows.push(row);
    });
  });

  const finalHeaders = ["__source", ...headers];
  const matrix: any[][] = [finalHeaders, ...rows.map((r) => finalHeaders.map((h) => r[h]))];
  return { name: "Fusion globale", headers: finalHeaders, rows, matrix };
}

export const appActions = {
  addFile: (f: ParsedFile) => {
    const files = [...store.get().files, f];
    const plan = { ...store.get().importPlan };
    f.sheets.forEach((_, si) => {
      const key = `${files.length - 1}::${si}`;
      if (plan.enabledSheets[key] === undefined) plan.enabledSheets[key] = true;
    });
    const merged = mergeFiles(files, plan);

    // Auto-detect mapping across ALL sheets of all files.
    const currentMapping = store.get().mapping;
    const detections: { fileIdx: number; sheetIdx: number; kind: DetectedKind; map: any }[] = [];
    files.forEach((file, fi) =>
      file.sheets.forEach((s, si) => {
        const d = detectSheet(s);
        detections.push({ fileIdx: fi, sheetIdx: si, kind: d.kind, map: d.mapping });
      })
    );
    const spcDet = detections.find((d) => d.kind === "spc");
    const msaDet = detections.find((d) => d.kind === "msa");

    const nextMapping: ColumnMapping = {
      ...currentMapping,
      // SPC fields from SPC sheet (only if user hasn't already mapped)
      measureCols:
        currentMapping.measureCols.length > 0
          ? currentMapping.measureCols
          : spcDet?.map.measureCols ?? msaDet?.map.measureCols ?? [],
      // MSA fields from MSA sheet
      partCol: currentMapping.partCol ?? msaDet?.map.partCol ?? null,
      operatorCol: currentMapping.operatorCol ?? msaDet?.map.operatorCol ?? null,
      trialCol: currentMapping.trialCol ?? msaDet?.map.trialCol ?? null,
      valueCol: currentMapping.valueCol ?? msaDet?.map.valueCol ?? null,
      validated: true, // auto-detected mapping is considered valid until user changes it
    };

    // Pick a sensible active sheet (prefer SPC sheet for the preview)
    const preferred = spcDet ?? msaDet ?? { fileIdx: files.length - 1, sheetIdx: 0 };

    store.set({
      files,
      activeFileIndex: preferred.fileIdx,
      activeSheetIndex: preferred.sheetIdx,
      mergedSheet: merged,
      importPlan: plan,
      mapping: nextMapping,
    });
    persist();
  },
  removeFile: (idx: number) => {
    const files = store.get().files.filter((_, i) => i !== idx);
    const plan = store.get().importPlan;
    const merged = mergeFiles(files, plan);
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
  getAnalysisSheet: (): ParsedSheet | null => {
    const s = store.get();
    if (s.files.length > 1 && s.mergedSheet) return s.mergedSheet;
    return appActions.getActiveSheet();
  },
  // Find the sheet that best matches a given analysis kind (auto-detected).
  getSheetForKind: (kind: "spc" | "msa"): ParsedSheet | null => {
    const s = store.get();
    for (const f of s.files) {
      for (const sh of f.sheets) {
        if (detectSheet(sh).kind === kind) return sh;
      }
    }
    return null;
  },
  hasAnyData: (): boolean => store.get().files.length > 0,
  setSpecs: (patch: Partial<ProjectSpecs>) => {
    store.set({ specs: { ...store.get().specs, ...patch } });
    persist();
  },
  setColumnSpec: (col: string, patch: Partial<ColumnSpec>) => {
    const s = store.get();
    const current = s.perColumnSpecs[col] ?? { lsl: s.specs.lsl, usl: s.specs.usl, target: s.specs.target };
    store.set({ perColumnSpecs: { ...s.perColumnSpecs, [col]: { ...current, ...patch } } });
    persist();
  },
  removeColumnSpec: (col: string) => {
    const s = store.get();
    const next = { ...s.perColumnSpecs };
    delete next[col];
    store.set({ perColumnSpecs: next });
    persist();
  },
  getEffectiveSpec: (col: string | null | undefined): ColumnSpec => {
    const s = store.get();
    if (col && s.perColumnSpecs[col]) return s.perColumnSpecs[col];
    return { lsl: s.specs.lsl, usl: s.specs.usl, target: s.specs.target };
  },
  setMapping: (patch: Partial<ColumnMapping>) => {
    store.set({ mapping: { ...store.get().mapping, ...patch } });
    persist();
  },
  resetMapping: () => {
    store.set({ mapping: { ...DEFAULT_MAPPING } });
    persist();
  },
  // ===== Import plan =====
  setSheetEnabled: (fileIdx: number, sheetIdx: number, enabled: boolean) => {
    const plan = { ...store.get().importPlan };
    plan.enabledSheets = { ...plan.enabledSheets, [`${fileIdx}::${sheetIdx}`]: enabled };
    const merged = mergeFiles(store.get().files, plan);
    store.set({ importPlan: plan, mergedSheet: merged });
    persist();
  },
  setColumnAlias: (from: string, to: string) => {
    const plan = { ...store.get().importPlan };
    if (!to || to === from) {
      const next = { ...plan.columnAliases };
      delete next[from];
      plan.columnAliases = next;
    } else {
      plan.columnAliases = { ...plan.columnAliases, [from]: to };
    }
    const merged = mergeFiles(store.get().files, plan);
    store.set({ importPlan: plan, mergedSheet: merged });
    persist();
  },
  toggleExcludedColumn: (col: string) => {
    const plan = { ...store.get().importPlan };
    plan.excludedColumns = plan.excludedColumns.includes(col)
      ? plan.excludedColumns.filter((c) => c !== col)
      : [...plan.excludedColumns, col];
    const merged = mergeFiles(store.get().files, plan);
    store.set({ importPlan: plan, mergedSheet: merged });
    persist();
  },
  rebuildMerge: () => {
    const merged = mergeFiles(store.get().files, store.get().importPlan);
    store.set({ mergedSheet: merged });
  },
};
