-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_VerificationCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'REGISTER',
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_VerificationCode" ("code", "createdAt", "email", "expiresAt", "id", "purpose", "usedAt") SELECT "code", "createdAt", "email", "expiresAt", "id", "purpose", "usedAt" FROM "VerificationCode";
DROP TABLE "VerificationCode";
ALTER TABLE "new_VerificationCode" RENAME TO "VerificationCode";
CREATE INDEX "VerificationCode_email_purpose_idx" ON "VerificationCode"("email", "purpose");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
