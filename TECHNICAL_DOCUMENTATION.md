# Documentation Technique - Changement PDF

## Architecture

### Séparation des responsabilités

La génération PDF a été extraite dans un fichier utilitaire dédié pour respecter le principe DRY et faciliter la maintenance.

```
smt-enligne/
├── components/
│   └── tax-calculator.tsx       ← Logique UI et interaction utilisateur
├── lib/
│   └── pdf-generator.ts         ← ✨ Nouveau: Logique de génération PDF
```

### Flux de génération

```
Utilisateur clique sur "Télécharger (PDF)"
    ↓
tax-calculator.tsx appelle generateTaxReportPDF()
    ↓
pdf-generator.ts importe jsPDF dynamiquement
    ↓
Crée instance jsPDF
    ↓
Remplit contenu (en-tête, données, calculs, pied)
    ↓
Sauvegarde avec nom basé sur l'entreprise
```

## Implémentation détaillée

### Fichier: `lib/pdf-generator.ts`

**Signature de fonction:**
```typescript
export async function generateTaxReportPDF(
  enterprise: any,
  taxCalculation: any,
  revenue: string,
  expenses: string,
  previousTaxPayments: string
): Promise<void>
```

**Paramètres:**
- `enterprise` - Objet contenant (name, nif, sector, taxType)
- `taxCalculation` - Objet contenant (netIncome, taxRate, taxAmount, minimumPerception)
- `revenue` - Chaîne du chiffre d'affaires
- `expenses` - Chaîne des charges
- `previousTaxPayments` - Chaîne des acomptes versés

**Gestion d'erreurs:**
- Try/catch pour capturer les erreurs d'import jsPDF
- Alert utilisateur en cas d'erreur
- Logs console pour debugging

### Fichier: `components/tax-calculator.tsx`

**Avant:**
```tsx
const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
// ... création d'URL et download
```

**Après:**
```tsx
import { generateTaxReportPDF } from "@/lib/pdf-generator"

// Dans le handler du bouton:
await generateTaxReportPDF(enterprise, taxCalculation, revenue, expenses, previousTaxPayments)
```

## Considérations de performance

- **Import dynamique**: jsPDF n'est chargé que lorsque l'utilisateur clique sur le bouton
- **Pas de rendu React**: Le PDF est généré directement sans passer par React
- **Pas de requête réseau**: Génération 100% client-side
- **Taille de bundle**: jsPDF (~280KB) est ajouté au bundle mais uniquement chargé à la demande

## Compatibilité

✅ Chrome/Chromium
✅ Firefox
✅ Safari
✅ Edge
✅ Support du français (accents et caractères spéciaux)
✅ Format A4 standard

## Modification future

Si vous souhaitez:

### Ajouter un logo
```typescript
doc.addImage(logoUrl, 'PNG', margin, 5, 20, 20);
```

### Ajouter plusieurs pages
```typescript
doc.addPage();
yPosition = 15; // Reset position pour nouvelle page
```

### Changer les couleurs
```typescript
const headerColor = [51, 65, 85]; // RGB slate-700
const accentColor = [99, 102, 241]; // RGB indigo-500
```

### Ajouter un numéro de page
```typescript
const pageCount = doc.internal.pages.length;
doc.text(`Page ${currentPage}/${pageCount}`, margin, pageHeight - 5);
```

## Tests

Pour tester manuellement:

1. Démarrer le serveur: `pnpm dev`
2. Naviguer vers l'onglet Calculateur Fiscal
3. Entrer des valeurs fictives
4. Cliquer sur "Télécharger (PDF)"
5. Vérifier que le PDF est généré avec le bon contenu

## Migration depuis JSON

**Aucune action requise** - Le changement est transparent pour l'utilisateur final.

Les anciens exports JSON ne sont plus disponibles et remplacés entièrement par les PDF.

## Dépendances

```json
{
  "jspdf": "^2.5.1"
}
```

Installé avec: `pnpm install`

## Support

Pour toute question ou problème:
1. Vérifier les logs console (F12)
2. Vérifier que jsPDF est chargée correctement
3. Vérifier que les données passées sont au bon format
