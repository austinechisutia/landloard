-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('FIXED', 'PER_UNIT');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "rentAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Service" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ServiceType" NOT NULL DEFAULT 'FIXED',
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "unitLabel" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentService" (
    "id" SERIAL NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "units" DECIMAL(10,2),
    "amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "PaymentService_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PaymentService" ADD CONSTRAINT "PaymentService_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentService" ADD CONSTRAINT "PaymentService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
