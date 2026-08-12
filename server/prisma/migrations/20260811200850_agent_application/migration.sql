-- CreateTable
CREATE TABLE "AgentApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "motivation" TEXT NOT NULL,
    "experience" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentApplication_userId_key" ON "AgentApplication"("userId");

-- CreateIndex
CREATE INDEX "AgentApplication_status_idx" ON "AgentApplication"("status");

-- CreateIndex
CREATE INDEX "AgentApplication_createdAt_idx" ON "AgentApplication"("createdAt");
