-- CreateEnum
CREATE TYPE "public"."EnterpriseStatus" AS ENUM ('ACTIF', 'INACTIF', 'SUSPENDU');

-- CreateEnum
CREATE TYPE "public"."TaxType" AS ENUM ('IR', 'IS');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN_FISCAL', 'ENTREPRISE', 'AGENT_FISCAL');

-- CreateEnum
CREATE TYPE "public"."MouvementType" AS ENUM ('CREDIT', 'DEBIT', 'TAXPAIMENT');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT,
    "phone" TEXT,
    "avatar" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'ENTREPRISE',
    "entrepriseId" INTEGER,
    "taxId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Entreprise" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT,
    "siret" TEXT,
    "address" TEXT,
    "contactEmail" TEXT,
    "phone" TEXT,
    "status" "public"."EnterpriseStatus" NOT NULL DEFAULT 'ACTIF',
    "taxType" "public"."TaxType" NOT NULL DEFAULT 'IR',
    "legalForm" TEXT,
    "activity" TEXT,
    "annualRevenue" DOUBLE PRECISION,
    "city" TEXT,
    "postalCode" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entreprise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Mouvement" (
    "id" SERIAL NOT NULL,
    "entrepriseId" INTEGER NOT NULL,
    "userId" INTEGER,
    "amount" DECIMAL(15,2) NOT NULL,
    "type" "public"."MouvementType" NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "estPaiementImpot" BOOLEAN NOT NULL DEFAULT false,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mouvement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Entreprise_siret_key" ON "public"."Entreprise"("siret");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "public"."Entreprise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mouvement" ADD CONSTRAINT "Mouvement_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "public"."Entreprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mouvement" ADD CONSTRAINT "Mouvement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
