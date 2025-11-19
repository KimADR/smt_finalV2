# Changement du format de téléchargement du Calculateur Fiscal

## Résumé des modifications

Le téléchargement du rapport de calcul d'impôt a été changé du format **JSON** au format **PDF**.

## Fichiers modifiés

### 1. **smt-enligne/package.json**
- ✅ Ajout de la dépendance `jspdf ^2.5.1` pour générer les fichiers PDF

### 2. **smt-enligne/lib/pdf-generator.ts** (Nouveau fichier)
- ✅ Création d'un nouveau fichier utilitaire
- ✅ Fonction `generateTaxReportPDF()` qui génère un PDF professionnel avec:
  - En-tête avec le titre et logo de couleur
  - Informations de l'entreprise (nom, NIF, secteur)
  - Données financières (CA, charges, bénéfice net, acomptes)
  - Calcul de l'impôt détaillé (régime fiscal, taux, montant calculé)
  - Boîte de résumé avec le montant total à payer
  - Pied de page avec date et heure de génération

### 3. **smt-enligne/components/tax-calculator.tsx**
- ✅ Remplacement de l'import `jsPDF` par l'import de `generateTaxReportPDF`
- ✅ Modification du bouton "Télécharger" pour appeler la fonction PDF
- ✅ Label du bouton changé de "Télécharger" à "Télécharger (PDF)"
- ✅ Suppression du code de téléchargement JSON inline

## Fonctionnalités

### Avant
- Téléchargement d'un fichier JSON structuré avec les données du calculateur
- Nom du fichier: `{enterprise-name}-tax-report.json`

### Après
- Téléchargement d'un fichier PDF formaté avec mise en page professionnelle
- Nom du fichier: `{enterprise-name}-tax-report.pdf`
- Le PDF contient tous les éléments du rapport de manière lisible et imprimable

## Points d'intégration

Le changement ne requiert aucune modification supplémentaire:
- La fonction PDF est entièrement autonome
- Elle gère les erreurs gracieusement (alerte si problème)
- Elle est compatible avec tous les navigateurs modernes

## Installation et utilisation

1. Les dépendances ont été automatiquement installées (`pnpm install`)
2. Le bouton "Télécharger (PDF)" dans le calculateur d'impôt génère maintenant un PDF
3. Le PDF s'affiche avec tous les calculs et informations de l'entreprise

## Notes techniques

- Import dynamique de jsPDF pour éviter les problèmes de SSR/CSR
- Utilisation de la police Helvetica pour meilleure compatibilité
- Gestion des couleurs en RGB avec thème slate/indigo
- Formatage automatique des nombres avec séparateurs de milliers (MGA)
