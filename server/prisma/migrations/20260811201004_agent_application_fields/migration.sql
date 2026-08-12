/*
  Warnings:

  - You are about to drop the column `experience` on the `AgentApplication` table. All the data in the column will be lost.
  - You are about to drop the column `motivation` on the `AgentApplication` table. All the data in the column will be lost.
  - Added the required column `address` to the `AgentApplication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `banking` to the `AgentApplication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `education` to the `AgentApplication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `AgentApplication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fullName` to the `AgentApplication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `idNumber` to the `AgentApplication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `idType` to the `AgentApplication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `AgentApplication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `referenceOneContact` to the `AgentApplication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `referenceOneName` to the `AgentApplication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `referenceTwoContact` to the `AgentApplication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `referenceTwoName` to the `AgentApplication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tin` to the `AgentApplication` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AgentApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "idType" TEXT NOT NULL,
    "idNumber" TEXT NOT NULL,
    "idDocumentUrl" TEXT,
    "proofOfAddressUrl" TEXT,
    "applicationFeeAmount" DECIMAL NOT NULL DEFAULT 0,
    "applicationFeeTx" TEXT,
    "registrationFeeAck" BOOLEAN NOT NULL DEFAULT false,
    "education" TEXT NOT NULL,
    "resumeUrl" TEXT,
    "referenceOneName" TEXT NOT NULL,
    "referenceOneContact" TEXT NOT NULL,
    "referenceTwoName" TEXT NOT NULL,
    "referenceTwoContact" TEXT NOT NULL,
    "tin" TEXT NOT NULL,
    "criminalRecordOk" BOOLEAN NOT NULL DEFAULT false,
    "license" TEXT,
    "businessRegistration" TEXT,
    "hasDevice" BOOLEAN NOT NULL DEFAULT false,
    "hasInternet" BOOLEAN NOT NULL DEFAULT false,
    "banking" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AgentApplication" ("createdAt", "id", "reviewedAt", "reviewedBy", "status", "updatedAt", "userId") SELECT "createdAt", "id", "reviewedAt", "reviewedBy", "status", "updatedAt", "userId" FROM "AgentApplication";
DROP TABLE "AgentApplication";
ALTER TABLE "new_AgentApplication" RENAME TO "AgentApplication";
CREATE UNIQUE INDEX "AgentApplication_userId_key" ON "AgentApplication"("userId");
CREATE INDEX "AgentApplication_status_idx" ON "AgentApplication"("status");
CREATE INDEX "AgentApplication_createdAt_idx" ON "AgentApplication"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
