"use client"

import { useState, Fragment } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, List, ArrowUpRight, ArrowDownRight, Banknote, MoreHorizontal, Edit2, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import Swal from 'sweetalert2'
import dynamic from 'next/dynamic'
const MovementForm = dynamic(() => import('@/components/movement-form').then(mod => mod.MovementForm), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
})
import { Plus } from "lucide-react"

import { useEffect } from "react"
import { authFetch } from "@/lib/utils"
import { createChannel, type MvtEvent } from '@/lib/events'
import { showErrorToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/auth-context'
import { toast } from "@/hooks/use-toast"
import { ThemeToggle } from '@/components/theme-toggle'
import NotificationBell from '@/components/notification-bell'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

type Movement = {
  id: number
  date: string
  type: "RECETTE" | "DEPENSE" | string
  amount: number
  description?: string
  enterprise?: string
  enterpriseNif?: string
  isTaxPayment?: boolean
  attachmentsCount?: number
  attachments?: any[]
  enterpriseId?: number | string
  reference?: string
}

function getEnterpriseNameFromRaw(raw: any) {
  if (!raw) return ''
  if (raw.entreprise) {
    const e = raw.entreprise
    if (typeof e === 'string') return e
    if (typeof e === 'object') return e.name || e.nom || ''
  }
  if (raw.enterprise) {
    const e = raw.enterprise
    if (typeof e === 'string') return e
    if (typeof e === 'object') return e.name || e.nom || ''
  }
  return String(raw.enterpriseName || raw.entrepriseName || raw.name || '')
}

export default function MouvementsPage() {
  const { user, role } = useAuth()
  const [query, setQuery] = useState("")
  const [showForm, setShowForm] = useState(false)
    const [movements, setMovements] = useState<Movement[]>([]) // Updated to use movements
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [filterMode, setFilterMode] = useState<'all' | 'tax' | 'normal'>('all')
  const [highlightId, setHighlightId] = useState<number | null>(null)
  const [enterprises, setEnterprises] = useState<Array<{ id: number; name: string }>>([])
  const [selectedEnterpriseFilter, setSelectedEnterpriseFilter] = useState<string>('all') // 'all' = all
  const [typeFilter, setTypeFilter] = useState<'all' | 'RECETTE' | 'DEPENSE' | 'TAXPAIMENT'>('all')
  const [enterpriseQuery, setEnterpriseQuery] = useState<string>('')
  // UI state for per-item menu and editing
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [editingMovement, setEditingMovement] = useState<any | null>(null)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const PAGE_SIZE = 10
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [serverStats, setServerStats] = useState<null | {
    totalRecettes: number
    totalDepenses: number
    totalDepensesImpots: number
    totalDepensesNormales: number
    soldeNet: number
  }>(null)
  const [serverComputedDepenses, setServerComputedDepenses] = useState<number | null>(null)
  const [listComputedSolde, setListComputedSolde] = useState<number | null>(null)
  // default to 'year' so the mouvements page requests the same period as the dashboard
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'week' | 'month' | 'quarter' | 'year'>('year')

  useEffect(() => {
    let mounted = true
    const fetchStats = async () => {
      try {
        const params = new URLSearchParams()
        // if role is ENTREPRISE, scope to user's entreprise
        const userEntId = (user as any)?.entrepriseId ?? (user as any)?.entreprise?.id
        if (role === 'ENTREPRISE' && userEntId) params.set('entrepriseId', String(userEntId))
        // if UI selected a specific entreprise, override
        if (selectedEnterpriseFilter && selectedEnterpriseFilter !== 'all') {
          params.set('entrepriseId', selectedEnterpriseFilter)
        }
        // period
        if (selectedPeriod && selectedPeriod !== 'all') params.set('period', selectedPeriod)
        const url = params.toString() ? `${API_URL}/api/mouvements/stats?${params.toString()}` : `${API_URL}/api/mouvements/stats`
  console.debug('[mouvements] fetching stats URL:', url)
  const res = await authFetch(url)
        if (!res.ok) {
          // clear serverStats on error
          setServerStats(null)
          return
        }
        const data = await res.json()
        if (!mounted) return
        console.debug('[mouvements] stats response:', data)
        setServerStats({
          totalRecettes: Number(data.totalRecettes ?? 0),
          totalDepenses: Number(data.totalDepenses ?? 0),
          totalDepensesImpots: Number(data.totalDepensesImpots ?? 0),
          totalDepensesNormales: Number(data.totalDepensesNormales ?? 0),
          soldeNet: Number(data.soldeNet ?? 0),
        })
        // Also fetch the mouvements list with the same params and compute the total
        // using the same logic as the dashboard so both pages match exactly.
        try {
          const listUrl = url.replace('/stats', '') // /api/mouvements?...
          const r2 = await authFetch(listUrl)
          if (r2.ok) {
            const list = await r2.json()
            const computed = (list || []).reduce((s: number, m: any) => {
              const t = String(m.type || m.type_mouvement || '').toUpperCase()
              const isTax = !!(m.estPaiementImpot ?? m.est_paiement_impot ?? m.isTaxPayment ?? (t === 'TAXPAIMENT'))
              if (isTax) return s
              const amtRaw = Number(m.amount ?? m.montant ?? 0)
              const isExpense = t === 'DEBIT' || t === 'DEPENSE' || amtRaw < 0
              if (!isExpense) return s
              return s + Math.abs(Number(amtRaw || 0))
            }, 0)
            setServerComputedDepenses(computed)
            console.debug('[mouvements] computed server depenses from list:', computed)
          }
        } catch (e) {
          // ignore
        }
      } catch (e) {
        setServerStats(null)
      }
    }

    fetchStats()
    return () => { mounted = false }
  }, [selectedEnterpriseFilter, selectedPeriod, role, (user as any)?.entrepriseId, movements.length])

  useEffect(() => {
    let mounted = true
    setLoading(true)
    // scope to entreprise if role is ENTREPRISE
    const params = new URLSearchParams()
    const userEntId = (user as any)?.entrepriseId ?? (user as any)?.entreprise?.id
    if (role === 'ENTREPRISE' && userEntId) params.set('entrepriseId', String(userEntId))
    // include period when fetching list (server will apply same period filter)
    if (selectedPeriod && selectedPeriod !== 'all') params.set('period', selectedPeriod)
    const url = params.toString() ? `${API_URL}/api/mouvements?${params.toString()}` : `${API_URL}/api/mouvements`
    console.debug('[mouvements] fetching list URL:', url)
    authFetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text())
        return r.json()
      })
          .then((data: any[]) => {
        if (mounted) {
          // compute solde from the raw list using the same logic as dashboard:
          // total credits (type CREDIT) minus total expenses (type DEBIT / DEPENSE),
          // excluding tax payments (estPaiementImpot / type TAXPAIMENT)
          try {
            const totalCredits = (data || []).reduce((s: number, m: any) => {
              const t = String(m.type || m.type_mouvement || '').toUpperCase()
              if (t === 'CREDIT') return s + Math.abs(Number(m.amount ?? m.montant ?? 0) || 0)
              return s
            }, 0)
            const totalExpenses = (data || []).reduce((s: number, m: any) => {
              const t = String(m.type || m.type_mouvement || '').toUpperCase()
              const isTax = !!(m.estPaiementImpot ?? m.est_paiement_impot ?? m.isTaxPayment ?? (t === 'TAXPAIMENT'))
              if (isTax) return s
              const amtRaw = Number(m.amount ?? m.montant ?? 0)
              const isExpense = t === 'DEBIT' || t === 'DEPENSE' || amtRaw < 0
              if (!isExpense) return s
              return s + Math.abs(Number(amtRaw || 0))
            }, 0)
            setListComputedSolde(Number((totalCredits - totalExpenses).toFixed(2)))
          } catch (e) {
            setListComputedSolde(null)
          }

          const mapped = (data || []).map((m: any) => ({
            id: m.id,
            date: m.createdAt ? new Date(m.createdAt).toLocaleDateString('fr-FR') : '',
                type: m.type === 'CREDIT' ? 'RECETTE' : m.type === 'DEBIT' ? 'DEPENSE' : String(m.type || ''),
                amount: Number(m.amount || 0),
                description: m.description || '',
                enterprise: getEnterpriseNameFromRaw(m),
                enterpriseNif: m.entreprise?.siret ?? m.entrepriseNif ?? m.enterpriseNif ?? null,
                isTaxPayment: !!(m.estPaiementImpot ?? m.est_paiement_impot ?? m.isTaxPayment),
        attachmentsCount: Array.isArray(m.attachments) ? m.attachments.length : (m.attachments && typeof m.attachments === 'object' ? Object.keys(m.attachments).length : 0),
        attachments: Array.isArray(m.attachments) ? m.attachments : undefined,
                enterpriseId: m.entrepriseId ?? m.entreprise?.id ?? m.enterpriseId ?? null,
                reference: m.reference ?? m.ref ?? '',
          }))
          setMovements(mapped)
        }
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
  }, [selectedEnterpriseFilter, selectedPeriod, role, (user as any)?.entrepriseId])

  // subscribe to broadcast events so list updates without reload
  useEffect(() => {
    if (typeof window === 'undefined') return
    const ch = createChannel()
    const unsub = ch.on((ev: MvtEvent) => {
      if (!ev || !ev.type) return
      if (ev.type === 'movement.created') {
        const d = ev.payload
        if (!d) return
        // ignore if already present
        setMovements((prev) => (prev.some(p => Number(p.id) === Number(d.id)) ? prev : [{
          id: d.id,
          date: d.createdAt ? new Date(d.createdAt).toLocaleDateString('fr-FR') : '',
          type: d.type === 'CREDIT' ? 'RECETTE' : d.type === 'DEBIT' ? 'DEPENSE' : (d.type || ''),
          amount: Number(d.amount ?? d.montant ?? 0),
          description: d.description ?? '',
          enterprise: getEnterpriseNameFromRaw(d),
          enterpriseNif: d.entreprise?.siret ?? null,
          enterpriseId: d.entrepriseId ?? d.entreprise?.id ?? null,
        }, ...prev]))
      } else if (ev.type === 'movement.updated') {
        const d = ev.payload
        setMovements((prev) => prev.map((it) => it.id === d.id ? ({
          id: d.id,
          date: d.createdAt ? new Date(d.createdAt).toLocaleDateString('fr-FR') : '',
          type: d.type === 'CREDIT' ? 'RECETTE' : d.type === 'DEBIT' ? 'DEPENSE' : (d.type || ''),
          amount: Number(d.amount ?? d.montant ?? 0),
          description: d.description ?? '',
          enterprise: getEnterpriseNameFromRaw(d),
          enterpriseNif: d.entreprise?.siret ?? null,
          enterpriseId: d.entrepriseId ?? d.entreprise?.id ?? null,
        }) : it))
      } else if (ev.type === 'movement.deleted') {
        const d = ev.payload
        setMovements((prev) => prev.filter((it) => it.id !== d.id))
      }
    })
    return () => unsub()
  }, [])

  // fetch enterprises for the filter select
  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"
    authFetch(`${API_URL}/api/entreprises`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: any[]) => {
  const mapped = (list || []).map((e) => ({ id: e.id, name: e.name }))
  mapped.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
  setEnterprises(mapped)
      })
      .catch(() => {})
  }, [])

  const searched = movements.filter((m) => {
    return (
      (m.description || "").toLowerCase().includes(query.toLowerCase()) ||
      (m.enterprise || "").toLowerCase().includes(query.toLowerCase())
    )
  })

  // compute totals separated
  // compute totals based on the selected enterprise filter so cards reflect the current selection
  const movementsForStats = (selectedEnterpriseFilter && selectedEnterpriseFilter !== 'all')
    ? movements.filter((m) => {
        const entId = m.enterpriseId ?? null
        const matchesId = String(entId ?? '') === selectedEnterpriseFilter
        const enterpriseName = String(m.enterprise ?? '').toLowerCase()
        const selectedName = (enterprises.find(e => String(e.id) === selectedEnterpriseFilter)?.name ?? '').toLowerCase()
        const matchesName = !!selectedName && enterpriseName === selectedName
        return matchesId || matchesName
      })
    : movements

  const totalRecettes = movementsForStats
    .filter((m) => m.type === 'RECETTE')
    .reduce((s, m) => s + Math.abs(Number(m.amount || 0)), 0)
  // backend stores DEBIT amounts as negative numbers; sum absolute values so totals grow when new expenses are added
  const totalDepenses = movementsForStats
    .filter((m) => m.type === 'DEPENSE')
    .reduce((s, m) => s + Math.abs(Number(m.amount || 0)), 0)
  const totalDepensesNormales = movementsForStats
    .filter((m) => m.type === 'DEPENSE' && !m.isTaxPayment)
    .reduce((s, m) => s + Math.abs(Number(m.amount || 0)), 0)
  const totalDepensesImpots = movementsForStats
    .filter((m) => m.isTaxPayment)
    .reduce((s, m) => s + Math.abs(Number(m.amount || 0)), 0)

  // Net balance = recettes - depenses (based on filtered movements)
  const soldeNet = totalRecettes - totalDepenses

  const displayList = searched.filter((m) => {
    // filter by tax mode
    if (filterMode === 'tax' && !m.isTaxPayment) return false
    if (filterMode === 'normal' && m.isTaxPayment) return false

    // filter by enterprise if selected
    if (selectedEnterpriseFilter && selectedEnterpriseFilter !== 'all') {
      // selectedEnterpriseFilter is id as string
      const entId = m.enterpriseId ?? null
      if (String(entId ?? '') !== selectedEnterpriseFilter && String(m.enterprise ?? '').toLowerCase() !== (enterprises.find(e => String(e.id) === selectedEnterpriseFilter)?.name ?? '').toLowerCase()) {
        return false
      }
    }

    // filter by type (RECETTE/DEPENSE/TAXPAIMENT)
    if (typeFilter !== 'all') {
      if (typeFilter === 'DEPENSE') {
        // only normal expenses (exclude tax payments)
        if (!(m.type === 'DEPENSE' && !m.isTaxPayment)) return false
      } else if (typeFilter === 'TAXPAIMENT') {
        // include any movement flagged as tax payment or explicitly typed TAXPAIMENT
        if (!(m.isTaxPayment || m.type === 'TAXPAIMENT')) return false
      } else {
        if (m.type !== typeFilter) return false
      }
    }

    return true
  })

  // pagination
  const totalPages = Math.max(1, Math.ceil(displayList.length / PAGE_SIZE))
  const pagedList = displayList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // close menus on outside click
  useEffect(() => {
    const onDocClick = () => setOpenMenuId(null)
    window.addEventListener('click', onDocClick)
    return () => window.removeEventListener('click', onDocClick)
  }, [])

  // reset page when filters/search change
  useEffect(() => {
    setCurrentPage(1)
  }, [query, filterMode, selectedEnterpriseFilter, typeFilter, enterpriseQuery])

  const handleCreated = (m: any) => {
    // If server returned __tempId, replace the optimistic entry
    if (m.__tempId) {
      setMovements((prev) => prev.map((it) => (it.id === m.__tempId ? {
        id: m.id,
        date: m.createdAt ? new Date(m.createdAt).toLocaleDateString('fr-FR') : (m.date_mouvement ? new Date(m.date_mouvement).toLocaleDateString('fr-FR') : ''),
            type: m.type === 'CREDIT' ? 'RECETTE' : m.type === 'DEBIT' ? 'DEPENSE' : m.type === 'TAXPAIMENT' ? 'TAXPAIMENT' : (m.type || m.type_mouvement || ''),
        amount: Number(m.amount ?? m.montant ?? 0),
  description: m.description || '',
  enterprise: getEnterpriseNameFromRaw(m),
        enterpriseNif: m.entreprise?.siret ?? m.entrepriseNif ?? m.enterpriseNif ?? null,
        isTaxPayment: !!(m.estPaiementImpot ?? m.est_paiement_impot ?? m.isTaxPayment),
        attachmentsCount: Array.isArray(m.attachments) ? m.attachments.length : (m.attachmentsCount ?? 0),
        enterpriseId: m.entrepriseId ?? m.entreprise?.id ?? m.enterpriseId ?? null,
      } : it))
      )
      setHighlightId(m.id)
      setTimeout(() => setHighlightId(null), 2200)
      return
    }
    // map to Movement shape
    const mapped: Movement = {
      id: m.id ?? m._id ?? Date.now(),
      date: m.date_mouvement ? new Date(m.date_mouvement).toLocaleDateString('fr-FR') : (m.createdAt ? new Date(m.createdAt).toLocaleDateString('fr-FR') : ''),
          type: m.type_mouvement === 'RECETTE' || m.type === 'RECETTE' ? 'RECETTE' : (m.type_mouvement === 'DEPENSE' || m.type === 'DEPENSE' ? 'DEPENSE' : m.type === 'TAXPAIMENT' ? 'TAXPAIMENT' : String(m.type || '')),
      amount: Number(m.montant ?? m.amount ?? 0),
  description: m.description ?? m.label ?? '',
  enterprise: getEnterpriseNameFromRaw(m),
      enterpriseNif: m.entreprise?.siret ?? m.entrepriseNif ?? m.enterpriseNif ?? null,
      isTaxPayment: !!(m.estPaiementImpot ?? m.est_paiement_impot ?? m.isTaxPayment),
      attachmentsCount: Array.isArray(m.attachments) ? m.attachments.length : (m.attachmentsCount ?? 0),
    }
    setMovements((prev) => [mapped, ...prev])
    setShowForm(false)
    setHighlightId(mapped.id)
    setTimeout(() => setHighlightId(null), 2200)
  import('@/hooks/use-toast').then((m) => { try { m.showOperationSuccessToast('create', 'le mouvement') } catch (e) { toast({ title: 'Mouvement ajouté', description: 'Le mouvement a été ajouté avec succès.', variant: 'success' }) } }).catch(() => { toast({ title: 'Mouvement ajouté', description: 'Le mouvement a été ajouté avec succès.', variant: 'success' }) })
  }

  const handleUpdated = (m: any) => {
    // If server returned __tempId, replace the optimistic entry (temp edit that became a create)
    if (m.__tempId) {
      setMovements((prev) => prev.map((it) => (it.id === m.__tempId ? {
        id: m.id,
        date: m.createdAt ? new Date(m.createdAt).toLocaleDateString('fr-FR') : (m.date_mouvement ? new Date(m.date_mouvement).toLocaleDateString('fr-FR') : ''),
        type: m.type === 'CREDIT' ? 'RECETTE' : m.type === 'DEBIT' ? 'DEPENSE' : (m.type || m.type_mouvement || ''),
        amount: Number(m.amount ?? m.montant ?? 0),
    description: m.description || m.label || '',
  enterprise: getEnterpriseNameFromRaw(m),
  enterpriseNif: m.entreprise?.siret ?? m.entrepriseNif ?? m.enterpriseNif ?? null,
        isTaxPayment: !!(m.estPaiementImpot ?? m.est_paiement_impot ?? m.isTaxPayment),
        attachmentsCount: Array.isArray(m.attachments) ? m.attachments.length : (m.attachmentsCount ?? 0),
        enterpriseId: m.entrepriseId ?? m.entreprise?.id ?? m.enterpriseId ?? null,
      } : it)))
  import('@/hooks/use-toast').then((m) => { try { m.showOperationSuccessToast('update', 'le mouvement') } catch (e) { toast({ title: 'Mouvement modifié', description: 'Le mouvement a été mis à jour.', variant: 'success' }) } }).catch(() => { toast({ title: 'Mouvement modifié', description: 'Le mouvement a été mis à jour.', variant: 'success' }) })
      return
    }
    // If the server returned a negative id without a __tempId, ignore it (bad response)
    if (typeof m.id === 'number' && m.id < 0 && !m.__tempId) return

    // replace existing movement
    setMovements((prev) => prev.map((it) => (it.id === m.id ? {
      id: m.id,
      date: m.createdAt ? new Date(m.createdAt).toLocaleDateString('fr-FR') : (m.date_mouvement ? new Date(m.date_mouvement).toLocaleDateString('fr-FR') : ''),
          type: m.type === 'CREDIT' ? 'RECETTE' : m.type === 'DEBIT' ? 'DEPENSE' : m.type === 'TAXPAIMENT' ? 'TAXPAIMENT' : (m.type || m.type_mouvement || ''),
      amount: Number(m.amount ?? m.montant ?? 0),
  description: m.description || m.label || '',
  enterprise: getEnterpriseNameFromRaw(m),
      enterpriseNif: m.entreprise?.siret ?? m.entrepriseNif ?? m.enterpriseNif ?? null,
      isTaxPayment: !!(m.estPaiementImpot ?? m.est_paiement_impot ?? m.isTaxPayment),
      attachmentsCount: Array.isArray(m.attachments) ? m.attachments.length : (m.attachmentsCount ?? 0),
      enterpriseId: m.entrepriseId ?? m.entreprise?.id ?? m.enterpriseId ?? null,
    } : it)))
  import('@/hooks/use-toast').then((m) => { try { m.showOperationSuccessToast('update', 'le mouvement') } catch (e) { toast({ title: 'Mouvement modifié', description: 'Le mouvement a été mis à jour.', variant: 'success' }) } }).catch(() => { toast({ title: 'Mouvement modifié', description: 'Le mouvement a été mis à jour.', variant: 'success' }) })
  }

  const handleDelete = async (id: number) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"
    // optimistic remove
    const prev = movements
    setMovements((p) => p.filter((it) => it.id !== id))
    try {
      const res = await authFetch(`${API_URL}/api/mouvements/${id}`, { method: 'DELETE' } as any)
      if (!res.ok) throw new Error(await res.text())
  import('@/hooks/use-toast').then((m) => { try { m.showOperationSuccessToast('delete', 'le mouvement') } catch (e) { toast({ title: 'Mouvement supprimé', variant: 'success' }) } }).catch(() => { toast({ title: 'Mouvement supprimé', variant: 'success' }) })
      try { createChannel().post({ type: 'movement.deleted', payload: { id } }) } catch (e) { }
    } catch (err: any) {
      setMovements(prev)
      showErrorToast(err?.message || err)
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Navigation />
      <main className="flex-1 pt-14 lg:pt-0 pl-0 lg:pl-[calc(16rem+0.75rem)] p-4 lg:p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4">
            <div>
              <h1 className="text-3xl font-bold">Mouvements</h1>
              <p className="text-muted-foreground">Suivi des mouvements financiers des entreprises</p>
            </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Hide new movement button for AGENT_FISCAL users */}
                {(role !== 'AGENT_FISCAL') && (
                  <Button onClick={() => setShowForm(true)} className="animate-glow w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouveau Mouvement
                  </Button>
                )}
                <div className="hidden md:flex items-center gap-3 h-10">
                  <NotificationBell />
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>

          {/* Top statistics - styled like Entreprises */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="glass border-primary/20 hover:border-primary/40 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <List className="h-5 w-5 text-primary" />
                  <Badge variant="secondary">Solde net</Badge>
                </div>
                <CardTitle className="text-2xl font-bold">
                  {listComputedSolde != null ? (
                    <>
                      <span className={`${listComputedSolde >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>{Number(listComputedSolde).toLocaleString('fr-FR')}</span>
                      <span className="ml-2 text-base">MGA</span>
                    </>
                  ) : serverStats ? (
                    <>
                      <span className={`${serverStats.soldeNet >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>{serverStats.soldeNet.toLocaleString('fr-FR')}</span>
                      <span className="ml-2 text-base">MGA</span>
                    </>
                  ) : (
                    <>
                      <span className={`${soldeNet >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>{soldeNet.toLocaleString('fr-FR')}</span>
                      <span className="ml-2 text-base">MGA</span>
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {selectedEnterpriseFilter && selectedEnterpriseFilter !== 'all' ? `Solde pour ${enterprises.find(e => String(e.id) === selectedEnterpriseFilter)?.name ?? selectedEnterpriseFilter}` : 'Flux enregistrés'}
                  {/* {serverStats ? ' · (calculé par le serveur)' : ' · (calcul local)'} */}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                  <Badge variant="secondary">Recettes</Badge>
                </div>
                <CardTitle className="text-2xl font-bold">{(serverStats ? serverStats.totalRecettes : totalRecettes).toLocaleString('fr-FR')} MGA</CardTitle>
                <CardDescription>Recettes</CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass border-destructive/20 hover:border-destructive/40 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <ArrowDownRight className="h-5 w-5 text-destructive" />
                  <Badge variant="secondary">Dépenses</Badge>
                </div>
                {/* Show the server totalDepenses (absolute total) which matches dashboard; fallback to local totalDepenses */}
                <CardTitle className="text-2xl font-bold">{(serverComputedDepenses != null ? serverComputedDepenses : (serverStats ? serverStats.totalDepenses : totalDepenses)).toLocaleString('fr-FR')} MGA</CardTitle>
                <CardDescription>Dépenses (totales)</CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass border-warning/20 hover:border-warning/40 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Banknote className="h-5 w-5 text-warning" />
                  <Badge variant="secondary">Paiement d'impôts</Badge>
                </div>
                <CardTitle className="text-2xl font-bold">{(serverStats ? serverStats.totalDepensesImpots : totalDepensesImpots).toLocaleString('fr-FR')} MGA</CardTitle>
                <CardDescription>Dépenses (impôts)</CardDescription>
              </CardHeader>
            </Card>
            <div />
          </div>

          {/* Search and Filters (moved under stats to match Entreprises) */}
          <Card className="glass">
            <CardHeader>
              <CardTitle>Rechercher et Filtrer</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Make search + filters in a horizontal flex row. On very small screens they will wrap. */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Rechercher par description ou entreprise..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10 w-full" />
                </div>

                <div className="flex items-center gap-4">
                  <Select value={selectedEnterpriseFilter} onValueChange={(v) => setSelectedEnterpriseFilter(v)}>
                    <SelectTrigger className="w-[240px]">
                      <SelectValue placeholder="Toutes les entreprises" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 pb-2">
                        <Input placeholder="Rechercher entreprise..." value={enterpriseQuery} onChange={(e) => setEnterpriseQuery(e.target.value)} className="w-full" />
                      </div>
                      <SelectItem value="all">Toutes les entreprises</SelectItem>
                      {enterprises
                        .filter((e) => e.name.toLowerCase().includes(enterpriseQuery.toLowerCase()))
                        .map((e) => (
                          <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2">
                    <Button variant={typeFilter === 'all' ? undefined : 'ghost'} onClick={() => setTypeFilter('all')} className="whitespace-nowrap">Tous</Button>
                    <Button variant={typeFilter === 'RECETTE' ? undefined : 'ghost'} onClick={() => setTypeFilter('RECETTE')} className="whitespace-nowrap">Recettes</Button>
                    <Button variant={typeFilter === 'DEPENSE' ? undefined : 'ghost'} onClick={() => setTypeFilter('DEPENSE')} className="whitespace-nowrap">Dépenses</Button>
                    <Button variant={typeFilter === 'TAXPAIMENT' ? undefined : 'ghost'} onClick={() => setTypeFilter('TAXPAIMENT')} className="whitespace-nowrap">Paiements d'impôt</Button>
                  </div>
                  
                  {/* Period selector */}
                  <div className="ml-2 flex items-center gap-2">
                    {/* <Button size="sm" variant={selectedPeriod === 'month' ? undefined : 'ghost'} onClick={() => setSelectedPeriod('month')}>Mois</Button>
                    <Button size="sm" variant={selectedPeriod === 'quarter' ? undefined : 'ghost'} onClick={() => setSelectedPeriod('quarter')}>Trimestre</Button>
                    <Button size="sm" variant={selectedPeriod === 'year' ? undefined : 'ghost'} onClick={() => setSelectedPeriod('year')}>Année</Button> */}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6">
            <div className="lg:col-span-2">
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Derniers mouvements</CardTitle>
                  <CardDescription>Les mouvements récents sont listés ci-dessous</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {loading ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center py-6">
                          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="p-4 rounded-xl border border-border bg-transparent dark:bg-transparent">
                            <div className="h-4 w-1/3 bg-muted/30 rounded animate-pulse" />
                            <div className="mt-3 h-3 w-2/3 bg-muted/30 rounded animate-pulse" />
                          </div>
                        ))}
                      </div>
                    ) : displayList.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground">Aucun mouvement trouvé.</div>
                    ) : (
                      pagedList.map((m, idx) => (
                        <Fragment key={m.id}>
                        <div
                          className={`group relative cursor-pointer flex flex-col sm:flex-row items-start gap-4 p-4 rounded-xl border backdrop-blur-sm transition-all duration-200 ${
                            highlightId === m.id
                              ? 'bg-emerald-20/10'
                              : 'bg-transparent dark:bg-transparent border-border hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/20'
                          }`}
                          onClick={() => setExpandedId((prev) => (prev === m.id ? null : m.id))}
                        >
                          <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${m.isTaxPayment ? 'bg-purple-500/80' : (m.type === 'RECETTE' ? 'bg-emerald-500' : 'bg-destructive')}`} />
                          <div className="flex flex-col sm:flex-row items-start gap-4 w-full">
                            <div className={`hidden sm:flex w-12 h-12 rounded-full items-center justify-center border text-slate-700 dark:text-slate-100 ${m.isTaxPayment ? 'bg-purple-50 border-purple-200' : (m.type === 'RECETTE' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200')}`}>
                              {m.isTaxPayment ? (
                                <Banknote className="h-5 w-5 text-purple-600" />
                              ) : m.type === 'RECETTE' ? (
                                <ArrowUpRight className="h-5 w-5 text-emerald-600" />
                              ) : (
                                <ArrowDownRight className="h-5 w-5 text-red-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span>{m.date}</span>
                                  <span className="hidden sm:inline">•</span>
                                  <span className="font-medium truncate">{getEnterpriseNameFromRaw(m)}</span>
                                  {m.enterpriseId || m.enterprise ? (
                                    <span className="text-xs text-muted-foreground">{m.enterpriseNif ? `NIF: ${m.enterpriseNif}` : ''}</span>
                                  ) : null}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {m.isTaxPayment ? (
                                    <Badge className="bg-purple-50 text-purple-700 border-purple-200 group-hover:bg-purple-100">Paiement d'impôt</Badge>
                                  ) : m.type === 'RECETTE' ? (
                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 group-hover:bg-emerald-100">Recette</Badge>
                                  ) : (
                                    <Badge className="bg-destructive/10 text-destructive border-destructive/20 group-hover:bg-destructive/15">Dépense</Badge>
                                  )}
                                  {m.attachmentsCount ? <Badge variant="secondary">{m.attachmentsCount} pièce(s)</Badge> : null}
                                </div>
                              </div>
                              <div className={`font-medium truncate mt-2 text-foreground/90`}>{m.description || '—'}</div>
                            </div>
                          </div>

                          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-0 mt-2 sm:mt-0">
                              <div className="flex flex-col items-end gap-1 sm:items-end ml-auto">
                                <div className={`flex items-baseline gap-1 whitespace-nowrap flex-shrink-0 ${m.isTaxPayment ? 'text-purple-500 font-extrabold' : (m.type === 'RECETTE' ? 'text-emerald-500 font-extrabold' : 'text-destructive font-extrabold')}`}>
                                  <span className="whitespace-nowrap">{m.isTaxPayment ? '-' : (m.type === 'RECETTE' ? '+' : '-')}{Number(m.amount || 0).toLocaleString('fr-FR')}</span>
                                  <span className="text-sm">Ar</span>
                                </div>
                                <div className="text-[10px] sm:text-xs text-muted-foreground">{m.isTaxPayment ? "Paiement d'impôt" : m.type}</div>
                              </div>

                            <div className="relative ml-auto sm:ml-0">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className={`h-8 w-8`} onClick={(e)=> e.stopPropagation()}>
                                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {!(role === 'ENTREPRISE' && Number(user?.entrepriseId ?? user?.entreprise?.id ?? null) !== Number(m.enterpriseId ?? m.enterpriseId ?? 0)) && role !== 'AGENT_FISCAL' ? (
                                    <>
                                      <DropdownMenuItem onSelect={async () => {
                                        // open edit modal (no create)
                                        setEditingMovement(m)
                                        setShowForm(true)
                                      }}>
                                        <Edit2 className="h-4 w-4 mr-2" /> Modifier
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="text-destructive" onSelect={async () => {
                                        setOpenMenuId(null)
                                        const res = await Swal.fire({
                                          title: `Supprimer le mouvement ?`,
                                          text: 'Cette action est irréversible.',
                                          icon: 'warning',
                                          showCancelButton: true,
                                          confirmButtonText: 'Oui, supprimer',
                                          cancelButtonText: 'Annuler',
                                        })
                                        if (res.isConfirmed) {
                                          handleDelete(m.id)
                                        }
                                      }}>
                                        <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                                      </DropdownMenuItem>
                                    </>
                                  ) : (
                                    <div className="px-3 py-2 text-xs text-muted-foreground">Vous ne pouvez pas modifier ce mouvement</div>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                        {expandedId === m.id && (
                          <div className={`pl-4 sm:pl-14 pr-4 py-3 text-sm`}> 
                            <div className="rounded-lg border border-border/60 bg-transparent dark:bg-transparent p-3">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Référence</p>
                                  <p className="font-medium break-all">{m.reference || '—'}</p>
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                  <p className="text-xs text-muted-foreground">Pièces jointes</p>
                                  {Array.isArray(m.attachments) && m.attachments.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                      {m.attachments.map((a: any, i: number) => (
                                        <span key={i} className="px-2 py-1 text-xs rounded-full border border-border/70 bg-muted/20 break-all">
                                          {a?.name || a?.filename || a?.originalname || a?.url || `Fichier ${i+1}`}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="font-medium">{m.attachmentsCount ? `${m.attachmentsCount} pièce(s)` : '—'}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        </Fragment>
                      ))
                    )}
                  </div>
                    {/* pagination controls */}
                    {displayList.length > PAGE_SIZE && (
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

            {/* Right column removed so movements list can take full width below the stats.
                The tax payments summary is shown in the top stats (4th card). */}
          </div>
        </div>
      </main>

      <MovementForm
        open={showForm}
        onOpenChange={(v) => {
          setShowForm(v)
          if (!v) setEditingMovement(null)
        }}
        initialData={editingMovement ?? undefined}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
        onOptimisticCreated={(opt) => setMovements((prev) => [opt, ...prev])}
        onCreateFailed={(tempId) => setMovements((prev) => prev.filter((p) => p.id !== tempId))}
      />
    </div>
  )
}
