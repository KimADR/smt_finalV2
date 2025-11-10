"use client"

import React, { useEffect, useState } from 'react'
import { authFetch } from '@/lib/utils'
import { showErrorToast } from '@/hooks/use-toast'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { DialogClose } from '@/components/ui/dialog'

type Props = {
  userId: string
  onClose?: () => void
  onUpdated?: (user: any) => void
}

export default function UserEditForm({ userId, onClose, onUpdated }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<{ username: string; email: string; fullName: string; phone: string; role: string; avatar: string }>({ username: '', email: '', fullName: '', phone: '', role: 'ENTREPRISE', avatar: '' })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333')
    authFetch(`${API_URL}/api/users/${userId}` as any)
      .then(async (r) => { if (!r.ok) throw new Error(await r.text()); return r.json() })
      .then((data) => {
        if (!mounted) return
        setForm({
          username: data.username || '',
          email: data.email || '',
          fullName: data.fullName || '',
          phone: data.phone || '',
          role: data.role || 'ENTREPRISE',
          avatar: data.avatar || '',
        })
        setPreviewUrl(data?.avatar || null)
      })
      .catch((e) => {
        const info = showErrorToast(e)
        setError(info?.message ?? String(e))
      })
      .finally(() => setLoading(false))
    return () => { mounted = false }
  }, [userId])

  function handleChange(e: any) {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
  }

  function handleFileChange(e: any) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "Veuillez sélectionner une image de moins de 2MB.",
        variant: "destructive",
      })
      return
    }

    setAvatarFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new window.Image()
    img.onload = () => {
      const maxSize = 300
      let { width, height } = img
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width
          width = maxSize
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height
          height = maxSize
        }
      }
      canvas.width = width
      canvas.height = height
      ctx?.drawImage(img, 0, 0, width, height)
      const base64 = canvas.toDataURL('image/jpeg', 0.8)
      setForm({ ...form, avatar: base64 })
    }
    img.src = URL.createObjectURL(file)
  }

  useEffect(() => {
    const okUsername = String(form.username || '').trim().length > 0
    const email = String(form.email || '')
    const okEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
    setIsValid(okUsername && okEmail)
  }, [form.username, form.email])

  function handleSubmit(e: any) {
    e.preventDefault()
    setLoading(true)
    const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333')
    const payload = {
      username: form.username,
      email: form.email,
      fullName: form.fullName,
      phone: form.phone,
      role: form.role,
      avatar: form.avatar,
    }
    authFetch(`${API_URL}/api/users/${userId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) } as any)
      .then(async (r) => { if (!r.ok) throw new Error(await r.text()); return r.json() })
      .then(() => {
        import('@/hooks/use-toast').then((mod) => {
          try { mod.showOperationSuccessToast('update', "l'utilisateur") } catch (e) { toast({ title: 'Utilisateur modifié', description: 'Le profil a été mis à jour.', variant: 'success' }) }
        }).catch(() => {
          toast({ title: 'Utilisateur modifié', description: 'Le profil a été mis à jour.', variant: 'success' })
        })
        try { router.refresh() } catch (e) { /* ignore */ }
        // If server returned updated entity, call onUpdated so parent can update client state immediately
        // Attempt to read JSON from response in previous then chain isn't available here; instead re-fetch the user
        authFetch(`${API_URL}/api/users/${userId}` as any).then(async (r) => { if (r.ok) { const updated = await r.json(); onUpdated?.(updated) } }).catch(() => { /* ignore */ })
        onClose?.()
      })
      .catch((e) => {
        const raw = String(e)
        setError(raw)
        try { const p = JSON.parse(raw); if (p && p.statusCode === 401) { toast({ title: 'Accès refusé', description: 'Vous devez vous connecter pour accéder à cette ressource.', variant: 'destructive' }); return } } catch {}
        const friendly = (() => { try { const p = JSON.parse(raw); return p.message || String(p) } catch { return raw } })()
        toast({ title: 'Erreur de modification', description: friendly, variant: 'destructive' })
      })
      .finally(() => setLoading(false))
  }

  if (loading) return <div className="p-6">Chargement...</div>
  if (error) {
    let friendly = String(error)
    try { const p = JSON.parse(String(error)); if (p && p.statusCode === 401) friendly = 'Accès refusé — veuillez vous connecter.'; else friendly = p.message || String(p) } catch {}
    return <div className="p-6 text-red-500">Erreur: {friendly}</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Modifier l'utilisateur</CardTitle>
              <CardDescription>Mettez à jour les informations du compte</CardDescription>
            </div>
            <Badge variant="secondary">Profil</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Nom d'utilisateur</label>
                <Input name="username" value={form.username || ''} onChange={handleChange} placeholder="ex: jdupont" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Nom complet</label>
                <Input name="fullName" value={form.fullName || ''} onChange={handleChange} placeholder="Jean Dupont" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Email</label>
                <Input name="email" value={form.email || ''} onChange={handleChange} type="email" placeholder="j.dupont@example.com" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Téléphone</label>
                <Input name="phone" value={form.phone || ''} onChange={handleChange} placeholder="Ex: +261341234567" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Rôle</label>
                <Select value={form.role || 'ENTREPRISE'} onValueChange={(v: any) => setForm({ ...form, role: v })}>
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
                <label className="text-sm text-muted-foreground">Avatar (URL) ou fichier</label>
                <Input name="avatar" value={form.avatar || ''} onChange={handleChange} placeholder="https://..." />
                <input type="file" accept="image/*" onChange={handleFileChange} className="mt-2" />
              </div>
            </div>

            {previewUrl && (
              <div className="mt-1 w-32 h-32 rounded-xl overflow-hidden">
                <Image src={previewUrl} alt="Preview" width={128} height={128} className="object-cover" unoptimized />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => onClose?.()}>Annuler</Button>
              </DialogClose>
              <Button type="submit" className="animate-glow" disabled={!isValid || loading}>Enregistrer</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
