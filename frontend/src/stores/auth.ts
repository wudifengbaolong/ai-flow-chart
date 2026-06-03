import { create } from 'zustand'

interface AuthState {
  token: string | null
  user: { id: string; email: string } | null
  setAuth: (token: string, user: { id: string; email: string }) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token'),
  user: null,

  setAuth: (token, user) => {
    localStorage.setItem('token', token)
    set({ token, user })
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ token: null, user: null })
  },

  isAuthenticated: () => {
    return !!get().token
  },
}))
