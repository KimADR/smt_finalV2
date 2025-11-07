"use client"

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import React from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Users, Plus, Phone, MoreHorizontal, User as UserIcon, Eye, Mail, MapPin, Building2 } from "lucide-react"
import Swal from 'sweetalert2'
import Image from 'next/image'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogContentNoClose, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import UserEditForm from '@/components/user-edit-form'
import { useEffect } from "react"
import { ThemeToggle } from "@/components/theme-toggle"
import NotificationBell from '@/components/notification-bell'
import { authFetch } from "@/lib/utils"
import { showErrorToast } from '@/hooks/use-toast'

// API base URL: can be overridden at build/runtime via NEXT_PUBLIC_API_URL
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

// Data will be fetched from backend API

export default function UtilisateursPage() {
  const [query, setQuery] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [users, setUsers] = useState([] as User[])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null as string | null)
  const { toast } = useToast()
  
  type User = {
    id: number
    username: string
    email: string
    role: string
    fullName?: string
    phone?: string
    avatar?: string
    entreprise?: string | null
    taxId?: string | null
    isActive?: boolean
    createdAt?: string
  }

  type UserForm = { username: string; email: string; role: string; password?: string; phone?: string; avatar?: string; fullName?: string; entreprise?: string }
  const [form, setForm] = useState({ username: "", email: "", role: "ENTREPRISE" } as UserForm)
  const [avatarPreview, setAvatarPreview] = useState(null as string | null)

  // No static fallback users: UI must display real users from the API.

  useEffect(() => {
    let mounted = true
  setLoading(true)
  authFetch(`${API_URL}/api/users` as any)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text())
        return r.json()
      })
      .then((data: User[]) => {
        if (!mounted) return
        if (Array.isArray(data) && data.length > 0) {
          setUsers(data)
        } else {
          // API returned empty array — show no users and a friendly message
          setUsers([])
        }
      })
      .catch((err) => {
        const info = showErrorToast(err)
        setError(info?.message ?? String(err))
        setUsers([])
      })
      .finally(() => setLoading(false))
    return () => { mounted = false }
  }, [])

  const isAdminSmt = (u: User) => {
    const name = (u.fullName || u.username || "").toLowerCase().trim()
    return name === "admin smt"
  }

  const filtered = users
    .filter((u) => !isAdminSmt(u))
    .filter((u) => u.username.toLowerCase().includes(query.toLowerCase()) || (u.email || "").includes(query))

  const stats = { total: users.length, admins: users.filter(u => u.role === 'ADMIN_FISCAL').length }

  const roleLabel = (role: string) => {
    switch (role) {
      case "ADMIN_FISCAL":
        return "Administrateur"
      case "ENTREPRISE":
        return "Entreprise"
      case "AGENT_FISCAL":
        return "Agent fiscal"
      default:
        return role
    }
  }

  // Local images provided in /public/ — use these as avatar fallbacks
  const PUBLIC_IMAGES = [
    "/fitiavana.jpg",
    "/kanto.jpg",
    "/zandry.jpg",
    "/sefobe.gif",
    "/sefo.jpg",
    "/anja.jpg",
    "/tsiaro.png",
  ]

  // Assign one image per visible user (unique while the pool has images).
  // If there are more users than images, the pool is reused deterministically.
  // Pagination: show 6 users per page and order by role then A→Z
  const PER_PAGE = 6
  const [page, setPage] = useState(1)

  // Define preferred role order for grouping
  const ROLE_ORDER = ['ADMIN_FISCAL', 'ENTREPRISE', 'AGENT_FISCAL']

  // Order users by role (ROLE_ORDER) then by fullName/username A→Z
  const ordered = (() => {
    const byRole: any[] = []
    const remaining = filtered.filter((u) => !ROLE_ORDER.includes(u.role))
    for (const r of ROLE_ORDER) {
      const group = filtered.filter((u) => u.role === r).sort((a, b) => {
        const na = (a.fullName || a.username || '').toLowerCase()
        const nb = (b.fullName || b.username || '').toLowerCase()
        return na.localeCompare(nb)
      })
      byRole.push(...group)
    }
    // append any other roles sorted alphabetically
    remaining.sort((a, b) => {
      const na = (a.fullName || a.username || '').toLowerCase()
      const nb = (b.fullName || b.username || '').toLowerCase()
      return na.localeCompare(nb)
    })
    byRole.push(...remaining)
    return byRole
  })()

  const totalPages = Math.max(1, Math.ceil(ordered.length / PER_PAGE))
  const pagedUsers = ordered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const imageAssignments = new Map<number, string>()
  {
    const pool = [...PUBLIC_IMAGES]
    for (const u of pagedUsers) {
      if (pool.length === 0) {
        // refill pool when exhausted
        pool.push(...PUBLIC_IMAGES)
      }
      const img = pool.shift() as string
      imageAssignments.set(u.id, img)
    }
  }

  // Reset page when search query or filtered list changes
  useEffect(() => {
    setPage(1)
  }, [query])

  function getEnterpriseName(raw: any) {
    if (!raw) return ''
    if (typeof raw === 'string') return raw
    if (typeof raw === 'object') return raw.name || raw.nom || String(raw.id ?? '') || ''
    return String(raw)
  }

  async function handleDeleteUser(u: User) {
    const res = await Swal.fire({
      title: `Supprimer ${u.fullName || u.username}?`,
      text: 'Cette action est irréversible.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
    })
    if (res.isConfirmed) {
      const prev = users
      setUsers((prevList) => prevList.filter((e) => e.id !== u.id))
      try {
        const r = await authFetch(`${API_URL}/api/users/${u.id}`, { method: 'DELETE' } as any)
        if (!r.ok) throw new Error(await r.text())
        Swal.fire('Supprimé', `${u.username} a été supprimé.`, 'success')
      } catch (err) {
        setUsers(prev)
        Swal.fire('Erreur', 'La suppression a échoué.', 'error')
      }
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Navigation />
      <main className="flex-1 pt-14 lg:pt-0 pl-0 lg:pl-[calc(16rem+0.75rem)] p-4 lg:p-6">
        <div className="max-w-7xl mx-auto space-y-8 mt-4">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Utilisateurs</h1>
              <p className="text-muted-foreground">Gérez les comptes utilisateurs de la plateforme</p>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={() => setShowForm(true)} className="animate-glow">
                <Plus className="h-4 w-4 mr-2" />
                Nouvel utilisateur
              </Button>
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
                  <Users className="h-5 w-5 text-primary" />
                  <Badge variant="secondary">Total</Badge>
                </div>
                <CardTitle className="text-2xl font-bold">{stats.total}</CardTitle>
                <CardDescription>Comptes enregistrés</CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass border-accent/20 hover:border-accent/40 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Users className="h-5 w-5 text-accent" />
                  <Badge variant="secondary">Admins</Badge>
                </div>
                <CardTitle className="text-2xl font-bold">{stats.admins}</CardTitle>
                <CardDescription>Comptes administrateurs</CardDescription>
              </CardHeader>
            </Card>

            <div />
            <div />
          </div>

          {/* Search */}
          <Card className="glass">
            <CardHeader>
              <CardTitle>Rechercher</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Rechercher par nom ou email..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
              <div className="col-span-3 p-4">Chargement des utilisateurs...</div>
            ) : error ? null
            : filtered.length === 0 ? (
              <div className="col-span-3">
                <Card className="glass">
                  <CardContent className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Aucun utilisateur trouvé</h3>
                    <p className="text-muted-foreground mb-4">Aucun utilisateur ne correspond à vos critères de recherche.</p>
                    <Button variant="outline" onClick={() => setQuery("")}>Réinitialiser la recherche</Button>
                  </CardContent>
                </Card>
              </div>
              ) : (
              pagedUsers.map((u: User) => {
                // If user has a custom avatar (not a placeholder), use it; otherwise use the pre-assigned unique image
                const assigned = imageAssignments.get(u.id)
                const avatarUrl = (u.avatar && !u.avatar.includes('placeholder'))
                  ? u.avatar
                  : (assigned || PUBLIC_IMAGES[u.id % PUBLIC_IMAGES.length])
                return (
                  <Card key={u.id} className="overflow-hidden hover:shadow-xl transition-all duration-200">
                    {/* Image header */}
                    <div className="relative">
                      <div className="h-64 bg-muted overflow-hidden relative">
                        <Image src={avatarUrl} alt={u.username} fill className="object-cover object-center" priority={false} />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-sm px-4 py-2 flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20">
                          <UserIcon className="h-3.5 w-3.5" />
                        </span>
                        <span className="font-medium">{roleLabel(u.role)}</span>
                      </div>
                    </div>

                    {/* Body */}
                    <CardContent className="pt-4 space-y-3">
                    <div>
                      <div className="text-xl font-semibold leading-tight">{u.fullName || u.username}</div>
                      <div className="text-sm text-muted-foreground">{getEnterpriseName(u.entreprise) || ""}</div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{u.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{u.phone || "-"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>Madagascar</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Badge variant="secondary">{u.isActive === false ? "Inactif" : "Actif"}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <a href={`/utilisateurs/${u.id}`}> 
                                <Eye className="h-4 w-4 mr-2" />
                                Voir le profil
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <button
                                onClick={() => setEditingUserId(u.id)}
                                className="flex items-center w-full text-left"
                              >
                                <svg className="inline-block mr-2" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                Modifier
                              </button>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="flex items-center w-full text-left text-destructive"
                              >
                                <svg className="inline-block mr-2" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6M10 6V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                Supprimer
                              </button>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
                )
              })
            )}
          </div>

          {/* Pagination controls */}
          {ordered.length > PER_PAGE && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Préc</Button>
              {Array.from({ length: totalPages }).map((_, idx) => {
                const p = idx + 1
                return (
                  <Button key={p} size="sm" variant={page === p ? undefined : 'ghost'} onClick={() => setPage(p)}>{p}</Button>
                )
              })}
              <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Suiv</Button>
            </div>
          )}
        </div>
      </main>

      {/* User creation dialog - styled like other forms */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="w-full max-w-2xl">
            <div className="bg-card p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-semibold">Nouvel utilisateur</h3>
                  <p className="text-sm text-muted-foreground">Créez un compte utilisateur</p>
                </div>
                <div>
                  <Button variant="outline" onClick={() => setShowForm(false)}>
                    Annuler
                  </Button>
                </div>
              </div>

              <form onSubmit={(e) => handleCreate(e)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Nom d'utilisateur *</label>
                    <Input
                      value={form.username}
                          onChange={(e: any) => setForm({ ...form, username: e.target.value })}
                      placeholder="ex: jdupont"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Email *</label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e: any) => setForm({ ...form, email: e.target.value })}
                      placeholder="ex: j.dupont@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Rôle *</label>
                      <Select value={form.role} onValueChange={(value: string) => setForm({ ...form, role: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un rôle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN_FISCAL">Administrateur</SelectItem>
                          <SelectItem value="ENTREPRISE">Entreprise</SelectItem>
                          <SelectItem value="AGENT_FISCAL">Agent fiscal</SelectItem>
                        </SelectContent>
                      </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Mot de passe *</label>
                    <Input
                      type="password"
                      value={form.password || ""}
                      onChange={(e: any) => setForm({ ...form, password: e.target.value })}
                      placeholder="Choisir un mot de passe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Téléphone</label>
                    <Input
                      type="tel"
                      value={form.phone || ""}
                      onChange={(e: any) => setForm({ ...form, phone: e.target.value })}
                      placeholder="Ex: +261341234567"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Photo de profil</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e: any) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const url = URL.createObjectURL(file)
                          setAvatarPreview(url)
                          setForm({ ...form, avatar: url })
                        }
                      }}
                      className="w-full"
                    />

                        {avatarPreview && (
                          <div className="mt-2 w-24 h-24 rounded-full overflow-hidden">
                            <Image src={avatarPreview} alt="Preview" width={96} height={96} className="object-cover" unoptimized />
                          </div>
                        )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowForm(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" className="animate-glow" disabled={!form.username || !form.email || !form.password}>
                    Créer
                  </Button>
                </div>
              </form>
              
              {/* end of form */}
            </div>
          </div>
        </div>
      )}

      {/* edit modal - controlled by editingUserId */}
      {editingUserId !== null && (
        <Dialog open={true} onOpenChange={(open) => { if (!open) setEditingUserId(null) }}>
          <DialogContentNoClose className="w-full max-w-3xl p-0 max-h-[80vh] overflow-auto">
            <div className="mt-4">
              <UserEditForm
                userId={String(editingUserId)}
                onClose={() => setEditingUserId(null)}
                onUpdated={(updated) => {
                  // Update users list in-place so the UI reflects the change immediately
                  setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)))
                }}
              />
            </div>
          </DialogContentNoClose>
        </Dialog>
      )}
    </div>

  )

  function handleCreate(e: any) {
    e.preventDefault()
    // Post to backend
    authFetch(`${API_URL}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text())
        return r.json()
      })
      .then((created: User) => {
        setUsers([created, ...users])
        setForm({ username: "", email: "", role: "ENTREPRISE" })
        setShowForm(false)
  import('@/hooks/use-toast').then((m) => { try { m.showOperationSuccessToast('create', `l\'utilisateur ${created.username}`) } catch (e) { toast({ title: "Utilisateur créé", description: `${created.username} a été créé.`, variant: 'success' }) } }).catch(() => { toast({ title: "Utilisateur créé", description: `${created.username} a été créé.`, variant: 'success' }) })
      })
      .catch((err) => {
        const info = showErrorToast(err)
        setError(info?.message ?? String(err))
      })
  }

  // Render the edit modal controlled by `editingUserId`.
  // When editingUserId is set, the Dialog is opened and shows the UserEditForm.
  // Closing the dialog will clear the editing id.
}
