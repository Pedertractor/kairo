-- CreateTable
CREATE TABLE "cost_centers" (
    "id" TEXT NOT NULL,
    "costCenter" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_cost_centers" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "costCenterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_costCenter_key" ON "cost_centers"("costCenter");

-- CreateIndex
CREATE INDEX "team_cost_centers_teamId_idx" ON "team_cost_centers"("teamId");

-- CreateIndex
CREATE INDEX "team_cost_centers_costCenterId_idx" ON "team_cost_centers"("costCenterId");

-- CreateIndex
CREATE UNIQUE INDEX "team_cost_centers_teamId_costCenterId_key" ON "team_cost_centers"("teamId", "costCenterId");

-- AddForeignKey
ALTER TABLE "team_cost_centers" ADD CONSTRAINT "team_cost_centers_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_cost_centers" ADD CONSTRAINT "team_cost_centers_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
