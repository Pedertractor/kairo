-- CreateEnum
CREATE TYPE "ComplexityLevel" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'MUITO_ALTA');

-- AlterTable
ALTER TABLE "cards" ADD COLUMN     "complexityLevel" "ComplexityLevel";

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "complexityLevel" "ComplexityLevel";
