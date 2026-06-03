-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'MANAGER', 'TECHNICIAN');

-- AlterTable
ALTER TABLE "HouseType" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "organizationId" TEXT;

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MANAGER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrgMember_userId_idx" ON "OrgMember"("userId");

-- CreateIndex
CREATE INDEX "OrgMember_organizationId_idx" ON "OrgMember"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgMember_organizationId_userId_key" ON "OrgMember"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "HouseType_organizationId_idx" ON "HouseType"("organizationId");

-- CreateIndex
CREATE INDEX "HouseType_userId_idx" ON "HouseType"("userId");

-- CreateIndex
CREATE INDEX "Payment_organizationId_idx" ON "Payment"("organizationId");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_tenantId_idx" ON "Payment"("tenantId");

-- CreateIndex
CREATE INDEX "Payment_unitId_idx" ON "Payment"("unitId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_dueDate_idx" ON "Payment"("dueDate");

-- CreateIndex
CREATE INDEX "Service_organizationId_idx" ON "Service"("organizationId");

-- CreateIndex
CREATE INDEX "Service_userId_idx" ON "Service"("userId");

-- CreateIndex
CREATE INDEX "Tenant_organizationId_idx" ON "Tenant"("organizationId");

-- CreateIndex
CREATE INDEX "Tenant_userId_idx" ON "Tenant"("userId");

-- CreateIndex
CREATE INDEX "Tenant_unitId_idx" ON "Tenant"("unitId");

-- CreateIndex
CREATE INDEX "Unit_organizationId_idx" ON "Unit"("organizationId");

-- CreateIndex
CREATE INDEX "Unit_userId_idx" ON "Unit"("userId");

-- CreateIndex
CREATE INDEX "Unit_houseTypeId_idx" ON "Unit"("houseTypeId");

-- CreateIndex
CREATE INDEX "Unit_status_idx" ON "Unit"("status");

-- AddForeignKey
ALTER TABLE "OrgMember" ADD CONSTRAINT "OrgMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMember" ADD CONSTRAINT "OrgMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseType" ADD CONSTRAINT "HouseType_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: create one Organization per existing User (using user id as org id),
-- create an OWNER OrgMember record, then stamp organizationId on all data rows.
INSERT INTO "Organization" ("id", "name", "createdAt", "updatedAt")
SELECT
  u."id",
  COALESCE(NULLIF(u."name", ''), SPLIT_PART(u."email", '@', 1), 'My Organization'),
  NOW(),
  NOW()
FROM "User" u
WHERE u."deletedAt" IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO "OrgMember" ("id", "organizationId", "userId", "role", "createdAt")
SELECT
  gen_random_uuid()::text,
  u."id",
  u."id",
  'OWNER',
  NOW()
FROM "User" u
WHERE u."deletedAt" IS NULL
ON CONFLICT DO NOTHING;

UPDATE "HouseType" SET "organizationId" = "userId" WHERE "userId" IS NOT NULL AND "organizationId" IS NULL;
UPDATE "Unit"      SET "organizationId" = "userId" WHERE "userId" IS NOT NULL AND "organizationId" IS NULL;
UPDATE "Tenant"    SET "organizationId" = "userId" WHERE "userId" IS NOT NULL AND "organizationId" IS NULL;
UPDATE "Payment"   SET "organizationId" = "userId" WHERE "userId" IS NOT NULL AND "organizationId" IS NULL;
UPDATE "Service"   SET "organizationId" = "userId" WHERE "userId" IS NOT NULL AND "organizationId" IS NULL;
