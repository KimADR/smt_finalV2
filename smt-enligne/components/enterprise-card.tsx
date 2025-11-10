import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Building2, Phone, Mail, MapPin, Calculator, Eye, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState } from "react"
import { useAuth } from '@/components/auth-context'
import { TaxCalculator } from "@/components/tax-calculator"
import { useEffect } from "react"
import { authFetch } from "@/lib/utils"
import Link from "next/link"
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

interface Enterprise {
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
  contact?: {
    phone?: string
    email?: string
  }
  // backend may return flat fields
  phone?: string
  contactEmail?: string
  address?: string
}

interface EnterpriseCardProps {
  enterprise: Enterprise
  onEdit?: (enterprise: Enterprise) => void
  onDelete?: (enterprise: Enterprise) => void
}

export function EnterpriseCard({ enterprise, onEdit, onDelete }: EnterpriseCardProps) {
  const { role } = useAuth()
  const [isTaxOpen, setIsTaxOpen] = useState(false)
  const [assignedUser, setAssignedUser] = useState<any | null>(null)
  const getStatusColor = (status?: string) => {
    const s = (status || "").toString().toLowerCase()
    switch (s) {
      case "actif":
        return "bg-accent/10 text-accent border-accent/20"
      case "inactif":
        return "bg-muted text-muted-foreground border-muted"
      case "suspendu":
        return "bg-destructive/10 text-destructive border-destructive/20"
      default:
        return "bg-secondary text-secondary-foreground border-secondary"
    }
  }

  const getTaxTypeColor = (taxType?: string) => {
    const t = (taxType || "").toString()
    return t === "IR"
      ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
      : "bg-purple-500/10 text-purple-500 border-purple-500/20"
  }

  useEffect(() => {
    let mounted = true
    async function loadAssignedUser() {
      try {
        const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'
        const res = await authFetch(`${api}/api/users?entrepriseId=${enterprise.id}` as any)
        if (!res.ok) return
  const data = await res.json()
  if (!mounted) return
  // API returns an array (possibly empty). Find a user that is explicitly assigned
  const candidates = Array.isArray(data) ? data : []
  const found = candidates.find((u: any) => Number(u.entrepriseId) === Number(enterprise.id) && (u.role === 'ENTREPRISE' || u.role === 'ENTREPRISE')) || null
  // Only set if an assigned user exists; otherwise keep null (show nothing)
  setAssignedUser(found)
      } catch (e) {
        // ignore
      }
    }
    loadAssignedUser()
    return () => { mounted = false }
  }, [enterprise.id])

  return (
    <>
      <Card className="glass hover:shadow-lg transition-all duration-300 group">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{enterprise.name}</CardTitle>
              <CardDescription className="text-justify">NIF: {enterprise.nif}</CardDescription>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Disable edit/delete for AGENT_FISCAL users */}
              {role !== 'AGENT_FISCAL' ? (
                <DropdownMenuItem onSelect={() => onEdit ? onEdit(enterprise) : console.log('Edit enterprise', enterprise.id)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Modifier entreprise
                </DropdownMenuItem>
              ) : (
                <div className="px-3 py-2 text-xs text-muted-foreground">Actions restreintes</div>
              )}
              <DropdownMenuItem>
                <Calculator className="h-4 w-4 mr-2" />
                Calculer impôts
              </DropdownMenuItem>
              {role !== 'AGENT_FISCAL' && (
                <DropdownMenuItem onSelect={() => onDelete ? onDelete(enterprise) : console.log('Delete enterprise', enterprise.id)} className="text-destructive">
                  <MoreHorizontal className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status and Tax Type */}
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(enterprise.status)}>{enterprise.status || 'Actif'}</Badge>
          <Badge className={getTaxTypeColor(enterprise.taxType)}>{enterprise.taxType || 'IR'}</Badge>
          <Badge variant="outline" className="text-xs">
            {enterprise.sector}
          </Badge>
        </div>

        {/* Revenue */}
        <div className="p-3 bg-card/50 rounded-lg">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Chiffre d'affaires annuel</p>
            <p className="text-lg font-semibold text-primary">{enterprise.annualRevenue ? `${(enterprise.annualRevenue / 1000000).toFixed(1)}M MGA` : '-'}</p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-2 text-sm">
          {enterprise.legalForm && (
            <div className="text-muted-foreground">
              <strong>Forme juridique:</strong> {enterprise.legalForm}
            </div>
          )}
          {enterprise.activity && (
            <div className="text-muted-foreground">
              <strong>Activité:</strong> {enterprise.activity}
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-3 w-3" />
            <span>{enterprise.contact?.phone || enterprise.phone || ""}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span className="truncate">{enterprise.contact?.email || enterprise.contactEmail || ""}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{enterprise.address || ""} {enterprise.city ? `, ${enterprise.city}` : ''} {enterprise.postalCode ? ` (${enterprise.postalCode})` : ''}</span>
          </div>
          {enterprise.description && (
            <div className="text-sm text-muted-foreground">{enterprise.description}</div>
          )}

          {/* Assigned user is shown below in the footer when present */}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Link href={`/entreprises/${enterprise.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full flex-1 bg-transparent">
              <Eye className="h-4 w-4 mr-2" />
              Détails
            </Button>
          </Link>
          <Button size="sm" className="flex-1" onClick={() => setIsTaxOpen(true)}>
            <Calculator className="h-4 w-4 mr-2" />
            Impôts
          </Button>
        </div>
        {/* Footer: show small muted 'Géré par' when a responsable exists */}
        {assignedUser ? (
          <div className="mt-4 border-t pt-3 text-sm text-muted-foreground flex items-center justify-center gap-3">
            <span>Géré par</span>
            <Link href={`/utilisateurs/${assignedUser.id}`} className="font-medium text-foreground underline flex items-center gap-3">
              <Avatar className="h-9 w-9">
                {assignedUser.avatar ? (
                  <AvatarImage src={assignedUser.avatar} alt={assignedUser.username || assignedUser.email} className="object-cover" />
                ) : (
                  <AvatarFallback>
                    { (assignedUser.fullName?.charAt(0) || assignedUser.username?.charAt(0) || assignedUser.email?.charAt(0) || '?') }
                  </AvatarFallback>
                )}
              </Avatar>
              <span>{assignedUser.fullName || assignedUser.username || assignedUser.email}</span>
            </Link>
          </div>
        ) : null}
      </CardContent>
      </Card>
      <TaxCalculator open={isTaxOpen} onOpenChange={setIsTaxOpen} enterprise={enterprise} />
    </>
  )
}

// fetch assigned user when component mounts if not provided
export default EnterpriseCard
