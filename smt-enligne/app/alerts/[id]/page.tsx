"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { authFetch } from '@/lib/utils'
import { createAlertChannel } from '@/lib/events'
import { useToast } from '@/hooks/use-toast'
import Swal from 'sweetalert2'
import { Trash2, X, CheckCircle, AlertTriangle, Calendar, FileText, Building2 } from 'lucide-react'

export default function AlertDetail({ params }: any) {
  const { id } = params || {}
  const [alert, setAlert] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    setLoading(true)
    authFetch(`${api}/api/alerts/${id}` as any)
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then(d => setAlert(d))
      .catch(() => setAlert(null))
      .finally(() => setLoading(false))
  }, [id])

  async function resolveAlert() {
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      const res = await authFetch(`${api}/api/alerts/${id}/resolve` as any, { method: 'PATCH' } as any)
  if (!res.ok) throw new Error(String(res.status))
      try { (await import('@/hooks/use-toast')).showOperationSuccessToast('resolve', 'l\'alerte') } catch (e) { toast({ title: 'Alerte résolue', description: 'L\'alerte a été marquée comme résolue.', variant: 'success' }) }
      // broadcast to other tabs/components that an alert was resolved
      try {
        const ch = createAlertChannel()
        ch.post({ type: 'alert.resolved', payload: { alertId: Number(id) } })
      } catch (er) { /* noop */ }
      router.replace('/dashboard')
    } catch (err) {
      toast({ title: 'Erreur', description: 'Impossible de résoudre l\'alerte.', variant: 'destructive' })
    }
  }

  async function deleteAlert() {
    // brief wait and blur to ensure any focus or dropdowns settle so the modal reacts to the first click
    await new Promise((res) => setTimeout(res, 220))
    try { (document.activeElement as HTMLElement | null)?.blur() } catch (er) { /* noop */ }
    const confirm = await Swal.fire({
      title: 'Supprimer cette alerte ?',
      text: "Cette action est irréversible.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      reverseButtons: true,
    })

  if (!confirm.isConfirmed) { Swal.close(); return }
  Swal.close()

  try {
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      const res = await authFetch(`${api}/api/alerts/${id}` as any, { method: 'DELETE' } as any)
  if (!res.ok) throw new Error(String(res.status))
      try { (await import('@/hooks/use-toast')).showOperationSuccessToast('delete', 'l\'alerte') } catch (e) { toast({ title: 'Alerte supprimée', description: 'L\'alerte a été supprimée avec succès.', variant: 'success' }) }
      // broadcast to update other clients
      try {
        const ch = createAlertChannel()
        ch.post({ type: 'alert.deleted', payload: { alertId: Number(id) } })
      } catch (er) { /* noop */ }
      router.replace('/dashboard')
    } catch (err) {
      toast({ title: 'Erreur', description: 'Impossible de supprimer l\'alerte.', variant: 'destructive' })
    }
  }

  if (loading) return <div>Chargement...</div>
  if (!alert) return <div>Alerte introuvable</div>

  const niveau = (alert.niveau || alert.level || '').toLowerCase()
  const niveauBadge = () => {
    if (niveau === 'urgent') return <Badge variant="destructive" className="px-3">Urgent</Badge>
    if (niveau === 'attention') return <Badge variant="outline" className="px-3">Attention</Badge>
    return <Badge className="px-3">En attente</Badge>
  }

  const montantClasse = (() => {
    const key = String(alert.mouvement?.type ?? '').toLowerCase()
    if (key.includes('credit') || key.includes('paiement') || key.includes('versement')) return 'text-emerald-600'
    if (key.includes('debit') || key.includes('débit') || key.includes('charge')) return 'text-destructive'
    return 'text-primary'
  })()

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            <span>{alert.type || 'Alerte'}</span>
            <span className="ml-2">{niveauBadge()}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2">Créée le {new Date(alert.createdAt).toLocaleString('fr-FR')}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => router.back()} aria-label="Fermer" title="Fermer">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="w-4 h-4"/> Détails du mouvement</CardTitle>
          </CardHeader>
          <CardContent>
            {alert.mouvement ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`text-lg font-semibold ${montantClasse}`}>{new Intl.NumberFormat('fr-FR').format(alert.mouvement.amount ?? 0)} <span className="text-sm text-muted-foreground">MGA</span></div>
                  <div className="text-sm text-muted-foreground">• {alert.mouvement.type}</div>
                </div>
                {alert.mouvement.description && <div className="text-sm text-muted-foreground">{alert.mouvement.description}</div>}
                <div className="text-xs text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4"/> {alert.mouvement.date ? new Date(alert.mouvement.date).toLocaleString('fr-FR') : '—'}</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Aucun mouvement associé.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="w-4 h-4"/> Entreprise</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="font-medium">{alert.entreprise?.name || alert.entrepriseName || alert.entrepriseId}</div>
              {alert.entreprise?.nif && <div className="text-xs text-muted-foreground">NIF: {alert.entreprise.nif}</div>}
              {alert.entreprise?.address && <div className="text-xs text-muted-foreground">{alert.entreprise.address}</div>}
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button variant="ghost" onClick={() => { navigator.clipboard?.writeText(alert.entreprise?.name || '') ; toast({ title: 'Copié', description: 'Nom de l\'entreprise copié.', variant: 'success' }) }}>Copier le nom</Button>
          </CardFooter>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Statut</div>
              <div className="font-medium">{alert.status === 'resolved' ? 'Résolu' : 'Non résolu'}</div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={resolveAlert} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4"/> Marquer comme résolu
              </Button>
              <Button variant="destructive" onClick={deleteAlert} className="flex items-center gap-2"><Trash2 className="w-4 h-4"/> Supprimer</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
