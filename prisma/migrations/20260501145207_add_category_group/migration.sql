-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "group" TEXT;

-- CreateIndex
CREATE INDEX "Category_userId_group_idx" ON "Category"("userId", "group");
