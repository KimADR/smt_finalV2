-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "deleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Notification" ADD COLUMN "deletedAt" TIMESTAMP;