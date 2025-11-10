"use client"

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Mail, Phone, Building2, User as UserIcon } from 'lucide-react'
import { Navigation } from '@/components/navigation'
import UserEditModal from '@/components/user-edit-modal'
import { authFetch } from '@/lib/utils'

export default function UserProfile({ params }: any) {
  const { id } = params
  const [user, setUser] = useState<any | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Helpers to safely extract enterprise id/name when API returns either
  // a string or an object { id, name } (or other shapes). This avoids
  // passing raw objects directly into JSX children.
  function getEnterpriseName(raw: any) {
    if (!raw) return '—'
    if (typeof raw === 'string') return raw
    if (typeof raw === 'object') return raw.name || raw.nom || String(raw.id ?? '') || '—'
    return String(raw)
  }

  function getEnterpriseId(raw: any) {
    if (!raw) return null
    if (typeof raw === 'object') return raw.id ?? null
    return null
  }

  useEffect(() => {
    let mounted = true
    setLoading(true)
    authFetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'}/api/users/${id}` as any)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text())
        return r.json()
      })
      .then((u) => { if (mounted) setUser(u) })
      .catch((e) => { if (mounted) setError(String(e)) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [id])

  if (loading) return <div className="p-6">Chargement...</div>
  if (error || !user) return <div className="p-6">Utilisateur introuvable</div>

  return (
    <div className="min-h-screen flex bg-background">
      <Navigation />

      <main className="flex-1 pt-14 lg:pt-0 pl-0 lg:pl-[calc(16rem+0.75rem)] p-4 lg:p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="overflow-hidden">
            <div className="relative h-40 bg-gradient-to-r from-primary/20 to-accent/20" />
            <CardContent className="-mt-12">
              <div className="flex items-end gap-4">
                <div className="w-24 h-24 rounded-2xl overflow-hidden ring-2 ring-background bg-muted">
                  {user.avatar ? (
                    <Image src={user.avatar} alt={user.username} width={96} height={96} className="object-cover w-full h-full" unoptimized />
                  ) : (
                    <div className="w-full h-full bg-gray-200" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-semibold">{user.fullName || user.username}</h1>
                    <Badge variant={user.isActive ? 'secondary' : 'outline'}>{user.isActive ? 'Actif' : 'Inactif'}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">Rôle: {user.role}</div>
                </div>
                <div>
                  <UserEditModal userId={String(user.id)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <Card className="glass">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Contact</CardTitle><CardDescription>Coordonnées</CardDescription></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {user.email}</div>
                    <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {user.phone || '-'}</div>
                  </CardContent>
                </Card>

                <Card className="glass">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Entreprise</CardTitle><CardDescription>Affectation</CardDescription></CardHeader>
                  <CardContent className="text-sm">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {user.entreprise ? (
                          <a href={`/entreprises/${user.entreprise.id}`} className="text-primary underline">
                            {user.entreprise.name}
                          </a>
                        ) : (
                          '—'
                        )}
                      </div>
                    </CardContent>
                </Card>

                <Card className="glass">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Métadonnées</CardTitle><CardDescription>Informations système</CardDescription></CardHeader>
                  <CardContent className="text-sm">
                    <div>Créé le: {new Date(user.createdAt).toLocaleString()}</div>
                    <div>ID: {user.id}</div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
