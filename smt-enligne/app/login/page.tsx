"use client"

import React, { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-context"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, ShieldCheck, BarChart3, Sparkles } from "lucide-react"

export default function LoginPage() {
  const { login, ready, token, role } = useAuth() as any
  const router = useRouter()
  const [fromUnauthorized, setFromUnauthorized] = useState(false)

  useEffect(() => {
    // Vérifie si l'utilisateur vient d'être redirigé après un accès non autorisé
    const params = new URLSearchParams(window.location.search)
    setFromUnauthorized(params.get('unauthorized') === 'true')
  }, [])

  useEffect(() => {
    if (!ready) return
    if (token && role) {
      // If already authenticated, redirect away from login
      router.replace('/')
    }
  }, [ready, token, role, router])
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(username, password)
      setFromUnauthorized(false)
      router.replace("/")
    } catch (e: any) {
      let errorMessage = "Identifiants incorrects"
      if (e?.message === "Network Error") {
        errorMessage = "Impossible de se connecter au serveur"
      } else if (e?.message?.includes("timeout")) {
        errorMessage = "Le serveur met trop de temps à répondre"
      }
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 md:grid-cols-2">
        <div className="relative hidden md:flex flex-col justify-center p-10">
          <div />
          <div>
            <Link href="/" aria-label="Aller à la page d'accueil" className="inline-block">
              <Image src="/logo.png" alt="Logo" width={160} height={160} className="h-40 w-40 opacity-90 dark:opacity-100 object-contain" priority />
            </Link>
            <h2 className="mt-6 text-4xl font-semibold tracking-tight">Bienvenue</h2>
            <p className="mt-3 max-w-xl text-base text-muted-foreground">
              Connectez-vous pour accéder à votre tableau de bord, gérer les entreprises, mouvements et rapports.
            </p>

            <div className="mt-8 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-lg border bg-background/40 p-4 backdrop-blur-sm dark:border-white/5">
                <span className="mt-0.5 rounded-md bg-blue-500/10 p-2 text-blue-500">
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <p className="text-sm font-medium">Sécurité renforcée</p>
                  <p className="text-sm text-muted-foreground">Accès protégé selon votre rôle.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border bg-background/40 p-4 backdrop-blur-sm dark:border-white/5">
                <span className="mt-0.5 rounded-md bg-purple-500/10 p-2 text-purple-500">
                  <BarChart3 size={18} />
                </span>
                <div>
                  <p className="text-sm font-medium">Analyses claires</p>
                  <p className="text-sm text-muted-foreground">Suivez vos indicateurs clés.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border bg-background/40 p-4 backdrop-blur-sm dark:border-white/5 sm:col-span-2">
                <span className="mt-0.5 rounded-md bg-emerald-500/10 p-2 text-emerald-500">
                  <Sparkles size={18} />
                </span>
                <div>
                  <p className="text-sm font-medium">Expérience moderne</p>
                  <p className="text-sm text-muted-foreground">Interface rapide et responsive.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(40rem_20rem_at_top_right,rgba(59,130,246,0.15),transparent_60%)]" />
          <div className="pointer-events-none absolute -left-24 top-1/3 -z-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        <div className="flex items-center justify-center p-6 md:p-10">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Connexion</CardTitle>
              <CardDescription>Entrez vos identifiants pour continuer</CardDescription>
            </CardHeader>
            <CardContent>
              {fromUnauthorized && (
                <div className="mb-4">
                  <div className="bg-red-900/80 border border-red-700 rounded-lg p-4 text-white shadow-lg">
                    <div className="font-bold text-lg mb-1">Accès refusé — authentification requise</div>
                    <div className="text-sm">Votre requête a été refusée car vous n'êtes pas connecté(e). Veuillez vous connecter pour accéder à cette ressource.</div>
                  </div>
                </div>
              )}
              {error && !fromUnauthorized && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={onSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username">Nom d'utilisateur ou email</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin@exemple.com"
                    autoComplete="username"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      placeholder="Votre mot de passe"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-2 my-auto inline-flex items-center rounded p-2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Connexion..." : "Se connecter"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex items-center justify-center">
              <p className="text-xs text-muted-foreground">
                Besoin d'aide ? Contactez l'administrateur.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}


