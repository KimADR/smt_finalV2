"use client"

import { useEffect, useState } from "react"
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ArrowUpRight, ArrowDownRight, CalendarIcon, DollarSign, FileText, Save, Building2 } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn, authFetch } from "@/lib/utils"
import { createChannel } from '@/lib/events'
import { useAuth } from '@/components/auth-context'
import { showErrorToast } from '@/hooks/use-toast'

interface MovementFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  enterpriseId?: number
  enterpriseName?: string
  onCreated?: (m: any) => void
  // optional initial data for editing an existing movement
  initialData?: any
  // callback when an existing movement has been updated
  onUpdated?: (m: any) => void
  onOptimisticCreated?: (m: any) => void
  onCreateFailed?: (tempId: number) => void
}

export function MovementForm({ open, onOpenChange, enterpriseId, enterpriseName, onCreated, initialData, onUpdated, onOptimisticCreated, onCreateFailed }: MovementFormProps) {
  const { toast } = useToast()
  const { user, role } = useAuth()
  const [movementType, setMovementType] = useState<"RECETTE" | "DEPENSE" | "TAXPAIMENT">("RECETTE")
  const [date, setDate] = useState<Date>(new Date())
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [isTaxPayment, setIsTaxPayment] = useState(false)
  const [reference, setReference] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const [enterprises, setEnterprises] = useState<Array<{ id: number; name: string }>>([])
  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState<number | undefined>(enterpriseId)
  const [enterpriseQuery, setEnterpriseQuery] = useState<string>('')

  // populate form when editing
  useEffect(() => {
    if (!open) return
    if (initialData) {
      try {
        // map various possible shapes
        const md: any = initialData
  setMovementType(md.type === 'CREDIT' ? 'RECETTE' : md.type === 'DEBIT' ? 'DEPENSE' : (md.type || md.type_mouvement || (md.isTaxPayment ? 'TAXPAIMENT' : 'RECETTE')))
        const parsedDate = md.date_mouvement || md.createdAt || md.date || md.dateMouvement
        if (parsedDate) {
          const d = new Date(parsedDate)
          setDate(!isNaN(d.valueOf()) ? d : new Date())
        } else {
          setDate(new Date())
        }
        setAmount(String(Number(md.montant ?? md.amount ?? md.montant_mga ?? 0)))
        setDescription(md.description ?? md.label ?? '')
        setIsTaxPayment(!!(md.estPaiementImpot ?? md.est_paiement_impot ?? md.isTaxPayment))
        setReference(md.reference ?? md.ref ?? '')
        // attachments cannot be prefilled as Files, but we can show count via attachments state as empty
        setAttachments([])
        const entId = md.entrepriseId ?? md.entreprise_id ?? md.entreprise?.id ?? md.enterpriseId ?? md.entreprise?.id
        setSelectedEnterpriseId(entId ? Number(entId) : enterpriseId)
      } catch (e) {
        console.warn('Failed to prefill movement form', e)
      }
    } else {
      // when opening for create, reset to defaults if provided
      setMovementType('RECETTE')
      setDate(new Date())
      setAmount('')
      setDescription('')
      setIsTaxPayment(false)
      setReference('')
      setAttachments([])
      setSelectedEnterpriseId(enterpriseId)
    }
  }, [initialData, open, enterpriseId])

  useEffect(() => {
    if (!open) return
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"
    authFetch(`${API_URL}/api/entreprises` as any)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: any[]) => {
  const mapped = (list || []).map((e) => ({ id: e.id, name: e.name }))
  mapped.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
  setEnterprises(mapped)
        // If the current user is an ENTREPRISE, default to their entreprise and keep it locked
        const userEnt = role === 'ENTREPRISE' ? Number(user?.entrepriseId ?? user?.entreprise?.id ?? undefined) : undefined
        if (userEnt) {
          setSelectedEnterpriseId(userEnt)
        } else if (!selectedEnterpriseId && mapped.length > 0) {
          setSelectedEnterpriseId(mapped[0].id)
        }
      })
      .catch(() => {})
  }, [open])

  const handleSubmit = async () => {
    const entrepriseIdPayload = selectedEnterpriseId ?? enterpriseId
    if (!entrepriseIdPayload || entrepriseIdPayload < 1) {
      toast({ title: 'Entreprise requise', description: 'Veuillez sélectionner une entreprise valide', variant: 'destructive' })
      return
    }

    const amountNum = Number.parseFloat(amount || '0')
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      toast({ title: 'Montant invalide', description: 'Le montant doit être un nombre positif', variant: 'destructive' })
      return
    }

    // Require at least one attachment (pièce justificative) only for non-tax payments
    if (!isTaxPayment && attachments.length === 0) {
      toast({ title: 'Pièce justificative requise', description: 'Veuillez joindre au moins une pièce justificative.', variant: 'destructive' })
      return
    }

    const movementData: any = {
  // when est_paiement_impot is checked, use 'TAXPAIMENT' so backend and UI can render it specially
  type: isTaxPayment ? 'TAXPAIMENT' : movementType, // expect 'RECETTE' or 'DEPENSE' or 'TAXPAIMENT'
      date_mouvement: new Date(date).toISOString(),
      montant: amountNum,
      description,
      est_paiement_impot: !!isTaxPayment,
      reference,
      entreprise_id: entrepriseIdPayload,
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

    // decide if this is an edit or create
    const isEdit = !!(initialData && (initialData.id || initialData._id))
    const initialId = initialData ? (initialData.id ?? initialData._id) : undefined
    const isTempEdit = isEdit && typeof initialId !== 'undefined' && Number(initialId) < 0

    // create optimistic preview only for creation flows
    let tempId: number | undefined = undefined
    if (!isEdit) {
      tempId = Date.now() * -1
      const optimistic = {
        id: tempId,
        date: new Date(date).toLocaleDateString('fr-FR'),
        type: isTaxPayment ? 'TAXPAIMENT' : movementType,
        amount: amountNum,
        description,
        enterprise: enterprises.find((e) => e.id === entrepriseIdPayload)?.name || enterpriseName || '',
        isTaxPayment: !!isTaxPayment,
        attachmentsCount: attachments.length,
      }
      onOptimisticCreated?.(optimistic)
    } else {
      // optimistic in-place update for edits (including temp edits)
      const optimisticUpdate = {
        id: initialId,
        date: new Date(date).toLocaleDateString('fr-FR'),
  type: isTaxPayment ? 'TAXPAIMENT' : movementType,
        amount: amountNum,
        description,
        entrepriseId: entrepriseIdPayload,
        enterprise: enterprises.find((e) => e.id === entrepriseIdPayload)?.name || enterpriseName || '',
        isTaxPayment: !!isTaxPayment,
        attachmentsCount: attachments.length,
      }
      onUpdated?.(optimisticUpdate)
    }

    try {
      let res: Response | null = null
      // if editing existing record, use PUT/PATCH to update
      // isEdit/isTempEdit already computed above
        if (isEdit && !isTempEdit) {
          const id = initialId
        // if attachments provided, send multipart, else JSON
        if (attachments.length > 0) {
          const form = new FormData()
          form.append('payload', JSON.stringify(movementData))
          form.append('entreprise_id', String(entrepriseIdPayload))
          form.append('montant', String(amountNum))
          form.append('description', String(description || ''))
          attachments.forEach((file) => form.append('attachments', file))

          res = await authFetch(`${API_URL}/api/mouvements/${id}`, {
            method: 'PUT',
            body: form,
          } as any)
        } else {
          res = await authFetch(`${API_URL}/api/mouvements/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(movementData),
          } as any)
        }
      } else {
        if (attachments.length > 0) {
          const form = new FormData()
          // include the full payload as JSON
          form.append('payload', JSON.stringify(movementData))
          // also append critical fields directly so servers that parse multipart fields without payload still receive them
          form.append('entreprise_id', String(entrepriseIdPayload))
          form.append('montant', String(amountNum))
          form.append('description', String(description || ''))
          attachments.forEach((file) => form.append('attachments', file))

          res = await authFetch(`${API_URL}/api/mouvements`, {
            method: 'POST',
            body: form,
          } as any)
        } else {
          // send as JSON when no attachments to avoid multipart parsing issues
          res = await authFetch(`${API_URL}/api/mouvements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(movementData),
          } as any)
        }
      }
      

      if (!res || !res.ok) {
        // Try to parse JSON error body with messages from Nest validation
        const contentType = res.headers.get('content-type') || ''
        let message = 'Erreur lors de la création du mouvement'
        if (contentType.includes('application/json')) {
          const body = await res.json().catch(() => null)
          if (body) {
            if (Array.isArray(body.message)) {
              message = body.message.join('; ')
            } else if (typeof body.message === 'string') {
              message = body.message
            } else if (body.error) {
              message = body.error
            }
          }
        } else {
          const text = await res.text().catch(() => '')
          if (text) message = text
        }
        throw new Error(message)
      }

    // Reset form defaults (will be overridden for edit by prefill effect when re-opening)
    setMovementType('RECETTE')
    setDate(new Date())
    setAmount('')
    setDescription('')
    setIsTaxPayment(false)
    setReference('')
    setAttachments([])
    const data = await res.json().catch(() => null)
      if (initialData && (initialData.id || initialData._id)) {
        // editing
        onOpenChange(false)
  try { (await import('@/hooks/use-toast')).showOperationSuccessToast('update', 'le mouvement') } catch (e) { toast({ title: 'Mouvement mis à jour', description: `Modification enregistrée.`, variant: 'success' }) }
        if (data) {
          // if this was a temp-edit that resulted in a server-side create (POST),
          // ensure parent replaces the temp item by passing __tempId
          if (isTempEdit) {
            onCreated?.({ ...data, __tempId: initialId })
          } else {
            onUpdated?.(data)
            // broadcast updated
            try { createChannel().post({ type: 'movement.updated', payload: data }) } catch (e) { }
          }
        } else if (res && res.ok) {
          // best-effort: construct updated object
          const bestEffort = { id: initialData.id ?? initialData._id, ...movementData }
          if (isTempEdit) {
            onCreated?.({ ...bestEffort, __tempId: initialId })
          } else {
            onUpdated?.(bestEffort)
          }
        }
      } else {
  // create
  onOpenChange(false)
  try { (await import('@/hooks/use-toast')).showOperationSuccessToast('create', 'le mouvement') } catch (e) { toast({ title: 'Mouvement enregistré', description: `${movementType === 'RECETTE' ? 'Recette' : 'Dépense'} de ${amountNum.toLocaleString('fr-FR')} MGA ajoutée.`, variant: 'success' }) }
        if (data) {
          // pass tempId so the parent can replace the optimistic item
          onCreated?.({ ...data, __tempId: tempId })
          try { createChannel().post({ type: 'movement.created', payload: data }) } catch (e) { }
        } else {
          // fallback: notify parent with final data and temp id
          const fallback = { id: Date.now(), montant: amountNum, amount: amountNum, createdAt: new Date().toISOString(), type: movementType, description, entreprise: enterprises.find((e) => e.id === entrepriseIdPayload)?.name || enterpriseName || '', entrepriseId: entrepriseIdPayload, __tempId: tempId }
          onCreated?.(fallback)
          try { createChannel().post({ type: 'movement.created', payload: fallback }) } catch (e) { }
        }
  }
    } catch (err: any) {
      // inform parent to remove optimistic item if we created one
      if (typeof tempId !== 'undefined') onCreateFailed?.(tempId)
      console.error(err)
      showErrorToast(err?.message || err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{initialData ? 'Modifier le mouvement' : 'Nouveau Mouvement'}</DialogTitle>
          <DialogDescription>
            Enregistrez une nouvelle transaction financière
            {enterpriseName && ` pour ${enterpriseName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Movement Type Toggle */}
          <Card className="glass">
            <CardContent className="p-4">
              <Label className="text-base font-medium mb-4 block">Type de mouvement</Label>
              <div className="flex gap-2">
                <Button
                    variant={movementType === "RECETTE" ? "default" : "outline"}
                    onClick={() => { if (!isTaxPayment) setMovementType("RECETTE") }}
                    disabled={isTaxPayment}
                  className={cn(
                    "flex-1 h-12",
                    movementType === "RECETTE" && "bg-accent hover:bg-accent/90 text-accent-foreground",
                  )}
                >
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Recette
                </Button>
                <Button
                    variant={movementType === "DEPENSE" ? "default" : "outline"}
                    onClick={() => { if (!isTaxPayment) setMovementType("DEPENSE") }}
                    disabled={isTaxPayment}
                    className={cn(
                      "flex-1 h-12 transition-colors duration-150",
                      movementType === "DEPENSE"
                        ? "bg-destructive hover:bg-destructive text-destructive-foreground "
                        : // when RECETTE is active, make the DEPENSE button show a subtle destructive hover
                          "hover:bg-destructive hover:text-black/90"
                    )}
                >
                  <ArrowDownRight className="h-4 w-4 mr-2" />
                  Dépense
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date de la transaction *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {(date instanceof Date && !isNaN(date.valueOf())) ? format(date, "PPP", { locale: fr }) : "Sélectionner une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={(date) => date && setDate(date)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Montant (MGA) *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ex: 1500000"
                  className="pl-10"
                />
              </div>
              {amount && (
                <p className="text-xs text-muted-foreground">{Number.parseFloat(amount).toLocaleString("fr-FR")} MGA</p>
              )}
            </div>
            {/* Enterprise select */}
            <div className="space-y-2">
                <Label htmlFor="enterprise">Entreprise *</Label>
                {/* If user is an ENTREPRISE, lock the enterprise selection to their entreprise */}
                {role === 'ENTREPRISE' ? (
                  <div className="p-2 rounded border bg-muted/5">{enterpriseName || enterprises.find((e) => e.id === Number(user?.entrepriseId ?? user?.entreprise?.id))?.name || 'Votre entreprise'}</div>
                ) : (
                  <Select value={String(selectedEnterpriseId ?? '')} onValueChange={(v) => setSelectedEnterpriseId(v ? Number(v) : undefined)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez une entreprise" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 pb-2">
                        <Input placeholder="Rechercher entreprise..." value={enterpriseQuery} onChange={(e) => setEnterpriseQuery(e.target.value)} className="w-full" />
                      </div>
                      {enterprises
                        .filter((e) => e.name.toLowerCase().includes(enterpriseQuery.toLowerCase()))
                        .map((e) => (
                          <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={`Décrivez cette ${movementType.toLowerCase()}...`}
                className="pl-10"
                rows={3}
              />
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label htmlFor="attachments">Pièces justificatives (images, PDF, Excel...)</Label>
            <input
              id="attachments"
              type="file"
              multiple
              onChange={(e) => {
                if (e.target.files) setAttachments(Array.from(e.target.files))
              }}
              className="w-full"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            />
            {attachments.length > 0 && (
              <div className="text-xs text-muted-foreground mt-2">
                {attachments.map((f, i) => (
                  <div key={i}>{f.name}</div>
                ))}
              </div>
            )}
          </div>

          {/* Reference */}
          <div className="space-y-2">
            <Label htmlFor="reference">Référence (optionnel)</Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ex: Facture #001, Reçu #123..."
            />
          </div>

          {/* Tax Payment Checkbox */}
          <Card className="glass border-warning/20 hover:border-warning/40 transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="taxPayment"
                  checked={isTaxPayment}
                  onCheckedChange={(checked) => {
                    const val = !!checked
                    setIsTaxPayment(val)
                    if (val) {
                      setMovementType('TAXPAIMENT')
                    } else {
                      setMovementType('RECETTE')
                    }
                  }}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="taxPayment"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Paiement d'impôt
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Cochez si cette transaction concerne un paiement d'impôt. Quand activé, le mouvement sera marqué comme paiement d'impôt (les boutons Recette/Dépense sont désactivés et la pièce justificative devient optionnelle).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="glass border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Résumé de la transaction</p>
                  <p className="text-sm text-muted-foreground">
                    {movementType} du {(date instanceof Date && !isNaN(date.valueOf())) ? format(date, "PPP", { locale: fr }) : "..."}
                  </p>
                </div>
                <div className="text-right">
                  {(() => {
                    const raw = Number.parseFloat(amount) || 0
                    const isExcludedTax = movementType === 'DEPENSE' && isTaxPayment
                    const display = isExcludedTax ? 0 : raw
                    const sign = movementType === 'RECETTE' ? '+' : '-'
                    const badgeClass = movementType === 'RECETTE' ? 'bg-accent/10 text-accent border-accent/20' : 'bg-destructive/10 text-destructive border-destructive/20'
                    return (
                      <>
                        <Badge className={badgeClass}>
                          {sign}{(display / 1000000).toFixed(1)}M MGA
                        </Badge>
                        {isTaxPayment && (
                          <p className="text-xs text-muted-foreground mt-1">Paiement d'impôt — non inclus dans les dépenses</p>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!amount || !description} className="animate-glow">
            <Save className="h-4 w-4 mr-2" />
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// also provide a default export to make dynamic imports more resilient
export default MovementForm
