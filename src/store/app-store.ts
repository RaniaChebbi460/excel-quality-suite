import { create } from "zustand";
import type { ParsedFile } from "@/lib/excel";

// minimal store without external dep
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

import { useSyncExternalStore } from "react";

export interface AppState {
  files: ParsedFile[];
  activeFileIndex: number | null;
  activeSheetIndex: number | null;
}

const store = new SimpleStore<AppState>({
  files: [],
  activeFileIndex: null,
  activeSheetIndex: null,
});

export function useAppStore<S>(selector: (s: AppState) => S): S {
  return useSyncExternalStore(store.subscribe, () => selector(store.get()), () => selector(store.get()));
}

export const appActions = {
  addFile: (f: ParsedFile) => {
    const files = [...store.get().files, f];
    store.set({ files, activeFileIndex: files.length - 1, activeSheetIndex: 0 });
  },
  removeFile: (idx: number) => {
    const files = store.get().files.filter((_, i) => i !== idx);
    store.set({ files, activeFileIndex: files.length ? 0 : null, activeSheetIndex: files.length ? 0 : null });
  },
  setActiveFile: (idx: number) => store.set({ activeFileIndex: idx, activeSheetIndex: 0 }),
  setActiveSheet: (idx: number) => store.set({ activeSheetIndex: idx }),
  getActiveSheet: () => {
    const s = store.get();
    if (s.activeFileIndex === null || s.activeSheetIndex === null) return null;
    return s.files[s.activeFileIndex]?.sheets[s.activeSheetIndex] ?? null;
  },
};

// fake `create` to avoid zustand runtime dependency since we wrote our own
function create<T>(_: any): any {
  return null;
}
