-- DropForeignKey
ALTER TABLE "printing_machines" DROP CONSTRAINT "printing_machines_threeDPartId_fkey";

-- DropTable
DROP TABLE "printing_machines";

-- DropTable
DROP TABLE "three_d_parts";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "printerOperator";
