"use client"

import React, { createContext, useContext, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { showAuthRequiredToast } from '@/hooks/use-toast'

export type AppRole = "ADMIN_FISCAL" | "AGENT_FISCAL" | "ENTREPRISE"

type AuthUser = {
  id: number
  username: string
  email?: string | null
  fullName?: string | null
  avatar?: string | null
  role: AppRole
  // entreprise info (optional) - present for ENTREPRISE users
  entrepriseId?: number | null
  entreprise?: { id: number } | null
}

type AuthState = {
  token: string | null
  user: AuthUser | null
}

type AuthContextValue = {
  token: string | null
  user: AuthUser | null
  role: AppRole | null
  isLoggingOut: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  startLogout: () => void
  ready: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

function readStoredAuth(): AuthState {
  try {
    const raw = localStorage.getItem("smt.auth")
    if (!raw) return { token: null, user: null }
    const parsed = JSON.parse(raw) as AuthState
    return { token: parsed.token ?? null, user: parsed.user ?? null }
  } catch {
    return { token: null, user: null }
  }
}

function writeStoredAuth(state: AuthState) {
  try {
    localStorage.setItem("smt.auth", JSON.stringify(state))
  } catch {}
}

export const AuthProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  // Initialize from localStorage immediately on first render to avoid redirects before hydration
  const initial = (typeof window !== 'undefined') ? readStoredAuth() : { token: null, user: null }
  const [token, setToken] = useState<string | null>(initial.token)
  const [user, setUser] = useState<AuthUser | null>(initial.user)
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false)
  const [ready, setReady] = useState<boolean>(false)

  useEffect(() => {
    // Ensure we re-sync once after mount in case storage changed before hydration
    const s = readStoredAuth()
    setToken(s.token)
    setUser(s.user)
    setReady(true)

    // Developer convenience: allow auto-login in development by setting
    // Developer convenience: allow explicit auto-login in development only when
    // NEXT_PUBLIC_ENABLE_DEV_LOGIN is set to 'true' alongside NEXT_PUBLIC_DEV_TOKEN
    // and optionally NEXT_PUBLIC_DEV_USER. This prevents accidental auto-login in
    // environments where the vars are present but not intentionally enabled.
    try {
      const enableDev = (process as any)?.env?.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true'
      const devToken = (process as any)?.env?.NEXT_PUBLIC_DEV_TOKEN as string | undefined
      const devUserRaw = (process as any)?.env?.NEXT_PUBLIC_DEV_USER as string | undefined
      if (!s.token && enableDev && devToken && process.env.NODE_ENV !== 'production') {
        let devUser = null
        if (devUserRaw) {
          try {
            devUser = JSON.parse(devUserRaw)
          } catch {
            // ignore JSON parse errors
          }
        }
        setToken(devToken)
        setUser(devUser)
        writeStoredAuth({ token: devToken, user: devUser })
      }
    } catch (e) {
      // ignore in environments where process.env isn't available
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    token,
    user,
    role: user?.role ?? null,
  login: async (username: string, password: string) => {
      const base = (typeof process !== 'undefined' && (process as any)?.env?.NEXT_PUBLIC_API_BASE) || 'http://localhost:4000'
      const res = await fetch(`${base.replace(/\/$/, '')}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) throw new Error("Identifiants invalides")
      const data = await res.json() as { access_token: string; user: AuthUser }
      setToken(data.access_token)
      setUser(data.user)
      writeStoredAuth({ token: data.access_token, user: data.user })
    },
    logout: async () => {
      // perform client-side logout: clear auth and storage
      setToken(null)
      setUser(null)
      writeStoredAuth({ token: null, user: null })
      // reset logging out flag
      setIsLoggingOut(false)
      return Promise.resolve()
    },
    startLogout: () => {
      setIsLoggingOut(true)
    },
    isLoggingOut,
    ready,
  }), [token, user, ready])

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}

// Simple client-side role guard to redirect if a role is not allowed for route
export function RoleGate({ children }: { children: React.ReactNode }) {
  const { role, token, ready, isLoggingOut } = useAuth() as AuthContextValue & { token: string | null }
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Don't gate until we've read auth state from storage
    if (!ready) return
    
    // if logged in and tries to access login page, redirect to dashboard
    // If we're logged in and we land on the root or login page, send users to the dashboard
    if (role && token && (pathname === '/' || pathname?.startsWith('/login'))) {
      router.replace('/dashboard')
      return
    }

    // Public routes for unauthenticated users: home and login should render for not-logged-in users
    // Allow the root path '/' to be publicly accessible (landing page) and login/unauthorized/logout to render
    if (pathname === '/' || pathname?.startsWith('/login') || pathname?.startsWith('/unauthorized') || pathname?.startsWith('/logout')) return

    // if we're actively logging out, allow the logout route to render
    if (isLoggingOut) return

    // if not logged in, but tries to access any protected route, redirect to login
    if (!role || !token) {
      // show a friendly toast explaining why
      try { showAuthRequiredToast() } catch (er) { /* noop */ }
      // keep the original intended path so user can be redirected after login
      const next = pathname || '/'
      router.replace(`/login?next=${encodeURIComponent(next)}`)
      return
    }

    // Role-based route restrictions
    if (role === "ENTREPRISE") {
      const allowed = ["/", "/dashboard", "/entreprises", "/mouvements"]
      if (!allowed.some(p => pathname === p || pathname?.startsWith(p + "/"))) {
        router.replace("/unauthorized")
      }
      return
    }

    if (role === "AGENT_FISCAL") {
      // Agents cannot access users
      if (pathname?.startsWith("/utilisateurs")) {
        router.replace("/unauthorized")
      }
    }
  }, [pathname, role, router, ready])

  // Avoid rendering protected UI until ready to prevent hydration mismatch
  if (!ready) return null
  return <>{children}</>
}


