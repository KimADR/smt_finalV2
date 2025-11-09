"use client"

import { useState, useEffect } from "react"
import { authFetch } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, CalendarDays, Building2, CreditCard, Percent, TrendingUp, TrendingDown, FileText } from "lucide-react"

interface ReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  enterprise?: any
  calculation?: any
  revenue?: string
  expenses?: string
  previousPayments?: string
}

const months = [
  'Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'
]

export default function ReportModal({ open, onOpenChange, enterprise, calculation, revenue, expenses, previousPayments }: ReportModalProps) {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [month, setMonth] = useState(months[new Date().getMonth()])
  const [generated, setGenerated] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // movement data
  const [movements, setMovements] = useState<any[]>([])
  const [recettes, setRecettes] = useState<any[]>([])
  const [depenses, setDepenses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // total from movements (for selected period)
  // backend may store DEBIT amounts as negative numbers; use absolute values
  const totalRecettes = recettes.reduce((s, r) => s + Math.abs(Number(r.amount || 0)), 0)
  const totalDepenses = depenses.reduce((s, d) => s + Math.abs(Number(d.amount || 0)), 0)
  const soldeNet = totalRecettes - totalDepenses

  // Base de calcul should be chiffre d'affaires annuel (CA)
  const baseCA = Number(enterprise?.annualRevenue ?? revenue ?? 0)

  useEffect(() => {
    if (!generated) return
    // fetch mouvements and filter by enterprise and period
    setLoading(true)
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'
    authFetch(`${API_URL}/api/mouvements` as any)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: any[]) => {
        const monthIndex = months.indexOf(month)
        const filtered = (list || []).filter((m) => {
          // match enterprise by id or nif or name
          const entId = enterprise?.id ?? null
          const entNif = enterprise?.nif ?? null
          const matchesEnt = entId
            ? String(m.entrepriseId ?? m.enterpriseId ?? '') === String(entId)
            : entNif
            ? (m.entreprise?.siret === entNif || m.enterpriseNif === entNif)
            : true

          if (!matchesEnt) return false

          // filter by month/year using createdAt or date_mouvement
          const d = m.createdAt ? new Date(m.createdAt) : (m.date_mouvement ? new Date(m.date_mouvement) : null)
          if (!d) return false
          return d.getFullYear() === Number(year) && d.getMonth() === monthIndex
        })

        const mapped = filtered.map((m) => ({
          id: m.id,
          date: m.createdAt ? new Date(m.createdAt).toLocaleDateString('fr-FR') : (m.date_mouvement ? new Date(m.date_mouvement).toLocaleDateString('fr-FR') : ''),
          type: m.type === 'CREDIT' || m.type_mouvement === 'RECETTE' || (m.amount || m.montant) > 0 ? 'RECETTE' : 'DEPENSE',
          amount: Number(m.amount ?? m.montant ?? 0),
          description: m.description ?? m.label ?? '',
        }))

        setMovements(mapped)
        setRecettes(mapped.filter((x) => x.type === 'RECETTE'))
        setDepenses(mapped.filter((x) => x.type === 'DEPENSE'))
      })
      .catch(() => {
        setMovements([])
        setRecettes([])
        setDepenses([])
      })
      .finally(() => setLoading(false))
  }, [generated, enterprise, month, year, refreshKey])

  const downloadReport = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'
      const monthIndex = months.indexOf(month)
      const from = new Date(Number(year), monthIndex, 1)
      const to = new Date(Number(year), monthIndex + 1, 0)
      const params = new URLSearchParams()
      params.set('from', from.toISOString().slice(0, 10))
      params.set('to', to.toISOString().slice(0, 10))
      if (enterprise?.id) params.set('entrepriseId', String(enterprise.id))

      const resp = await authFetch(`${API_URL}/api/reports/pdf?${params.toString()}` as any)
      if (!resp.ok) throw new Error('Export PDF échoué')
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(enterprise?.name || 'enterprise').replace(/\s+/g, '_')}-rapport-${year}-${month}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      // Fallback: download JSON if PDF endpoint not available
      const report = {
        enterprise: enterprise || null,
        period: { year, month },
        calculation: calculation || null,
        totals: { recettes: totalRecettes, depenses: totalDepenses, soldeNet },
        movements,
        generatedAt: new Date().toISOString(),
      }
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(enterprise?.name || 'enterprise').replace(/\s+/g, '_')}-rapport-${year}-${month}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }
  }

  const reset = () => {
    setGenerated(false)
    setMovements([])
    setRecettes([])
    setDepenses([])
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset() }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-background text-foreground rounded-2xl p-6 shadow-2xl border border-border">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-indigo-600/90 flex items-center justify-center shadow">
              <CalendarDays className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Rapport SMT</DialogTitle>
              <DialogDescription className="text-sm text-slate-300">{enterprise?.name || 'Entreprise'}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!generated ? (
          <div className="space-y-6">
            <Card className="bg-card/60 border border-border">
              <CardHeader className="pb-0">
                <CardTitle className="text-lg">Sélection de la période</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">Choisissez l'année et le mois pour générer le rapport SMT.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
                  <div className="w-full md:w-56">
                    <label className="text-xs uppercase tracking-wide text-muted-foreground block mb-1">Année</label>
                    <select className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40" value={year} onChange={(e) => setYear(e.target.value)}>
                      {Array.from({ length: 6 }).map((_, i) => {
                        const y = new Date().getFullYear() - i
                        return <option key={y} value={String(y)}>{y}</option>
                      })}
                    </select>
                  </div>
                  <div className="w-full md:w-64">
                    <label className="text-xs uppercase tracking-wide text-muted-foreground block mb-1">Mois</label>
                    <select className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40" value={month} onChange={(e) => setMonth(e.target.value)}>
                      {months.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  <div className="flex-1" />

                  <div className="flex items-end gap-2">
                    <Button variant="outline" className="border-border" onClick={() => { onOpenChange(false); reset() }}>Fermer</Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-500" onClick={() => setGenerated(true)}>
                      <CalendarDays className="h-4 w-4 mr-2" />
                      Générer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="p-4 bg-card/60 rounded-lg border border-border text-sm text-muted-foreground">
              <span className="font-semibold">Note:</span> Ce rapport SMT est conforme à la réglementation malgache pour les petites entreprises (CA &lt; 200M MGA). Il remplace le registre côté et paraphé traditionnel et peut être présenté aux autorités fiscales.
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Period selection inside generated view */}
            <Card className="bg-card/60 border border-border">
              <CardHeader className="pb-0">
                <CardTitle className="text-lg">Sélection de la période</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">Choisissez l'année et le mois pour générer le rapport SMT.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
                  <div className="w-full md:w-56">
                    <label className="text-xs uppercase tracking-wide text-muted-foreground block mb-1">Année</label>
                    <select className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40" value={year} onChange={(e) => setYear(e.target.value)}>
                      {Array.from({ length: 6 }).map((_, i) => {
                        const y = new Date().getFullYear() - i
                        return <option key={y} value={String(y)}>{y}</option>
                      })}
                    </select>
                  </div>
                  <div className="w-full md:w-64">
                    <label className="text-xs uppercase tracking-wide text-muted-foreground block mb-1">Mois</label>
                    <select className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40" value={month} onChange={(e) => setMonth(e.target.value)}>
                      {months.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  <div className="flex-1" />

                  <div className="flex items-end gap-2">
                    <Button variant="outline" className="border-border" onClick={() => setGenerated(false)}>Retour</Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-500" onClick={() => setRefreshKey((k) => k + 1)}>
                      <CalendarDays className="h-4 w-4 mr-2" />
                      Générer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top summary block */}
            <div className="rounded-2xl border border-border bg-sky-500/5 p-6">
              <div className="text-center">
                <h3 className="text-2xl font-extrabold tracking-tight">RAPPORT SMT</h3>
                <div className="text-sm text-muted-foreground">Système Minimal de Trésorerie</div>
                <div className="text-sm text-muted-foreground mt-1">Période: {month} {year}</div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 justify-start sm:justify-center">
                  <div className="h-9 w-9 rounded-xl bg-sky-600/15 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-sky-400" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Entreprise</div>
                    <div className="font-semibold">{enterprise?.name || '-'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 justify-start sm:justify-center">
                  <div className="h-9 w-9 rounded-xl bg-sky-600/15 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-sky-400" />
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="text-xs text-muted-foreground">NIF</div>
                    <div className="font-semibold tabular-nums">{enterprise?.nif || enterprise?.NIF || '-'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 justify-start sm:justify-center">
                  <div className="h-9 w-9 rounded-xl bg-sky-600/15 flex items-center justify-center">
                    <Percent className="h-5 w-5 text-sky-400" />
                  </div>
                  <div className="text-right sm:text-left">
                    <div className="text-xs text-muted-foreground">Type d'impôt</div>
                    <div className="font-semibold">{enterprise?.taxType || 'IS'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* KPI cards restored in generated view */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-5 rounded-2xl border border-green-700/20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground">Recettes</div>
                    <div className="text-2xl font-extrabold text-emerald-400">{totalRecettes.toLocaleString()} Ar</div>
                    <div className="text-xs text-slate-400">{recettes.length} mouvement(s)</div>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-rose-700/20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                    <TrendingDown className="h-5 w-5 text-rose-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground">Dépenses</div>
                    <div className="text-2xl font-extrabold text-rose-400">{totalDepenses.toLocaleString()} Ar</div>
                    <div className="text-xs text-slate-400">{depenses.length} mouvement(s)</div>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-sky-700/20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-sky-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground">Solde Net</div>
                    <div className="text-2xl font-extrabold text-sky-400">{soldeNet.toLocaleString()} Ar</div>
                    <div className="text-xs text-slate-400">Bénéfice</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Calcul Fiscal card: left = details, right = amounts */}
            <div className="p-6 rounded-2xl border border-border bg-rose-500/5">
              <h4 className="font-semibold text-slate-100 mb-4">Calcul Fiscal</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 text-sm text-muted-foreground">
                {/* Row 1 */}
                <div className="py-2">
                  <div className="text-muted-foreground">Détails du calcul</div>
                  <div className="mt-3 flex items-center justify-between"><span>Type d'impôt:</span><span className="font-semibold">{enterprise?.taxType || 'IS'}</span></div>
                </div>
                <div className="py-2 md:text-right">
                  <div className="text-muted-foreground">Montants</div>
                  <div className="mt-3 flex items-center justify-between md:justify-end"><span className="md:hidden">Impôt calculé:</span><span className="font-semibold tabular-nums md:ml-4">{Math.round(calculation?.taxAmount||0).toLocaleString()} Ar</span></div>
                </div>
                {/* Row 2 */}
                <div className="py-2">
                  <div className="flex items-center justify-between"><span>Base de calcul (Chiffre d'affaires annuel):</span><span className="font-semibold">{baseCA.toLocaleString()} Ar</span></div>
                </div>
                <div className="py-2 md:text-right">
                  <div className="flex items-center justify-between md:justify-end"><span className="md:hidden">Minimum perception:</span><span className="font-semibold tabular-nums md:ml-4">{(calculation?.minimumPerception || 200000).toLocaleString()} Ar</span></div>
                </div>
                {/* Row 3 */}
                <div className="py-2">
                  <div className="flex items-center justify-between"><span>Taux d'imposition:</span><span className="font-semibold">{calculation?.taxRate ?? 0}%</span></div>
                </div>
                <div className="py-2 md:text-right border-t border-slate-700/60 md:border-0 md:pt-2">
                  <div className="flex items-center justify-between md:justify-end"><span className="font-semibold md:hidden">Montant dû:</span><span className="text-base font-bold text-indigo-400 tabular-nums md:ml-4">{Math.round(calculation?.taxAmount||0).toLocaleString()} Ar</span></div>
                </div>
              </div>
            </div>

            {/* Details columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-card/60 rounded-2xl border border-border">
                <h4 className="font-semibold text-slate-100 mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-400"/> Détail des recettes</h4>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {recettes.length === 0 && <div className="text-sm text-muted-foreground">Aucune recette pour la période sélectionnée.</div>}
                  {recettes.map((r, i) => (
                    <div key={r.id || i} className="p-3 bg-emerald-500/10 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-100">{r.description || `Recette ${i+1}`}</div>
                        <div className="text-xs text-muted-foreground">{r.date}</div>
                      </div>
                      <div className="font-semibold text-emerald-400">{Number(r.amount || 0).toLocaleString()} Ar</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-card/60 rounded-2xl border border-border">
                <h4 className="font-semibold text-slate-100 mb-4 flex items-center gap-2"><TrendingDown className="h-4 w-4 text-rose-400"/> Détail des dépenses</h4>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {depenses.length === 0 && <div className="text-sm text-muted-foreground">Aucune dépense pour la période sélectionnée.</div>}
                  {depenses.map((d, i) => (
                    <div key={d.id || i} className="p-3 bg-rose-500/10 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-100">{d.description || `Dépense ${i+1}`}</div>
                        <div className="text-xs text-muted-foreground">{d.date}</div>
                      </div>
                      <div className="font-semibold text-rose-400">{Number(d.amount || 0).toLocaleString()} Ar</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-6">
              <Button variant="ghost" className="hover:bg-card/60" onClick={() => setGenerated(false)}>Retour</Button>
              <Button className="ml-3 bg-emerald-600 hover:bg-emerald-500 rounded-full px-6" onClick={downloadReport}>
                <Download className="h-4 w-4 mr-2"/>Télécharger le rapport
              </Button>
            </div>

            <div className="p-4 bg-card/60 rounded-lg border border-border text-sm text-muted-foreground">Note: Ce rapport SMT est conforme à la réglementation malgache pour les petites entreprises (CA &lt; 200M MGA). Il remplace le registre côté et paraphé traditionnel et peut être présenté aux autorités fiscales.</div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  )
}
