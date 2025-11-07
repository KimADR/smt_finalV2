"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AlertTriangle, ArrowLeft, Home } from "lucide-react"

export default function UnauthorizedPage() {
  const router = useRouter()
  const isLoggedIn = typeof window !== "undefined" && !!localStorage.getItem("smt.auth") && (() => {
    try {
      const s = JSON.parse(localStorage.getItem("smt.auth") || "null")
      return !!s?.token
    } catch {
      return false
    }
  })()

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
      <Card className="w-full max-w-2xl shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <CardHeader className="flex flex-col items-center gap-4 py-10 px-6 text-center">
          <div className="relative flex items-center justify-center">
            {/* subtle pulsing ring */}
            <div className="absolute -inset-3 flex items-center justify-center">
              <div className="w-36 h-36 rounded-full bg-blue-600/6 animate-pulse" />
            </div>
            <div className="relative z-10 flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-2xl transform transition-transform hover:scale-105 motion-reduce:transform-none animate-bounce">
              <AlertTriangle className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Accès non autorisé</CardTitle>
          <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            Si vous pensez qu'il s'agit d'une erreur, contactez l'administrateur.
          </p>
        </CardHeader>

        <CardContent className="flex flex-col items-center gap-6 px-8 pb-6">
          <div className="text-center">
            <div className="text-7xl font-extrabold text-blue-600 dark:text-blue-400">403</div>
            <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">Acces restreint</div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 px-6 py-6">
          <div className="flex gap-3 w-full">
            <Button variant="outline" onClick={() => router.back()} className="flex-1 border-slate-300 text-slate-700 dark:text-slate-200">
              <ArrowLeft className="h-4 w-4 mr-2" />Retour
            </Button>

            {isLoggedIn ? (
              <Button onClick={() => router.replace('/')} className="flex-1 bg-blue-600 text-white hover:bg-blue-700">
                <Home className="h-4 w-4 mr-2" />Tableau de bord
              </Button>
            ) : (
              <Button onClick={() => router.replace('/login')} className="flex-1 bg-blue-600 text-white hover:bg-blue-700">
                <Home className="h-4 w-4 mr-2" />Se connecter
              </Button>
            )}
          </div>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-2">Besoin d'aide ? Contactez le support technique</p>
        </CardFooter>
      </Card>
    </div>
  )
}


