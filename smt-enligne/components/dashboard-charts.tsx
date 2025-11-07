"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  LabelList,
} from "recharts"

import React, { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { authFetch } from '@/lib/utils'
import { useAuth } from '@/components/auth-context'

// initially empty; will be filled from backend
const emptyArray: any[] = []

export function DashboardCharts({ period, selectedEnterprise }: { period: string; selectedEnterprise?: string }) {
  const { theme } = useTheme();
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
  const [revenueExpenseData, setRevenueExpenseData] = useState<any[]>(emptyArray)
  const [sectorData, setSectorData] = useState<any[]>(emptyArray)
  const [netBalanceData, setNetBalanceData] = useState<any[]>(emptyArray)
  const [topEnterprisesData, setTopEnterprisesData] = useState<any[]>(emptyArray)

  const { user, role } = useAuth()

  useEffect(() => {
    // Skip initial render when role or user is not ready
    if (!role || !user) return;

    let mounted = true
    const params = new URLSearchParams({ period })
    const userEntId = (user as any)?.entrepriseId ?? (user as any)?.entreprise?.id
    // Apply entreprise filter: ENTREPRISE users always scoped to their entreprise
    if (role === 'ENTREPRISE' && userEntId) params.set('entrepriseId', String(userEntId))
    // ADMIN_FISCAL can select a specific entreprise via the page-level select
    if (role === 'ADMIN_FISCAL' && selectedEnterprise && selectedEnterprise !== 'all') {
      params.set('entrepriseId', String(selectedEnterprise))
    }
    console.log('[DashboardCharts] Fetching with params:', params.toString(), { role, selectedEnterprise, userEntId })

    // Always fetch monthly data. For non-ENTREPRISE users also fetch sector/top lists.
    const monthlyPromise = authFetch(`${API_URL}/api/analytics/monthly?${params.toString()}` as any).then(r => r.ok ? r.json() : [])

    if (role === 'ENTREPRISE') {
      monthlyPromise.then((monthly: any) => {
        if (!mounted) return
        const mapped = (monthly || []).map((m: any) => ({
          month: (m.month || '').slice(5) || m.month,
          revenus: Number(m.revenus || 0),
          depenses: Number(m.depenses || 0)
        }))
        setRevenueExpenseData(mapped)
        setNetBalanceData(mapped.map((m: any) => ({ month: m.month, solde: m.revenus - m.depenses })))
        // clear other charts for entreprise users
        setSectorData([])
        setTopEnterprisesData([])
      }).catch((err) => {
        // eslint-disable-next-line no-console
        console.error('dashboard charts (monthly) fetch error', err)
      })
    } else {
      const sectorPromise = authFetch(`${API_URL}/api/analytics/sector?${params.toString()}` as any).then(r => r.ok ? r.json() : [])
      const topPromise = authFetch(`${API_URL}/api/analytics/top-enterprises?${params.toString()}` as any).then(r => r.ok ? r.json() : [])

      Promise.all([monthlyPromise, sectorPromise, topPromise]).then(([monthly, sector, top]: any) => {
        if (!mounted) return
        const mapped = (monthly || []).map((m: any) => ({
          month: (m.month || '').slice(5) || m.month,
          revenus: Number(m.revenus || 0),
          depenses: Number(m.depenses || 0)
        }))
        setRevenueExpenseData(mapped)
        setNetBalanceData(mapped.map((m: any) => ({ month: m.month, solde: m.revenus - m.depenses })))
        setSectorData((sector || []).map((s: any, i: number) => ({ name: s.sector || `Secteur ${i+1}`, value: Number(s.revenus || 0), color: `hsl(var(--chart-${(i%5)+1}))` })))
        const sortedTop = (top || [])
          .map((t: any, i: number) => ({
            name: t.name,
            revenus: Number(t.revenus || 0),
            color: `hsl(var(--chart-${(i%5)+1}))`,
          }))
          .sort((a: {revenus: number}, b: {revenus: number}) => b.revenus - a.revenus)
          .slice(0, 5)
        setTopEnterprisesData(sortedTop)
      }).catch((err) => {
        // basic error logging to surface issues during dev
        // eslint-disable-next-line no-console
        console.error('dashboard charts fetch error', err)
      })
    }

    return () => { mounted = false }
  }, [user, role, period, selectedEnterprise])

  return (
    <>
      {/* Revenue vs Expenses */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Évolution Revenus vs Dépenses</CardTitle>
          <CardDescription>Comparaison mensuelle des flux financiers</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueExpenseData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
              <Tooltip
                formatter={(value: number) => [`${(value / 1000000).toFixed(1)}M MGA`, ""]}
                labelStyle={{ color: "hsl(var(--foreground))" }}
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
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Sector Distribution (hidden for ENTREPRISE users) */}
      {role !== 'ENTREPRISE' && (
        <Card className="glass">
          <CardHeader>
            <CardTitle>Répartition par Secteur</CardTitle>
            <CardDescription>Distribution des entreprises par domaine d'activité</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sectorData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name }) => (
                    <span style={{
                      color: theme === 'dark' ? '#F3F4F6' : '#222',
                      fontWeight: 500,
                      fontSize: 13,
                      textShadow: theme === 'dark' ? '0 1px 4px #000' : undefined
                    }}>{name}</span>
                  )}
                >
                  {sectorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${(value/1000000).toFixed(2)}M MGA`, "Revenus"]}
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#222' : 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: theme === 'dark' ? '#F3F4F6' : 'hsl(var(--foreground))',
                  }}
                  itemStyle={{ color: theme === 'dark' ? '#F3F4F6' : 'hsl(var(--foreground))' }}
                  labelStyle={{ color: theme === 'dark' ? '#F3F4F6' : 'hsl(var(--foreground))' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Net Balance Trend */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Tendance du Solde Net</CardTitle>
          <CardDescription>Évolution du bénéfice net mensuel</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={netBalanceData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
              <Tooltip
                formatter={(value: number) => [`${(value / 1000000).toFixed(1)}M MGA`, "Solde Net"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="solde"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Enterprises (hidden for ENTREPRISE users) */}
      {role !== 'ENTREPRISE' && (
        <Card className="glass">
          <CardHeader>
            <CardTitle>Top 5 Entreprises</CardTitle>
            <CardDescription>Classement par chiffre d'affaires</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={topEnterprisesData}
                layout="horizontal"
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                barCategoryGap={18}
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis dataKey="name" type="category" axisLine={false} tickLine={false}
                  tick={{ fill: theme === 'dark' ? '#F3F4F6' : 'hsl(var(--foreground))', fontWeight: 500 }}
                />
                <YAxis type="number" tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} axisLine={false} tickLine={false}
                  tick={{ fill: theme === 'dark' ? '#F3F4F6' : 'hsl(var(--foreground))', fontWeight: 500 }}
                />
                <Tooltip
                  formatter={(value: number) => [`${(value / 1000000).toFixed(2)}M MGA`, "Chiffre d'affaires"]}
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#222' : 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: theme === 'dark' ? '#F3F4F6' : 'hsl(var(--foreground))',
                  }}
                  itemStyle={{ color: theme === 'dark' ? '#F3F4F6' : 'hsl(var(--foreground))' }}
                  labelStyle={{ color: theme === 'dark' ? '#F3F4F6' : 'hsl(var(--foreground))', fontWeight: 600 }}
                />
                <Bar dataKey="revenus" radius={[8, 8, 8, 8]} isAnimationActive>
                  {topEnterprisesData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                  <LabelList
                    dataKey="revenus"
                    position="top"
                    formatter={(label: React.ReactNode) => {
                      const v = typeof label === 'number' ? label : Number(label);
                      return isNaN(v) ? '' : `${(v / 1000000).toFixed(2)}M`;
                    }}
                    style={{ fontWeight: 600, fill: theme === 'dark' ? '#F3F4F6' : 'hsl(var(--foreground))', textShadow: theme === 'dark' ? '0 1px 4px #000' : undefined }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </>
  )
}
