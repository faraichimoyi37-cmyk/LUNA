-- DropIndex
DROP INDEX "PromoCode_status_idx";

-- CreateTable
CREATE TABLE "PromoUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromoUsage_promoId_fkey" FOREIGN KEY ("promoId") REFERENCES "PromoCode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PromoUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PromoUsage_promoId_userId_key" ON "PromoUsage"("promoId", "userId");
