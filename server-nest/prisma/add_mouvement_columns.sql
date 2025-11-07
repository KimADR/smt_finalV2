ALTER TABLE "Mouvement" ADD COLUMN IF NOT EXISTS "reference" text;
ALTER TABLE "Mouvement" ADD COLUMN IF NOT EXISTS "estPaiementImpot" boolean DEFAULT false;
ALTER TABLE "Mouvement" ADD COLUMN IF NOT EXISTS "attachments" jsonb;