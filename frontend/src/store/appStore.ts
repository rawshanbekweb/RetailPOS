import { create } from "zustand";

interface AppState {
  isOnline:     boolean;
  isSyncing:    boolean;
  pendingCount: number;
  setOnline:       (v: boolean) => void;
  setSyncing:      (v: boolean) => void;
  setPendingCount: (n: number)  => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOnline:     navigator.onLine,
  isSyncing:    false,
  pendingCount: 0,
  setOnline:       (isOnline)     => set({ isOnline }),
  setSyncing:      (isSyncing)    => set({ isSyncing }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
}));
