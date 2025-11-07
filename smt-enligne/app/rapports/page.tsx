"use client"

import React, { useState, useEffect } from "react"
import { authFetch } from "@/lib/utils"
import { useAuth } from '@/components/auth-context'
import { toast, showErrorToast } from "@/hooks/use-toast"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { List, ArrowUpRight, ArrowDownRight, Calendar, Printer, RefreshCw, FileText, Banknote, Search } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import NotificationBell from '@/components/notification-bell'

// ...existing imports

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

type MovementType = 'RECETTE' | 'DEPENSE' | 'TAXPAIMENT' | string
type ReportRow = {
  id: number
  entreprise: string
  date: string
  // ISO date (for reliable comparisons)
  dateISO?: string
  formattedDate?: string
  formattedTime?: string
  // amount is signed: positive for RECETTE, negative for DEPENSE and TAXPAIMENT
  amount: number
  // absolute amount for easy display
  amountAbs?: number
  description?: string
  entrepriseNif?: string
  isTaxPayment?: boolean
  type?: MovementType
}

export default function RapportsPage() {
  const { user, role } = useAuth()
  // normalize different API shapes into our ReportRow shape
  function normalizeRow(raw: any): ReportRow {
    const entreprise = raw.entreprise?.name || raw.entreprise || raw.entrepriseName || raw.nom || raw.company || ''
    const entrepriseNif = raw.entrepriseNif || raw.entreprise?.siret || raw.siret || raw.nif || null
    // Detect tax payment from several possible API shapes: explicit flag or type literal
    const rawType = String(raw.type || raw.type_mouvement || raw.type_mouvement_type || raw.action || '').toUpperCase()
    const explicitTaxFlag = !!(
      raw.isTaxPayment || raw.estPaiementImpot || raw.est_paiement_impot || raw.is_tax_payment || raw.isTax || raw.paiement_impot
    )
    // also detect by keywords in type or description/label
    const desc = String(raw.description || raw.label || raw.libelle || raw.name || '').toLowerCase()
    const typeStr = String(rawType || '').toLowerCase()
    const taxKeyword = /impot|impôts|impot(s)?|taxe|tax(es)?|tax|paiement[_ ]?impot|paiement[_ ]?tax/i
    const isTaxByKeyword = taxKeyword.test(typeStr) || taxKeyword.test(desc)
    const isTaxPayment = explicitTaxFlag || isTaxByKeyword || /TAXPAIMENT|TAX_PAYMENT|TAX/.test(rawType) || rawType.includes('IMPOT')

    const rawAmount = Number(raw.amount ?? raw.montant ?? 0)
    // Determine movement kind: prefer explicit flags/types, fallback to amount sign
    let kind: MovementType = 'RECETTE'
    if (isTaxPayment) kind = 'TAXPAIMENT'
  else if (/CREDIT/.test(rawType) || /RECETTE/.test(rawType) || rawType.includes('CREDIT')) kind = 'RECETTE'
  else if (/DEBIT/.test(rawType) || /DEPENSE/.test(rawType) || rawType.includes('DEBIT')) kind = 'DEPENSE'
  else if (isTaxByKeyword) kind = 'TAXPAIMENT'
    else {
      // fallback based on amount sign
      kind = rawAmount < 0 ? 'DEPENSE' : 'RECETTE'
    }

    // amount is signed: recettes positive, depenses and taxes negative
    const signedAmount = kind === 'RECETTE' ? Math.abs(rawAmount) : -Math.abs(rawAmount)
    const dateRaw = raw.date || raw.createdAt || raw.created_at || raw.created || raw.timestamp || ''
    let parsedDate = null
    if (dateRaw) {
      const d = new Date(dateRaw)
      if (!isNaN(d.getTime())) parsedDate = d
    }
    // fallback: if createdAt not provided, try other fields
    if (!parsedDate && raw.createdAt) {
      const d = new Date(raw.createdAt)
      if (!isNaN(d.getTime())) parsedDate = d
    }
    const date = parsedDate ? parsedDate.toLocaleString('fr-FR') : (dateRaw || '')
    const dateISO = parsedDate ? parsedDate.toISOString() : undefined
    const formattedDate = parsedDate ? parsedDate.toLocaleDateString('fr-FR') : (dateRaw ? String(dateRaw) : '')
    const formattedTime = parsedDate ? parsedDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''
    const description = raw.description || raw.label || ''
    return {
      id: Number(raw.id ?? raw._id ?? 0),
      entreprise,
      entrepriseNif,
      isTaxPayment: isTaxPayment,
      type: kind,
      amount: signedAmount,
      amountAbs: Math.abs(signedAmount),
      date,
      dateISO,
      formattedDate,
      formattedTime,
      description,
    }
  }
  const [from, setFrom] = useState<string | undefined>()
  const [to, setTo] = useState<string | undefined>()
  const [rows, setRows] = useState<ReportRow[]>([])
  const [originalRows, setOriginalRows] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState<string>("")
  const [currentPage, setCurrentPage] = useState<number>(1)
  const PAGE_SIZE = 10

  useEffect(() => {
    let mounted = true
    setLoading(true)
    const params = new URLSearchParams()
    const userEntId = (user as any)?.entrepriseId ?? (user as any)?.entreprise?.id
    if (role === 'ENTREPRISE' && userEntId) params.set('entrepriseId', String(userEntId))
    const url = params.toString() ? `${API_URL}/api/reports?${params.toString()}` : `${API_URL}/api/reports`
    authFetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text())
        return r.json()
      })
      .then(async (data: any) => {
        if (!mounted) return
        // API returns { rows: [...] } or an array — normalize
        const normalized = Array.isArray(data) ? data : Array.isArray(data.rows) ? data.rows : []
        let mapped = (normalized || []).map((r: any) => normalizeRow(r))
        // If reports endpoint seems to only return recettes / is incomplete (no taxes present)
        // attempt to fetch mouvements which reliably contains all movement types
  const hasTax = mapped.some((m: ReportRow) => m.type === 'TAXPAIMENT' || m.isTaxPayment)
  const hasExpense = mapped.some((m: ReportRow) => m.type === 'DEPENSE')
        if (!hasTax && (mapped.length === 0 || !hasExpense)) {
          try {
            const mv = await authFetch(`${API_URL}/api/mouvements`)
            if (mv.ok) {
              const mvJson = await mv.json()
              const normalizedMv = Array.isArray(mvJson) ? mvJson : Array.isArray(mvJson.rows) ? mvJson.rows : []
              const mappedMv = (normalizedMv || []).map((r: any) => normalizeRow(r))
              mapped = mappedMv
            }
          } catch (e) {
            // ignore fallback errors, we'll use mapped as-is
          }
        }
        setRows(mapped)
        setOriginalRows(mapped)
      })
      .catch((err) => {
        const info = showErrorToast(err)
        if (mounted) {
          setError(info?.message ?? String(err))
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  function fetchReport() {
    if (from && to && from > to) {
      alert('La date de début doit être antérieure ou égale à la date de fin.')
      return
    }
    setLoading(true)
    const sp = new URLSearchParams({ ...(from?{from}:{}) as any, ...(to?{to}:{}) as any })
    const userEntId = (user as any)?.entrepriseId ?? (user as any)?.entreprise?.id
    if (role === 'ENTREPRISE' && userEntId) sp.set('entrepriseId', String(userEntId))
    authFetch(`${API_URL}/api/reports${sp.toString() ? `?${sp.toString()}` : ''}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text())
        return r.json()
      })
      .then((data: any) => {
        const normalized = Array.isArray(data) ? data : Array.isArray(data.rows) ? data.rows : []
        const mapped = (normalized || []).map((r: any) => normalizeRow(r))
        setRows(mapped)
      })
      .catch((err) => {
        const info = showErrorToast(err)
        setError(info?.message ?? String(err))
      })
      .finally(() => setLoading(false))
  }

  const [exporting, setExporting] = useState(false)

  // Reset filters and reload full list
  function resetFilters() {
    setFrom(undefined)
    setTo(undefined)
    setLoading(true)
    const rp = new URLSearchParams()
    const userEntId2 = (user as any)?.entrepriseId ?? (user as any)?.entreprise?.id
    if (role === 'ENTREPRISE' && userEntId2) rp.set('entrepriseId', String(userEntId2))
    authFetch(`${API_URL}/api/reports${rp.toString() ? `?${rp.toString()}` : ''}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text())
        return r.json()
      })
      .then((data: any) => {
        const normalized = Array.isArray(data) ? data : Array.isArray(data.rows) ? data.rows : []
        const mapped = (normalized || []).map((r: any) => normalizeRow(r))
        setRows(mapped)
        setOriginalRows(mapped)
      })
      .catch((err) => {
        const info = showErrorToast(err)
        setError(info?.message ?? String(err))
      })
      .finally(() => setLoading(false))
  }

  function exportPDF() {
    setExporting(true)
    const params = new URLSearchParams({ ...(from?{from}:{}) as any, ...(to?{to}:{}) as any })
    const userEntId3 = (user as any)?.entrepriseId ?? (user as any)?.entreprise?.id
    if (role === 'ENTREPRISE' && userEntId3) params.set('entrepriseId', String(userEntId3))
    authFetch(`${API_URL}/api/reports/pdf?${params.toString()}`)
      .then(async (r) => {
        const ct = r.headers.get('content-type') || ''
        if (!r.ok) {
          // try parse json error
          if (ct.includes('application/json')) {
            const j = await r.json()
            throw new Error(j?.error || JSON.stringify(j))
          }
          throw new Error(await r.text())
        }
        if (ct.includes('application/json')) {
          const j = await r.json()
          throw new Error(j?.error || JSON.stringify(j))
        }
        return r.blob()
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `report-${new Date().toISOString().slice(0,10)}.pdf`
        a.click()
        URL.revokeObjectURL(url)
  import('@/hooks/use-toast').then((m) => { try { m.showOperationSuccessToast('create', 'l\'export PDF') } catch (e) { toast({ title: 'Export -PDF', description: 'Exportaion PDF reussi avec succes', variant: 'success' }) } }).catch(() => { toast({ title: 'Export -PDF', description: 'Exportaion PDF reussi avec succes', variant: 'success' }) })
      })
      .catch((err) => {
        showErrorToast(err)
      })
      .finally(() => setTimeout(() => setExporting(false), 400))
  }

  function exportPrint() {
    // Open print dialog — styles should handle print layout
    window.print()
  import('@/hooks/use-toast').then((m) => { try { m.showOperationSuccessToast('create', 'l\'impression') } catch (e) { toast({ title: 'Impression', description: 'Ouverture de la boîte de dialogue impression.', variant: 'success' }) } }).catch(() => { toast({ title: 'Impression', description: 'Ouverture de la boîte de dialogue impression.', variant: 'success' }) })
  }

  // Apply search filter
  const filteredRows = rows.filter((r) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      (r.description || '').toLowerCase().includes(q) ||
      (r.entreprise || '').toLowerCase().includes(q) ||
      String(r.id).includes(q)
    )
  })

  // Separate counts for recettes, depenses (non-tax) and paiements d'impot (based on filtered rows)
  const stats = {
    total: filteredRows.length,
    recettes: filteredRows.filter(r => (r.type === 'RECETTE')).length,
    depenses: filteredRows.filter(r => (r.type === 'DEPENSE')).length,
    taxes: filteredRows.filter(r => (r.type === 'TAXPAIMENT' || r.isTaxPayment)).length,
    totalTaxesAmount: filteredRows.filter(r => (r.type === 'TAXPAIMENT' || r.isTaxPayment)).reduce((s, r) => s + Number(r.amountAbs || Math.abs(r.amount || 0)), 0),
  }

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const pagedRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // reset page when query or filters change
  React.useEffect(() => { setCurrentPage(1) }, [query, from, to])

  return (
    <div className="min-h-screen flex bg-background">
      <Navigation />
      <main className="flex-1 pt-14 lg:pt-0 pl-0 lg:pl-[calc(16rem+0.75rem)] p-4 lg:p-6">
        <div className="max-w-7xl mx-auto space-y-8 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Rapports</h1>
              <p className="text-muted-foreground">Génération et consultation des rapports</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={exportPrint} className="flex items-center gap-2">
                  <Printer className="h-4 w-4" /> Imprimer
                </Button>

                <Button onClick={exportPDF} className="ml-2 flex items-center gap-2" disabled={exporting}>
                    {exporting ? <RefreshCw className="animate-spin h-4 w-4" /> : <Printer className="h-4 w-4" />} Export PDF
                </Button>
              </div>

              <div className="hidden md:flex items-center gap-3 h-10">
                <NotificationBell />
                <ThemeToggle />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="glass border-primary/20 hover:border-primary/40 transition-all duration-300"><CardHeader className="pb-3"><div className="flex items-center justify-between"><List className="h-5 w-5 text-primary" /><Badge variant="secondary">Total</Badge></div><CardTitle className="text-2xl font-bold">{loading ? '…' : stats.total}</CardTitle><CardDescription>Lignes</CardDescription></CardHeader></Card>
            <Card className="glass border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300"><CardHeader className="pb-3"><div className="flex items-center justify-between"><ArrowUpRight className="h-5 w-5 text-emerald-500" /><Badge variant="secondary">Recettes</Badge></div><CardTitle className="text-2xl font-bold">{loading ? '…' : stats.recettes}</CardTitle><CardDescription>Recettes</CardDescription></CardHeader></Card>
            <Card className="glass border-destructive/20 hover:border-destructive/40 transition-all duration-300"><CardHeader className="pb-3"><div className="flex items-center justify-between"><ArrowDownRight className="h-5 w-5 text-destructive" /><Badge variant="secondary">Dépenses</Badge></div><CardTitle className="text-2xl font-bold">{loading ? '…' : stats.depenses}</CardTitle><CardDescription>Dépenses</CardDescription></CardHeader></Card>
            <Card className="glass border-warning/20 hover:border-warning/40 transition-all duration-300"><CardHeader className="pb-3"><div className="flex items-center justify-between"><Banknote className="h-5 w-5 text-warning" /><Badge variant="secondary">Paiements d'impôt</Badge></div><CardTitle className="text-2xl font-bold">{loading ? '…' : stats.taxes}</CardTitle><CardDescription>Total: {loading ? '…' : Number(stats.totalTaxesAmount || 0).toLocaleString('fr-FR')} MGA</CardDescription></CardHeader></Card>
            <div />
          </div>

          <Card className="glass">
            <CardHeader><CardTitle>Filtres</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Rechercher par description, entreprise, ou id..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div className="flex gap-3">
                      <div className="flex flex-col">
                        <label className="text-sm text-muted-foreground">Date de</label>
                        <input type="date" value={from||''} onChange={(e)=>setFrom(e.target.value)} className="input input-bordered w-[150px]"/>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm text-muted-foreground">Date à</label>
                        <input type="date" value={to||''} onChange={(e)=>setTo(e.target.value)} className="input input-bordered w-[150px]"/>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button onClick={()=>{ const d = new Date(); const start = new Date(d.getFullYear(), d.getMonth(), 1); setFrom(start.toISOString().slice(0,10)); setTo(new Date().toISOString().slice(0,10)); fetchReport();}}>Ce mois</Button>
                    <Button className="btn btn-primary" onClick={fetchReport}>
                      Filtrer
                    </Button>
                    <Button onClick={resetFilters} variant="outline" className="ml-2">
                      Réinitialiser
                    </Button>
                  </div>
                </div>
              </div>
              {from && to && from > to && <div className="mt-2 text-red-500">La date de début doit être antérieure ou égale à la date de fin.</div>}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <Card className="glass w-full">
                <CardHeader><CardTitle>Rapport</CardTitle><CardDescription>Résultats</CardDescription></CardHeader>
                <CardContent>
                      <div className="space-y-3">
                        {loading ? (
                          <div>Chargement du rapport...</div>
                        ) : error ? null
                        : filteredRows.length === 0 ? (
                          <div className="text-muted-foreground">Aucun résultat pour la période choisie.</div>
                        ) : (
                          pagedRows.map((r) => {
                            function getEntName(raw: any) {
                              if (!raw) return ''
                              if (typeof raw === 'string') return raw
                              if (typeof raw === 'object') return raw.name || raw.nom || String(raw.id ?? '') || ''
                              return String(raw)
                            }
                            const isTax = !!(r.type === 'TAXPAIMENT' || r.isTaxPayment)
                            const amountClass = isTax ? 'text-purple-500 font-extrabold' : (r.type === 'RECETTE' ? 'text-emerald-500 font-extrabold' : 'text-destructive font-extrabold')
                            const label = isTax ? "Paiement d'impôt" : (r.type === 'RECETTE' ? 'Recette' : 'Dépense')
                            return (
                              <div key={r.id} className="group relative p-4 bg-card/60 rounded-xl border border-border flex items-center justify-between gap-4 w-full hover:-translate-y-0.5 hover:shadow-md transition-all">
                                <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${isTax ? 'bg-purple-500/80' : (r.type === 'RECETTE' ? 'bg-emerald-500' : 'bg-destructive')}`} />
                                <div className="flex items-start gap-4 min-w-0">
                                  <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center text-muted-foreground border border-muted/30">
                                    <FileText className="h-5 w-5" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                                      <span className="truncate">{r.date}</span>
                                      <span>•</span>
                                      <span className="font-medium truncate">{getEntName(r.entreprise)}</span>
                                      {r.entrepriseNif && <span className="text-xs text-muted-foreground ml-2">NIF: {r.entrepriseNif}</span>}
                                    </div>
                                    <div className="font-medium truncate mt-1 text-foreground/90">{r.description || '—'}</div>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end ml-4">
                                  <div className={amountClass}>{Number(r.amountAbs ?? Math.abs(r.amount || 0)).toLocaleString('fr-FR')} Ar</div>
                                  <div className="text-[10px] sm:text-xs text-muted-foreground">{label}</div>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                      {/* pagination controls */}
                      {filteredRows.length > PAGE_SIZE && (
                        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-20">Préc</Button>
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            {Array.from({ length: totalPages }).map((_, idx) => {
                              const page = idx + 1
                              // On mobile, show limited page numbers
                              if (totalPages > 7 && ![-1, 0, 1].includes(page - currentPage) && page !== 1 && page !== totalPages) {
                                if (page === 2 || page === totalPages - 1) return <span key={page} className="text-muted-foreground">...</span>
                                return null
                              }
                              return (
                                <Button key={page} size="sm" variant={currentPage === page ? undefined : 'ghost'} onClick={() => setCurrentPage(page)}>{page}</Button>
                              )
                            })}
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-20">Suiv</Button>
                        </div>
                      )}
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
