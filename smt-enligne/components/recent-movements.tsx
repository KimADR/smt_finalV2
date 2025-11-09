import React, { useEffect, useState } from "react"
import { authFetch } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, ArrowDownRight, Building2, Calendar, MoreHorizontal } from "lucide-react"
import { useRouter } from "next/navigation"

type Movement = {
  id: number
  type: string
  amount: number
  description?: string
  enterprise?: string | { id?: number; name?: string }
  entrepriseNif?: string
  createdAt?: string
  status?: string
}

export function RecentMovements({ period, selectedEnterprise }: { period: string; selectedEnterprise?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [movements, setMovements] = useState<Movement[]>([])
  // Pagination (1-based like Mouvements page)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const PAGE_SIZE = 9
  const totalPages = Math.max(1, Math.ceil(movements.length / PAGE_SIZE))
  const displayed = movements.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"
    setLoading(true)
    const params = new URLSearchParams({ period })
    // apply entreprise filter when provided
    if (selectedEnterprise && selectedEnterprise !== 'all') params.set('entrepriseId', String(selectedEnterprise))
    console.log('[RecentMovements] Fetching with params:', params.toString(), { selectedEnterprise })
    authFetch(`${api}/api/mouvements?${params.toString()}` as any)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: any[]) => {
        console.debug('[RecentMovements] fetched', data)
        // On mappe explicitement le nom d'entreprise pour chaque mouvement
        const arr = (data || []).map((m) => ({
          ...m,
          enterprise:
            (m.entreprise && typeof m.entreprise === 'object' && m.entreprise.name)
              ? m.entreprise.name
              : (typeof m.enterprise === 'string' ? m.enterprise : (m.enterprise?.name || m.enterprise || '')),
        }))
        setMovements(arr)
        setCurrentPage(1)
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false))
  }, [period, selectedEnterprise])

  function getEnterpriseName(raw: any) {
    if (!raw) return ''
    if (typeof raw === 'string') return raw
    if (typeof raw === 'object') return raw.name || raw.nom || String(raw.id ?? '') || ''
    return String(raw)
  }

  return (
  <Card className="glass !bg-white dark:!bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Mouvements Récents</CardTitle>
            <CardDescription>Dernières transactions enregistrées</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push('/mouvements')}
          >
            Voir tout
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <div className="text-sm text-muted-foreground">Chargement...</div>}
        {error && <div className="text-sm text-destructive">Erreur: {error}</div>}
        {!loading && !error && movements.length === 0 && (
          <div className="text-sm text-muted-foreground">Aucun mouvement récent.</div>
        )}

        {displayed.map((movement) => (
          <div
            key={movement.id}
            className="group relative p-4 bg-card/40 rounded-xl flex items-center justify-between gap-4 w-full hover:-translate-y-0.5 hover:shadow-md transition-all !bg-white dark:!bg-card"
          >
                {(() => {
                  const isTax = movement.type === 'TAXPAIMENT'
                  // Determine receipt vs expense: prefer amount sign when available, otherwise fallback to type
                  const isReceiptByAmount = typeof movement.amount === 'number' ? movement.amount > 0 : null
                  const isReceiptByType = movement.type === 'RECETTE' || movement.type === 'CREDIT'
                  const isReceipt = isReceiptByAmount === null ? isReceiptByType : isReceiptByAmount
                  return (
                    <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${isTax ? 'bg-purple-500/80' : (isReceipt ? 'bg-emerald-500' : 'bg-destructive')}`} />
                  )
                })()}

            <div className="flex items-start gap-4 min-w-0">
              {(() => {
                const isTax = movement.type === 'TAXPAIMENT'
                const isReceiptByAmount = typeof movement.amount === 'number' ? movement.amount > 0 : null
                const isReceiptByType = movement.type === 'RECETTE' || movement.type === 'CREDIT'
                const isReceipt = isReceiptByAmount === null ? isReceiptByType : isReceiptByAmount
                return (
                  <div className={`w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center text-muted-foreground border border-muted/30`}>
                    {isReceipt ? (
                      <ArrowUpRight className="h-5 w-5" />
                    ) : isTax ? (
                      <Building2 className="h-5 w-5" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5" />
                    )}
                  </div>
                )
              })()}

              <div className="min-w-0">
                <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                  <span className="truncate">{movement.createdAt ? new Date(movement.createdAt).toLocaleDateString("fr-FR") : '-'}</span>
                  {/* Nom de l'entreprise sous la date */}
                  {(typeof movement.enterprise === 'object' && movement.enterprise?.name) && (
                    <div className="text-xs font-semibold text-foreground mt-1">{movement.enterprise.name}</div>
                  )}
                  {typeof movement.enterprise === 'string' && movement.enterprise && (
                    <div className="text-xs font-semibold text-foreground mt-1">{movement.enterprise}</div>
                  )}
                  <span>•</span>
                  {movement.entrepriseNif && (
                    <span className="text-[11px] text-muted-foreground ml-2">NIF: {movement.entrepriseNif}</span>
                  )}
                  <Badge variant={movement.status === "Validé" ? "default" : "secondary"} className="text-xs">
                    {movement.status || ""}
                  </Badge>
                </div>
                <div className="font-medium truncate mt-1 text-foreground/90">{movement.description || '—'}</div>
              </div>
            </div>

            <div className="flex flex-col items-end ml-4">
              {(() => {
                // Prefer amount sign; if amount is positive -> receipt, else expense
                const isReceiptByAmount = typeof movement.amount === 'number' ? movement.amount > 0 : null
                const isReceiptByType = movement.type === 'RECETTE' || movement.type === 'CREDIT'
                const isReceipt = isReceiptByAmount === null ? isReceiptByType : isReceiptByAmount
                return (
                  <div className={`${isReceipt ? 'text-emerald-500 font-extrabold' : 'text-destructive font-extrabold'}`}>
                    {(isReceipt ? '+' : '-')}{(Math.abs(movement.amount) / 1000000).toFixed(1)}M
                  </div>
                )
              })()}
              <div className="text-[10px] sm:text-xs text-muted-foreground">MGA</div>
            </div>
          </div>
        ))}

        {/* Pagination controls alignés */}
        {movements.length > PAGE_SIZE && (
          <div className="pagination-row flex items-center justify-center gap-2 !mb-0 pt-16">
            <Button variant="ghost" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Préc</Button>
            <div className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-sm">{currentPage} / {totalPages}</div>
            <Button variant="ghost" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Suiv</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
