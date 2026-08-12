-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PromoCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "percent" INTEGER NOT NULL,
    "amount" DECIMAL NOT NULL DEFAULT 0,
    "maxUses" INTEGER NOT NULL DEFAULT 100,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromoCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PromoCode" ("code", "createdAt", "createdById", "expiresAt", "id", "maxUses", "percent", "status", "usedCount") SELECT "code", "createdAt", "createdById", "expiresAt", "id", "maxUses", "percent", "status", "usedCount" FROM "PromoCode";
DROP TABLE "PromoCode";
ALTER TABLE "new_PromoCode" RENAME TO "PromoCode";
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");
CREATE INDEX "PromoCode_status_idx" ON "PromoCode"("status");
CREATE TABLE "new_Voucher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "usedById" TEXT,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Voucher_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Voucher_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Voucher" ("amount", "code", "createdAt", "createdById", "id", "status", "usedAt", "usedById") SELECT "amount", "code", "createdAt", "createdById", "id", "status", "usedAt", "usedById" FROM "Voucher";
DROP TABLE "Voucher";
ALTER TABLE "new_Voucher" RENAME TO "Voucher";
CREATE UNIQUE INDEX "Voucher_code_key" ON "Voucher"("code");
CREATE INDEX "Voucher_status_idx" ON "Voucher"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
