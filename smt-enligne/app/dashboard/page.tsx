"use client"

import React, { useEffect, useState } from "react"
import { useAuth } from '@/components/auth-context'
import { authFetch, normalizeErrorString } from "@/lib/utils"
import { Navigation } from "@/components/navigation"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { DashboardCharts } from '@/components/dashboard-charts'
import { RecentMovements } from "@/components/recent-movements"
import { TaxAlerts } from "@/components/tax-alerts"
import {
  TrendingUp,
  TrendingDown,
  Building2,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
} from "lucide-react"
import { toast, showErrorToast } from "@/hooks/use-toast"
import { createAlertChannel, createChannel } from '@/lib/events'
import { ThemeToggle } from "@/components/theme-toggle"
import NotificationBell from '@/components/notification-bell'

export default function DashboardPage() {
  const { user, role } = useAuth()
  // Defensive guard: if auth provider indicates not ready or no user/role,
  // redirect to login. RoleGate should handle this globally, but this ensures
  // the dashboard cannot render for unauthenticated users even if RoleGate
  // is bypassed for any reason.
  const { ready, token } = (useAuth() as any)
  const router = require('next/navigation').useRouter()
  useEffect(() => {
    if (!ready) return
    if (!token || !role) {
      const next = '/dashboard'
      router.replace(`/login?next=${encodeURIComponent(next)}`)
    }
  }, [ready, token, role])
  const [entreprisesCount, setEntreprisesCount] = useState<number | null>(null)
  const [revenusTotal, setRevenusTotal] = useState<number | null>(null)
  const [depensesTotal, setDepensesTotal] = useState<number | null>(null)
  const [soldeNet, setSoldeNet] = useState<number | null>(null)
  const [depensesGrowthPercent, setDepensesGrowthPercent] = useState(null as number | null)
  const [growthPercent, setGrowthPercent] = useState(null as number | null)
  const [taxesDue, setTaxesDue] = useState<number | null>(null)
  const [urgentAlertsTotal, setUrgentAlertsTotal] = useState<number | null>(null)
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
  const [period, setPeriod] = useState('year') // week | month | quarter | year
  const [selectedEnterprise, setSelectedEnterprise] = useState<string>('all') // 'all' ou ID de l'entreprise
  const [enterprises, setEnterprises] = useState<Array<{ id: number; name: string }>>([])
  const [enterpriseQuery, setEnterpriseQuery] = useState<string>('')
  const fmtCompact = new Intl.NumberFormat('fr-FR', { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 })

  // Helper to robustly parse amounts coming from the API. Accepts numbers, strings,
  // Prisma Decimal-like objects (toString / toNumber), and keys like `amount` or `montant`.
  function parseAmount(raw: unknown): number {
    if (raw == null) return 0
    // If object with toNumber (some Decimal libs)
    try {
      if (typeof raw === 'object') {
        // @ts-ignore
        if (raw && typeof (raw as any).toNumber === 'function') {
          // @ts-ignore
          return Number((raw as any).toNumber()) || 0
        }
        const s = String(raw)
        const cleaned = s.replace(/\s+/g, '').replace(/,/g, '.')
        const n = Number(cleaned)
        return Number.isFinite(n) ? n : 0
      }
      if (typeof raw === 'string') {
        const cleaned = raw.replace(/\s+/g, '').replace(/,/g, '.')
        const n = Number(cleaned)
        return Number.isFinite(n) ? n : 0
      }
      if (typeof raw === 'number') {
        return Number.isFinite(raw) ? raw : 0
      }
    } catch (e) {
      return 0
    }
    return 0
  }

  // Charger la liste des entreprises
  useEffect(() => {
    if (role === 'ENTREPRISE') return // Ne pas charger la liste pour les utilisateurs entreprise
    authFetch(`${API_URL}/api/entreprises`)
      .then((r) => r.ok ? r.json() : [])
      .then((list: any[]) => {
        const mapped = (list || []).map((e) => ({ id: e.id, name: e.name }))
        mapped.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
        setEnterprises(mapped)
      })
      .catch(() => {})
  }, [API_URL, role])

  useEffect(() => {
    // Skip if not ready
    if (!ready || !role || !user) return;

    let mounted = true
    const params = new URLSearchParams({ period })
    const userEntId = (user as any)?.entrepriseId ?? (user as any)?.entreprise?.id
    
    // Gestion du filtre entreprise
    if (role === 'ENTREPRISE' && userEntId) {
      params.set('entrepriseId', String(userEntId))
    } else if (role === 'ADMIN_FISCAL' && selectedEnterprise !== 'all') {
      params.set('entrepriseId', selectedEnterprise)
    }
    
    console.log('[Dashboard] Fetching summary with params:', params.toString(), { role, selectedEnterprise, userEntId })
    authFetch(`${API_URL}/api/analytics/summary?${params.toString()}`)
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then(async (summary: any) => {
          if (!mounted) return
          setEntreprisesCount(typeof summary.entreprises === 'number' ? summary.entreprises : null)
          setRevenusTotal(typeof summary.revenusTotal === 'number' ? summary.revenusTotal : (typeof summary.total === 'number' ? summary.total : null))
          // Fetch server-side authoritative mouvements stats (period + entrepriseId)
          let serverStats: any = null
          try {
            const statsUrl = `${API_URL}/api/mouvements/stats?${params.toString()}`
            const rs = await authFetch(statsUrl)
            if (rs.ok) serverStats = await rs.json()
            console.debug('[Dashboard] serverStats:', serverStats)
          } catch (e) {
            serverStats = null
          }

          // For entreprise users, keep the summary-provided depensesTotal (period-scoped) or use serverStats when available.
          // For admin users, show the total of existing DEPENSE mouvements in DB (global total) similar to the Mouvements page.
          if (role === 'ENTREPRISE') {
            // For entreprise users, fetch the mouvements for their entreprise and compute the exact total
            ;(async () => {
              try {
                const entId = userEntId
                if (!entId) {
                  const fallback = serverStats?.totalDepenses ?? summary.depensesTotal
                  setDepensesTotal(typeof fallback === 'number' ? Math.abs(fallback) : null)
                  return
                }
                // Prefer serverStats if available
                if (serverStats && typeof serverStats.totalDepenses === 'number') {
                  setDepensesTotal(Math.abs(serverStats.totalDepenses))
                } else {
                  // use same params (period + entrepriseId) so the total matches filters
                  const listUrl = `${API_URL}/api/mouvements?${params.toString()}`
                  const r2 = await authFetch(listUrl)
                  if (!r2.ok) {
                    const fallback = serverStats?.totalDepenses ?? summary.depensesTotal
                    setDepensesTotal(typeof fallback === 'number' ? Math.abs(fallback) : null)
                    return
                  }
                  const list = await r2.json()
                console.debug('[Dashboard] mouvements list (entreprise) count:', (list || []).length, list.slice ? list.slice(0,5) : list)
                const total = (list || []).reduce((s: number, m: any) => {
                  const t = String(m.type || m.type_mouvement || '').toUpperCase()
                  // detect tax payment flag from multiple possible shapes
                  const isTax = !!(m.estPaiementImpot ?? m.est_paiement_impot ?? m.isTaxPayment ?? (t === 'TAXPAIMENT'))
                  if (isTax) return s
                  const amtRaw = parseAmount(m.amount ?? m.montant ?? m.montant_raw ?? 0)
                  const amt = Math.abs(amtRaw)
                  const isExpense = t === 'DEBIT' || t === 'DEPENSE' || amtRaw < 0
                  if (!isExpense) return s
                  return s + amt
                }, 0)
                setDepensesTotal(total)
                console.debug('[Dashboard] computed depensesTotal (entreprise):', total)
                }
              } catch (e) {
                setDepensesTotal(typeof summary.depensesTotal === 'number' ? Math.abs(summary.depensesTotal) : null)
              }
            })()
          } else {
            // fetch all mouvements and compute total depenses from DB
            (async () => {
              try {
                // include period and entrepriseId (if selected) so totals reflect filters
                const listUrl = `${API_URL}/api/mouvements?${params.toString()}`
                const r2 = await authFetch(listUrl)
                if (!r2.ok) {
                  const fallback = serverStats?.totalDepenses ?? summary.depensesTotal
                  setDepensesTotal(typeof fallback === 'number' ? Math.abs(fallback) : null)
                  return
                }
                const list = await r2.json()
                console.debug('[Dashboard] mouvements list (admin) count:', (list || []).length, list.slice ? list.slice(0,5) : list)
                const totalFromDb = (list || []).reduce((s: number, m: any) => {
                  // determine if movement is an expense: prefer explicit type 'DEBIT' or 'DEPENSE', fallback to negative amount
                  const t = String(m.type || m.type_mouvement || '').toUpperCase()
                  const isTax = !!(m.estPaiementImpot ?? m.est_paiement_impot ?? m.isTaxPayment ?? (t === 'TAXPAIMENT'))
                  if (isTax) return s
                  const amtRaw = parseAmount(m.amount ?? m.montant ?? m.montant_raw ?? 0)
                  const isExpense = t === 'DEBIT' || t === 'DEPENSE' || amtRaw < 0
                  if (!isExpense) return s
                  return s + Math.abs(amtRaw)
                }, 0)
                setDepensesTotal(totalFromDb)
                console.debug('[Dashboard] computed depensesTotal (admin):', totalFromDb)
                } catch (e) {
                // fallback to summary value if fetch fails
                setDepensesTotal(typeof summary.depensesTotal === 'number' ? Math.abs(summary.depensesTotal) : null)
              }
            })()
          }
          // compute soldeNet as recettes - depenses (excluding tax payments) when possible
          ;(async () => {
              try {
              // fetch mouvements using same params (period + entrepriseId) so solde uses same filters
              let mouvementsList: any[] | null = null
              const listUrlForSolde = `${API_URL}/api/mouvements?${params.toString()}`
              const r3 = await authFetch(listUrlForSolde)
              if (r3.ok) mouvementsList = await r3.json()

              if (mouvementsList && Array.isArray(mouvementsList)) {
                const totalCredits = (mouvementsList || []).reduce((s: number, m: any) => {
                  const t = String(m.type || m.type_mouvement || '').toUpperCase()
                  if (t === 'CREDIT') return s + Math.abs(parseAmount(m.amount ?? m.montant ?? 0) || 0)
                  return s
                }, 0)
                const totalExpenses = (mouvementsList || []).reduce((s: number, m: any) => {
                  const t = String(m.type || m.type_mouvement || '').toUpperCase()
                  const isTax = !!(m.estPaiementImpot ?? m.est_paiement_impot ?? m.isTaxPayment ?? (t === 'TAXPAIMENT'))
                  if (isTax) return s
                  const amtRaw = parseAmount(m.amount ?? m.montant ?? 0)
                  const isExpense = t === 'DEBIT' || t === 'DEPENSE' || amtRaw < 0
                  if (!isExpense) return s
                  return s + Math.abs(amtRaw)
                }, 0)
                setSoldeNet(totalCredits - totalExpenses)
              } else {
                setSoldeNet(typeof summary.soldeNet === 'number' ? summary.soldeNet : null)
              }
            } catch (e) {
              setSoldeNet(typeof summary.soldeNet === 'number' ? summary.soldeNet : null)
            }
          })()
          setDepensesGrowthPercent(typeof summary.depensesGrowthPercent === 'number' ? summary.depensesGrowthPercent : null)
          setGrowthPercent(typeof summary.growthPercent === 'number' ? summary.growthPercent : null)
          setTaxesDue(typeof summary.taxesDue === 'number' ? summary.taxesDue : null)
        })
      .catch((e) => {
        if (!mounted) return
        const info = showErrorToast(e)
        setEntreprisesCount(null)
        setRevenusTotal(null)
      })

      // also fetch alerts to compute urgent total
      const fetchUrgentTotal = async () => {
        try {
          // include period and entrepriseId to respect current filters
          const alertsUrl = `${API_URL}/api/alerts?${params.toString()}`
          const r = await authFetch(alertsUrl)
          if (!r.ok) throw new Error('alerts fetch failed')
          const data = await r.json()
          if (!mounted) return
          // sum amounts for alerts considered 'urgent'
          console.debug('[Dashboard] alerts list count:', (data || []).length, (data || []).slice ? (data || []).slice(0,5) : data)
          const total = (data || []).reduce((sum: number, a: any) => {
            // Ignore resolved alerts: when an alert is resolved it should no longer
            // contribute to the 'Urgent' KPI.
            if (String(a.status || '').toLowerCase() === 'resolved') return sum

            const niveau = String(a.niveau || a.level || '').toLowerCase()
            const isUrgent = niveau === 'urgent' || niveau === 'high' || a.priority === 'high'
            if (!isUrgent) return sum
            // use absolute amount: backend may store debits as negative values
            const amt = Math.abs(parseAmount((a.mouvement && (a.mouvement.amount ?? a.amount)) ?? (a.amount ?? 0)))
            return sum + amt
          }, 0)
          setUrgentAlertsTotal(total)
            console.debug('[Dashboard] computed urgentAlertsTotal:', total)
        } catch (err) {
          // ignore silently
          console.debug('failed to fetch alerts for urgent total', err)
        }
      }

      fetchUrgentTotal()

      // subscribe to alert events so we can update urgent total live
      const alertCh = createAlertChannel()
      const offAlert = alertCh.on((ev: any) => {
        // when alerts are created/resolved/deleted/updated, refetch the urgent total
        if (ev && (
          ev.type === 'alert.resolved' || 
          ev.type === 'alert.deleted' || 
          ev.type === 'alert.created' ||
          ev.type === 'alert.updated' // handle level changes (warning -> urgent)
        )) {
          fetchUrgentTotal()
        }
      })

      // also subscribe to mouvement events: when movements change (created/updated/deleted)
      // related alerts' amounts may change, so refresh the urgent total as well.
      const mvtCh = createChannel()
      const offMvt = mvtCh.on((ev: any) => {
        if (ev && (ev.type === 'movement.created' || ev.type === 'movement.updated' || ev.type === 'movement.deleted')) {
          fetchUrgentTotal()
        }
      })

    return () => { mounted = false; try { offAlert && offAlert(); offMvt && offMvt() } catch {} }
  }, [period, role, selectedEnterprise, (user as any)?.entrepriseId, (user as any)?.entreprise?.id])

  return (
    <div className="min-h-screen flex bg-background">
  <Navigation />
  <main className="flex-1 pt-16 lg:pt-0 pl-0 lg:pl-[calc(16rem+0.75rem)] p-3 sm:p-4 lg:p-6">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 lg:mb-8">
            <div className="space-y-1 mt-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-balance tracking-tight">Tableau de Bord</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Vue d'ensemble de votre écosystème financier</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
              {/* Contrôles de filtrage */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Filtre Entreprise */}
                {role === 'ADMIN_FISCAL' && (
                  <div className="w-full sm:w-auto">
                    <Select value={selectedEnterprise} onValueChange={setSelectedEnterprise}>
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <Building2 className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Toutes les entreprises" />
                      </SelectTrigger>
                      <SelectContent align="start">
                        <div className="px-2 pb-2">
                          <Input 
                            placeholder="Rechercher entreprise..." 
                            value={enterpriseQuery} 
                            onChange={(e) => setEnterpriseQuery(e.target.value)}
                            className="h-8"
                          />
                        </div>
                        <SelectItem value="all">Toutes les entreprises</SelectItem>
                        {enterprises
                          .filter((e) => e.name.toLowerCase().includes(enterpriseQuery.toLowerCase()))
                          .map((e) => (
                            <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Sélecteur de période */}
                <div className="w-full sm:w-auto">
                  <Select value={period} onValueChange={(v) => setPeriod(String(v))}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Choisir une période" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Cette semaine</SelectItem>
                      <SelectItem value="month">Ce mois</SelectItem>
                      <SelectItem value="quarter">Ce trimestre</SelectItem>
                      <SelectItem value="year">Cette année</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Contrôles système */}
              <div className="flex items-center gap-3 ml-auto">
                <NotificationBell />
                <ThemeToggle />
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
            <Card className="glass border-primary/20 hover:border-primary/40 transition-all duration-300">
              <CardHeader className="pb-2 sm:pb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Building2 className="h-4 sm:h-5 w-4 sm:w-5 text-primary" />
                  {/* @ts-ignore */}
                  <Badge variant="secondary" className="text-[10px] sm:text-xs px-2 py-0 sm:px-2 sm:py-0">
                    Actif
                  </Badge>
                </div>
                <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold">{entreprisesCount ?? '—'}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Entreprises Actives</CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                    <div className={`flex items-center gap-1 text-sm ${growthPercent != null ? (growthPercent >= 0 ? 'text-emerald-500' : 'text-destructive') : 'text-emerald-500'}`}>
                      <TrendingUp className="h-3 w-3" />
                      {growthPercent != null ? `${growthPercent >= 0 ? '+' : ''}${growthPercent.toFixed(1)}%` : '+12.5%'}
                    </div>
                </div>
                <CardTitle className="text-2xl font-bold">{revenusTotal != null ? fmtCompact.format(revenusTotal) : '—'}</CardTitle>
                <CardDescription>Revenus Totaux (MGA)</CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass border-destructive/20 hover:border-destructive/40 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <ArrowDownRight className="h-5 w-5 text-destructive" />
                  <div className="flex items-center gap-1 text-accent text-sm">
                    <TrendingDown className="h-3 w-3" />
                    {depensesGrowthPercent != null ? `${depensesGrowthPercent.toFixed(1)}%` : '-0%'}
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold">{depensesTotal != null ? fmtCompact.format(depensesTotal) : '—'}</CardTitle>
                <CardDescription>Dépenses Totales (MGA)</CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass border-primary/20 hover:border-primary/40 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <div className="flex items-center gap-1 text-accent text-sm">
                    <TrendingUp className="h-3 w-3" />
                    {soldeNet != null && revenusTotal != null && revenusTotal !== 0 ? `${((soldeNet/revenusTotal)*100).toFixed(1)}%` : '+0%'}
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold">{soldeNet != null ? fmtCompact.format(soldeNet) : '—'}</CardTitle>
                <CardDescription>Solde Net (MGA)</CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass border-orange-500/20 hover:border-orange-500/40 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  {/* @ts-ignore */}
                  <Badge variant="destructive" className="text-xs">Urgent</Badge>
                </div>
                <CardTitle className="text-2xl font-bold">{urgentAlertsTotal != null ? fmtCompact.format(urgentAlertsTotal) : '—'}</CardTitle>
                <CardDescription>Total des montants (Urgent) - MGA</CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <DashboardCharts period={period} selectedEnterprise={selectedEnterprise} />
          </div>

          {/* Recent Activity & Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <div className="card-equal-height w-full">
              <RecentMovements period={period} selectedEnterprise={selectedEnterprise} />
            </div>
            <div className="card-equal-height w-full">
              <TaxAlerts period={period} selectedEnterprise={selectedEnterprise} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
