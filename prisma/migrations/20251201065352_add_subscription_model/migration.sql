-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "cancelledAt" DATETIME,
    "trialEndsAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_shop_key" ON "Subscription"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_subscriptionId_key" ON "Subscription"("subscriptionId");
