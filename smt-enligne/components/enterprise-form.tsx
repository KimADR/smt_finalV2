"use client"

import { useState, useEffect } from "react"
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, User, Phone, Mail, MapPin, DollarSign, FileText, CheckCircle } from "lucide-react"
import { authFetch } from "@/lib/utils"
import { showErrorToast } from '@/hooks/use-toast'

interface EnterpriseFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // optional: initial data when editing
  initialData?: {
    id?: number
    name?: string
    nif?: string
    sector?: string
    legalForm?: string
    activity?: string
    annualRevenue?: number | string
    taxType?: string
    status?: string
    phone?: string
    email?: string
    address?: string
    city?: string
    postalCode?: string
    description?: string
  }
  onSaved?: (enterprise: any, method?: string, extra?: any) => void
}

export function EnterpriseForm({ open, onOpenChange, initialData, onSaved }: EnterpriseFormProps) {
  const { toast } = useToast()
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [currentStep, setCurrentStep] = useState(1)
  type FormShape = {
    name: string
    nif: string
    sector: string
    legalForm: string
    activity: string
    annualRevenue: string
    taxType: string
    status: string
    phone: string
    email: string
    address: string
    city: string
    postalCode: string
    description: string
  }

  const [formData, setFormData] = useState({
    // General Information
    name: "",
    nif: "",
    sector: "",
    legalForm: "",

  // Activity & Taxation
    activity: "",
    annualRevenue: "",
  taxType: "",
  // Status
  status: "Actif",

    // Contact Details
    phone: "",
    email: "",
    address: "",
    city: "",
    postalCode: "",

    // Additional Info
    description: "",
  })

  // populate form when editing
  useEffect(() => {
    if (initialData) {
      setFormData((prev: FormShape) => ({
        ...prev,
        name: (initialData as any).name || "",
        nif: (initialData as any).nif || (initialData as any).siret || "",
        sector: (initialData as any).sector || "",
        legalForm: (initialData as any).legalForm || "",
        activity: (initialData as any).activity || "",
        annualRevenue: String((initialData as any).annualRevenue || ""),
        taxType: (initialData as any).taxType || "",
        status: (initialData as any).status || "Actif",
        phone: (initialData as any).phone || "",
        email: (initialData as any).email || (initialData as any).contactEmail || "",
        address: (initialData as any).address || "",
        city: (initialData as any).city || "",
        postalCode: (initialData as any).postalCode || "",
        description: (initialData as any).description || "",
      }))
      // if editing, we'll attempt to preselect the user assigned to this entreprise
      // fetch users to determine which one (if any) is linked to this entreprise
      fetchUsers()
    }
  }, [initialData])

  // fetch users (to populate dropdown)
  const fetchUsers = async () => {
    setLoadingUsers(true)
    const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"
    try {
      const res = await authFetch(`${api}/api/users` as any)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
      // if editing, try to find a user with entrepriseId === initialData.id
      if (initialData?.id) {
        const assigned = (Array.isArray(data) ? data : []).find((u: any) => Number(u.entrepriseId) === Number(initialData.id))
        setSelectedUserId(assigned ? Number(assigned.id) : null)
      }
    } catch (err) {
      console.error('Error fetching users for enterprise form', err)
    } finally {
      setLoadingUsers(false)
    }
  }

  // Ensure users are loaded when the dialog opens (for create flow)
  useEffect(() => {
    if (open && (!users || users.length === 0) && !loadingUsers) {
      fetchUsers()
    }
    if (open) setUserSearch('')
  }, [open])

  const steps = [
    { id: 1, title: "Informations Générales", icon: Building2 },
    { id: 2, title: "Activité & Fiscalité", icon: FileText },
    { id: 3, title: "Coordonnées", icon: User },
  ]

  const sectors = [
    "Commerce",
    "Services",
    "Artisanat",
    "Agriculture",
    "Industrie",
    "Transport",
    "Tourisme",
    "Technologie",
    "Autres",
  ]

  const legalForms = ["Entreprise Individuelle", "SARL", "SA", "SAS", "EURL", "SNC", "Coopérative"]

  const handleInputChange = (field: keyof FormShape, value: string) => {
    setFormData((prev: FormShape) => ({ ...prev, [field]: value }))

    // Auto-determine tax type based on revenue
    if (field === "annualRevenue") {
      const revenue = Number.parseFloat(value) || 0
      const taxType = revenue > 20000000 ? "IS" : "IR"
    setFormData((prev: FormShape) => ({ ...prev, taxType }))
    }
  }

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const handleSubmit = () => {
    // Client-side validation (required fields)
    const required = [
      { key: 'name', label: "Nom de l'entreprise" },
      { key: 'nif', label: 'Numéro NIF' },
      { key: 'sector', label: "Secteur d'activité" },
      { key: 'legalForm', label: 'Forme juridique' },
      { key: 'activity', label: "Description de l'activité" },
      { key: 'annualRevenue', label: "Chiffre d'affaires annuel" },
      { key: 'phone', label: 'Téléphone' },
      { key: 'email', label: 'Email' },
      { key: 'address', label: 'Adresse' },
      { key: 'city', label: 'Ville' },
    ]

    const missing = required.filter((r) => !String((formData as any)[r.key]).trim())
    if (missing.length > 0) {
      toast({
        title: 'Champs requis manquants',
        description: `Merci de remplir: ${missing.map((m) => m.label).join(', ')}`,
        variant: 'destructive',
      })
      return
    }

    // Submit form to backend (create or update)
    const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"
  const payload = {
  name: formData.name,
  siret: formData.nif,
  address: formData.address,
  contactEmail: formData.email,
  phone: formData.phone,
  status: (formData.status || 'Actif').toUpperCase(),
  taxType: (formData.taxType || (Number(formData.annualRevenue || 0) > 20000000 ? 'IS' : 'IR')).toUpperCase(),
  sector: formData.sector,
  legalForm: formData.legalForm,
  activity: formData.activity,
  annualRevenue: Number(formData.annualRevenue || 0),
  city: formData.city,
  postalCode: formData.postalCode,
  description: formData.description,
  // include selected user id if any so backend can assign the user
  userId: selectedUserId ?? undefined,
    }
    const method = initialData?.id ? 'PUT' : 'POST'
    const url = initialData?.id ? `${api}/api/entreprises/${initialData.id}` : `${api}/api/entreprises`
    // Optimistic update path
    if (method === 'POST') {
      // create optimistic
      const tempId = Date.now() * -1
      const optimistic = {
        id: tempId,
        name: payload.name,
        nif: payload.siret,
        sector: formData.sector,
        status: payload.status,
        taxType: payload.taxType,
        annualRevenue: Number(formData.annualRevenue || 0),
        contact: { phone: payload.phone, email: payload.contactEmail },
        address: payload.address,
      }
      if (onSaved) onSaved(optimistic, 'createOptimistic')

      authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      } as any)
        .then(async (res) => {
          if (!res.ok) {
            const text = await res.text()
            throw new Error(`HTTP ${res.status}: ${text}`)
          }
          return res.json()
        })
        .then(async (created) => {
          // replace optimistic item with real one
          if (onSaved) onSaved(created, 'replace', { tempId })
            import('@/hooks/use-toast').then((m) => {
              try { m.showOperationSuccessToast('create', created.name ? `${created.name}` : 'l\'entreprise') } catch (e) { toast({ title: "Entreprise créée", description: `${created.name} a été créée.`, variant: 'success' }) }
            }).catch(() => { toast({ title: "Entreprise créée", description: `${created.name} a été créée.`, variant: 'success' }) })
          // if a user was selected, assign the user to the created entreprise and show confirmation
          if (selectedUserId) {
            try {
              const assigned = await assignUserToEntreprise(selectedUserId, created.id)
              const user = users.find((u) => Number(u.id) === Number(selectedUserId))
              const label = user ? (user.fullName || user.username || user.email) : `#${selectedUserId}`
              import('@/hooks/use-toast').then((m) => { try { m.showOperationSuccessToast('update', `l\'utilisateur ${label}`) } catch (e) { toast({ title: 'Utilisateur assigné', description: `${label} a été assigné à ${created.name}.`, variant: 'success' }) } }).catch(() => { toast({ title: 'Utilisateur assigné', description: `${label} a été assigné à ${created.name}.`, variant: 'success' }) })
            } catch (e) {
              // assignUserToEntreprise already shows an error toast
              console.error('Failed to assign user to entreprise (post-create)', e)
            }
          }
          onOpenChange(false)
          // reset form
          setCurrentStep(1)
          setFormData({
            name: "",
            nif: "",
            sector: "",
            legalForm: "",
            activity: "",
            annualRevenue: "",
            taxType: "",
            status: "Actif",
            phone: "",
            email: "",
            address: "",
            city: "",
            postalCode: "",
            description: "",
          })
        })
        .catch((err) => {
          console.error('Create entreprise failed', err)
          showErrorToast(err)
          // revert optimistic
          if (onSaved) onSaved({ id: tempId }, 'revertCreate', { tempId })
        })
    } else {
      // update optimistic
      const optimistic = {
        id: initialData!.id,
        name: payload.name,
        nif: payload.siret,
        sector: formData.sector,
        status: payload.status,
        taxType: payload.taxType,
        annualRevenue: Number(formData.annualRevenue || 0),
        contact: { phone: payload.phone, email: payload.contactEmail },
        address: payload.address,
      }
      if (onSaved) onSaved(optimistic, 'updateOptimistic')

      authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      } as any)
        .then(async (res) => {
          if (!res.ok) {
            const text = await res.text()
            throw new Error(`HTTP ${res.status}: ${text}`)
          }
          return res.json()
        })
        .then((updated) => {
          if (onSaved) onSaved(updated, 'replace')
          import('@/hooks/use-toast').then((m) => { try { m.showOperationSuccessToast('update', updated.name ? `${updated.name}` : 'l\'entreprise') } catch (e) { toast({ title: 'Entreprise modifiée', description: `${updated.name} a été mise à jour.`, variant: 'success' }) } }).catch(() => { toast({ title: 'Entreprise modifiée', description: `${updated.name} a été mise à jour.`, variant: 'success' }) })
          onOpenChange(false)
          // If editing: handle user assignment changes.
          // Find previously assigned user (if any) and update entrepriseId accordingly.
          try {
            (async () => {
              // refresh users if not loaded
              if (!users || users.length === 0) await fetchUsers()
              const prevAssigned = (users || []).find((u: any) => Number(u.entrepriseId) === Number(initialData?.id))
              const prevAssignedId = prevAssigned ? Number(prevAssigned.id) : null
              const newAssignedId = selectedUserId ? Number(selectedUserId) : null
              // If changed: clear previous and set new
              if (prevAssignedId && prevAssignedId !== newAssignedId) {
                await assignUserToEntreprise(prevAssignedId, null)
              }
              if (newAssignedId && newAssignedId !== prevAssignedId) {
                await assignUserToEntreprise(newAssignedId, updated.id)
              }
            })()
          } catch (e) {
            console.error('Error assigning user after update', e)
          }
        })
        .catch((err) => {
          console.error('Update entreprise failed', err)
          showErrorToast(err)
          // TODO: could revert optimistic update by asking parent
          if (onSaved) onSaved({ id: optimistic.id }, 'revertUpdate', { prev: initialData })
        })
    }
  }

  const handleDelete = () => {
    if (!initialData?.id) return
    const confirmed = window.confirm('Confirmer la suppression de cette entreprise ?')
    if (!confirmed) return

    const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"
    const url = `${api}/api/entreprises/${initialData.id}`
    // optimistic remove
    if (onSaved) onSaved({ id: initialData.id }, 'deleteOptimistic', { prev: initialData })

    authFetch(url, { method: 'DELETE' } as any)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text())
        // 204 No Content: do not attempt to parse JSON
        return undefined
      })
      .then(() => {
  import('@/hooks/use-toast').then((m) => { try { m.showOperationSuccessToast('delete', initialData.name ? `${initialData.name}` : 'l\'entreprise') } catch (e) { toast({ title: 'Entreprise supprimée', description: `${initialData.name} a été supprimée.`, variant: 'success' }) } }).catch(() => { toast({ title: 'Entreprise supprimée', description: `${initialData.name} a été supprimée.`, variant: 'success' }) })
        onOpenChange(false)
      })
      .catch((err) => {
        showErrorToast(err)
        // revert delete
        if (onSaved) onSaved({ id: initialData.id }, 'revertDelete', { prev: initialData })
      })
  }

  // assign (or clear) a user's entrepriseId
  async function assignUserToEntreprise(userId: number, entrepriseId: number | null) {
    const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"
    try {
      const res = await authFetch(`${api}/api/users/${userId}` as any, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entrepriseId }),
      } as any)
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text)
      }
      return await res.json()
    } catch (err) {
      console.error('Failed to assign user to entreprise', err)
      showErrorToast(err)
      throw err
    }
  }

  const isEdit = !!initialData?.id;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isEdit ? "Modifier l'Entreprise" : "Nouvelle Entreprise"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifiez les informations de l'entreprise dans le système SMT"
              : "Créez une nouvelle entreprise dans le système SMT"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                  currentStep >= step.id
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted text-muted-foreground"
                }`}
              >
                {currentStep > step.id ? <CheckCircle className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
              </div>
              <div className="ml-3 hidden sm:block">
                <p
                  className={`text-sm font-medium ${
                    currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.title}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-4 ${currentStep > step.id ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: General Information */}
        {currentStep === 1 && (
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informations Générales
              </CardTitle>
              <CardDescription>Renseignez les informations de base de l'entreprise</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom de l'entreprise *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e: any) => handleInputChange("name", e.target.value)}
                    placeholder="Ex: SARL FIHAVANANA"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nif">Numéro NIF *</Label>
                  <Input
                    id="nif"
                    value={formData.nif}
                    onChange={(e: any) => handleInputChange("nif", e.target.value)}
                    placeholder="Ex: 3000123456"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sector">Secteur d'activité *</Label>
                  <Select value={formData.sector} onValueChange={(value: any) => handleInputChange("sector", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un secteur" />
                    </SelectTrigger>
                    <SelectContent>
                      {sectors.map((sector) => (
                        <SelectItem key={sector} value={sector}>
                          {sector}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="legalForm">Forme juridique *</Label>
                  <Select value={formData.legalForm} onValueChange={(value: any) => handleInputChange("legalForm", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez la forme" />
                    </SelectTrigger>
                    <SelectContent>
                      {legalForms.map((form) => (
                        <SelectItem key={form} value={form}>
                          {form}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Activity & Taxation */}
        {currentStep === 2 && (
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Activité & Fiscalité
              </CardTitle>
              <CardDescription>Détails sur l'activité et le régime fiscal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="activity">Description de l'activité *</Label>
                <Textarea
                  id="activity"
                  value={formData.activity}
                  onChange={(e: any) => handleInputChange("activity", e.target.value)}
                  placeholder="Décrivez l'activité principale de l'entreprise..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="annualRevenue">Chiffre d'affaires annuel estimé (MGA) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="annualRevenue"
                    type="number"
                    value={formData.annualRevenue}
                    onChange={(e: any) => handleInputChange("annualRevenue", e.target.value)}
                    placeholder="Ex: 25000000"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxType">Régime fiscal</Label>
                  <Select value={formData.taxType} onValueChange={(v: any) => handleInputChange("taxType", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="IR / IS" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IR">IR</SelectItem>
                      <SelectItem value="IS">IS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Statut</Label>
                  <Select value={formData.status} onValueChange={(v: any) => handleInputChange("status", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Actif" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Actif">Actif</SelectItem>
                      <SelectItem value="Inactif">Inactif</SelectItem>
                      <SelectItem value="Suspendu">Suspendu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.annualRevenue && (
                <div className="p-4 bg-card/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Régime fiscal déterminé automatiquement:</p>
                      <p className="text-sm text-muted-foreground">Basé sur le chiffre d'affaires déclaré</p>
                    </div>
                    <Badge
                      {...({
                        className:
                          formData.taxType === "IR"
                            ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            : "bg-purple-500/10 text-purple-500 border-purple-500/20",
                      } as any)}
                    >
                      {formData.taxType === "IR" ? "Impôt sur le Revenu (IR)" : "Impôt sur les Sociétés (IS)"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formData.taxType === "IR" ? "CA ≤ 20M MGA - Régime simplifié" : "CA > 20M MGA - Régime normal"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Contact Details */}
        {currentStep === 3 && (
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Coordonnées
              </CardTitle>
              <CardDescription>Informations de contact et adresse</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e: any) => handleInputChange("phone", e.target.value)}
                      placeholder="+261 34 12 345 67"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e: any) => handleInputChange("email", e.target.value)}
                      placeholder="contact@entreprise.mg"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresse *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e: any) => handleInputChange("address", e.target.value)}
                    placeholder="Adresse complète de l'entreprise..."
                    className="pl-10"
                    rows={2}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Ville *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e: any) => handleInputChange("city", e.target.value)}
                    placeholder="Ex: Antananarivo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postalCode">Code postal</Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e: any) => handleInputChange("postalCode", e.target.value)}
                    placeholder="Ex: 101"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description supplémentaire</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e: any) => handleInputChange("description", e.target.value)}
                  placeholder="Informations complémentaires..."
                  rows={3}
                />
              </div>

              {/* User assignment dropdown */}
              <div className="space-y-2">
                <Label htmlFor="assignedUser">Assigner un utilisateur</Label>
                <Select
                  value={selectedUserId ? String(selectedUserId) : "__none"}
                  onValueChange={(v: any) => setSelectedUserId(v === "__none" ? null : Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingUsers ? "Chargement..." : "Sélectionnez un utilisateur (optionnel)"} />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Search input inside dropdown */}
                    <div className="p-2">
                      <Input
                        value={userSearch}
                        onChange={(e: any) => setUserSearch(e.target.value)}
                        placeholder="Rechercher un utilisateur..."
                        className="w-full"
                      />
                    </div>
                    <SelectItem value="__none">Aucun</SelectItem>
                    {users
                      .filter((u) => String(u.role || '').toUpperCase() === 'ENTREPRISE')
                      .filter((u) => {
                        const q = (userSearch || '').trim().toLowerCase()
                        if (!q) return true
                        const name = (u.fullName || u.username || '').toLowerCase()
                        const email = (u.email || '').toLowerCase()
                        return name.includes(q) || email.includes(q)
                      })
                      .map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.fullName || u.username} {u.email ? ` - ${u.email}` : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={prevStep} disabled={currentStep === 1}>
            Précédent
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>

            {currentStep === 3 ? (
              <Button onClick={handleSubmit} className="animate-glow">
                <CheckCircle className="h-4 w-4 mr-2" />
                {isEdit ? "Enregistrer les modifications" : "Créer l'Entreprise"}
              </Button>
            ) : (
              <Button onClick={nextStep}>Suivant</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
