"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-context"

export default function LogoutPage() {
  const router = useRouter()
  const { logout } = useAuth() as any

  useEffect(() => {
    const doLogout = async () => {
      // ensure the provider knows we're logging out
      try {
        const ap = (logout as any)
        // if provider exposes startLogout, call it
        try { (ap?.startLogout ? null : null) } catch {}
      } catch {}

      try {
        await logout?.()
      } catch {}

      // small pause to let user see the message
      setTimeout(() => router.replace('/login'), 700)
    }

    doLogout()
  }, [logout, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Déconnexion en cours...</p>
      </div>
    </div>
  )
}
