-- CreateEnum
CREATE TYPE "ClaimType" AS ENUM ('ANTI_AGING', 'HYDRATION', 'BRIGHTENING', 'UV_PROTECTION', 'HAIR_REPAIR', 'SENSITIVE_SKIN');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PROPOSED', 'SCREENED', 'FORMULATION_TESTING', 'UNDER_EVALUATION', 'ASSESSED');

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "claimText" TEXT NOT NULL,
    "claimType" "ClaimType" NOT NULL,
    "formula" TEXT,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PROPOSED',
    "submittedBy" TEXT NOT NULL DEFAULT 'R&I Scientist',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "studyTitle" TEXT NOT NULL,
    "methodology" TEXT NOT NULL,
    "resultsSummary" TEXT NOT NULL,
    "sampleSize" INTEGER,
    "durationWeeks" INTEGER,
    "justified" BOOLEAN NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Claim_status_idx" ON "Claim"("status");

-- CreateIndex
CREATE INDEX "Assessment_claimId_idx" ON "Assessment"("claimId");

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
