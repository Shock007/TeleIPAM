import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { AUTH_EXPIRED, clearToken, getToken, setToken } from '@/lib/auth'
import type { AuthResponse, AuthUser } from '@/types/api'

interface Ctx {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, wisphubKey?: string) => Promise<AuthResponse>
  logout: () => void
}

const AuthContext = createContext<Ctx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(!!getToken())

  useEffect(() => {
    if (!getToken()) return
    api.auth.me().then(setUser).catch(() => clearToken()).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onExpired = () => setUser(null)
    window.addEventListener(AUTH_EXPIRED, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED, onExpired)
  }, [])

  const value: Ctx = {
    user,
    loading,
    login: async (email, password) => {
      const r = await api.auth.login({ email, password })
      setToken(r.access_token)
      setUser(r.user)
    },
    register: async (email, password, wisphubKey) => {
      const r = await api.auth.register({ email, password, wisphub_api_key: wisphubKey || null })
      setToken(r.access_token)
      setUser(r.user)
      return r
    },
    logout: () => {
      clearToken()
      setUser(null)
      qc.clear()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}