-- AlterTable: add nullable userId to HouseType
ALTER TABLE "HouseType" ADD COLUMN "userId" TEXT;

-- AlterTable: add nullable userId to Unit
ALTER TABLE "Unit" ADD COLUMN "userId" TEXT;

-- AlterTable: add nullable userId to Tenant
ALTER TABLE "Tenant" ADD COLUMN "userId" TEXT;

-- AlterTable: add nullable userId to Payment
ALTER TABLE "Payment" ADD COLUMN "userId" TEXT;

-- AlterTable: add nullable userId to Service
ALTER TABLE "Service" ADD COLUMN "userId" TEXT;

-- AddForeignKey
ALTER TABLE "HouseType" ADD CONSTRAINT "HouseType_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
