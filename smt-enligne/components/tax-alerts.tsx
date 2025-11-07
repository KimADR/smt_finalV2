"use client"

import React, { useEffect, useState } from "react"
import Link from 'next/link'
import { authFetch } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Check, Trash2 } from 'lucide-react'
import Swal from 'sweetalert2'
import { useToast } from '@/hooks/use-toast'
import { AlertTriangle, Calendar, Building2, FileText, Clock } from "lucide-react"

type AlertItem = {
  id: number | string
  type: string
  enterprise: string
  dueDate: string
  amount: number
  priority: 'high' | 'medium' | 'low'
  status: string
  niveau?: string
  reason?: string
  monthsSinceCreated?: number | null
  mouvement?: {
    id?: number | string
    type?: string
    description?: string
    amount?: number
    estPaiementImpot?: boolean
    // possible date fields from backend (ISO strings)
    createdAt?: string
    created_at?: string
    date?: string
    dateCreated?: string
    date_creation?: string
  }
}

export function TaxAlerts({ period, selectedEnterprise }: { period: string; selectedEnterprise?: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null as string | null)
  const [alerts, setAlerts] = useState([] as AlertItem[])
  // Use 1-based page like the Mouvements page
  const [currentPage, setCurrentPage] = useState<number>(1)
  const unreadCount = alerts.filter((a) => a.status && a.status !== 'resolved').length
  const PAGE_SIZE = 7
  const totalPages = Math.max(1, Math.ceil(alerts.length / PAGE_SIZE))
  const displayedAlerts = alerts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const { toast } = useToast()

  // compute total amount for urgent alerts (use mouvement.amount when available, otherwise alert.amount)
  const urgentTotal = React.useMemo(() => {
    return alerts.reduce((sum, a) => {
      const n = String(a.niveau || niveauFromMouvementDate(a.mouvement) || '').toLowerCase()
      if (n === 'urgent' || n === 'high') {
        // backend may store DEBIT amounts as negative; sum absolute values for display
        const amt = Math.abs(Number((a.mouvement && (a.mouvement.amount ?? a.amount)) ?? (a.amount ?? 0)) || 0)
        return sum + amt
      }
      return sum
    }, 0)
  }, [alerts])

  // helper: deduplicate alerts by id (keep first occurrence — server returns newest first)
  function dedupeAlerts(arr: AlertItem[]) {
    const seen = new Set<string | number>()
    const out: AlertItem[] = []
    for (const a of arr) {
      if (!seen.has(a.id)) {
        seen.add(a.id)
        out.push(a)
      }
    }
    return out
  }

  // ensure current page is valid when alerts change
  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [alerts.length, totalPages])

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"
    setLoading(true)
    // fetch alerts from the new backend alerts endpoint
    const params = new URLSearchParams({ period })
    if (selectedEnterprise && selectedEnterprise !== 'all') params.set('entrepriseId', String(selectedEnterprise))
    console.log('[TaxAlerts] Fetching alerts with params:', params.toString(), { selectedEnterprise })
    authFetch(`${api}/api/alerts?${params.toString()}` as any)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: AlertItem[]) => {
        console.debug('[TaxAlerts] fetched', data)
        // Do not hide recent alerts here  show whatever the backend returns.
        const filtered = (data || []).filter((a) => !!a)
  const deduped = dedupeAlerts(filtered)
  console.debug('[TaxAlerts] filtered', deduped)
  const sorted = sortAlertsByNiveau(deduped)
  setAlerts(sorted)
  // try to enrich alerts with mouvement dates when missing
  enrichAlertsWithMouvementDates(sorted)
        setCurrentPage(1)
      })
      .catch((err) => {
        console.error('[TaxAlerts] fetch error', err)
        setError(String(err))
      })
      .finally(() => setLoading(false))
  }, [period, selectedEnterprise])

  // simple manual refresh helper
  function refresh() {
    setLoading(true)
    setError(null)
    const api = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"
    const params = new URLSearchParams()
    if (selectedEnterprise && selectedEnterprise !== 'all') params.set('entrepriseId', String(selectedEnterprise))
    authFetch(`${api}/api/alerts${params.toString() ? `?${params.toString()}` : ''}` as any)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: AlertItem[]) => {
        console.debug('[TaxAlerts.refresh] fetched', data)
        // Mirror the same behavior as initial load: show what backend returns
        const filtered = (data || []).filter((a) => !!a)
  const deduped = dedupeAlerts(filtered)
  console.debug('[TaxAlerts.refresh] filtered', deduped)
  const sorted = sortAlertsByNiveau(deduped)
  setAlerts(sorted)
  enrichAlertsWithMouvementDates(sorted)
        setCurrentPage(1)
      })
      .catch((err) => {
        console.error('[TaxAlerts.refresh] fetch error', err)
        setError(String(err))
      })
      .finally(() => setLoading(false))
  }

  function getEnterpriseName(raw: any) {
    if (!raw) return ''
    if (typeof raw === 'string') return raw
    if (typeof raw === 'object') return raw.name || raw.nom || String(raw.id ?? '') || ''
    return String(raw)
  }

  function getEnterpriseNif(raw: any) {
    if (!raw) return ''
    if (typeof raw === 'object') return raw.nif || raw.tin || ''
    return ''
  }

  // Map backend status to a user-friendly French label
  function statusLabel(status?: string | null) {
    if (!status) return ''
    const s = String(status).toLowerCase()
    if (s === 'open') return 'Non résolu'
    if (s === 'resolved') return 'Résolu'
    // Preserve original for any other statuses (keep capitalization)
    return String(status)
  }

  // Map alert 'niveau' to badge label and classes
  function niveauBadgeProps(niveau?: string | null) {
    const n = String(niveau || '').toLowerCase()
    if (n === 'simple' || n === 'niveau simple' || n === 'low') {
      return { label: 'En attente', variant: 'outline', className: 'bg-muted/10 text-muted-foreground' }
    }
    if (n === 'warning' || n === 'medium') {
      // use orange/warning look — project may not have a 'warning' variant so we use classes
      return { label: 'Attention', variant: 'outline', className: 'bg-orange-500/10 text-orange-500' }
    }
    if (n === 'urgent' || n === 'high') {
      // destructive background with white text for readability
      return { label: 'Urgent', variant: 'destructive', className: 'bg-destructive text-white' }
    }
    return null
  }

  // Resolve the effective niveau for an alert, preferring server-provided value,
  // then mouvement date-derived value, then fallbacks from priority/status.
  function resolveAlertNiveau(a: AlertItem): string | null {
    if (!a) return null
    let resolved = a.niveau || niveauFromMouvementDate(a.mouvement)
    if (!resolved) {
      if (a.priority === 'high') resolved = 'urgent'
      else if (a.priority === 'medium') resolved = 'warning'
      else if (a.priority === 'low') resolved = 'simple'
      if (!resolved && a.status) {
        const s = String(a.status).toLowerCase()
        if (s === 'urgent') resolved = 'urgent'
        else if (s === 'attention' || s === 'warning') resolved = 'warning'
      }
    }
    return resolved || null
  }

  // Numeric priority for sorting: lower = higher priority in sort
  function niveauPriority(niveau?: string | null): number {
    const n = String(niveau || '').toLowerCase()
    if (n === 'urgent' || n === 'high') return 0
    if (n === 'warning' || n === 'attention' || n === 'medium') return 1
    if (n === 'simple' || n === 'low') return 2
    return 3
  }

  // Return a new array sorted by niveau (urgent -> warning -> simple), preserving relative order for ties.
  function sortAlertsByNiveau(arr: AlertItem[]) {
    // decorate-sort-undecorate for stable sort by computed priority
    return arr
      .map((a, idx) => ({
        a,
        idx,
        prio: niveauPriority(resolveAlertNiveau(a)),
        resolved: String(a.status || '').toLowerCase() === 'resolved' ? 1 : 0,
      }))
      .sort((x, y) => {
        // primary: unresolved first (resolved grouped together after)
        if (x.resolved !== y.resolved) return x.resolved - y.resolved
        // secondary: niveau priority within each group
        if (x.prio !== y.prio) return x.prio - y.prio
        return x.idx - y.idx
      })
      .map((t) => t.a)
  }

  // Try to extract a Date object from a mouvement using common date field names
  function getMouvementDate(m?: any): Date | null {
    if (!m || typeof m !== 'object') return null
    // include various possible date field names used across backend/db
    const candidates = ['createdAt', 'created_at', 'date', 'dateCreated', 'date_creation', 'date_mouvement', 'dateMouvement', 'date_mvt', 'dateMvt']
    for (const k of candidates) {
      const v = m[k]
      if (!v) continue
      const d = new Date(v)
      if (!isNaN(d.getTime())) return d
    }
    return null
  }

  // When the alert's mouvement has no detectable date, try fetching the mouvement
  // details from the API (by id) to get a date field. This avoids changing backend.
  async function enrichAlertsWithMouvementDates(arr: AlertItem[]) {
    try {
      const missing = arr.filter(a => a.mouvement && !getMouvementDate(a.mouvement))
      if (missing.length === 0) return
      const api = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"
      // fetch in parallel limited to 6 at a time
      const fetches = missing.map(async (a) => {
        const mid = (a.mouvement as any).id
        if (!mid) return null
        try {
          const r = await authFetch(`${api}/api/mouvements/${mid}` as any)
          if (!r.ok) return null
          const m = await r.json()
          return { alertId: a.id, mouvement: m }
        } catch (e) {
          return null
        }
      })
      const results = await Promise.all(fetches)
      const mapped = new Map<string | number, any>()
      for (const res of results) {
        if (res && res.alertId) mapped.set(res.alertId, res.mouvement)
      }
      if (mapped.size === 0) return
      // merge into alerts state
      setAlerts((prev) => prev.map(a => {
        const m = mapped.get(a.id)
        if (!m) return a
        return { ...a, mouvement: { ...(a.mouvement || {}), ...m } }
      }))
      console.debug('[TaxAlerts] enriched alerts with mouvement dates for', Array.from(mapped.keys()))
    } catch (e) {
      console.error('[TaxAlerts] enrich error', e)
    }
  }

  // Derive a niveau from the mouvement date (age-based) using month thresholds:
  // - <= 1 month -> 'simple' (En attente)
  // - <= 3 months -> 'warning' (Attention)
  // - <= 6 months -> 'urgent' (Urgent)
  // - > 6 months -> 'urgent'
  function niveauFromMouvementDate(m?: any): string | null {
    const d = getMouvementDate(m)
    if (!d) return null
    const msPerMonth = 1000 * 60 * 60 * 24 * 30
    const ageMonths = Math.floor((Date.now() - d.getTime()) / msPerMonth)
    if (ageMonths <= 1) return 'simple'
    if (ageMonths <= 3) return 'warning'
    // anything older than 3 months becomes 'urgent'
    return 'urgent'
  }

  // Map mouvement.type to a text color class used for the amount
  function amountClassForMovementType(t?: string) {
  if (!t) return 'text-muted-foreground';
  const key = String(t).toLowerCase();
  // Paiement d'impôt (violet) : type ou description ou flag
  if (key.includes('impot') || key.includes('impôt') || key.includes('tax') || key.includes('paiement impot')) return 'text-violet-500';
  // Recette (vert)
  if (key === 'credit' || key.includes('recette') || key.includes('versement') || key.includes('reçu')) return 'text-emerald-500';
  // Dépense (rouge)
  if (key === 'debit' || key.includes('dépense') || key.includes('charge') || key.includes('retard')) return 'text-red-500';
  // Ajustement (orange)
  if (key.includes('ajust') || key.includes('correction') || key.includes('modif') || key.includes('ajustement')) return 'text-orange-500';
  // Provision (jaune)
  if (key.includes('provision')) return 'text-yellow-500';
  return 'text-primary';
  }

  // Map mouvement.type to badge classes (background + text) so the badge visually matches the amount color
  function movementBadgeClass(t?: string) {
    if (!t) return 'bg-muted/10 text-muted-foreground'
    const key = String(t).toLowerCase()
    if (key.includes('credit') || key.includes('paiement') || key.includes('versement') || key.includes('reçu') || key.includes('pay')) return 'bg-emerald-600/10 text-emerald-600'
    if (key.includes('debit') || key.includes('débit') || key.includes('retard') || key.includes('charge') || key.includes('retenu') || key.includes('retenue')) return 'bg-destructive/10 text-destructive'
    if (key.includes('ajust') || key.includes('correction') || key.includes('modif') || key.includes('ajustement')) return 'bg-orange-500/10 text-orange-500'
    if (key.includes('provision')) return 'bg-yellow-500/10 text-yellow-500'
    return 'bg-primary/10 text-primary'
  }

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <CardTitle>Alertes Fiscales</CardTitle>
                {unreadCount > 0 && (
                  // @ts-ignore - small UI badge
                  <Badge variant="destructive" className="text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </div>
            </div>
            <CardDescription>Échéances et obligations à venir</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={refresh} title="Actualiser">
              Rafraîchir
            </Button>
            <Button variant="outline" size="sm">
              Gérer
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <div className="text-sm text-muted-foreground">Chargement...</div>}
        {error && <div className="text-sm text-destructive">Erreur: {error}</div>}
        {!loading && !error && alerts.length === 0 && (
          <div className="text-sm text-muted-foreground">Aucune alerte fiscale pour le moment.</div>
        )}

  {displayedAlerts.map((alert: AlertItem) => {
    const isResolved = String(alert.status || '').toLowerCase() === 'resolved'
    const containerClass = `flex items-start gap-4 p-4 rounded-lg border border-border/50 hover:border-border transition-colors ${isResolved ? 'opacity-80' : ''}`

    return (
      <div key={alert.id} className={containerClass}>
        <Link
          href={`/alerts/${alert.id}`}
          className="flex-1 block"
          onClick={(e: any) => {
            if (isResolved) {
              e.preventDefault && e.preventDefault()
              e.stopPropagation && e.stopPropagation()
              Swal.fire({
                icon: 'info',
                title: 'Cas déjà résolu',
                text: "Cette alerte est déjà résolue. Merci de choisir un autre cas.",
                confirmButtonText: 'OK',
              })
            }
          }}
        >
          <div className="flex items-center gap-4">
            {/* left icon */}
            <div className={`p-2 rounded-lg ${
              alert.priority === 'high' ? 'bg-destructive/10 text-destructive' : alert.priority === 'medium' ? 'bg-orange-500/10 text-orange-500' : 'bg-primary/10 text-primary'
            }`}>
              {alert.priority === 'high' ? <AlertTriangle className="h-4 w-4" /> : alert.type.includes('Rapport') ? <FileText className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            </div>

            {/* center content */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{alert.type}</p>
                {alert.mouvement?.type && (
                  // @ts-ignore
                  <Badge variant="outline" className={`${movementBadgeClass(alert.mouvement?.type)} text-xs`}>
                    {alert.mouvement.type}
                  </Badge>
                )}

                {/* niveau / resolved badge */}
                {isResolved ? (
                  <Badge variant={'outline' as any} className="text-xs bg-emerald-600 text-white">À jour</Badge>
                ) : (
                  (() => {
                    const nb = niveauBadgeProps(alert.niveau || niveauFromMouvementDate(alert.mouvement))
                    if (!nb) return null
                    // @ts-ignore
                    return <Badge variant={(nb.variant as any) || 'default'} className={`text-xs ${nb.className || ''}`}>{nb.label}</Badge>
                  })()
                )}

                {/* status */}
                {/* @ts-ignore */}
                <Badge variant={alert.status === 'Urgent' ? 'destructive' : alert.status === 'Attention' ? 'secondary' : 'default'} className="text-xs">{statusLabel(alert.status)}</Badge>
                {alert.reason && <span className="text-xs text-muted-foreground ml-2">{alert.reason}</span>}
              </div>

              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  <div>
                    <div>{getEnterpriseName(alert.enterprise ?? (alert as any).entreprise)}</div>
                    {getEnterpriseNif(alert.enterprise ?? (alert as any).entreprise) && <div className="text-[11px] text-muted-foreground">NIF: {getEnterpriseNif(alert.enterprise ?? (alert as any).entreprise)}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Échéance: {new Date(alert.dueDate).toLocaleDateString('fr-FR')}
                </div>
              </div>

              {alert.mouvement?.description && (
                <div className="text-sm text-muted-foreground mt-2 flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="leading-snug">{alert.mouvement.description}</div>
                </div>
              )}
            </div>
          </div>

        </Link>

        {/* right actions + amount */}
        <div className="flex flex-col items-end gap-3 ml-4">
          <div className="text-right">
            {(() => {
              // normalize amount: prefer mouvement.amount then alert.amount, use absolute value
              const rawAmt = alert.mouvement?.amount ?? alert.amount ?? 0
              const amtNumeric = Number(rawAmt) || 0
              const amt = Math.abs(amtNumeric)

              if (amt > 0) {
                const mouvementType = alert.mouvement?.type ?? alert.type
                // improved detection for tax payments: explicit flag, description keywords, or types containing 'impot'/"impôt"/tax
                const descr = String(alert.mouvement?.description ?? '')
                const typeStr = String((alert.mouvement?.type ?? alert.type) ?? '')
                const isImpot = !!(alert.mouvement?.estPaiementImpot) || /(imp[oô]t|tax)/i.test(descr) || /imp[oô]t/i.test(typeStr) || /tax/i.test(typeStr) || String(alert.type || '').toLowerCase().includes('impot')
                let cls = 'text-muted-foreground'
                if (isImpot) cls = 'text-violet-500'
                else if (mouvementType) cls = amountClassForMovementType(mouvementType)
                return (
                  <>
                    <p className={`font-semibold ${cls}`}>{new Intl.NumberFormat('fr-FR').format(amt)}</p>
                    <p className={`text-xs ${cls}`}>MGA estimés</p>
                  </>
                )
              }
              return <p className="text-xs text-muted-foreground">Aucun impôt estimé</p>
            })()}
          </div>

          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()} title="Actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={async (e: any) => {
                  e.preventDefault && e.preventDefault()
                  e.stopPropagation && e.stopPropagation()
                  // give the dropdown a moment to close and clear focus so subsequent modals receive clicks
                  await new Promise((res) => setTimeout(res, 220))
                  try { (document.activeElement as HTMLElement | null)?.blur() } catch (er) { /* noop */ }
                  const api = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
                  try {
                    const r = await authFetch(`${api}/api/alerts/${alert.id}/resolve` as any, { method: 'PATCH' } as any)
                    if (!r.ok) throw new Error(`HTTP ${r.status}`)
                    setAlerts((prev) => prev.map(a => a.id === alert.id ? { ...a, status: 'resolved' } : a))
                    // Formal success toast
                    try { (await import('@/hooks/use-toast')).showOperationSuccessToast('resolve', 'l\'alerte') } catch (e) { toast({ title: 'Alerte résolue', description: 'L\'alerte a été marquée comme résolue.', variant: 'success' }) }
                  } catch (err) {
                    console.error('resolve failed', err)
                    toast({ title: 'Erreur', description: 'La requête a échoué.', variant: 'destructive' })
                  }
                }}>
                  <span className="flex items-center gap-2"><Check className="w-4 h-4"/>Marquer comme résolu</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onSelect={async (e: any) => {
                  e.preventDefault && e.preventDefault()
                  e.stopPropagation && e.stopPropagation()
                  // give the dropdown a moment to close and clear focus so the modal receives clicks
                  await new Promise((res) => setTimeout(res, 220))
                  try { (document.activeElement as HTMLElement | null)?.blur() } catch (er) { /* noop */ }
                  const res = await Swal.fire({
                    title: 'Supprimer cette alerte?',
                    text: 'Cette action supprimera définitivement l\'alerte et ses notifications.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Oui, supprimer',
                    cancelButtonText: 'Annuler',
                  })
                  // Close the modal immediately so it disappears on first click
                  if (!res.isConfirmed) { Swal.close(); return }
                  // Swal.close()
                  const api = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
                  const prev = alerts
                  setAlerts((prevList) => prevList.filter((a) => a.id !== alert.id))
                  try {
                    const r = await authFetch(`${api}/api/alerts/${alert.id}` as any, { method: 'DELETE' } as any)
                    if (!r.ok) throw new Error(`HTTP ${r.status}`)
                    try { (await import('@/hooks/use-toast')).showOperationSuccessToast('delete', 'l\'alerte') } catch (e) { toast({ title: 'Alerte supprimée', description: 'L\'alerte a été supprimée.', variant: 'success' }) }
                  } catch (err) {
                    console.error('delete failed', err)
                    setAlerts(prev)
                    toast({ title: 'Erreur', description: 'La suppression a échoué.', variant: 'destructive' })
                  }
                }}>
                  <span className="flex items-center gap-2"><Trash2 className="w-4 h-4"/>Supprimer</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    )
  })}

        {/* Pagination controls alignés */}
        {alerts.length > PAGE_SIZE && (
          <div className="pagination-row flex items-center justify-center gap-2 !mb-0">
            <Button variant="ghost" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Préc</Button>
            <div className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-sm">{currentPage} / {totalPages}</div>
            <Button variant="ghost" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Suiv</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
