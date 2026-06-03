import { create } from 'zustand'

interface AppState {
  // Add global state here as needed
}

export const useAppStore = create<AppState>(() => ({}))
