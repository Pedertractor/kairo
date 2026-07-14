-- CreateTable
CREATE TABLE "printing_machines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "busy" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "printing_machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "three_d_parts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "timeToPrint" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "three_d_parts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "three_d_parts_code_key" ON "three_d_parts"("code");
