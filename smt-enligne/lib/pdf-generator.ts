// PDF Generator for Tax Calculator Reports
export async function generateTaxReportPDF(
  enterprise: any,
  taxCalculation: any,
  revenue: string,
  expenses: string,
  previousTaxPayments: string,
  options?: { logoDataUrl?: string }
) {
  try {
    const { jsPDF } = await import("jspdf");

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 18;
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;
    // Color palette
    const darkBlue = [12, 44, 89] as [number, number, number];
    const brandOrange = [243, 132, 33] as [number, number, number];
    const midBlue = [28, 86, 158] as [number, number, number];
    const successGreen = [34, 197, 94] as [number, number, number];
    const lightFill = [245, 247, 250] as [number, number, number];
    const strokeGray = [200, 208, 216] as [number, number, number];

    // Header
    doc.setFillColor(...darkBlue);
    doc.rect(0, 0, pageWidth, 26, "F");
    doc.setFillColor(...brandOrange);
    doc.rect(pageWidth - 60, 0, 60, 8, "F");

    // Logo
    if (options?.logoDataUrl) {
      try {
        doc.addImage(options.logoDataUrl, "PNG", margin, 4, 24, 18);
      } catch (e) {
        doc.setFillColor(255, 255, 255);
        doc.rect(margin, 6, 24, 14, "F");
      }
    } else {
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, 6, 24, 14, "F");
      doc.setDrawColor(...strokeGray);
      doc.rect(margin, 6, 24, 14);
    }

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text("RAPPORT D'IMPÔT", pageWidth / 2, 12, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Calculateur Fiscal SMT - Rapport Détaillé", pageWidth / 2, 18, { align: "center" });

    // Company right info
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(enterprise?.name || "Nom de l'entreprise", pageWidth - margin, 7, { align: "right" });
    doc.setFontSize(7);
    doc.text(enterprise?.address || "Adresse entreprise", pageWidth - margin, 11, { align: "right" });

    // Orange separator
    doc.setFillColor(...brandOrange);
    doc.rect(margin, 26, contentWidth, 4, "F");

    y = 34;

    // Section header helper
    const drawSectionHeader = (label: string) => {
      doc.setFillColor(...midBlue);
      doc.rect(margin, y, contentWidth, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(label.toUpperCase(), margin + 3, y + 6);
      y += 10;
    };

    // Number formatter (dots as thousands separator)
    const fmt = (v: any) => {
      const n = Number(String(v || 0).replace(/[^0-9.-]/g, "")) || 0;
      return n.toLocaleString("de-DE");
    };

    // Enterprise info
    drawSectionHeader("Informations de l'entreprise");
    doc.setFillColor(...lightFill);
    doc.rect(margin, y, contentWidth, 20, "F");
    doc.setDrawColor(...strokeGray);
    doc.rect(margin, y, contentWidth, 20);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Entreprise:", margin + 3, y + 6);
    doc.setFont("helvetica", "normal");
    doc.text(enterprise?.name || "-", margin + 28, y + 6);

    doc.setFont("helvetica", "bold");
    doc.text("NIF:", margin + 3, y + 12);
    doc.setFont("helvetica", "normal");
    doc.text(enterprise?.nif || "-", margin + 28, y + 12);

    doc.setFont("helvetica", "bold");
    doc.text("Secteur:", margin + contentWidth / 2, y + 6);
    doc.setFont("helvetica", "normal");
    doc.text(enterprise?.sector || "-", margin + contentWidth / 2 + 20, y + 6);

    y += 24;

    // Financial
    drawSectionHeader("Données financières");
    const colW = (contentWidth - 6) / 2;
    const leftX = margin + 1;
    const rightXCol = margin + 3 + colW;

    doc.setFillColor(...lightFill);
    doc.rect(leftX, y, colW, 28, "F");
    doc.setDrawColor(...strokeGray);
    doc.rect(leftX, y, colW, 28);
    doc.rect(rightXCol, y, colW, 28, "F");
    doc.rect(rightXCol, y, colW, 28);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Chiffre d'affaires:", leftX + 2, y + 6);
    doc.setFont("helvetica", "normal");
    doc.text(`${fmt(revenue)} MGA`, leftX + 2, y + 12);

    doc.setFont("helvetica", "bold");
    doc.text("Charges déductibles:", rightXCol + 2, y + 6);
    doc.setFont("helvetica", "normal");
    doc.text(`${fmt(expenses)} MGA`, rightXCol + 2, y + 12);

    doc.setFont("helvetica", "bold");
    doc.text("Acomptes versés:", rightXCol + 2, y + 18);
    doc.setFont("helvetica", "normal");
    doc.text(`${fmt(previousTaxPayments)} MGA`, rightXCol + 2, y + 24);

    y += 34;

    // Tax calculation
    drawSectionHeader("Calcul de l'impôt");
    doc.setFillColor(...lightFill);
    doc.rect(margin, y, contentWidth, 22, "F");
    doc.setDrawColor(...strokeGray);
    doc.rect(margin, y, contentWidth, 22);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Régime fiscal:", margin + 3, y + 6);
    doc.setFont("helvetica", "normal");
    const taxType = enterprise?.taxType === "IR" ? "Impôt sur le Revenu (IR)" : "Impôt sur les Sociétés (IS)";
    doc.text(taxType, margin + 40, y + 6);

    doc.setFont("helvetica", "bold");
    doc.text("Taux d'imposition:", margin + 3, y + 12);
    doc.setFont("helvetica", "normal");
    doc.text(`${taxCalculation?.taxRate ?? 0}%`, margin + 50, y + 12);

    doc.setFont("helvetica", "bold");
    doc.text("Montant d'impôt:", margin + contentWidth / 2, y + 6);
    doc.setFont("helvetica", "normal");
    const taxAmountVal = Math.round(Number(taxCalculation?.taxAmount ?? 0)) || 0;
    doc.text(`${taxAmountVal.toLocaleString("de-DE")} MGA`, margin + contentWidth / 2 + 30, y + 6);

    y += 28;

    // Total strip - calculate: tax amount - charges - previous payments
    const taxAmountVal_total = Math.round(Number(taxCalculation?.taxAmount ?? 0)) || 0;
    const expensesVal_total = Math.round(Number(String(expenses || "0").replace(/[^0-9.-]/g, ""))) || 0;
    const previousPaymentsVal_total = Math.round(Number(String(previousTaxPayments || "0").replace(/[^0-9.-]/g, ""))) || 0;
    const total = Math.max(0, taxAmountVal_total - expensesVal_total - previousPaymentsVal_total);
    
    doc.setFillColor(...successGreen);
    doc.rect(margin, y, contentWidth, 16, "F");
    // Per request: black text for numbers and letters
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("MONTANT TOTAL À PAYER", margin + 4, y + 11);
    doc.setFontSize(14);
    const amountX = pageWidth - margin - 20;
    doc.text(`${total.toLocaleString("de-DE")}`, amountX, y + 11, { align: "right" });
    doc.setFontSize(10);
    doc.text("MGA", pageWidth - margin - 3, y + 11, { align: "right" });

    y += 20;

    // Footer
    doc.setDrawColor(...midBlue);
    doc.setLineWidth(0.6);
    doc.line(margin, pageHeight - 22, pageWidth - margin, pageHeight - 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    const now = new Date();
    doc.text(`Généré le: ${now.toLocaleDateString("fr-FR")} à ${now.toLocaleTimeString("fr-FR")}`, margin, pageHeight - 14);
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(7);
    doc.text("SMT-Enligne © 2025", pageWidth - margin, pageHeight - 14, { align: "right" });

    // Save
    doc.save(`${(enterprise?.name || "enterprise").replace(/\s+/g, "_")}-tax-report.pdf`);
  } catch (error) {
    console.error("Error generating PDF:", error);
  }
}