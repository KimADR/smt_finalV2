"use client"

import React, { useEffect, useState } from "react"
import { authFetch } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { TrendingUp, TrendingDown, DollarSign, Building2, Calendar, Download, Filter } from "lucide-react"

// initial empty states (will be populated from backend)

// will be fetched from backend

// will be fetched from backend

// will be fetched from backend

export function AnalyticsDashboard() {
  const [entreprisesCount, setEntreprisesCount] = useState<number | null>(null)
  const [revenusTotal, setRevenusTotal] = useState<number | null>(null)
  const [monthlyData, setMonthlyData] = useState<Array<any>>([])
  const [sectorPerformance, setSectorPerformance] = useState<Array<any>>([])
  const [taxComplianceData, setTaxComplianceData] = useState<Array<any>>([])
  const [cashFlowData, setCashFlowData] = useState<Array<any>>([])
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

  useEffect(() => {
    let mounted = true
    // fetch entreprises and mouvements to compute simple metrics
    Promise.all([
      authFetch(`${API_URL}/api/analytics/summary` as any).then((r) => r.ok ? r.json() : {}),
      authFetch(`${API_URL}/api/analytics/monthly?months=6` as any).then((r) => r.ok ? r.json() : []),
      authFetch(`${API_URL}/api/analytics/sector` as any).then((r) => r.ok ? r.json() : []),
      authFetch(`${API_URL}/api/analytics/tax-compliance` as any).then((r) => r.ok ? r.json() : []),
      authFetch(`${API_URL}/api/analytics/cashflow?weeks=4` as any).then((r) => r.ok ? r.json() : []),
    ])
      .then(([summary, monthly, sector, taxCompliance, cashflow]: any) => {
        if (!mounted) return
        setEntreprisesCount(typeof summary.entreprises === 'number' ? summary.entreprises : null)
        setRevenusTotal(typeof summary.total === 'number' ? summary.total : null)

        if (Array.isArray(monthly)) {
          const mapped = monthly.map((m: any) => ({ month: (m.month || '').slice(5) || m.month, revenus: m.total || 0, depenses: 0, benefice: m.total || 0, entreprises: 0 }))
          setMonthlyData(mapped)
        }

        if (Array.isArray(sector)) setSectorPerformance(sector)
        if (Array.isArray(taxCompliance)) setTaxComplianceData(taxCompliance)
        if (Array.isArray(cashflow)) setCashFlowData(cashflow)
      })
      .catch(() => {
        if (!mounted) return
        setEntreprisesCount(null)
        setRevenusTotal(null)
      })

    return () => { mounted = false }
  }, [])
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Analyses Avancées</h2>
          <p className="text-muted-foreground">Insights détaillés sur les performances financières</p>
        </div>

        <div className="flex items-center gap-3">
          <Select defaultValue="month">
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass border-emerald-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              <div className="flex items-center gap-1 text-emerald-500 text-sm">
                <TrendingUp className="h-3 w-3" />
                +18.5%
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">{revenusTotal != null ? `${(revenusTotal/1000000).toFixed(1)}M` : '—'}</CardTitle>
            <CardDescription>Revenus Totaux (MGA)</CardDescription>
          </CardHeader>
        </Card>

        <Card className="glass border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Building2 className="h-5 w-5 text-primary" />
              <div className="flex items-center gap-1 text-primary text-sm">
                <TrendingUp className="h-3 w-3" />
                +8.9%
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">{entreprisesCount ?? '—'}</CardTitle>
            <CardDescription>Entreprises Actives</CardDescription>
          </CardHeader>
        </Card>

        <Card className="glass border-blue-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <Badge variant="secondary">Marge</Badge>
            </div>
            <CardTitle className="text-2xl font-bold">26.8%</CardTitle>
            <CardDescription>Marge Bénéficiaire Moyenne</CardDescription>
          </CardHeader>
        </Card>

        <Card className="glass border-purple-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Calendar className="h-5 w-5 text-purple-500" />
              <Badge variant="outline">Conformité</Badge>
            </div>
            <CardTitle className="text-2xl font-bold">89.3%</CardTitle>
            <CardDescription>Taux de Conformité Fiscale</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Performance Mensuelle</CardTitle>
            <CardDescription>Évolution des revenus, dépenses et bénéfices</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${(value / 1000000).toFixed(1)}M MGA`,
                    name === "revenus" ? "Revenus" : name === "depenses" ? "Dépenses" : "Bénéfice",
                  ]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenus"
                  stackId="1"
                  stroke="hsl(var(--chart-2))"
                  fill="hsl(var(--chart-2))"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="depenses"
                  stackId="2"
                  stroke="hsl(var(--destructive))"
                  fill="hsl(var(--destructive))"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="benefice"
                  stackId="3"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.8}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sector Performance */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Performance par Secteur</CardTitle>
            <CardDescription>Revenus et croissance par secteur d'activité</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sectorPerformance} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                <YAxis dataKey="sector" type="category" width={80} />
                <Tooltip
                  formatter={(value: number) => [`${(value / 1000000).toFixed(1)}M MGA`, "Revenus"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="revenus" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tax Compliance */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Conformité Fiscale</CardTitle>
            <CardDescription>Répartition du statut de conformité des entreprises</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={taxComplianceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {taxComplianceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.couleur} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string, props: any) => [
                    `${value} entreprises (${props.payload.percentage}%)`,
                    props.payload.status,
                  ]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cash Flow */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Flux de Trésorerie</CardTitle>
            <CardDescription>Entrées et sorties hebdomadaires</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="semaine" />
                <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${(value / 1000000).toFixed(1)}M MGA`,
                    name === "entrees" ? "Entrées" : "Sorties",
                  ]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="entrees"
                  stroke="hsl(var(--accent))"
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--accent))", strokeWidth: 2, r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="sorties"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--destructive))", strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Sector Growth Details */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Détail de Croissance par Secteur</CardTitle>
          <CardDescription>Performance détaillée et tendances sectorielles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sectorPerformance.map((sector) => (
              <div
                key={sector.sector}
                className="flex items-center justify-between p-4 rounded-lg border border-border/50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: sector.couleur }} />
                  <div>
                    <p className="font-medium">{sector.sector}</p>
                    <p className="text-sm text-muted-foreground">
                      {(sector.revenus / 1000000).toFixed(1)}M MGA de revenus
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge
                    className={
                      sector.croissance > 0
                        ? "bg-accent/10 text-accent border-accent/20"
                        : "bg-destructive/10 text-destructive border-destructive/20"
                    }
                  >
                    {sector.croissance > 0 ? "+" : ""}
                    {sector.croissance}%
                  </Badge>
                  {sector.croissance > 0 ? (
                    <TrendingUp className="h-4 w-4 text-accent" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
