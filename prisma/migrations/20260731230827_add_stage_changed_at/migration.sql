-- AlterTable
ALTER TABLE "Applicant" ADD COLUMN     "stageChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill: a row that has never changed stage has been in its stage
-- since it was created.
UPDATE "Applicant" SET "stageChangedAt" = "appliedAt";
