"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/hooks/use-toast'
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EnterpriseCard } from "@/components/enterprise-card"
import dynamic from 'next/dynamic'
const EnterpriseForm = dynamic(() => import('@/components/enterprise-form').then(mod => mod.EnterpriseForm), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
})
import { Search, Plus, Filter, Building2, Users, CheckCircle, AlertCircle, TrendingUp, Phone, Mail, MapPin, FileText, Settings, Zap, Activity, Compass } from "lucide-react"
import Swal from 'sweetalert2'

// useEffect imported above
import { useAuth } from '@/components/auth-context'
import { ThemeToggle } from "@/components/theme-toggle"
import NotificationBell from '@/components/notification-bell'
import { authFetch } from "@/lib/utils"
import { TaxAlerts } from '@/components/tax-alerts'
import EnterpriseMap from '@/components/enterprise-map'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

// Small inline animated counter used in the enterprise card
function AnimatedCounter({ value }: { value: number }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let mounted = true
    const start = v
    const end = Number(value || 0)
    const duration = 700
    const startTime = Date.now()
    function tick() {
      if (!mounted) return
      const now = Date.now()
      const t = Math.min(1, (now - startTime) / duration)
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t // simple ease
      const next = Math.round(start + (end - start) * eased)
      setV(next)
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return <span>{new Intl.NumberFormat('fr-FR').format(v)}</span>
}

type Enterprise = {
  id: number
  name: string
  nif?: string
  sector?: string
  status?: string
  taxType?: string
  annualRevenue?: number
  legalForm?: string
  activity?: string
  city?: string
  postalCode?: string
  description?: string
  contact?: { phone?: string; email?: string }
  address?: string
}

export default function EntreprisesPage() {
  const { user, role } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Enterprise | null>(null)
  const [enterprises, setEnterprises] = useState<Enterprise[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const { toast } = useToast()

  useEffect(() => {
    // small mount animation flag
    const t = setTimeout(() => setMounted(true), 80)
    let mounted = true
    setLoading(true)
    const params = new URLSearchParams()
    const userEntId = (user as any)?.entrepriseId ?? (user as any)?.entreprise?.id
    if (role === 'ENTREPRISE' && userEntId) params.set('entrepriseId', String(userEntId))
    const url = params.toString() ? `${API_URL}/api/entreprises?${params.toString()}` : `${API_URL}/api/entreprises`
    authFetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text())
        return r.json()
      })
      .then((data: any[]) => {
        if (mounted) {
          // normalize backend shape to frontend Enterprise type
          const mapped = data
            .map((e) => ({
            id: e.id,
            name: e.name,
            nif: e.siret || e.nif || "",
            sector: e.sector || e.activity || "",
            status: typeof e.status === 'string'
              ? (String(e.status).toUpperCase() === 'ACTIF' ? 'Actif' : String(e.status).toUpperCase() === 'INACTIF' ? 'Inactif' : String(e.status).toUpperCase() === 'SUSPENDU' ? 'Suspendu' : (e.status || 'Actif'))
              : 'Actif',
            taxType: e.taxType || 'IR',
            annualRevenue: Number(e.annualRevenue || e.revenusTotal || 0),
            legalForm: e.legalForm || undefined,
            activity: e.activity || undefined,
            city: e.city || undefined,
            postalCode: e.postalCode || undefined,
            description: e.description || undefined,
            contact: { phone: e.phone || undefined, email: e.contactEmail || undefined },
            address: e.address || "",
          }))
            .sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()))
          setEnterprises(mapped)
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(String(err))
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
      clearTimeout(t)
    }
  }, [])

  const filteredEnterprises = enterprises.filter((enterprise) => {
    const matchesSearch =
      (enterprise.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (enterprise.nif || "").includes(searchTerm) ||
      (enterprise.sector || "").toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || (enterprise.status || "").toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })
  const fetchEnterprises = () => {
    let mounted = true
    setLoading(true)
    const params = new URLSearchParams()
    const userEntId = (user as any)?.entrepriseId ?? (user as any)?.entreprise?.id
    if (role === 'ENTREPRISE' && userEntId) params.set('entrepriseId', String(userEntId))
    const url = params.toString() ? `${API_URL}/api/entreprises?${params.toString()}` : `${API_URL}/api/entreprises`
    authFetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text())
        return r.json()
      })
      .then((data: any[]) => {
        if (mounted) {
          // normalize backend shape to frontend Enterprise type (keep activity/description)
          const mapped = data
            .map((e) => ({
            id: e.id,
            name: e.name,
            nif: e.siret || e.nif || "",
            sector: e.sector || e.activity || "",
            status: typeof e.status === 'string'
              ? (String(e.status).toUpperCase() === 'ACTIF' ? 'Actif' : String(e.status).toUpperCase() === 'INACTIF' ? 'Inactif' : String(e.status).toUpperCase() === 'SUSPENDU' ? 'Suspendu' : (e.status || 'Actif'))
              : 'Actif',
            taxType: e.taxType || 'IR',
            annualRevenue: Number(e.annualRevenue || e.revenusTotal || 0),
            legalForm: e.legalForm || undefined,
            activity: e.activity || undefined,
            city: e.city || undefined,
            postalCode: e.postalCode || undefined,
            description: e.description || undefined,
            contact: { phone: e.phone || undefined, email: e.contactEmail || undefined },
            address: e.address || "",
          }))
            .sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()))
          setEnterprises(mapped)
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(String(err))
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }

  useEffect(() => {
    fetchEnterprises()
  }, [])
  
  const stats = {
    total: enterprises.length,
    active: enterprises.filter((e) => e.status === "Actif").length,
    ir: enterprises.filter((e) => e.taxType === "IR").length,
    is: enterprises.filter((e) => e.taxType === "IS").length,
  }

  // Pagination
  const PAGE_SIZE = 6
  const totalPages = Math.max(1, Math.ceil(filteredEnterprises.length / PAGE_SIZE))
  const pagedEnterprises = filteredEnterprises.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // Reset page when filters/search change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])
  const handleOnSaved = (item: any, action?: string, meta?: any) => {
    // actions: createOptimistic, replace, updateOptimistic, revertCreate, revertUpdate, deleteOptimistic, revertDelete
    if (action === 'createOptimistic') {
      setEnterprises((prev) => [item, ...prev])
      return
    }

    if (action === 'replace' && meta?.tempId) {
      // replace optimistic with real
      setEnterprises((prev) => prev.map((e) => (e.id === meta.tempId ? { ...item } : e)))
      return
    }

    if (action === 'updateOptimistic') {
      setEnterprises((prev) => prev.map((e) => (e.id === item.id ? { ...e, ...item } : e)))
      return
    }

    if (action === 'revertCreate') {
      setEnterprises((prev) => prev.filter((e) => e.id !== item.id))
      return
    }

    if (action === 'revertUpdate') {
      // meta.prev contains the previous data
      if (meta?.prev) {
        setEnterprises((prev) => prev.map((e) => (e.id === meta.prev.id ? meta.prev : e)))
      }
      return
    }

    if (action === 'deleteOptimistic') {
      setEnterprises((prev) => prev.filter((e) => e.id !== item.id))
      return
    }

    if (action === 'revertDelete') {
      // put back the previous
      if (meta?.prev) setEnterprises((prev) => [meta.prev, ...prev])
      return
    }

    // default: full replace/insert
    if (!action) {
      // fallback full refresh
      fetchEnterprises()
      return
    }
  }

  // If user is an ENTREPRISE, display a simplified company-centric dashboard
  if ((user as any)?.role === 'ENTREPRISE') {
    const myEntId = (user as any)?.entrepriseId ?? (user as any)?.entreprise?.id
    const myEnterprise = enterprises.find((e) => Number(e.id) === Number(myEntId))
    return (
      <div className="min-h-screen flex bg-background">
        <Navigation />
       <main className="flex-1 pt-14 lg:pt-0 pl-0 lg:pl-[calc(16rem+0.75rem)] p-4 lg:p-8">
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="max-w-7xl mx-auto space-y-8"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <motion.h1
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-4xl font-bold tracking-tight text-foreground mt-4"
                  >
                    Mon Entreprise
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-muted-foreground text-lg"
                  >
                    Vue synthétique de vos informations fiscales
                  </motion.p>
                </div>
                <motion.div
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <NotificationBell />
                  <ThemeToggle />
                </motion.div>
              </div>

              {/* Combined Enterprise + Sidebar Card */}
              <motion.div
                className="w-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <Card className="border-border/50 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="space-y-3 pb-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <motion.div
                          className="p-3 rounded-xl bg-primary/10 text-primary"
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        >
                          <Building2 className="h-6 w-6" />
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 }}
                        >
                          <CardTitle className="text-2xl">{myEnterprise?.name ?? "Mon Entreprise"}</CardTitle>
                          <CardDescription className="text-base mt-1">{myEnterprise?.sector ?? ""}</CardDescription>
                        </motion.div>
                      </div>
                      <motion.div
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </motion.div>
                        <span className="text-sm font-medium">{myEnterprise?.status ?? "N/A"}</span>
                      </motion.div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left: stats above then large map occupying most space */}
                      <div className="lg:col-span-2 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Numéro d'Identification Fiscale</div>
                            <div className="text-2xl font-bold text-foreground">{myEnterprise?.nif ?? "N/A"}</div>
                          </div>
                          <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                            <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Chiffre d'affaires annuel
                            </div>
                            <div className="text-2xl font-bold text-foreground">
                              <AnimatedCounter value={myEnterprise?.annualRevenue ?? 0} /> <span className="text-lg text-muted-foreground">MGA</span>
                            </div>
                          </div>
                        </div>

                        <EnterpriseMap address={myEnterprise?.address} heightClass="h-[60vh] lg:h-[70vh]" />
                      </div>

                      {/* Right: stacked info - nif/revenue, description, contacts, actions */}
                      <div className="space-y-6">

                        <Card className="border-border/50">
                          <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2"><Phone className="h-5 w-5 text-primary" /> Coordonnées</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex items-start gap-3">
                                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                  <div className="text-xs text-muted-foreground mb-0.5">Téléphone</div>
                                  <div className="text-sm font-medium">{myEnterprise?.contact?.phone ?? "—"}</div>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                  <div className="text-xs text-muted-foreground mb-0.5">Email</div>
                                  <div className="text-sm font-medium break-all">{myEnterprise?.contact?.email ?? "—"}</div>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                  <div className="text-xs text-muted-foreground mb-0.5">Adresse</div>
                                  <div className="text-sm font-medium leading-relaxed">{myEnterprise?.address ?? "—"}</div>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <Compass className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                  <div className="text-xs text-muted-foreground mb-0.5">Code Postal</div>
                                  <div className="text-sm font-medium leading-relaxed">{myEnterprise?.postalCode ?? "—"}</div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-border/50">
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2"><Zap className="h-4 w-4 text-amber-400" /> Actions Rapides</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-6">
                              <Button onClick={() => (window.location.href = `/mouvements`)} className="w-full justify-start gap-3 h-11 rounded-lg shadow-md bg-primary text-white hover:bg-primary/90" variant="default">
                                <TrendingUp className="h-4 w-4" /> <span className="font-medium">Voir mes mouvements</span>
                              </Button>
                              <Button onClick={() => (window.location.href = `/rapports`)} className="w-full justify-start gap-3 h-11 rounded-lg shadow-md bg-sky-500 text-white hover:bg-sky-600" variant="default">
                                <FileText className="h-4 w-4" /> <span className="font-medium">Générer un rapport</span>
                              </Button>
                              <Button onClick={() => {}} className="w-full justify-start gap-3 h-11 rounded-lg shadow-sm bg-muted/60 text-muted-foreground" variant="outline" disabled>
                                <Settings className="h-4 w-4" /> <span className="font-medium">Modifier mes informations</span>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Tax Alerts Section */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
              >
                <TaxAlerts period={"30d"} />
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </main>

        <EnterpriseForm
          open={showForm}
          onOpenChange={(open) => {
            setShowForm(open)
            if (!open) setEditing(null)
          }}
          initialData={editing || undefined}
          onSaved={(item, action, meta) => {
            try {
              handleOnSaved(item, action, meta)
            } catch (err) {
              console.error(err)
            }
          }}
        />
      </div>
    )
  }

  // Default admin/agent view (unchanged)
  return (
    <div className="min-h-screen flex bg-background">
      <Navigation />
      <main className="flex-1 pt-14 lg:pt-0 pl-0 lg:pl-[calc(16rem+0.75rem)] p-4 lg:p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mt-4">
            <div>
              <h1 className="text-3xl font-bold text-balance">Gestion des Entreprises</h1>
              <p className="text-muted-foreground">Gérez vos entreprises et leurs informations fiscales</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Hide create button for ENTREPRISE and AGENT_FISCAL roles */}
              {(user as any)?.role !== 'ENTREPRISE' && (user as any)?.role !== 'AGENT_FISCAL' && (
                <Button onClick={() => { setEditing(null); setShowForm(true) }} className="animate-glow">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle Entreprise
                </Button>
              )}
              <div className="hidden md:flex items-center gap-3 h-10">
                <NotificationBell />
                <ThemeToggle />
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="glass border-primary/20 hover:border-primary/40 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Building2 className="h-5 w-5 text-primary" />
                  <Badge variant="secondary">Total</Badge>
                </div>
                <CardTitle className="text-2xl font-bold">{stats.total}</CardTitle>
                <CardDescription>Entreprises Enregistrées</CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass border-accent/20 hover:border-accent/40 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CheckCircle className="h-5 w-5 text-accent" />
                  <Badge variant="secondary">Actives</Badge>
                </div>
                <CardTitle className="text-2xl font-bold">{stats.active}</CardTitle>
                <CardDescription>Entreprises Actives</CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass border-blue-500/20 hover:border-blue-500/40 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Users className="h-5 w-5 text-blue-500" />
                  <Badge variant="outline">IR</Badge>
                </div>
                <CardTitle className="text-2xl font-bold">{stats.ir}</CardTitle>
                <CardDescription>Impôt sur le Revenu</CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass border-purple-500/20 hover:border-purple-500/40 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <AlertCircle className="h-5 w-5 text-purple-500" />
                  <Badge variant="outline">IS</Badge>
                </div>
                <CardTitle className="text-2xl font-bold">{stats.is}</CardTitle>
                <CardDescription>Impôt sur les Sociétés</CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card className="glass">
            <CardHeader>
              <CardTitle>Rechercher et Filtrer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, NIF ou secteur..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full lg:w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="inactif">Inactif</SelectItem>
                    <SelectItem value="suspendu">Suspendu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Enterprises Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                <div className="col-span-3 p-4">Chargement des entreprises...</div>
              ) : error ? null
              : filteredEnterprises.length === 0 ? (
              <div className="col-span-3">
                <Card className="glass">
                  <CardContent className="text-center py-12">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Aucune entreprise trouvée</h3>
                    <p className="text-muted-foreground mb-4">
                      Aucune entreprise ne correspond à vos critères de recherche.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("")
                        setStatusFilter("all")
                      }}
                    >
                      Réinitialiser les filtres
                    </Button>
                  </CardContent>
                </Card>
              </div>
              ) : (
              pagedEnterprises.map((enterprise) => (
                <EnterpriseCard key={enterprise.id} enterprise={enterprise as any} onEdit={async (e) => {
                  try {
                    const r = await authFetch(`${API_URL}/api/entreprises/${e.id}` as any)
                    const full = r.ok ? await r.json() : e
                    setEditing({
                      id: full.id,
                      name: full.name,
                      nif: full.siret || e.nif,
                      sector: full.sector || e.sector,
                      status: typeof full.status === 'string' ? (String(full.status).toUpperCase() === 'ACTIF' ? 'Actif' : String(full.status).toUpperCase() === 'INACTIF' ? 'Inactif' : 'Suspendu') : e.status,
                      taxType: full.taxType || e.taxType,
                      annualRevenue: full.annualRevenue ?? e.annualRevenue,
                      legalForm: full.legalForm || e.legalForm,
                      activity: full.activity || e.activity,
                      city: full.city || e.city,
                      postalCode: full.postalCode || e.postalCode,
                      description: full.description || e.description,
                      phone: full.phone || e.contact?.phone,
                      email: full.contactEmail || e.contact?.email,
                      address: full.address || e.address,
                    } as any)
                  } catch {
                    setEditing(e)
                  }
                  setShowForm(true)
                } }
                onDelete={async (ent) => {
                  const res = await Swal.fire({
                    title: `Supprimer ${ent.name}?`,
                    text: 'Cette action est irréversible.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Oui, supprimer',
                    cancelButtonText: 'Annuler',
                  })
                  if (res.isConfirmed) {
                    // optimistic remove
                    const prev = enterprises
                    setEnterprises((prevList) => prevList.filter((e) => e.id !== ent.id))
                    try {
                    const r = await authFetch(`${API_URL}/api/entreprises/${ent.id}`, { method: 'DELETE' } as any)
                      if (!r.ok) throw new Error(await r.text())
                      Swal.fire('Supprimé', `${ent.name} a été supprimée.`, 'success')
                    } catch (err) {
                      // revert
                      setEnterprises(prev)
                      Swal.fire('Erreur', 'La suppression a échoué.', 'error')
                    }
                  }
                }} />
              ))
            )}
          </div>
          {/* Pagination controls */}
          {filteredEnterprises.length > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Préc</Button>
              {Array.from({ length: totalPages }).map((_, idx) => {
                const page = idx + 1
                return (
                  <Button key={page} size="sm" variant={currentPage === page ? undefined : 'ghost'} onClick={() => setCurrentPage(page)}>{page}</Button>
                )
              })}
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Suiv</Button>
            </div>
          )}
        </div>
      </main>

      <EnterpriseForm
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open)
          if (!open) setEditing(null)
        }}
        initialData={editing || undefined}
        onSaved={(item, action, meta) => {
          try {
            handleOnSaved(item, action, meta)
          } catch (err) {
            console.error(err)
          }
        }}
      />
    </div>
  )
}
