// @refresh reset
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { User } from '../types'
import { useEffect } from 'react'
import { apiRequest } from '../api/client'
import { fetchMe, updateUserSettings } from '../api/mockApi'

type AuthContextType = {
  user: User | null
  token: string | null
  authReady: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  locale: 'en' | 'zh'
  setLocale: (locale: 'en' | 'zh') => void
  hydrateSession: (token: string) => Promise<void>
  refreshUser: (nextUser?: User) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'))
  const [authReady, setAuthReady] = useState(() => !localStorage.getItem('auth_token'))
  const [locale, setLocaleState] = useState<'en' | 'zh'>(() => {
    const saved = localStorage.getItem('ui_locale')
    return saved === 'zh' ? 'zh' : 'en'
  })

  useEffect(() => {
    if (!token) {
      setAuthReady(true)
      return
    }

    let cancelled = false
    setAuthReady(false)
    fetchMe(token)
      .then((me) => {
        if (cancelled) return
        setUser(me)
        setLocaleState(me.locale)
      })
      .catch(() => {
        if (cancelled) return
        setUser(null)
        setToken(null)
        localStorage.removeItem('auth_token')
      })
      .finally(() => {
        if (!cancelled) setAuthReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  async function hydrateSession(nextToken: string) {
    setAuthReady(false)
    try {
      const me = await fetchMe(nextToken)
      setUser(me)
      setLocaleState(me.locale)
    } finally {
      setAuthReady(true)
    }
  }

  async function refreshUser(nextUser?: User) {
    if (nextUser) {
      setUser(nextUser)
      return
    }
    if (!token) return
    const me = await fetchMe(token)
    setUser(me)
    setLocaleState(me.locale)
  }

  async function login(email: string, password: string): Promise<boolean> {
    try {
      const response = await apiRequest<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })
      setToken(response.token)
      setUser(response.user)
      setLocaleState(response.user.locale)
      localStorage.setItem('auth_token', response.token)
      localStorage.setItem('ui_locale', response.user.locale)
      return true
    } catch {
      return false
    }
  }

  function logout() {
    setToken(null)
    setUser(null)
    localStorage.removeItem('auth_token')
  }

  async function setLocale(localeValue: 'en' | 'zh') {
    setLocaleState(localeValue)
    localStorage.setItem('ui_locale', localeValue)
    if (token) {
      try {
        const updated = await updateUserSettings(token, { locale: localeValue })
        setUser(updated)
        setLocaleState(updated.locale)
      } catch {
        // keep local fallback
      }
    }
  }

  const value = useMemo(
    () => ({ user, token, authReady, login, logout, locale, setLocale, hydrateSession, refreshUser }),
    [user, token, authReady, locale],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
