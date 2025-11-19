"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Calculator, DollarSign, FileText, Download } from "lucide-react"
import ReportModal from "@/components/report-modal"
import { generateTaxReportPDF } from "@/lib/pdf-generator"
import { getMadagascarLogoDataUrl } from "@/lib/logo-data"

interface TaxCalculatorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  enterprise?: {
    id?: number | string
    nif?: string
    name: string
    taxType?: string
    annualRevenue?: number
  }
}

export function TaxCalculator({ open, onOpenChange, enterprise }: TaxCalculatorProps) {
  const [revenue, setRevenue] = useState(enterprise?.annualRevenue?.toString() || "")
  const [expenses, setExpenses] = useState("")
  const [previousTaxPayments, setPreviousTaxPayments] = useState("")

  // Sync revenue when enterprise changes or when dialog opens
  useEffect(() => {
    if (enterprise?.annualRevenue != null) {
      setRevenue(String(enterprise.annualRevenue))
    }
  }, [enterprise?.annualRevenue])

  const calculateTax = () => {
    const revenueAmount = Number.parseFloat(revenue) || 0
    const expenseAmount = Number.parseFloat(expenses) || 0
    const previousPayments = Number.parseFloat(previousTaxPayments) || 0
    const netIncome = revenueAmount - expenseAmount

    // Defaults
    let taxRate = 0
    let taxAmount = 0

    // Minimum perception (business rule / informative)
    const minimumPerception = 200000

    // If CA < 400 millions ariary => Impôt Synthétique (IS) at 5% of CA
    if (revenueAmount > 0 && revenueAmount < 400_000_000) {
      taxRate = 5
      taxAmount = revenueAmount * 0.05
    } else if (enterprise?.taxType === "IR" || revenueAmount <= 20000000) {
      // Impôt sur le Revenu - Barème progressif simplifié
      if (netIncome <= 2000000) {
        taxRate = 0
      } else if (netIncome <= 5000000) {
        taxRate = 5
        taxAmount = (netIncome - 2000000) * 0.05
      } else if (netIncome <= 10000000) {
        taxRate = 10
        taxAmount = 150000 + (netIncome - 5000000) * 0.1
      } else {
        taxRate = 15
        taxAmount = 650000 + (netIncome - 10000000) * 0.15
      }
    } else {
      // Impôt sur les Sociétés - taux fixe 20% sur bénéfice
      taxRate = 20
      taxAmount = netIncome * 0.2
    }

    const remainingTax = Math.max(0, taxAmount - previousPayments)

    return {
      netIncome,
      taxRate,
      taxAmount,
      previousPayments,
      remainingTax,
      minimumPerception,
    }
  }

  const taxCalculation = calculateTax()

  const generateReport = () => {
    // legacy download kept as separate action; main flow opens report modal
    setIsReportOpen(true)
  }

  const [isReportOpen, setIsReportOpen] = useState(false)

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Calculateur d'Impôt
          </DialogTitle>
          <DialogDescription>Calculez les impôts dus pour {enterprise?.name || "l'entreprise"}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Enterprise Info */}
          <div className="col-span-1 lg:col-span-2">
            <Card className="p-4 rounded-lg border border-slate-700/60 ">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">NIF</div>
                  <div className="font-semibold">{(enterprise as any)?.nif || "-"}</div>

                  <div className="text-sm text-muted-foreground mt-3">Chiffre d'affaires annuel</div>
                  <div className="font-semibold">{Number.parseFloat(revenue || "0").toLocaleString()} Ar</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Secteur d'activité</div>
                  <div className="font-semibold">{(enterprise as any)?.sector || "-"}</div>

                  <div className="text-sm text-muted-foreground mt-3">Bénéfice net (période)</div>
                  <div className="font-semibold text-destructive">{( (Number.parseFloat(revenue||"0") - Number.parseFloat(expenses||"0")) ).toLocaleString()} Ar</div>
                </div>
              </div>
            </Card>
          </div>
          {/* Input Section */}
          <div className="space-y-6">
            <Card className="glass border border-slate-700/60 bg-slate-800/50">
              <CardHeader>
                <CardTitle className="text-lg">Données Financières</CardTitle>
                <CardDescription>Saisissez les montants pour l'année fiscale en cours</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="revenue">Chiffre d'affaires annuel (MGA)</Label>
                  <div className="relative">
                    <Input
                      id="revenue"
                      type="number"
                      value={revenue}
                      onChange={(e) => setRevenue(e.target.value)}
                      placeholder="Ex: 25000000"
                      className="pl-10"
                      aria-describedby="revenue-help"
                    />
                  </div>
                  <p id="revenue-help" className="text-xs text-muted-foreground">Montant total des ventes déclaré; un CA faible peut vous placer sous le régime synthétique (IS).</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expenses">Charges déductibles (MGA)</Label>
                  <div className="relative">
                    <Input
                      id="expenses"
                      type="number"
                      value={expenses}
                      onChange={(e) => setExpenses(e.target.value)}
                      placeholder="Ex: 15000000"
                      className="pl-10"
                      aria-describedby="expenses-help"
                    />
                  </div>
                  <p id="expenses-help" className="text-xs text-muted-foreground">Dépenses que vous pouvez déduire pour calculer le bénéfice imposable (utilisé pour IR/IS sur bénéfice).</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="previousPayments">Acomptes déjà versés (MGA)</Label>
                  <div className="relative">
                     <Input
                      id="previousPayments"
                      type="number"
                      value={previousTaxPayments}
                      onChange={(e) => setPreviousTaxPayments(e.target.value)}
                      placeholder="Ex: 500000"
                      className="pl-10"
                      aria-describedby="prev-payments-help"
                    />
                  </div>
                  <p id="prev-payments-help" className="text-xs text-muted-foreground">Sommes déjà payées au titre de l'exercice. Elles seront déduites du montant final à payer.</p>
                </div>

                {/* Tax Type Info */}
                <div className="p-3 bg-card/50 rounded-lg border border-slate-700/40">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Régime fiscal:</span>
                    <Badge
                      className={
                        enterprise?.taxType === "IR" || (Number.parseFloat(revenue) || 0) <= 20000000
                          ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          : "bg-purple-500/10 text-purple-500 border-purple-500/20"
                      }
                    >
                      {enterprise?.taxType === "IR" || (Number.parseFloat(revenue) || 0) <= 20000000 ? "IR" : "IS"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {enterprise?.taxType === "IR" || (Number.parseFloat(revenue) || 0) <= 20000000
                      ? "Impôt sur le Revenu - Barème progressif"
                      : "Impôt sur les Sociétés - Taux fixe 20%"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            <Card className="glass border-primary/20 border border-slate-700/60 bg-slate-800/50">
                <CardHeader>
                  <CardTitle className="text-lg">Impôt Synthétique (IS)</CardTitle>
                  <CardDescription>CA &lt; 400 millions ariary</CardDescription>
                </CardHeader>
                <CardContent>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 bg-surface/80 rounded-lg shadow-sm border border-white/6">
                              <div className="text-xs text-muted-foreground">Base de calcul</div>
                              <div className="font-semibold mt-2">Chiffre d'affaires réalisé</div>
                              <div className="text-xl font-extrabold mt-1 text-white">{Number.parseFloat(revenue||"0").toLocaleString()} Ar</div>
                              <p className="text-xs text-muted-foreground mt-2">Montant déclaré pour l'année fiscale courante. Ce montant alimente le calcul automatique.</p>
                            </div>
                            <div className="p-4 bg-surface/80 rounded-lg shadow-sm border border-white/6 flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-sm text-muted-foreground">Taux d'imposition</div>
                                <div className="text-2xl font-extrabold mt-2 text-white">{taxCalculation.taxRate}%</div>
                                <p className="text-xs text-muted-foreground mt-2">Taux appliqué selon le régime fiscal et le CA.</p>
                              </div>
                            </div>
                          </div>
                </CardContent>

              </Card>

              {/* Detailed Calculation Card */}
              <Card className="glass border-emerald-200 border border-slate-700/60 bg-slate-800/50">
                <CardHeader>
                  <CardTitle className="text-lg">Calcul Détaillé</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Impôt calculé ({taxCalculation.taxRate}%)</span>
                    <span className="text-xl font-extrabold text-white" aria-live="polite" id="taxAmount">{Math.round(taxCalculation.taxAmount).toLocaleString()} Ar</span>
                  </div>

                  <Separator className="my-3" />

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-orange-500">⚠️</span>
                      <span className="text-sm">Acompte provisionnel</span>
                    </div>
                    <span className="font-medium">{(50000).toLocaleString()} Ar</span>
                  </div>

                  <div className="flex justify-between items-center mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-orange-500">⚠️</span>
                      <span className="text-sm">Minimum de perception</span>
                    </div>
                    <span className="font-medium">{(taxCalculation.minimumPerception).toLocaleString()} Ar</span>
                  </div>

                  <div className="mt-6 p-4 bg-emerald-900/30 rounded-md border border-emerald-800/30">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-muted-foreground">Montant total à payer</span>
                      <span className="text-2xl font-extrabold text-emerald-400" aria-live="polite">{Math.round(taxCalculation.taxAmount).toLocaleString()} Ar</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

            {/* Tax Breakdown */}
            {(enterprise?.taxType === "IR" || (Number.parseFloat(revenue) || 0) <= 20000000) && (
              <Card className="glass border border-slate-700/60 bg-slate-800/50">
                <CardHeader>
                  <CardTitle className="text-lg">Barème IR - Détail</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>0 - 2M MGA:</span>
                      <span>0%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>2M - 5M MGA:</span>
                      <span>5%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>5M - 10M MGA:</span>
                      <span>10%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Au-delà de 10M MGA:</span>
                      <span>15%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={async () => {
              const logoDataUrl = await getMadagascarLogoDataUrl()
              generateTaxReportPDF(enterprise, taxCalculation, revenue, expenses, previousTaxPayments, { logoDataUrl })
            }}>
              <Download className="h-4 w-4 mr-2" />
              Télécharger
            </Button>
            <Button onClick={generateReport} className="animate-glow">
              <FileText className="h-4 w-4 mr-2" />
              Générer Rapport
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

  <ReportModal open={isReportOpen} onOpenChange={setIsReportOpen} enterprise={enterprise} calculation={taxCalculation} revenue={revenue} expenses={expenses} previousPayments={previousTaxPayments} />
    </>
  )
}
