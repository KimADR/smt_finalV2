"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Building2, TrendingUp, Phone, Mail, MapPin, Compass, Zap } from 'lucide-react'
import EnterpriseMap from '@/components/enterprise-map'
import NotificationBell from '@/components/notification-bell'
import { ThemeToggle } from '@/components/theme-toggle'
import { authFetch } from '@/lib/utils'
// Local animated counter (small reusable inline component)
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
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      const next = Math.round(start + (end - start) * eased)
      setV(next)
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return <span>{new Intl.NumberFormat('fr-FR').format(v)}</span>
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export default function EnterpriseDetailPage() {
  const params = useParams()
  const id = params?.id
  const [enterprise, setEnterprise] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    if (!id) return
    setLoading(true)
    authFetch(`${API_URL}/api/entreprises/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text())
        return r.json()
      })
      .then((data) => {
        if (!mounted) return
        const e = data
        const mapped = {
          id: e.id,
          name: e.name,
          nif: e.siret || e.nif || '',
          sector: e.sector || e.activity || '',
          status: typeof e.status === 'string'
            ? (String(e.status).toUpperCase() === 'ACTIF' ? 'Actif' : String(e.status).toUpperCase() === 'INACTIF' ? 'Inactif' : 'Suspendu')
            : 'Actif',
          taxType: e.taxType || 'IR',
          annualRevenue: Number(e.annualRevenue || e.revenusTotal || 0),
          legalForm: e.legalForm || undefined,
          activity: e.activity || undefined,
          city: e.city || undefined,
          postalCode: e.postalCode || undefined,
          description: e.description || undefined,
          contact: { phone: e.phone || undefined, email: e.contactEmail || undefined },
          address: e.address || '',
        }
        setEnterprise(mapped)
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))

    return () => { mounted = false }
  }, [id])

  if (loading) return <div className="p-6">Chargement...</div>
  if (!enterprise) return <div className="p-6">Entreprise non trouvée</div>

  return (
    <div className="min-h-screen flex bg-background">
      <Navigation />
      <main className="flex-1 pt-14 lg:pt-0 pl-0 lg:pl-[calc(16rem+0.75rem)] p-4 lg:p-8">
        <AnimatePresence>
          <motion.div className="max-w-7xl mx-auto space-y-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mt-4">
              <div>
                <h1 className="text-4xl font-bold">{enterprise.name}</h1>
                <p className="text-muted-foreground">Vue synthétique détaillée</p>
              </div>
              <div className="flex items-center gap-3">
                <NotificationBell />
                <ThemeToggle />
              </div>
            </div>

            <Card className="border-border/50 shadow-lg">
              <CardHeader className="pb-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary"><Building2 className="h-6 w-6" /></div>
                    <div>
                      <CardTitle className="text-2xl">{enterprise.name}</CardTitle>
                      <CardDescription className="text-base mt-1">{enterprise.sector}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">{enterprise.status}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                        <div className="text-sm font-medium text-muted-foreground mb-1">Numéro d'Identification Fiscale</div>
                        <div className="text-2xl font-bold text-foreground">{enterprise.nif || 'N/A'}</div>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                        <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2"><TrendingUp className="h-4 w-4" />Chiffre d'affaires annuel</div>
                        <div className="text-2xl font-bold text-foreground"><AnimatedCounter value={enterprise.annualRevenue ?? 0} /> <span className="text-lg text-muted-foreground">MGA</span></div>
                      </div>
                    </div>
                    <EnterpriseMap address={enterprise.address} heightClass="h-[60vh] lg:h-[70vh]" />
                  </div>

                  <div className="space-y-6">

                    <Card className="border-border/50">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Phone className="h-5 w-5 text-primary" /> Coordonnées</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          <div className="flex items-start gap-3"><Phone className="h-4 w-4 text-muted-foreground mt-0.5" /><div><div className="text-xs text-muted-foreground mb-0.5">Téléphone</div><div className="text-sm font-medium">{enterprise.contact?.phone ?? '—'}</div></div></div>
                          <div className="flex items-start gap-3"><Mail className="h-4 w-4 text-muted-foreground mt-0.5" /><div><div className="text-xs text-muted-foreground mb-0.5">Email</div><div className="text-sm font-medium break-all">{enterprise.contact?.email ?? '—'}</div></div></div>
                          <div className="flex items-start gap-3"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5" /><div><div className="text-xs text-muted-foreground mb-0.5">Adresse</div><div className="text-sm font-medium leading-relaxed">{enterprise.address ?? '—'}</div></div></div>
                          <div className="flex items-start gap-3"><Compass className="h-4 w-4 text-muted-foreground mt-0.5" /><div><div className="text-xs text-muted-foreground mb-0.5">Code Postal</div><div className="text-sm font-medium leading-relaxed">{enterprise.postalCode ?? '—'}</div></div></div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-border/50">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Zap className="h-4 w-4 text-amber-400" /> Actions Rapides</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Button onClick={() => (window.location.href = `/mouvements`)} className="w-full justify-start gap-3 h-11 rounded-lg shadow-md bg-primary text-white hover:bg-primary/90">Voir mes mouvements</Button>
                          <Button onClick={() => (window.location.href = `/rapports`)} className="w-full justify-start gap-3 h-11 rounded-lg shadow-md bg-sky-500 text-white hover:bg-sky-600">Générer un rapport</Button>
                          <Button className="w-full justify-start gap-3 h-11 rounded-lg shadow-sm bg-muted/60 text-muted-foreground" disabled>Modifier mes informations</Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* TaxAlerts removed on user request */}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
