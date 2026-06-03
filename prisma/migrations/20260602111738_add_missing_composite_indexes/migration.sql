-- CreateIndex
CREATE INDEX "Payment_period_idx" ON "Payment"("period");

-- CreateIndex
CREATE INDEX "Payment_organizationId_status_idx" ON "Payment"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Payment_tenantId_paymentType_period_idx" ON "Payment"("tenantId", "paymentType", "period");

-- CreateIndex
CREATE INDEX "PaymentService_paymentId_idx" ON "PaymentService"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentService_serviceId_idx" ON "PaymentService"("serviceId");
